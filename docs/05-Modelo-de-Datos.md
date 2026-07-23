# Modelo de Datos

**Proyecto:** Munchinking League

**Documento:** Modelo de Datos

**Versión:** 1.0

---

# 1. Objetivo

Este documento define la estructura de datos utilizada por la aplicación.

La base de datos almacenará el estado completo de la liga, las cartas y todas las acciones realizadas por los managers.

Se utilizará Cloudflare D1 (SQLite).

---

# 2. Diagrama de entidades

Liga
│
├── Managers
│
├── Cartas
│
├── Inventario
│
├── Acciones
│
├── Notificaciones
│
└── Configuración

---

# 3. Tabla: users

Representa a los usuarios de la aplicación.

| Campo | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | Identificador |
| username | TEXT | Nombre de usuario |
| password_hash | TEXT | Contraseña cifrada |
| display_name | TEXT | Nombre visible |
| avatar | TEXT | Imagen de perfil |
| role | TEXT | manager / admin |
| created_at | DATETIME | Fecha de creación |
| updated_at | DATETIME | Última modificación |

---

# 4. Tabla: cards

Catálogo maestro de cartas.

Una fila por tipo de carta.

| Campo | Tipo |
|---------|------|
| id | UUID |
| name | TEXT |
| nickname | TEXT |
| description | TEXT |
| rules | TEXT |
| image | TEXT |
| rarity | TEXT |
| copies | INTEGER |
| target_type | TEXT |
| whatsapp_template | TEXT |
| enabled | BOOLEAN |

---

## target_type

Valores posibles:

- none
- manager
- player

---

# 5. Tabla: user_cards

Representa las cartas que posee o ha poseído un manager.

| Campo | Tipo |
|---------|------|
| id | UUID |
| user_id | UUID |
| card_id | UUID |
| obtained_at | DATETIME |
| played_at | DATETIME |
| discarded_at | DATETIME |
| returned_at | DATETIME |
| validated_at | DATETIME |
| state | TEXT |

---

## state

Valores:

- hand
- played
- discarded
- returned
- validated

---

# 6. Tabla: actions

Representa cada acción realizada.

| Campo | Tipo |
|---------|------|
| id | INTEGER AUTOINCREMENT |
| user_card_id | UUID |
| user_id | UUID |
| action_type | TEXT |
| target_manager | TEXT |
| target_player | TEXT |
| whatsapp_message | TEXT |
| status | TEXT |
| created_at | DATETIME |

---

## action_type

- play
- discard
- return
- validate

---

## status

- executed
- returned
- validated

---

# 7. Tabla: notifications

Notificaciones personales.

| Campo | Tipo |
|---------|------|
| id | UUID |
| user_id | UUID |
| title | TEXT |
| body | TEXT |
| type | TEXT |
| read | BOOLEAN |
| created_at | DATETIME |

---

# 8. Tabla: settings

Configuración global.

| Campo | Tipo |
|---------|------|
| key | TEXT |
| value | TEXT |

---

# 9. Relaciones

users

↓

user_cards

↓

cards

---------------

users

↓

actions

---------------

users

↓

notifications

---

# 10. Índices

users.username

user_cards.user_id

actions.user_id

actions.created_at

notifications.user_id

---

# 11. Historial público

El historial público se construirá a partir de la tabla actions.

Filtros:

- action_type = play

No se mostrarán:

- discard
- return
- validate

---

# 12. Historial personal

Se construirá utilizando:

user_cards

+

actions

Mostrará todas las acciones del manager.

---

# 13. Historial de administración

Mostrará todas las acciones.

Sin filtros.

Permitirá:

- Validar

- Devolver

---

# 14. Reparto semanal

Cuando un usuario reciba una carta:

1. Se insertará una nueva fila en user_cards.

2. Se insertará una notificación.

No se creará ninguna acción.

---

# 15. Eliminaciones

No se eliminará ninguna acción.

No se eliminarán cartas del historial.

Toda la información será permanente.

---

# 16. Auditoría

Cada modificación importante deberá quedar registrada.

La aplicación nunca perderá el historial de una temporada.