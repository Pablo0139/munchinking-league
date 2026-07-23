# Modelo de Dominio

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Modelo de Dominio |
| Versión | 1.0 |
| Estado | Aprobado |
| Última actualización | 23/07/2026 |

---

# 1. Objetivo

Este documento define el modelo conceptual de Munchinking League.

Su objetivo es identificar todas las entidades del sistema, sus responsabilidades y las relaciones existentes entre ellas.

No describe tablas de base de datos ni detalles técnicos de implementación.

---

# 2. Visión general

El dominio se organiza alrededor de una **Liga**.

Una liga contiene varias temporadas.

Cada temporada dispone de un mazo de cartas, un conjunto de managers y un historial de acciones.

```text
Liga
│
├── Temporadas
│
├── Managers
│
├── Cartas
│
├── Mazo
│
├── Acciones
│
└── Notificaciones
```

---

# 3. Liga

La Liga representa el espacio donde se desarrolla toda la competición.

## Responsabilidades

- Mantener la configuración general.
- Gestionar los managers.
- Almacenar las temporadas.
- Definir los administradores.

## Reglas

- Una liga puede tener muchas temporadas.
- Solo una temporada puede estar activa.

---

# 4. Temporada

Representa una edición anual de la competición.

## Responsabilidades

- Mantener el mazo.
- Gestionar las cartas en juego.
- Registrar el historial.
- Asociar managers participantes.

## Reglas

- Pertenece a una única liga.
- Solo puede existir una temporada activa.
- Las temporadas cerradas son de solo lectura.

---

# 5. Manager

Representa a un jugador de la liga.

## Responsabilidades

- Mantener su mano de cartas.
- Jugar cartas.
- Descartar cartas.
- Consultar historial.
- Recibir notificaciones.

## Reglas

- Puede tener como máximo tres cartas en mano.
- Solo puede jugar cartas que posea.
- Solo puede descartar cartas que posea.

---

# 6. Administrador

Es un manager con permisos adicionales.

## Responsabilidades

- Validar cartas.
- Devolver cartas.
- Consultar el historial completo.
- Gestionar la temporada.

Todo administrador es también un manager.

---

# 7. Carta

Representa el diseño de una carta.

No representa una copia física.

## Propiedades

- Nombre.
- Apodo.
- Descripción.
- Rareza.
- Tipo.
- Imagen.
- Plantilla de WhatsApp.

## Reglas

Una carta puede tener varias copias físicas.

---

# 8. Copia de Carta

Representa una carta física del mazo.

Esta entidad es la que realmente se reparte entre los managers.

## Propiedades

- Carta original.
- Temporada.
- Estado.
- Propietario actual.

## Estados posibles

- En mazo.
- En mano.

Cuando una carta se juega o se descarta, la copia vuelve inmediatamente al mazo.

---

# 9. Mano

La mano representa el conjunto de cartas que posee un manager.

## Reglas

- Máximo tres cartas.
- Las cartas se muestran en abanico.
- Puede ocultarse o mostrarse.
- Solo pertenece a un manager.

La mano no tiene identidad propia; es una vista de las copias de carta cuyo propietario es el manager.

---

# 10. Mazo

Representa el conjunto de copias de cartas disponibles durante una temporada.

## Responsabilidades

- Repartir cartas.
- Recuperar cartas jugadas.
- Recuperar cartas descartadas.

## Reglas

- Existe un único mazo por temporada.
- Todas las copias pertenecen al mazo.
- El mazo nunca desaparece.
- Las cartas vuelven inmediatamente tras ser jugadas o descartadas.

---

# 11. Acción

Toda operación importante genera una acción.

Ejemplos:

- Carta jugada.
- Carta descartada.
- Carta validada.
- Carta devuelta.
- Carta repartida.

## Responsabilidades

Conservar el historial oficial de la temporada.

Las acciones nunca se eliminan.

---

# 12. Historial

El historial es la secuencia cronológica de acciones de una temporada.

Existen tres vistas distintas.

## Historial público

Visible para todos.

Incluye únicamente cartas jugadas.

---

## Historial personal

Visible únicamente para el manager.

Incluye:

- Cartas recibidas.
- Cartas jugadas.
- Cartas descartadas.
- Cartas devueltas.

---

## Historial administrativo

Visible únicamente para administradores.

Incluye todas las acciones registradas.
# 13. Notificación

Una notificación representa un evento relevante para un manager.

## Responsabilidades

- Informar al usuario.
- Destacar acciones importantes.
- Facilitar el acceso rápido a determinados eventos.

## Tipos

- Nueva carta recibida.
- Carta devuelta.
- Carta validada.
- Aviso del administrador.

## Estados

- No leída.
- Leída.

Las notificaciones nunca se eliminan automáticamente.

---

# 14. Biblioteca

La Biblioteca representa el catálogo completo de cartas existentes.

No contiene cartas físicas.

Únicamente información descriptiva.

## Funciones

Permite consultar:

- Imagen.
- Nombre.
- Apodo.
- Rareza.
- Descripción.
- Reglas.
- Número de copias por temporada.

La Biblioteca no modifica el estado del juego.

---

# 15. Mensaje de WhatsApp

Representa el texto generado automáticamente cuando un manager juega una carta.

## Responsabilidades

- Informar al resto de managers.
- Estandarizar la comunicación.
- Facilitar el trabajo del administrador.

Cada carta dispone de una plantilla propia.

Durante la generación se sustituyen automáticamente las variables correspondientes.

Ejemplos:

- Manager.
- Objetivo.
- Carta.
- Jornada (opcional).

El mensaje únicamente se genera.

Nunca se envía automáticamente.

---

# 16. Relaciones del dominio

```text
Liga
│
├──────────────┐
│              │
▼              ▼
Temporadas   Managers
│              │
│              │
│              └────────────┐
│                           │
▼                           ▼
Mazo                      Mano
│                           │
│                           │
▼                           ▼
Copias de Carta ─────────────┘
│
│
▼
Carta
│
▼
Biblioteca
```

---

## Relaciones principales

Una Liga:

- Tiene muchas temporadas.
- Tiene muchos managers.

Una Temporada:

- Pertenece a una liga.
- Tiene un único mazo.
- Tiene muchas acciones.

Un Manager:

- Pertenece a una liga.
- Participa en una temporada.
- Tiene una mano.
- Recibe notificaciones.

Una Carta:

- Puede tener varias copias físicas.

Una Copia:

- Pertenece a una temporada.
- Puede estar en un mazo.
- Puede estar en una mano.

---

# 17. Eventos del dominio

Los eventos representan hechos importantes ocurridos en la aplicación.

## Eventos previstos

- Manager registrado.
- Inicio de temporada.
- Fin de temporada.
- Carta repartida.
- Carta jugada.
- Carta descartada.
- Carta validada.
- Carta devuelta.
- Notificación enviada.

Estos eventos podrán utilizarse en el futuro para estadísticas, automatizaciones e integración con Biwenger.

---

# 18. Reglas de negocio

## Liga

- Puede existir una o varias ligas.
- Todos los datos pertenecen a una liga.

---

## Temporadas

- Solo puede existir una temporada activa.
- Las temporadas cerradas son de solo lectura.

---

## Managers

- Máximo tres cartas en mano.
- No pueden jugar cartas ajenas.

---

## Cartas

- Cada copia física es única.
- Las cartas jugadas vuelven inmediatamente al mazo.
- Las cartas descartadas vuelven inmediatamente al mazo.
- Las cartas devueltas vuelven directamente a la mano del manager.

---

## Historial

- Nunca se elimina.
- Nunca se modifica.
- Constituye el registro oficial de la temporada.

---

## Notificaciones

- Cada notificación pertenece a un único manager.
- Solo el propietario puede marcarla como leída.

---

# 19. Agregados del dominio

El dominio se divide en varios agregados principales.

## Liga

Raíz del sistema.

Gestiona:

- Managers.
- Temporadas.

---

## Temporada

Gestiona:

- Mazo.
- Acciones.
- Historial.

---

## Manager

Gestiona:

- Mano.
- Notificaciones.
- Historial personal.

---

## Carta

Gestiona:

- Información descriptiva.
- Plantillas.
- Rareza.

Las copias físicas dependen de ella.

---

# 20. Invariantes

El sistema debe garantizar siempre:

- Solo una temporada activa.
- Ningún manager puede tener más de tres cartas.
- Toda copia pertenece exactamente a una carta.
- Toda copia pertenece exactamente a una temporada.
- Ninguna acción puede quedar sin registrar.
- Una carta solo puede jugarla su propietario.
- Las cartas nunca desaparecen del sistema.

---

# 21. Modelo conceptual

```text
                    Liga
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
     Temporada               Manager
          │                       │
          │                       │
          ▼                       ▼
        Mazo                   Mano
          │                       │
          └───────────┬───────────┘
                      ▼
              Copia de Carta
                      │
                      ▼
                    Carta
                      │
                      ▼
                 Biblioteca

Manager
│
├── Notificaciones
│
└── Historial Personal

Temporada
│
└── Historial Público
```

---

# 22. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Modelo inicial del dominio. |