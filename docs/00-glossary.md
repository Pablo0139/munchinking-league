# Glosario

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Glosario |
| Archivo | `00-glossary.md` |
| Versión | 1.0 |
| Estado | FROZEN |
| Última actualización | 23/07/2026 |

---

# 1. Objetivo

Este documento define el lenguaje ubicuo (Ubiquitous Language) utilizado en Munchinking League.

Todos los documentos del proyecto, el código fuente y el modelo de datos deberán utilizar estos términos de forma consistente.

La interfaz de usuario podrá mostrar nombres diferentes en español cuando resulte más natural para los managers.

---

# 2. Convenciones

## Idioma

- La documentación funcional utilizará español.
- El código fuente utilizará inglés.
- Los nombres de las entidades del dominio estarán en inglés.
- Los textos visibles para el usuario estarán en español.

---

## Singular

Todas las entidades del dominio se nombrarán en singular.

Ejemplos:

- `League`
- `Season`
- `Manager`
- `CardDefinition`

No se utilizarán nombres en plural para representar entidades.

---

# 3. Términos del dominio

## League

Representa una liga de Munchinking League.

Es la entidad raíz del sistema.

Una League contiene:

- Managers.
- Seasons.
- Configuración.

---

## Season

Representa una temporada de una League.

Una League puede tener varias Seasons.

Solo una Season puede estar activa al mismo tiempo.

Cada Season mantiene su propio conjunto de cartas y su propio historial de movimientos.

---

## User

Representa una persona autenticada en la aplicación.

Gestiona aspectos relacionados con el acceso al sistema, como la autenticación y la sesión.

Un User puede estar asociado a uno o varios Managers.

---

## Manager

Representa a un participante dentro de una League.

Es el propietario de las cartas que recibe y quien puede jugarlas o descartarlas.

Un Manager pertenece siempre a una única League.

---

## CardDefinition

Define una carta.

Contiene únicamente información descriptiva.

Ejemplos:

- Nombre.
- Apodo.
- Rareza.
- Descripción.
- Imagen.
- Plantilla del mensaje para WhatsApp.

Una CardDefinition no puede repartirse directamente.

---

## CardCopy

Representa una copia física de una CardDefinition durante una Season.

Cada CardCopy posee una identidad única e inmutable.

Todas las operaciones del juego se realizan sobre CardCopy.

---

## CardMovement

Representa un hecho ocurrido sobre una CardCopy.

Todo CardMovement es:

- Inmutable.
- Cronológico.
- Auditable.

Nunca se modifica.

Nunca se elimina.

---

## Deck

Zona lógica que contiene todas las CardCopy disponibles para ser repartidas.

El Deck no es una entidad persistente.

Una CardCopy se encuentra en el Deck cuando no pertenece a ningún Manager.

---

## Hand

Zona lógica formada por todas las CardCopy que pertenecen actualmente a un Manager.

Una Hand no posee identidad propia.

Es simplemente una vista sobre las CardCopy asignadas a un Manager.

---

## CardCatalog

Colección de todas las CardDefinition disponibles en la aplicación.

El CardCatalog no contiene copias físicas.

Únicamente almacena definiciones de cartas.

La pantalla "Biblioteca" muestra el contenido del CardCatalog.

---

## Notification

Representa un aviso dirigido a un Manager.

Las notificaciones son personales.

Cada Notification pertenece a un único Manager.

---

# 4. Estados y ubicaciones

## Card Location

Toda CardCopy posee exactamente una ubicación lógica.

Las ubicaciones permitidas son:

- Deck
- Hand
- Played
- Discarded

Toda modificación de la ubicación genera un CardMovement.

---

## Played

Ubicación lógica que representa una carta recién jugada.

Las CardCopy permanecen en esta ubicación hasta que el sistema registra su retorno al Deck o a la Hand.

---

## Discarded

Ubicación lógica que representa una carta descartada por un Manager.

Tras registrarse el descarte, la CardCopy vuelve inmediatamente al Deck.

---

# 5. Conceptos funcionales

Los siguientes términos forman parte de la interfaz de usuario, pero no constituyen entidades del dominio.

## Biblioteca

Nombre visible del CardCatalog.

---

## Historial

Vista obtenida a partir de los CardMovement.

No constituye una entidad propia.

Existen distintas vistas:

- Público.
- Personal.
- Administrativo.

---

## Mano

Nombre visible de la Hand.

---

## Mazo

Nombre visible del Deck.

---

# 6. Reglas de nomenclatura

Para mantener la consistencia del proyecto:

- Toda entidad del dominio utilizará nombres en inglés.
- Toda tabla de base de datos utilizará el mismo nombre que la entidad correspondiente.
- Los tipos de TypeScript utilizarán exactamente la misma nomenclatura.
- Los procedimientos tRPC utilizarán los nombres definidos en este documento.
- La documentación técnica deberá utilizar siempre estos términos.

---

# 7. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Primera versión congelada del glosario del proyecto. |