# Contrato de API

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Contrato de API |
| Archivo | `06-api-contract.md` |
| Versión | 1.1 |
| Estado | APPROVED |
| Última actualización | 17/11/2026 |

---

# 1. Introducción

## 1.1 Objetivo

Este documento define el contrato de comunicación entre el frontend y el backend de Munchinking League.

La API se implementará mediante **tRPC**, por lo que los procedimientos estarán completamente tipados.

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

La estructura será:

- `auth`
- `manager`
- `cards`
- `history`
- `notifications`
- `distribution`
- `library`
- `admin`

El router principal será `appRouter`.

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
- `stats: { handCount: number; playedCount: number; discardedCount: number; returnedCount: number }`

---

## 5.2 manager.getHand

Obtiene las cartas actualmente disponibles para el manager, enriquecidas con su `CardDefinition`.

### Tipo

`query`

### Entrada

Ninguna.

### Respuesta

- `cards: HandCardDto[]` (incluye `cardCopyId`, `obtainedAt`, `definition: CardDefinitionDto`)

Solo devolverá cartas de la temporada activa cuya ubicación actual sea `HAND` y cuyo propietario sea el manager autenticado.

---

## 5.3 manager.listTargets

Obtiene la lista de managers activos de la liga para poblar el selector cuando se juega una carta con `targetType = 'MANAGER'`.

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

- `cardCopyId: UUID`
- `targetManagerId?: UUID` (obligatorio si `definition.targetType === 'MANAGER'`)
- `targetLabel?: string` (obligatorio si `definition.targetType === 'PLAYER' | 'FREE_TEXT'`, máx. 120 caracteres)
- `notes?: string` (opcional, máx. 240 caracteres)

### Validaciones

El backend deberá comprobar:

1. El usuario está autenticado.
2. La CardCopy existe.
3. La CardCopy pertenece a la temporada activa.
4. La CardCopy pertenece al manager autenticado.
5. La CardCopy se encuentra en `HAND`.
6. Los campos de objetivo coinciden exactamente con el `targetType` exigido por la `CardDefinition` (y `targetManagerId` pertenece a la misma `League`).

### Operación

La operación realizará atómicamente mediante `db.batch` con condición optimista:

1. Obtener la CardCopy y su CardDefinition.
2. Validar propiedad y requisitos de objetivo.
3. Renderizar el mensaje oficial de WhatsApp a partir de `whatsapp_template`.
4. Cambiar `location` a `DECK` y establecer `current_manager_id` a `NULL` (`WHERE id = cardCopyId AND location = 'HAND' AND current_manager_id = managerId`).
5. Crear un `CardMovement` (`PLAYED`, `from_location = 'HAND'`, `to_location = 'DECK'`) almacenando `target_manager_id`, `target_label` y `whatsapp_message`.
6. Devolver el resultado.

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

Las mismas que para `cards.play`.

### Operación

La operación realizará:

1. Validar la propiedad.
2. Cambiar `location` a `DECK`.
3. Establecer `current_manager_id` a `NULL`.
4. Crear un `CardMovement`.

### Respuesta

- `card: CardCopy`
- `movement: CardMovement`

La carta vuelve inmediatamente al mazo.

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

### Respuesta

- `items: HistoryItem[]`
- `nextCursor: string | null`

Solo incluirá movimientos de tipo `PLAYED`.

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

- `items: Notification[]`
- `nextCursor: string | null`

Las notificaciones se devolverán ordenadas de más reciente a más antigua.

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

El contador visual tendrá un máximo de `+9`.

---

## 9.3 notifications.markAsRead

Marca una notificación como leída.

### Tipo

`mutation`

### Entrada

- `notificationId: UUID`

### Respuesta

- `notification: Notification`

El backend deberá verificar que la notificación pertenece al manager autenticado.

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

Consulta el estado del reparto de la semana ISO actual sobre la temporada activa.

### Tipo

`query`

### Entrada

- `weekKey?: string` (por defecto la semana ISO actual en `Europe/Madrid`)

### Respuesta

- `seasonId: UUID`
- `weekKey: string`
- `alreadyExecuted: boolean`
- `batch: DistributionBatch | null`
- `availableDeckCopies: number`
- `eligibleManagersCount: number`

---

## 10.2 distribution.execute

Ejecuta manualmente el reparto correspondiente a la semana activa de una temporada.

### Tipo

`mutation`

### Entrada

- `seasonId?: UUID` (si se omite, toma la temporada activa)
- `weekKey?: string` (si se omite, calcula la semana ISO actual en `Europe/Madrid`)

### Validaciones

El backend deberá comprobar:

1. El usuario está autenticado.
2. El usuario tiene permisos de administrador (`ADMIN`).
3. La Season existe y está activa.
4. No existe un `DistributionBatch` previo para `(seasonId, weekKey)` (en caso contrario devuelve `CONFLICT`).

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
4. El manager propietario de esa jugada tiene actualmente **menos de 3 cartas** en `HAND` (en caso contrario devuelve `CONFLICT` con código de aplicación `HAND_LIMIT_REACHED`).
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

# 12. Autorización

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

La validación de si la carta se ha jugado correctamente se realizará externamente mediante WhatsApp.

La API no tendrá ningún estado de validación o aprobación de cartas jugadas.

---

# 17. Consideraciones sobre Biwenger

La API del MVP no dependerá de Biwenger.

No existirán procedimientos específicos de Biwenger en esta versión.

La aplicación no utilizará el calendario de partidos para determinar si una carta puede jugarse.

La validación de las condiciones particulares de cada carta se realizará externamente durante el MVP.

Una futura integración con Biwenger podrá añadirse sin modificar el contrato básico de las operaciones de cartas.

---

# 18. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Primera versión del contrato de API. |
| 1.1 | Se añaden parámetros de objetivo en `cards.play`, estadísticas de perfil en `manager.getProfile`, `manager.listTargets`, búsqueda y copias de temporada en `library.list`, `notifications.markAllAsRead`, `distribution.status`, devolución determinista por `movementId` en `admin.returnCard` y `admin.sendNotice`. |