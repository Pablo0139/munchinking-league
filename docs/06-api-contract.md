# Contrato de API

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Contrato de API |
| Archivo | `06-api-contract.md` |
| Versión | 1.0 |
| Estado | DRAFT |
| Última actualización | 18/08/2026 |

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

Obtiene la información del manager actual.

### Tipo

`query`

### Entrada

Ninguna.

### Respuesta

- `id: UUID`
- `displayName: string`
- `avatarUrl: string | null`
- `role: string`

---

## 5.2 manager.getHand

Obtiene las cartas actualmente disponibles para el manager.

### Tipo

`query`

### Entrada

Ninguna.

### Respuesta

- `cards: CardCopy[]`

Solo devolverá cartas cuya ubicación actual sea `HAND` y cuyo propietario sea el manager autenticado.

---

# 6. Cards Router

Agrupa las operaciones relacionadas con las cartas del manager.

## 6.1 cards.play

Juega una carta.

### Tipo

`mutation`

### Entrada

- `cardCopyId: UUID`

### Validaciones

El backend deberá comprobar:

1. El usuario está autenticado.
2. La CardCopy existe.
3. La CardCopy pertenece a la temporada activa.
4. La CardCopy pertenece al manager autenticado.
5. La CardCopy se encuentra en `HAND`.

### Operación

La operación realizará atómicamente:

1. Obtener la CardCopy.
2. Validar la propiedad.
3. Cambiar `location` a `DECK`.
4. Establecer `current_manager_id` a `NULL`.
5. Crear un `CardMovement`.
6. Generar el mensaje de WhatsApp.
7. Devolver el resultado.

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

Obtiene las CardDefinition disponibles.

### Tipo

`query`

### Entrada

- `rarity?: string`

### Respuesta

- `cards: CardDefinition[]`

La consulta no devolverá CardCopy.

La Biblioteca representa el catálogo de cartas, no las cartas actualmente disponibles en el mazo.

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

# 10. Distribution Router

Gestiona el reparto semanal de cartas.

El reparto será una operación administrativa.

## 10.1 distribution.execute

Ejecuta el reparto correspondiente a una temporada.

### Tipo

`mutation`

### Entrada

- `seasonId: UUID`

### Validaciones

El backend deberá comprobar:

1. El usuario está autenticado.
2. El usuario tiene permisos de administrador.
3. La Season existe.
4. La Season está activa.
5. El reparto correspondiente todavía no se ha ejecutado.

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

Devuelve una carta jugada a la mano del manager.

Esta operación existe para corregir manualmente una carta que haya sido jugada incorrectamente.

### Tipo

`mutation`

### Entrada

- `cardCopyId: UUID`

### Validaciones

El backend deberá comprobar:

1. El usuario está autenticado.
2. El usuario es administrador.
3. La CardCopy existe.
4. La CardCopy pertenece a la temporada activa.
5. La CardCopy se encuentra actualmente en `DECK`.
6. Existe un manager al que devolver la carta.

### Operación

El sistema:

1. Identificará el manager asociado a la última acción que permita determinar el propietario de la carta.
2. Comprobará que dicho manager puede recibir la carta.
3. Cambiará `location` a `HAND`.
4. Establecerá `current_manager_id`.
5. Creará un CardMovement de tipo `RETURNED`.

### Respuesta

- `card: CardCopy`
- `movement: CardMovement`

La carta volverá inmediatamente a la mano del manager.

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