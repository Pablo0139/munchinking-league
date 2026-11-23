# Contrato de API

| Campo                | Valor                |
| -------------------- | -------------------- |
| Proyecto             | Munchinking League   |
| Documento            | Contrato de API      |
| Archivo              | `06-api-contract.md` |
| Versión              | 1.4                  |
| Estado               | Contrato del código local T26/27; no certifica despliegue ni pruebas integradas |
| correlation_id       | No suministrado |
| Fuentes              | [Routers registrados](../apps/api/src/routers/index.ts), [esquemas compartidos](../packages/shared/src/schemas.ts), [router de cartas](../apps/api/src/routers/cards.ts) |
| Última actualización | 20/11/2026           |

---

# 1. Introducción

## 1.1 Objetivo

Este documento define el contrato de comunicación entre el frontend y el backend de Munchinking League.

El Worker sirve **tRPC** en `/trpc`; el cliente consume el tipo `AppRouter`.

El frontend no accederá directamente a la base de datos.

---

# 2. Principios

La API seguirá los siguientes principios:

- Todas las operaciones estarán tipadas.
- Las entradas serán validadas en el servidor.
- La autorización se realizará siempre en el backend.
- Los procedimientos representarán casos de uso o consultas del sistema.
- Las operaciones que modifiquen el estado serán procedimientos `mutation`.
- Las operaciones de consulta serán procedimientos `query`.
- No se expondrán consultas SQL al cliente.

---

# 3. Estructura

Los procedimientos estarán agrupados en routers funcionales.

La estructura registrada es:

- `health` (`health.ping`, consulta pública; `/health` es una ruta HTTP separada)
- `auth`
- `manager`
- `cards`
- `calendar` (administrativo, **no** anidado en `admin`)
- `history`
- `notifications`
- `distribution`
- `library`
- `admin`

El router principal es `appRouter`.

---

# 4. Auth Router

Responsable de la autenticación y gestión de sesión.

## 4.1 auth.login

Autentica un usuario.

### Tipo

`mutation`

### Entrada

- `username: string`
- `password: string`

### Respuesta

- `user: User`
- `manager: Manager`
- `session: Session`

### Errores

- Credenciales incorrectas.
- Usuario inexistente.
- Cuenta deshabilitada.

---

## 4.2 auth.logout

Finaliza la sesión actual.

### Tipo

`mutation`

### Entrada

No requiere parámetros.

### Respuesta

- `success: boolean`

---

## 4.3 auth.me

Obtiene la sesión actualmente autenticada.

### Tipo

`query`

### Entrada

Ninguna.

### Respuesta

- `user: User`
- `manager: Manager`

Si no existe una sesión válida, devolverá un error de autenticación.

---

# 5. Manager Router

Agrupa las operaciones relacionadas con el manager autenticado.

## 5.1 manager.getProfile

Obtiene la información y métricas personales del manager actual en la temporada activa.

### Tipo

`query`

### Entrada

Ninguna.

### Respuesta

- `id: UUID`
- `displayName: string`
- `teamName: string | null`
- `avatarUrl: string | null`
- `role: 'MANAGER' | 'ADMIN'`
- `stats: { handCount: number; playedCount: number; discardedCount: number; returnedCount: number; maxHandSize: number }`

---

## 5.2 manager.getHand

Obtiene las cartas actualmente disponibles para el manager, enriquecidas con su `CardDefinition`.

### Tipo

`query`

### Entrada

Ninguna.

### Respuesta

- `cards: HandCardDto[]` (incluye `cardCopyId`, `obtainedAt`, `definition: CardDefinitionDto`)
- `musDiscardRequired: boolean` (privado; sin temporada activa: `cards: []` y `false`)

Solo devolverá cartas de la temporada activa cuya ubicación actual sea `HAND` y cuyo propietario sea el manager autenticado.

---

## 5.3 manager.listTargets

Lista los mánagers activos de la liga para el selector histórico y los campos oficiales. Con `excludeSelf: false` incluye al actor, elegible en Cambio de Puntuación pero no como rival.

### Tipo

`query`

### Entrada

- `excludeSelf?: boolean` (por defecto `true`)

### Respuesta

- `managers: Array<{ id: UUID; displayName: string; teamName: string | null; avatarUrl: string | null }>`

---

# 6. Cards Router

Agrupa las operaciones relacionadas con las cartas del manager.

## 6.1 cards.play

Juega una carta.

### Tipo

`mutation`

### Entrada

La copia (`cardCopyId: UUID`) determina la definición y el servidor distingue dos formatos por **slug**, no por un modo enviado por el cliente. El esquema común admite `notes` opcionales (máx. 240 caracteres).

| Copia | Campos de juego |
|---|---|
| Oficial T26/27 | `choices: Record<string,string>` con las claves del [catálogo](../packages/shared/src/season-cards.ts) y `rulesConfirmed: true`. Enviar `{}` si no hay campos (p. ej., Mus). No combinar con `targetManagerId` ni `targetLabel`. |
| Histórica | Omitir `choices` y `rulesConfirmed`. `MANAGER` exige `targetManagerId`; `PLAYER` y `FREE_TEXT` exigen `targetLabel` (máx. 120 caracteres); `NONE` no acepta objetivo. |

### Validaciones

El backend deberá comprobar:

1. El usuario está autenticado.
2. La CardCopy existe.
3. La CardCopy pertenece a la temporada activa.
4. La CardCopy pertenece al manager autenticado.
5. La CardCopy se encuentra en `HAND`.
6. La selección corresponde al formato de esa carta. En las oficiales comprueba claves y opciones, nombres distintos cuando hay varios jugadores, importes válidos y mánagers activos de la liga (sin repetir ni usar al actor como rival). No valida una escudería o una plantilla por el mero hecho de seleccionar un mánager.
7. El servidor evalúa la ventana de calendario cuando procede y resuelve las tiradas y los cálculos; no acepta resultados de dados del cliente. El bloqueo Mus, las protecciones locales aplicables y la vigencia del origen de Espejo se comprueban en la escritura.

### Operación

Tras leer la copia y resolver la jugada, un único `db.batch` mueve `HAND → DECK`, quita el propietario y encadena el movimiento `PLAYED` al éxito del cambio. Registra el mensaje completo, tramita obligaciones Mus y, en oficiales, persiste en `card_play_effect` elecciones originales y efectivas, resumen, slug efectivo, jornada si se pudo asociar y origen si es réplica. El detalle de efecto **no** es un objeto adicional de la respuesta.

### Respuesta

- `card: CardCopy`
- `movement: CardMovement`
- `whatsappMessage: string`

La carta queda jugada inmediatamente.

No existe ningún estado `PENDING`, `WAITING_VALIDATION` o equivalente.

---

## 6.2 cards.discard

Descarta una carta.

### Tipo

`mutation`

### Entrada

- `cardCopyId: UUID`

### Validaciones

Exige copia propia en mano de la temporada activa, no objetivos ni confirmación reglamentaria. Con Mus pendiente solo admite la rareza máxima de la mano actual; los empates son válidos.

### Operación

La operación realizará:

1. Validar la propiedad.
2. Cambiar `location` a `DECK`.
3. Establecer `current_manager_id` a `NULL`.
4. Crear un `CardMovement`.

### Respuesta

- `card: CardCopy`
- `movement: CardMovement`

La carta vuelve inmediatamente al mazo. El movimiento `DISCARDED` satisface en el mismo lote las obligaciones Mus pendientes de ese mánager y temporada. No genera mensaje de jugada ni liquida compensación.

## 6.3 cards.mirrorTargets

`query` autenticada **sin entrada** → `{ items: Array<{ id, cardName, managerName, createdAt, targetLabel, requiresPlayer }> }`. `id` identifica el movimiento, no la copia; `targetLabel` puede ser nulo. Sin temporada activa devuelve `{ items: [] }`. No es el historial público: solo incluye efectos adversos admitidos dirigidos al mánager autenticado, de un emisor activo distinto, sin devolución ni réplica vigente suya para ese origen.

Para jugar Espejo: `choices: { movement: id }`; añadir `reflectedPlayer` si `requiresPlayer` es verdadero. El servidor impone como destino al emisor original, revalida el origen en la escritura y evalúa las protecciones sobre el efecto replicado. No se elige un tercer equipo, no se refleja Cambio de Puntuación y no se anula la primera jugada. La pertenencia del futbolista y la inmediatez reglamentaria requieren confirmación externa.

---

# 7. History Router

Permite consultar el historial de cartas.

## 7.1 history.public

Obtiene el historial público de cartas jugadas.

### Tipo

`query`

### Entrada

- `limit: number`
- `cursor?: string`
- `activeOnly?: boolean` (por defecto `false`; el carrusel de inicio solicita `true`).

### Respuesta

- `items: HistoryItem[]`
- `nextCursor: string | null`

Solo incluye movimientos `PLAYED`. Cada fila indica `isReturned: boolean`: la jugada original se conserva si fue devuelta. Con `activeOnly: true` se omiten las jugadas devueltas **antes** de paginar. El orden es `createdAt DESC, id DESC`.

No mostrará:

- Repartos.
- Descartes.
- Devoluciones.

---

## 7.2 history.mine

Obtiene el historial personal del manager.

### Tipo

`query`

### Entrada

- `limit: number`
- `cursor?: string`
- `movementType?: string`

### Respuesta

- `items: HistoryItem[]`
- `nextCursor: string | null`

Podrá contener:

- Cartas jugadas.
- Cartas descartadas.
- Cartas repartidas.
- Cartas devueltas.

---

# 8. Library Router

Permite consultar el catálogo de cartas.

## 8.1 library.list

Obtiene las CardDefinition habilitadas junto con el número de copias configuradas en la temporada activa.

### Tipo

`query`

### Entrada

- `rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'`
- `search?: string`

### Respuesta

- `cards: Array<CardDefinitionDto & { seasonCopiesCount: number }>`

La consulta no expondrá qué copias concretas están en el mazo o en manos de managers para preservar el secreto de juego.

---

# 9. Notifications Router

Gestiona las notificaciones de un manager.

## 9.1 notifications.list

Obtiene las notificaciones del manager autenticado.

### Tipo

`query`

### Entrada

- `limit: number`
- `cursor?: string`
- `unreadOnly?: boolean`

### Respuesta

- `items: Array<Notification & { card: NoticeCard | null }>`
- `nextCursor: string | null`

Las notificaciones se devuelven de más reciente a más antigua (`createdAt DESC, id DESC`). `card` contiene `name`, `nickname`, `description`, `usageRules`, `rarity`, `targetType` e `imageUrl` solo en un aviso `CARD_DISTRIBUTED` asociado a un movimiento de reparto del destinatario. No depende del propietario actual ni revela dónde está la copia. Sin un reparto válido, su valor es `null`.

---

## 9.2 notifications.unreadCount

Obtiene el número de notificaciones no leídas.

### Tipo

`query`

### Entrada

Ninguna.

### Respuesta

- `count: number`

El frontend utilizará este valor para mostrar el contador de notificaciones.

El contador visual se oculta con cero, muestra `1` a `9` y muestra `9+` a partir de diez.

---

## 9.3 notifications.markAsRead

Marca una notificación como leída.

### Tipo

`mutation`

### Entrada

- `notificationId: UUID`

### Respuesta

- `notification: Notification`

El backend verifica que la notificación pertenece al manager autenticado. Repetir la operación conserva la fecha de la primera lectura (`readAt`).

---

## 9.4 notifications.markAllAsRead

Marca todas las notificaciones pendientes del manager autenticado como leídas.

### Tipo

`mutation`

### Entrada

Ninguna.

### Respuesta

- `updatedCount: number`

---

# 10. Distribution Router

Gestiona el reparto semanal de cartas.

El reparto automático del Cron Trigger reutiliza el mismo caso de uso interno (`ExecuteDistribution`) que este router administrativo.

## 10.1 distribution.status

Solo `ADMIN`. Consulta el lote de la semana solicitada en la temporada activa. Sin temporada activa devuelve `PRECONDITION_FAILED`.

### Tipo

`query`

### Entrada

- `weekKey?: string` (por defecto la semana ISO actual en `Europe/Madrid`)

### Respuesta

- `seasonId: UUID`
- `weekKey: string`
- `alreadyExecuted: boolean`
- `weekBatchCount: number`
- `batch: DistributionBatch | null` (último lote registrado en esa semana, ordenado por `createdAt DESC, id DESC`)
- `skippedFullHandManagers: Array<{ id: string; displayName: string }> | null`
- `availableDeckCopies: number`
- `eligibleManagersCount: number`

`skippedFullHandManagers` está al mismo nivel que `batch`. Si no hay lote, ambos son `null` y `weekBatchCount` es `0`. Si hay un lote antiguo sin snapshot, `batch` contiene el lote y la lista es `null` (desconocida). `[]` significa que sí se guardó el snapshot y nadie quedó fuera por mano llena. Los dos contadores de disponibilidad reflejan el estado actual, no el del momento del reparto.

---

## 10.2 distribution.execute

Ejecuta manualmente un reparto en la semana activa de una temporada.

### Tipo

`mutation`

### Entrada

- `seasonId?: UUID` (si se omite, toma la temporada activa)
- `weekKey?: string` (si se omite, calcula la semana ISO actual en `Europe/Madrid`)
- `forceAdditional?: boolean` (por defecto `false`; si es `true`, autoriza crear un lote manual adicional en una semana que ya tiene lotes previos)
- `expectedWeekBatchCount?: number` (control optimista opcional; si no coincide con el número actual de lotes de la semana, devuelve `CONFLICT` para evitar duplicados por doble envío concurrente)

### Validaciones

El backend deberá comprobar:

1. El usuario está autenticado.
2. El usuario tiene permisos de administrador (`ADMIN`).
3. La Season existe y está activa.
4. Si `forceAdditional` no es `true`, no existe ningún `DistributionBatch` previo para `(seasonId, weekKey)` (en caso contrario devuelve `CONFLICT`). El Cron Trigger nunca activa `forceAdditional`.
5. Si se informa `expectedWeekBatchCount`, coincide exactamente con el número de lotes existentes de `(seasonId, weekKey)` en el instante de insertar el lote; de lo contrario devuelve `CONFLICT`.
6. Si se envía una `weekKey` distinta de la semana ISO actual, devuelve `CONFLICT` sin repartir. El cliente debe volver a consultar el estado antes de confirmar.

### Operación

El sistema:

1. Obtendrá los managers participantes.
2. Determinará las cartas que deben repartirse.
3. Seleccionará las CardCopy disponibles del mazo.
4. Respetará el límite máximo de tres cartas por manager.
5. Actualizará las CardCopy.
6. Creará los CardMovement correspondientes.
7. Creará las Notification correspondientes.

### Respuesta

- `distributed: number`
- `seasonId: UUID`
- `weekKey: string`
- `skippedFullHandCount: number`
- `movements: CardMovement[]`

---

# 11. Admin Router

Agrupa las operaciones exclusivas de administración.

Todas las operaciones de este router requieren rol de administrador.

## 11.1 admin.history

Obtiene el historial completo de movimientos.

### Tipo

`query`

### Entrada

- `limit: number`
- `cursor?: string`
- `managerId?: UUID`
- `movementType?: string`

### Respuesta

- `items: HistoryItem[]`
- `nextCursor: string | null`

A diferencia del historial público, podrá incluir:

- `DISTRIBUTED`
- `PLAYED`
- `DISCARDED`
- `RETURNED`

---

## 11.2 admin.returnCard

Devuelve una carta previamente jugada a la mano del manager referenciando de forma inequívoca el movimiento `PLAYED` que se desea revertir.

### Tipo

`mutation`

### Entrada

- `movementId: UUID`
- `reason?: string` (opcional, máx. 240 caracteres)

### Validaciones

El backend deberá comprobar:

1. El usuario está autenticado y tiene rol `ADMIN`.
2. El `CardMovement` existe, pertenece a la temporada activa y es de tipo `PLAYED`.
3. Dicho movimiento no ha sido revertido ya por otro `CardMovement` de tipo `RETURNED` (`related_movement_id = movementId`).
4. El mánager propietario de esa jugada tiene actualmente **menos de 3 cartas** en `HAND`. Si la mano está llena, devuelve `CONFLICT` con `error.data.appCode` igual a `HAND_LIMIT_REACHED`.
5. La `CardCopy` original se encuentra en `DECK` (o, si ya fue repartida en un reparto posterior, existe en `DECK` otra `CardCopy` disponible de la misma `CardDefinition`).

### Operación

El sistema ejecutará atómicamente:

1. Seleccionar la `CardCopy` disponible en `DECK` (priorizando la copia original del movimiento).
2. Cambiar `location` a `HAND` y establecer `current_manager_id` al manager de la jugada original.
3. Crear un `CardMovement` de tipo `RETURNED` (`from_location = 'DECK'`, `to_location = 'HAND'`, `related_movement_id = movementId`, `actor_user_id = adminUser.id`, `notes = reason`).
4. Crear una `Notification` de tipo `CARD_RETURNED` dirigida al manager afectado.

### Respuesta

- `card: CardCopy`
- `movement: CardMovement`
- `notification: Notification` (el aviso de la devolución)

---

## 11.3 admin.sendNotice

Envía un aviso administrativo interno a un manager específico o a todos los managers activos de la liga.

### Tipo

`mutation`

### Entrada

- `title: string`
- `message: string`
- `targetManagerId?: UUID` (si se omite, se envía a todos los managers activos)

### Respuesta

- `deliveredCount: number`

---

## 11.4 admin.roster

`query` exclusiva de `ADMIN`, **sin entrada**. Devuelve `{ managers }` con los mánagers de la liga, también los inactivos. Cada elemento contiene `id: UUID`, `displayName: string`, `isActive: boolean` y `handCount: number` (cartas en mano de la temporada activa). El panel usa esta lista para filtrar el historial y elegir destinatarios.

---

# 12. Autorización

### Calendario opcional: router `calendar` (solo `ADMIN`)

| Procedimiento | Entrada | Respuesta y condiciones |
|---|---|---|
| `calendar.list` · query | Ninguna | `{ seasonId, zone, rounds }`; sin temporada activa: ID nulo y lista vacía. Cada jornada incluye `roundNumber`, `firstStart`, `lastStart`, `endAt`, `endKind`, `revision`. Salida temporal en UTC ISO. |
| `calendar.save` · mutation | `{ seasonId, roundNumber, expectedRevision, firstStart, lastStart, endAt, endKind }` | `{ revision }`. Temporada activa de la liga del administrador. Revisión 0 crea; revisión positiva actualiza solo si coincide. Duplicado, temporada ajena/inactiva o revisión obsoleta: `CONFLICT`. |

Entradas temporales en minutos civiles de `Europe/Madrid`; una hora inexistente se rechaza y una repetida exige desfase explícito. Primer inicio ≤ último inicio < fin; `endKind` es `planned` o `actual`, y un fin futuro no puede ser `actual`. No hay importación, precarga ni borrado. [Ruta](../apps/api/src/routers/calendar.ts) y [ventanas por carta](calendario-oficial.md).

La autorización se comprobará siempre en el backend.

## 12.1 Roles

Los roles actuales serán:

- `MANAGER`
- `ADMIN`

## 12.2 MANAGER

Puede:

- Consultar su perfil.
- Consultar su mano.
- Jugar cartas.
- Descartar cartas.
- Consultar su historial.
- Consultar el historial público.
- Consultar la biblioteca.
- Consultar sus notificaciones.

## 12.3 ADMIN

Puede realizar todas las operaciones de `MANAGER` y además:

- Ejecutar repartos.
- Consultar el historial completo.
- Devolver cartas.
- Acceder a las funciones administrativas.

---

# 13. Errores

Los errores de la API serán tipados mediante los códigos de error de tRPC.

Los principales errores funcionales serán:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `BAD_REQUEST`
- `CONFLICT`
- `PRECONDITION_FAILED` (p. ej., sin temporada activa al jugar, ventana cerrada o descarte exigido por Mus)
- `INTERNAL_SERVER_ERROR`

## 13.1 UNAUTHORIZED

El usuario no está autenticado o su sesión ha expirado.

## 13.2 FORBIDDEN

El usuario está autenticado pero no dispone de permisos suficientes.

## 13.3 NOT_FOUND

El recurso solicitado no existe.

## 13.4 BAD_REQUEST

Los datos enviados no cumplen las validaciones necesarias.

## 13.5 CONFLICT

La operación entra en conflicto con el estado actual del sistema.

Ejemplos:

- Intentar jugar una carta que ya no está en la mano.
- Intentar repartir dos veces el mismo reparto.
- Intentar devolver una carta que no puede ser devuelta.

---

# 14. Paginación

Las consultas que puedan devolver un número elevado de registros utilizarán paginación basada en cursor.

El patrón será:

- `limit`
- `cursor`

La respuesta será:

- `items`
- `nextCursor`

El cliente solicitará la siguiente página utilizando el `nextCursor` recibido.

---

# 15. Transacciones

Las operaciones que modifiquen el estado de una carta deberán mantener la actualización de `CardCopy` y la creación de `CardMovement` dentro de la misma operación transaccional.

Por ejemplo, `cards.play` deberá:

1. Actualizar la CardCopy.
2. Crear el CardMovement.
3. Confirmar la operación.

Si una de las operaciones falla, no deberá persistirse un estado parcial.

---

# 16. Mensaje de WhatsApp

`cards.play` devolverá el mensaje preparado para ser copiado al grupo común de WhatsApp.

El backend será responsable de construir el mensaje a partir de:

- Manager que juega la carta.
- Nombre de la carta.
- Apodo de la carta.
- Manager objetivo, si procede.
- Información necesaria definida por la carta.

La API no enviará el mensaje a WhatsApp.

El frontend mostrará el resultado y permitirá copiarlo al portapapeles.

El mensaje es el del movimiento aceptado; copiarlo no lo valida de nuevo. El comisionado comprueba los hechos externos y aplica los ajustes reales.

La API no tendrá ningún estado de validación o aprobación de cartas jugadas.

---

# 17. Consideraciones sobre Biwenger

La API del MVP no dependerá de Biwenger.

No existirán procedimientos específicos de Biwenger en esta versión.

En `cards.play` una ventana local cerrada rechaza la jugada; abierta acredita solo el horario; indeterminada mantiene la confirmación externa. Un fin previsto no prueba la finalización. Los nombres, importes y confirmaciones no autentican plantillas, precios, partidos individuales, minutos ni puntos. No hay escritura de saldos, alineaciones o mercado en Biwenger. Véase la [matriz de responsabilidades](09-card-catalog-and-templates.md).

---

# 18. Historial de cambios

| Versión | Descripción                                                                                                                                                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Primera versión del contrato de API.                                                                                                                                                                                                                                                                                  |
| 1.1     | Se añaden parámetros de objetivo en `cards.play`, estadísticas de perfil en `manager.getProfile`, `manager.listTargets`, búsqueda y copias de temporada en `library.list`, `notifications.markAllAsRead`, `distribution.status`, devolución determinista por `movementId` en `admin.returnCard` y `admin.sendNotice`. |
| 1.2     | Se documentan `isReturned` y el filtro `activeOnly` del historial público, el detalle de carta del reparto personal y la lectura idempotente de avisos. |
| 1.3     | Se precisa el contrato administrativo de plantilla, devolución y reparto semanal según los routers locales de Fase 5. |
| 1.4     | Se distinguen jugada oficial e histórica, consulta dirigida de Espejo, obligación Mus, protecciones y calendario administrativo opcional. |
