# 🃏 Munchinking League

> Aplicación web para la gestión de las Cartas Personalizadas de la Munchinking League.

---

# Información

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Versión | 1.1 |
| Estado | En desarrollo |
| Licencia | MIT |

---

# Descripción

**Munchinking League** es una aplicación web diseñada para complementar la experiencia de una liga privada de Biwenger mediante un sistema de cartas personalizadas.

La aplicación actúa como el **registro oficial de las cartas de la liga**, permitiendo a los managers consultar su mano, jugar cartas, generar automáticamente los mensajes para comunicar las acciones por WhatsApp y mantener un historial completo de toda la temporada.

En esta primera versión la aplicación **no modifica automáticamente Biwenger**. La aplicación de los efectos continúa realizándose manualmente por el administrador, utilizando la información generada por la propia aplicación.

---

# Objetivos

- Gestionar el reparto semanal de cartas.
- Mostrar la mano de cartas de cada manager.
- Permitir jugar y descartar cartas.
- Generar automáticamente mensajes para WhatsApp.
- Mantener un historial público de cartas jugadas.
- Mantener un historial privado de cada manager.
- Facilitar el trabajo del administrador.
- Preparar la arquitectura para una futura integración con Biwenger.

---

# Filosofía del proyecto

La aplicación **no pretende sustituir Biwenger**.

Su objetivo es complementar la liga aportando una experiencia más inmersiva alrededor de las Cartas Personalizadas.

Las acciones seguirán comunicándose mediante el grupo de WhatsApp de la liga, mientras que Biwenger continuará siendo la plataforma oficial para la gestión deportiva.

---

# Funcionalidades principales

## 🃏 Sistema de Cartas

- Mano de cartas en abanico.
- Mostrar u ocultar las cartas.
- Jugar cartas.
- Descartar cartas.
- Descubrimiento animado de nuevas cartas.

---

## 📚 Biblioteca

- Catálogo completo de cartas.
- Búsqueda.
- Filtros.
- Rarezas.
- Reglas de uso.

---

## 📜 Historial

### Público

Visible para todos los managers.

Incluye únicamente las cartas jugadas.

### Personal

Visible únicamente para cada manager.

Incluye:

- Cartas recibidas.
- Cartas jugadas.
- Cartas descartadas.
- Cartas devueltas.
- Estado de cada carta.

### Administración

Historial completo de todas las acciones realizadas durante la temporada.

---

## 🔔 Notificaciones

La aplicación dispone de un centro de notificaciones donde el usuario podrá consultar:

- Nuevas cartas.
- Cartas devueltas.
- Cartas validadas.
- Avisos del administrador.

Cada lunes, el reparto semanal se notificará mediante un evento especial que permitirá descubrir la nueva carta mediante una animación.

---

## 💬 Integración con WhatsApp

Cuando un manager juega una carta, la aplicación genera automáticamente un mensaje formateado para compartir en el grupo oficial de WhatsApp de la liga.

Este mensaje sirve como comunicación oficial entre los managers y el administrador.

---

## ⚙️ Administración

El administrador podrá:

- Consultar todas las cartas jugadas.
- Consultar todas las cartas descartadas.
- Validar cartas.
- Devolver cartas mal jugadas.
- Consultar el historial completo de la temporada.

La aplicación manual de los efectos continuará realizándose desde Biwenger.

---

# Tecnologías

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Cloudflare Workers

## Base de datos

- Cloudflare D1 (SQLite)

## Almacenamiento

- Cloudflare R2

## Autenticación

- JWT

## Despliegue

- Cloudflare Pages

---

# Arquitectura

```text
React (Frontend)

        │

Cloudflare Workers

        │

Cloudflare D1

        │

Cloudflare R2
```

Toda la infraestructura está diseñada para funcionar dentro del ecosistema de Cloudflare utilizando únicamente el plan gratuito.

---

# Estado del proyecto

## ✅ Completado

- Definición funcional.
- Arquitectura.
- Modelo de dominio.
- Identidad visual.
- Diseño del MVP.

## 🚧 En desarrollo

- Modelo de datos.
- API REST.
- Desarrollo del frontend.

## ⏳ Futuro

- Integración con Biwenger.
- Automatización de efectos.
- Estadísticas avanzadas.
- Eventos especiales.
- Logros.

---

# Documentación

Toda la documentación del proyecto se encuentra en la carpeta `docs`.

| Documento | Descripción |
|------------|-------------|
| 01 | Documento Funcional |
| 02 | Arquitectura |
| 03 | Modelo de Dominio |
| 04 | Flujos de Usuario |
| 05 | Modelo de Datos |
| 06 | API REST |
| 07 | Sistema de Diseño |
| 08 | Roadmap |

---

# Hoja de ruta

## Versión 1.0

- Login.
- Mano de cartas.
- Biblioteca.
- Historial.
- Notificaciones.
- Administración.
- Generación de mensajes para WhatsApp.

## Versión 1.1

- Animaciones.
- Sonidos.
- Estadísticas.
- Mejoras visuales.

## Versión 2.0

- Integración con Biwenger.
- Automatización de efectos.
- Eventos especiales.
- Nuevas mecánicas.

---

# Licencia

Este proyecto ha sido desarrollado exclusivamente para la Munchinking League.

Su código podrá evolucionar para adaptarse a las necesidades futuras de la competición.

---

# Autor

Desarrollado para la **Munchinking League** ❤️