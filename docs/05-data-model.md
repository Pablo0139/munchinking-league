# Modelo de Datos

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Modelo de Datos |
| Archivo | `05-data-model.md` |
| Versión | 1.0 |
| Estado | DRAFT |
| Última actualización | 24/07/2026 |

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

│

├── season

│

├── manager

│

├── user

│

├── card_definition

│

├── card_copy

│

├── card_movement

│

└── notification
```

---

# 4. Tablas

## 4.1 league

Representa una liga.

### Campos

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| id | UUID | Sí |
| name | TEXT | Sí |
| created_at | DATETIME | Sí |

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

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| id | UUID | Sí |
| league_id | UUID | Sí |
| name | TEXT | Sí |
| is_active | BOOLEAN | Sí |
| created_at | DATETIME | Sí |

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

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| id | UUID | Sí |
| username | TEXT | Sí |
| password_hash | TEXT | Sí |
| role | TEXT | Sí |
| created_at | DATETIME | Sí |

---

## Restricciones

El nombre de usuario deberá ser único.

---

## Relaciones

1:1 con Manager.

---

## 4.4 manager

Representa un participante.

### Campos

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| id | UUID | Sí |
| user_id | UUID | Sí |
| league_id | UUID | Sí |
| display_name | TEXT | Sí |
| avatar_url | TEXT | No |
| created_at | DATETIME | Sí |

---

## Relaciones

N:1 con League.

1:1 con User.

1:N con Notification.

1:N con CardMovement.

---

## 4.5 card_definition

Representa una carta.

### Campos

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| id | UUID | Sí |
| name | TEXT | Sí |
| nickname | TEXT | Sí |
| description | TEXT | Sí |
| rarity | TEXT | Sí |
| image_url | TEXT | Sí |
| whatsapp_template | TEXT | Sí |
| created_at | DATETIME | Sí |

---

## Restricciones

Las CardDefinition son inmutables durante una temporada.

---

## Relaciones

1:N con CardCopy.
## 4.6 card_copy

Representa una copia física de una carta durante una temporada.

Cada registro identifica una única copia de una `CardDefinition`.

### Campos

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| id | UUID | Sí |
| season_id | UUID | Sí |
| card_definition_id | UUID | Sí |
| current_manager_id | UUID | No |
| location | TEXT | Sí |
| created_at | DATETIME | Sí |

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

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| id | UUID | Sí |
| card_copy_id | UUID | Sí |
| manager_id | UUID | No |
| movement_type | TEXT | Sí |
| created_at | DATETIME | Sí |

---

### Restricciones

Los movimientos nunca podrán modificarse.

Los movimientos nunca podrán eliminarse.

---

### Relaciones

N:1 con CardCopy.

N:1 con Manager.

---

### Tipos de movimiento

Los valores permitidos serán:

- DISTRIBUTED
- PLAYED
- DISCARDED
- RETURNED

---

### Observaciones

Cada operación sobre una carta generará exactamente un CardMovement.

El historial completo de una carta podrá reconstruirse ordenando sus movimientos por `created_at`.

---

## 4.8 notification

Representa una notificación dirigida a un manager.

### Campos

| Campo | Tipo | Obligatorio |
|--------|------|-------------|
| id | UUID | Sí |
| manager_id | UUID | Sí |
| title | TEXT | Sí |
| message | TEXT | Sí |
| is_read | BOOLEAN | Sí |
| created_at | DATETIME | Sí |

---

### Relaciones

N:1 con Manager.

---

### Restricciones

Una notificación siempre pertenece a un único manager.

El campo `is_read` indicará si la notificación ya ha sido consultada.

---

# 5. Claves foráneas

| Tabla | Columna | Referencia |
|--------|---------|------------|
| season | league_id | league.id |
| manager | user_id | user.id |
| manager | league_id | league.id |
| card_copy | season_id | season.id |
| card_copy | card_definition_id | card_definition.id |
| card_copy | current_manager_id | manager.id |
| card_movement | card_copy_id | card_copy.id |
| card_movement | manager_id | manager.id |
| notification | manager_id | manager.id |

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

* CardCopy.
* Tipo de movimiento.
* Ubicación de origen.
* Ubicación de destino.
* Fecha y hora.

⸻

7.5 Coherencia de movimientos

Los movimientos deberán representar únicamente transiciones válidas.

Tipo	From	To
DISTRIBUTED	DECK	HAND
PLAYED	HAND	DECK
DISCARDED	HAND	DECK
RETURNED	DECK	HAND

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

* No se eliminarán CardMovement.
* No se eliminarán temporadas con movimientos registrados.
* No se eliminarán CardCopy que tengan historial.

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

* Tipo de movimiento.
* Carta.
* Fecha.

⸻

9.5 Obtener historial administrativo

El administrador podrá consultar todos los tipos de movimiento:

* DISTRIBUTED.
* PLAYED.
* DISCARDED.
* RETURNED.

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
│     league      │
├─────────────────┤
│ id              │
│ name            │
│ created_at      │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│     season      │  │     manager     │
├─────────────────┤  ├─────────────────┤
│ id              │  │ id              │
│ league_id       │  │ user_id         │
│ name            │  │ league_id       │
│ is_active       │  │ display_name    │
│ created_at      │  │ avatar_url      │
└────────┬────────┘  └────────┬────────┘
         │                    │
         │                    │
         ▼                    │
┌─────────────────┐           │
│    card_copy    │◄──────────┘
├─────────────────┤
│ id              │
│ season_id       │
│ card_definition │
│ current_manager │
│ location        │
│ created_at      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  card_movement  │
├─────────────────┤
│ id              │
│ card_copy_id    │
│ manager_id      │
│ movement_type   │
│ from_location   │
│ to_location     │
│ created_at      │
└─────────────────┘
┌─────────────────┐
│ card_definition │
├─────────────────┤
│ id              │
│ name            │
│ nickname        │
│ description     │
│ rarity          │
│ image_url       │
│ whatsapp_tpl    │
│ created_at      │
└─────────────────┘
┌─────────────────┐
│      user       │
├─────────────────┤
│ id              │
│ username        │
│ password_hash   │
│ role            │
│ created_at      │
└─────────────────┘
┌─────────────────┐
│  notification   │
├─────────────────┤
│ id              │
│ manager_id      │
│ title           │
│ message         │
│ is_read         │
│ created_at      │
└─────────────────┘

⸻

14. Historial de cambios

Versión	Descripción
1.0	Primera versión del modelo de datos.
1.1	Se añaden from_location y to_location a card_movement para mantener explícitas las transiciones de las cartas.