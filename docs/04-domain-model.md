# Modelo de Dominio

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Modelo de Dominio |
| Archivo | `04-domain-model.md` |
| Versión | 1.0 |
| Estado | DRAFT |
| Última actualización | 24/07/2026 |

---

# 1. Introducción

## 1.1 Objetivo

Este documento define el modelo de dominio de Munchinking League.

El dominio representa el conjunto de entidades y reglas que describen el funcionamiento del juego, independientemente de cualquier decisión tecnológica.

El modelo de dominio constituye la base para el diseño del modelo de datos y la implementación de los casos de uso.

---

## 1.2 Principios

El dominio seguirá los siguientes principios:

- Independiente de la tecnología.
- Centrado en el negocio.
- Fácilmente extensible.
- Completamente auditable.
- Basado en entidades con identidad propia.

---

# 2. Visión general

El dominio está compuesto por ocho entidades principales.

```text
League
│
├── Season
│
├── User
│
├── Manager
│
├── CardDefinition
│
├── CardCopy
│
├── CardMovement
│
└── Notification
```

Cada entidad posee una responsabilidad claramente definida.

---

# 3. Agregados

El dominio se organiza en los siguientes agregados.

```text
League
│
├── Season
│
│   ├── CardCopy
│   ├── CardMovement
│   └── Notification
│
├── Manager
│
└── CardDefinition
```

La raíz principal del dominio es `League`.

Todas las operaciones funcionales ocurren dentro de una única liga.

---

# 4. Entidades

## 4.1 League

Representa una liga de Munchinking League.

Es la entidad raíz del dominio.

### Responsabilidades

- Gestionar managers.
- Gestionar temporadas.
- Mantener la configuración general.

### Relaciones

- Contiene múltiples Seasons.
- Contiene múltiples Managers.

---

## 4.2 Season

Representa una temporada de juego.

Todas las cartas y movimientos pertenecen a una única Season.

### Responsabilidades

- Mantener el mazo.
- Gestionar los repartos.
- Registrar el historial.
- Controlar el estado de la temporada.

### Reglas

- Solo puede existir una Season activa por League.
- Las temporadas históricas son inmutables.

---

## 4.3 User

Representa una persona autenticada.

Su única responsabilidad es el acceso al sistema.

### Responsabilidades

- Autenticación.
- Gestión de sesión.
- Preferencias del usuario.

El User no participa directamente en el juego.

---

## 4.4 Manager

Representa un participante de la liga.

Es el propietario temporal de las cartas repartidas.

### Responsabilidades

- Mantener su mano.
- Jugar cartas.
- Descartar cartas.
- Consultar el historial.
- Recibir notificaciones.

### Reglas

Un Manager siempre pertenece a una única League.

---

## 4.5 CardDefinition

Describe una carta.

No representa una carta física.

### Contenido

- Nombre.
- Apodo.
- Rareza.
- Descripción.
- Imagen.
- Plantilla del mensaje de WhatsApp.

Las CardDefinition son compartidas por todas las temporadas.

Nunca contienen estado.

---

## 4.6 CardCopy

Representa una copia física de una CardDefinition durante una Season.

Es la entidad central del juego.

Cada CardCopy posee identidad propia.

### Responsabilidades

- Conocer su ubicación actual.
- Mantener su historial.
- Participar en repartos.
- Poder ser jugada múltiples veces durante la temporada.

### Reglas

Una CardCopy pertenece siempre a una única Season.

Una CardCopy nunca cambia de identidad.

---

## 4.7 CardMovement

Representa un hecho ocurrido sobre una CardCopy.

Todo cambio en una carta genera exactamente un CardMovement.

### Responsabilidades

- Registrar el tipo de movimiento.
- Registrar el momento del movimiento.
- Registrar el manager implicado.
- Permitir reconstruir el historial completo.

### Reglas

Los CardMovement son inmutables.

Nunca podrán modificarse.

Nunca podrán eliminarse.

---

## 4.8 Notification

Representa un aviso dirigido a un Manager.

### Responsabilidades

- Informar de eventos.
- Mantener el estado de lectura.
- Mostrar el contador de notificaciones.

Cada Notification pertenece únicamente a un Manager.
# 5. Relaciones entre entidades

Las entidades del dominio mantienen las siguientes relaciones.

---

## 5.1 League → Season

Una League puede contener múltiples temporadas.

Cada Season pertenece únicamente a una League.

Cardinalidad:

```text
League

1 ──────────── N Season
```

---

## 5.2 League → Manager

Una League contiene todos los managers participantes.

Cardinalidad:

```text
League

1 ──────────── N Manager
```

---

## 5.3 User → Manager

Un User representa una persona autenticada.

Cada Manager está asociado a un único User.

Cardinalidad actual:

```text
User

1 ──────────── 1 Manager
```

La arquitectura permite ampliar esta relación en futuras versiones si fuese necesario.

---

## 5.4 Season → CardCopy

Cada Season crea su propio conjunto de cartas físicas.

Las CardCopy nunca se comparten entre temporadas.

Cardinalidad:

```text
Season

1 ──────────── N CardCopy
```

---

## 5.5 CardDefinition → CardCopy

Una CardDefinition puede tener varias copias físicas.

Cada CardCopy representa exactamente una definición.

Cardinalidad:

```text
CardDefinition

1 ──────────── N CardCopy
```

---

## 5.6 CardCopy → CardMovement

Una carta puede generar múltiples movimientos durante la temporada.

Cada movimiento pertenece únicamente a una carta.

Cardinalidad:

```text
CardCopy

1 ──────────── N CardMovement
```

---

## 5.7 Manager → Notification

Cada manager posee sus propias notificaciones.

Cardinalidad:

```text
Manager

1 ──────────── N Notification
```

---

# 6. Conceptos lógicos

Existen varios conceptos utilizados por el juego que no constituyen entidades persistentes.

---

## 6.1 Deck

El Deck representa el conjunto de todas las CardCopy disponibles para ser repartidas.

No posee identidad.

No se almacena como una entidad independiente.

Una carta pertenece al Deck cuando su ubicación actual es **Deck**.

---

## 6.2 Hand

La Hand representa el conjunto de cartas actualmente disponibles para un Manager.

No posee identidad propia.

Se obtiene consultando todas las CardCopy cuya ubicación actual pertenece al Manager.

---

## 6.3 CardCatalog

El CardCatalog representa la colección de todas las CardDefinition existentes.

Es un concepto lógico utilizado por la pantalla Biblioteca.

No mantiene estado.

---

# 7. Ciclo de vida de una carta

Durante una temporada una CardCopy podrá recorrer el siguiente ciclo.

```text
              +----------------+
              |                |
              |     Deck       |
              |                |
              +-------+--------+
                      |
                Reparto semanal
                      |
                      ▼
              +----------------+
              |                |
              |      Hand      |
              |                |
              +----+-------+---+
                   |       |
            Jugar  |       | Descartar
                   |       |
                   ▼       ▼
           +-----------+  +--------------+
           |  Played   |  | Discarded    |
           +-----+-----+  +------+-------+
                 |               |
                 |               |
                 +-------+-------+
                         |
                         ▼
                     +-------+
                     | Deck  |
                     +-------+
```

En cualquier momento un administrador podrá devolver una carta previamente jugada.

```text
Played

↓

Hand
```

Cada transición genera un nuevo CardMovement.

---

# 8. Invariantes del dominio

Las siguientes reglas deberán cumplirse siempre.

---

## 8.1 Temporada activa

Solo puede existir una Season activa por League.

---

## 8.2 Mano

Un Manager nunca podrá tener más de tres cartas.

---

## 8.3 Identidad

Una CardCopy nunca cambia de identidad.

---

## 8.4 Historial

Todo cambio sobre una CardCopy genera un CardMovement.

---

## 8.5 Auditoría

Los CardMovement nunca podrán eliminarse.

---

## 8.6 Propiedad

Una CardCopy solo puede encontrarse en una ubicación lógica al mismo tiempo.

---

## 8.7 Persistencia

Las CardDefinition nunca almacenan estado.

Todo el estado pertenece a las CardCopy.

---

# 9. Servicios del dominio

Las operaciones complejas del dominio serán implementadas mediante servicios.

Los servicios no representan entidades.

Su responsabilidad es coordinar varias entidades para ejecutar un caso de uso.

Los principales servicios previstos son:

- CardDistributionService
- CardPlayService
- CardDiscardService
- CardReturnService
- NotificationService

Todos ellos actuarán respetando las reglas definidas por las entidades del dominio.

---

# 10. Eventos del dominio

El dominio genera eventos que representan hechos relevantes.

Estos eventos podrán utilizarse para generar notificaciones, auditoría o integraciones futuras.

Los principales eventos son:

- CardDistributed
- CardPlayed
- CardDiscarded
- CardReturned
- NotificationCreated

Los eventos no sustituyen a CardMovement.

CardMovement constituye el registro histórico permanente.

Los eventos representan acciones ocurridas en el dominio.

---

# 11. Diagrama general del dominio

```text
                               League
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
         Season               Manager              CardDefinition
             │                    │                    │
             │                    │                    │
             ▼                    │                    ▼
         CardCopy ────────────────┘                (define)
             │
             │
             ▼
      CardMovement
             │
             ▼
      Notification
```

Este diagrama representa las relaciones principales del dominio y servirá como referencia para el diseño del modelo de datos.

---

# 12. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Primera versión del modelo de dominio de Munchinking League. |