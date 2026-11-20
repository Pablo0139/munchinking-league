# Modelo de Datos

| Campo                | Valor              |
| -------------------- | ------------------ |
| Proyecto             | Munchinking League |
| Documento            | Modelo de Datos    |
| Archivo              | `05-data-model.md` |
| Versión              | 1.3                |
| Estado               | Ampliación de Fase 5 en local |
| Última actualización | 20/11/2026         |

---

# 1. Introducción

## 1.1 Objetivo

Este documento define el modelo de datos persistente de Munchinking League.

Su finalidad es transformar el modelo de dominio en un conjunto de tablas relacionales preparadas para ser implementadas mediante Cloudflare D1 y Drizzle ORM.

---

## 1.2 Principios

El modelo de datos seguirá los siguientes principios:

- Normalización.
- Integridad referencial.
- Auditoría completa.
- Escalabilidad.
- Simplicidad.

---

# 2. Convenciones

## 2.1 Identificadores

Todas las tablas utilizarán un identificador UUID como clave primaria.

```text
id UUID PRIMARY KEY
```

El identificador nunca cambiará durante la vida del registro.

---

## 2.2 Fechas

Todos los instantes temporales se almacenarán en UTC.

Los campos de auditoría utilizarán la siguiente nomenclatura.

- created_at
- updated_at

Cuando una entidad no pueda modificarse, únicamente dispondrá de `created_at`.

---

## 2.3 Nombres

Las tablas utilizarán nombres en singular.

Ejemplos:

```text
league
season
manager
card_definition
card_copy
card_movement
notification
```

Las columnas utilizarán `snake_case`.

---

# 3. Diagrama general

```text
league
├── season
│   ├── distribution_batch
│   ├── card_copy
│   └── card_movement
├── manager
│   └── notification
├── user
│   └── session
└── card_definition
```

---

# 4. Tablas

## 4.1 league

Representa una liga.

### Campos

| Campo      | Tipo     | Obligatorio |
| ---------- | -------- | ----------- |
| id         | UUID     | Sí          |
| name       | TEXT     | Sí          |
| created_at | DATETIME | Sí          |

---

## Restricciones

- Nombre obligatorio.

---

## Relaciones

- 1:N con Season.
- 1:N con Manager.

---

## 4.2 season

Representa una temporada.

### Campos

| Campo      | Tipo     | Obligatorio |
| ---------- | -------- | ----------- |
| id         | UUID     | Sí          |
| league_id  | UUID     | Sí          |
| name       | TEXT     | Sí          |
| is_active  | BOOLEAN  | Sí          |
| created_at | DATETIME | Sí          |

---

## Restricciones

Solo puede existir una temporada activa por liga.

---

## Relaciones

N:1 con League.

1:N con CardCopy.

---

## 4.3 user

Representa una cuenta autenticada.

### Campos

| Campo         | Tipo                        | Obligatorio |
| ------------- | --------------------------- | ----------- |
| id            | UUID                        | Sí          |
| username      | TEXT                        | Sí          |
| password_hash | TEXT                        | Sí          |
| role          | TEXT (`MANAGER` \| `ADMIN`) | Sí          |
| is_active     | BOOLEAN                     | Sí          |
| created_at    | DATETIME                    | Sí          |
| updated_at    | DATETIME                    | Sí          |

---

## Restricciones

El nombre de usuario deberá ser único (normalizado en minúsculas).

---

## Relaciones

1:1 con Manager.

1:N con Session.

---

## 4.3b session

Almacena sesiones autenticadas activas para permitir revocación inmediata y cookies seguras `HttpOnly`.

### Campos

| Campo      | Tipo     | Obligatorio |
| ---------- | -------- | ----------- |
| id         | UUID     | Sí          |
| user_id    | UUID     | Sí          |
| token_hash | TEXT     | Sí          |
| expires_at | DATETIME | Sí          |
| revoked_at | DATETIME | No          |
| created_at | DATETIME | Sí          |

---

## 4.4 manager

Representa un participante.

### Campos

| Campo        | Tipo     | Obligatorio |
| ------------ | -------- | ----------- |
| id           | UUID     | Sí          |
| user_id      | UUID     | Sí          |
| league_id    | UUID     | Sí          |
| display_name | TEXT     | Sí          |
| team_name    | TEXT     | No          |
| avatar_url   | TEXT     | No          |
| is_active    | BOOLEAN  | Sí          |
| created_at   | DATETIME | Sí          |

---

## Relaciones

N:1 con League.

1:1 con User.

1:N con Notification.

1:N con CardMovement.

---

## 4.5 card_definition

Representa una carta del catálogo.

### Campos

| Campo             | Tipo                                                  | Obligatorio |
| ----------------- | ----------------------------------------------------- | ----------- |
| id                | UUID                                                  | Sí          |
| slug              | TEXT                                                  | Sí          |
| name              | TEXT                                                  | Sí          |
| nickname          | TEXT                                                  | Sí          |
| description       | TEXT                                                  | Sí          |
| usage_rules       | TEXT                                                  | Sí          |
| rarity            | TEXT (`COMMON` \| `RARE` \| `EPIC` \| `LEGENDARY`)    | Sí          |
| target_type       | TEXT (`NONE` \| `MANAGER` \| `PLAYER` \| `FREE_TEXT`) | Sí          |
| default_copies    | INTEGER                                               | Sí          |
| image_url         | TEXT                                                  | Sí          |
| whatsapp_template | TEXT                                                  | Sí          |
| is_enabled        | BOOLEAN                                               | Sí          |
| created_at        | DATETIME                                              | Sí          |

---

## Restricciones

- `slug` único para semillas reproducibles y referencias a assets en R2.
- `default_copies >= 1`.
- Las `CardDefinition` activas en una temporada mantienen inmutable su identidad semántica.

---

## Relaciones

1:N con CardCopy.

## 4.6 card_copy

Representa una copia física de una carta durante una temporada.

Cada registro identifica una única copia de una `CardDefinition`.

### Campos

| Campo              | Tipo     | Obligatorio |
| ------------------ | -------- | ----------- |
| id                 | UUID     | Sí          |
| season_id          | UUID     | Sí          |
| card_definition_id | UUID     | Sí          |
| current_manager_id | UUID     | No          |
| location           | TEXT     | Sí          |
| created_at         | DATETIME | Sí          |

---

### Restricciones

Una CardCopy siempre pertenece a una única Season.

Una CardCopy nunca cambia de identidad.

---

### Relaciones

N:1 con Season.

N:1 con CardDefinition.

N:1 con Manager (opcional).

1:N con CardMovement.

---

### Observaciones

El campo `location` representa el estado actual de la carta.

Valores permitidos:

- DECK
- HAND

Cuando la carta está en la mano de un manager, el campo `current_manager_id` será obligatorio.

Cuando la carta se encuentra en el mazo, `current_manager_id` será NULL.

Los estados **Played** y **Discarded** no se almacenan en esta tabla, ya que representan eventos históricos registrados mediante `CardMovement`.

---

## 4.7 card_movement

Representa un movimiento realizado sobre una CardCopy.

Constituye el registro histórico permanente del sistema.

### Campos

| Campo                 | Tipo                                                          | Obligatorio |
| --------------------- | ------------------------------------------------------------- | ----------- |
| id                    | UUID                                                          | Sí          |
| season_id             | UUID                                                          | Sí          |
| card_copy_id          | UUID                                                          | Sí          |
| manager_id            | UUID                                                          | Sí          |
| actor_user_id         | UUID                                                          | No          |
| movement_type         | TEXT (`DISTRIBUTED` \| `PLAYED` \| `DISCARDED` \| `RETURNED`) | Sí          |
| from_location         | TEXT (`DECK` \| `HAND`)                                       | Sí          |
| to_location           | TEXT (`DECK` \| `HAND`)                                       | Sí          |
| target_manager_id     | UUID                                                          | No          |
| target_label          | TEXT                                                          | No          |
| whatsapp_message      | TEXT                                                          | No          |
| distribution_batch_id | UUID                                                          | No          |
| related_movement_id   | UUID                                                          | No          |
| notes                 | TEXT                                                          | No          |
| created_at            | DATETIME                                                      | Sí          |

---

### Restricciones

- Los hechos históricos nunca podrán eliminarse.
- En movimientos `RETURNED`, `related_movement_id` referencia de forma **UNIQUE** al movimiento `PLAYED` que se revierte, impidiendo devolver dos veces la misma jugada.
- `season_id` permite consultas rápidas y paginación por temporada activa sin necesidad de hacer join previo con `card_copy`.

---

### Relaciones

N:1 con Season.

N:1 con CardCopy.

N:1 con Manager (`manager_id`, y opcionalmente `target_manager_id`).

N:1 con User (`actor_user_id`, para saber si intervino un administrador).

N:1 con DistributionBatch (`distribution_batch_id`, cuando procede de un reparto).

---

### Tipos de movimiento

Los valores permitidos serán:

- `DISTRIBUTED` (`DECK` → `HAND`)
- `PLAYED` (`HAND` → `DECK`)
- `DISCARDED` (`HAND` → `DECK`)
- `RETURNED` (`DECK` → `HAND`)

---

### Observaciones

Cada operación sobre una carta generará exactamente un `CardMovement`.

El historial completo de una carta o temporada podrá reconstruirse ordenando sus movimientos por `(created_at DESC, id DESC)`.

---

## 4.7b distribution_batch

Garantiza la idempotencia y auditoría del reparto semanal de cada lunes.

### Campos

| Campo                   | Tipo                     | Obligatorio |
| ----------------------- | ------------------------ | ----------- |
| id                      | UUID                     | Sí          |
| season_id               | UUID                     | Sí          |
| week_key                | TEXT (`YYYY-Www`)        | Sí          |
| trigger_source          | TEXT (`CRON` \| `ADMIN`) | Sí          |
| triggered_by_user_id    | UUID                     | No          |
| distributed_count       | INTEGER                  | Sí          |
| skipped_full_hand_count | INTEGER                  | Sí          |
| skipped_full_hand_managers | TEXT (JSON)           | No          |
| created_at              | DATETIME                 | Sí          |

`skipped_full_hand_count` cuenta los mánagers excluidos por tener tres cartas en la mano. `skipped_full_hand_managers` guarda sus datos **en el momento del reparto** como una lista de objetos `{ id, displayName }`; no se reconstruye a partir de las manos actuales. `[]` indica que no se excluyó a nadie por mano llena. Los lotes anteriores conservan `NULL`: el recuento existe, pero no se registró la lista.

La [migración 0001](../db/migrations/0001_distribution_full_hand_snapshot.sql) añade la columna sin rellenar los lotes anteriores. La [migración 0002](../db/migrations/0002_allow_multiple_manual_distributions.sql) sustituye la unicidad semanal estricta por un índice único parcial sobre `CRON` para permitir repartos manuales adicionales autorizados por `ADMIN`. Ambas deben aplicarse en cada entorno **antes del nuevo Worker**.

### Restricciones

- Índice único parcial `UNIQUE (season_id, week_key) WHERE trigger_source = 'CRON'` para bloquear cualquier doble ejecución automática en la misma semana.
- Índice `idx_distribution_season_week_created (season_id, week_key, created_at)` para consultar con rapidez el último lote y el recuento semanal.

---

## 4.8 notification

Representa una notificación dirigida a un manager.

### Campos

| Campo               | Tipo                                                           | Obligatorio |
| ------------------- | -------------------------------------------------------------- | ----------- |
| id                  | UUID                                                           | Sí          |
| manager_id          | UUID                                                           | Sí          |
| notification_type   | TEXT (`CARD_DISTRIBUTED` \| `CARD_RETURNED` \| `ADMIN_NOTICE`) | Sí          |
| title               | TEXT                                                           | Sí          |
| message             | TEXT                                                           | Sí          |
| related_movement_id | UUID                                                           | No          |
| is_read             | BOOLEAN                                                        | Sí          |
| read_at             | DATETIME                                                       | No          |
| created_at          | DATETIME                                                       | Sí          |

---

### Relaciones

N:1 con Manager.

---

### Restricciones

Una notificación siempre pertenece a un único manager.

El campo `is_read` indicará si la notificación ya ha sido consultada.

---

# 5. Claves foráneas e índices críticos

| Tabla              | Columna               | Referencia            |
| ------------------ | --------------------- | --------------------- |
| season             | league_id             | league.id             |
| session            | user_id               | user.id               |
| manager            | user_id               | user.id               |
| manager            | league_id             | league.id             |
| distribution_batch | season_id             | season.id             |
| distribution_batch | triggered_by_user_id  | user.id               |
| card_copy          | season_id             | season.id             |
| card_copy          | card_definition_id    | card_definition.id    |
| card_copy          | current_manager_id    | manager.id            |
| card_movement      | season_id             | season.id             |
| card_movement      | card_copy_id          | card_copy.id          |
| card_movement      | manager_id            | manager.id            |
| card_movement      | actor_user_id         | user.id               |
| card_movement      | target_manager_id     | manager.id            |
| card_movement      | distribution_batch_id | distribution_batch.id |
| card_movement      | related_movement_id   | card_movement.id      |
| notification       | manager_id            | manager.id            |
| notification       | related_movement_id   | card_movement.id      |

Restricciones SQL / SQLite (D1) obligatorias en las migraciones Drizzle:

- Índice único parcial para temporada activa: `CREATE UNIQUE INDEX idx_season_single_active ON season(league_id) WHERE is_active = 1;`
- Índice único de reparto semanal: `CREATE UNIQUE INDEX idx_distribution_season_week ON distribution_batch(season_id, week_key);`
- Índice único de devolución única por jugada: `CREATE UNIQUE INDEX idx_movement_unique_return ON card_movement(related_movement_id) WHERE movement_type = 'RETURNED' AND related_movement_id IS NOT NULL;`
- Restricción `CHECK` en `card_copy`: `(location = 'DECK' AND current_manager_id IS NULL) OR (location = 'HAND' AND current_manager_id IS NOT NULL)`.

---

# 6. Índices

Se crearán índices para optimizar las consultas más frecuentes.

## league

- name

---

## season

- league_id
- is_active

---

## user

- username (UNIQUE)

---

## manager

- league_id
- user_id (UNIQUE)

---

## card_definition

- name
- rarity

---

## card_copy

- season_id
- current_manager_id
- location

---

## card_movement

- card_copy_id
- manager_id
- movement_type
- created_at

---

## notification

- manager_id
- is_read
- created_at

7. Restricciones de integridad

Las siguientes restricciones deberán garantizar que los datos persistidos sean coherentes con las reglas del dominio.

7.1 Season activa

Una League solo podrá tener una Season con is_active = true.

Esta regla se garantizará desde la capa de aplicación y deberá reforzarse mediante una estrategia compatible con las capacidades de Cloudflare D1.

⸻

7.2 CardCopy en mano

Cuando una CardCopy tenga:

location = HAND

deberá existir un current_manager_id.

Cuando:

location = DECK

current_manager_id deberá ser NULL.

⸻

7.3 Límite de mano

Un Manager no podrá tener más de tres CardCopy simultáneamente en estado:

location = HAND

Esta validación se realizará dentro del caso de uso de reparto y devolución.

⸻

7.4 Movimiento válido

Cada CardMovement deberá contener:

- CardCopy.
- Tipo de movimiento.
- Ubicación de origen.
- Ubicación de destino.
- Fecha y hora.

⸻

7.5 Coherencia de movimientos

Los movimientos deberán representar únicamente transiciones válidas.

Tipo From To
DISTRIBUTED DECK HAND
PLAYED HAND DECK
DISCARDED HAND DECK
RETURNED DECK HAND

⸻

7.6 Manager y League

Un Manager solo podrá recibir CardCopy pertenecientes a una Season de la misma League a la que pertenece.

⸻

7.7 Temporada

Una CardCopy solo podrá pertenecer a una Season.

Una CardCopy no podrá cambiar de Season.

⸻

8. Reglas de borrado

El sistema evitará los borrados en cascada sobre información histórica.

Especialmente:

- No se eliminarán CardMovement.
- No se eliminarán temporadas con movimientos registrados.
- No se eliminarán CardCopy que tengan historial.

Cuando una entidad deje de estar activa, se utilizará el estado correspondiente en lugar de eliminar físicamente información histórica.

⸻

9. Consultas principales

El modelo deberá optimizar las siguientes operaciones.

9.1 Obtener mano

Buscar todas las CardCopy de la Season activa cuyo:

location = HAND

y:

current_manager_id = manager.id

⸻

9.2 Obtener cartas del mazo

Buscar todas las CardCopy de la Season activa cuyo:

location = DECK

⸻

9.3 Obtener historial público

Buscar CardMovement de tipo:

PLAYED

ordenados por created_at DESC.

⸻

9.4 Obtener historial personal

Buscar CardMovement asociados a un Manager.

Se podrán filtrar por:

- Tipo de movimiento.
- Carta.
- Fecha.

⸻

9.5 Obtener historial administrativo

El administrador podrá consultar todos los tipos de movimiento:

- DISTRIBUTED.
- PLAYED.
- DISCARDED.
- RETURNED.

⸻

9.6 Obtener notificaciones

Buscar las Notification de un Manager ordenadas por:

created_at DESC

Las no leídas podrán filtrarse mediante:

is_read = false

⸻

10. Transacciones

Las operaciones que modifiquen simultáneamente una CardCopy y su historial deberán ejecutarse dentro de una misma transacción lógica.

Por ejemplo, al jugar una carta:

1. Verificar que la carta pertenece al Manager.
2. Cambiar CardCopy a DECK.
3. Eliminar current_manager_id.
4. Crear CardMovement.
5. Confirmar operación.

Si cualquiera de los pasos falla, la operación completa deberá considerarse fallida.

⸻

11. Creación inicial del mazo

Al crear una Season se generarán las CardCopy correspondientes a las cartas configuradas para esa temporada.

Por ejemplo:

CardDefinition:
Presi-Culo
copies = 3
Season:
2026
Resultado:
CardCopy A → Presi-Culo
CardCopy B → Presi-Culo
CardCopy C → Presi-Culo

Cada copia tendrá un UUID diferente.

Todas comenzarán en:

location = DECK
current_manager_id = NULL

⸻

12. Drizzle ORM

El esquema de persistencia será implementado mediante Drizzle ORM.

Los tipos TypeScript se derivarán del esquema de Drizzle siempre que sea posible.

Los identificadores utilizarán UUID.

Los valores de rarity, location, movement_type y role se almacenarán como TEXT.

La validación de sus valores permitidos se realizará en la capa de dominio o aplicación.

No se utilizarán enums de base de datos para estos campos.

⸻

13. Esquema conceptual

┌─────────────────┐
│ league │
├─────────────────┤
│ id │
│ name │
│ created_at │
└────────┬────────┘
│
├──────────────────┐
│ │
▼ ▼
┌─────────────────┐ ┌─────────────────┐
│ season │ │ manager │
├─────────────────┤ ├─────────────────┤
│ id │ │ id │
│ league_id │ │ user_id │
│ name │ │ league_id │
│ is_active │ │ display_name │
│ created_at │ │ avatar_url │
└────────┬────────┘ └────────┬────────┘
│ │
│ │
▼ │
┌─────────────────┐ │
│ card_copy │◄──────────┘
├─────────────────┤
│ id │
│ season_id │
│ card_definition │
│ current_manager │
│ location │
│ created_at │
└────────┬────────┘
│
▼
┌─────────────────┐
│ card_movement │
├─────────────────┤
│ id │
│ card_copy_id │
│ manager_id │
│ movement_type │
│ from_location │
│ to_location │
│ created_at │
└─────────────────┘
┌─────────────────┐
│ card_definition │
├─────────────────┤
│ id │
│ name │
│ nickname │
│ description │
│ rarity │
│ image_url │
│ whatsapp_tpl │
│ created_at │
└─────────────────┘
┌─────────────────┐
│ user │
├─────────────────┤
│ id │
│ username │
│ password_hash │
│ role │
│ created_at │
└─────────────────┘
┌─────────────────┐
│ notification │
├─────────────────┤
│ id │
│ manager_id │
│ title │
│ message │
│ is_read │
│ created_at │
└─────────────────┘

⸻

14. Historial de cambios

Versión Descripción
1.0 Primera versión del modelo de datos.
1.1 Se añaden from_location y to_location a card_movement para mantener explícitas las transiciones de las cartas.
1.2 Se completan tablas `session` y `distribution_batch`, columnas de objetivo/WhatsApp/reversión en `card_movement`, atributos completos de `card_definition` (`slug`, `usage_rules`, `target_type`, `default_copies`) y restricciones `CHECK` / índices únicos parciales para SQLite D1.
1.3 Se documenta el snapshot de manos llenas del reparto semanal.
