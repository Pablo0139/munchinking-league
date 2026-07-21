# 🃏 Munchinking League Companion

> Aplicación web complementaria para la gestión de la **Munchinking League**, ampliando las funcionalidades de Biwenger mediante cartas, eventos personalizados y herramientas de administración.

---

# 📖 Descripción

Munchinking League Companion es una aplicación web desarrollada para gestionar todas las reglas adicionales de la competición que actualmente se realizan de forma manual.

La aplicación **no pretende sustituir a Biwenger**, sino complementarlo.

Mientras Biwenger seguirá siendo la plataforma oficial para:

- Mercado
- Alineaciones
- Puntuaciones
- Clasificación

esta aplicación será la responsable de gestionar:

- 🃏 Cartas personalizadas
- 📜 Historial de acciones
- 👥 Managers
- ⚙️ Administración de la liga
- 🎲 Eventos especiales
- 🏆 Reglas propias de la competición

---

# 🎯 Objetivos del proyecto

- Centralizar todas las reglas propias de la Munchinking League.
- Reducir la carga administrativa.
- Mejorar la experiencia de los managers.
- Diseñar una aplicación atractiva y visual.
- Preparar una arquitectura escalable para futuras temporadas.

---

# 🚀 Roadmap

## Versión 1.0

- Sistema de usuarios
- Login
- Inventario de cartas
- Biblioteca de cartas
- Historial
- Panel de administración
- Reparto automático de cartas
- Registro de acciones

## Versión 2.0

- Animaciones de cartas
- Sonidos
- Notificaciones
- Estadísticas
- Perfil de manager
- Logros

## Versión 3.0

- Integración parcial con Biwenger
- Automatización de acciones
- Eventos especiales
- Tienda
- Expansiones
- Temporadas

---

# 🏗 Arquitectura

```text
React + TypeScript
        │
        ▼
Cloudflare Pages
        │
        ▼
Cloudflare Workers
        │
        ▼
Cloudflare D1
```

---

# 📂 Estructura del proyecto

```text
munchinking-league/

├── frontend/
├── backend/
├── docs/
│
│   ├── 00-README.md
│   ├── 01-Documento-Funcional.md
│   ├── 02-Arquitectura.md
│   ├── 03-Modelo-de-Datos.md
│   ├── 04-API.md
│   ├── 05-Design-System.md
│   ├── 06-Historias-de-Usuario.md
│   └── 07-Roadmap.md
│
├── README.md
└── LICENSE
```

---

# 📚 Documentación

La documentación del proyecto se encuentra en la carpeta `/docs`.

| Documento | Descripción |
|-----------|-------------|
| 00-README | Índice de documentación |
| 01-Documento Funcional | Objetivos y funcionalidades |
| 02-Arquitectura | Infraestructura del sistema |
| 03-Modelo de Datos | Diseño de la base de datos |
| 04-API | Endpoints del backend |
| 05-Design System | Guía visual de la aplicación |
| 06-Historias de Usuario | Casos de uso |
| 07-Roadmap | Planificación del proyecto |

---

# 🎨 Filosofía del proyecto

La aplicación debe sentirse como un videojuego.

No será únicamente una herramienta de gestión.

Los objetivos de diseño son:

- Interfaz moderna.
- Cartas grandes y visuales.
- Animaciones fluidas.
- Compatible con dispositivos móviles.
- Instalación como aplicación (PWA).

---

# 🛠 Tecnologías

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS
- Framer Motion

## Backend

- Cloudflare Workers

## Base de datos

- Cloudflare D1

## Repositorio

- GitHub

---

# 👥 Roles

## Manager

Puede:

- Iniciar sesión
- Ver sus cartas
- Jugar cartas
- Consultar el historial
- Consultar la biblioteca

## Administrador

Además podrá:

- Gestionar usuarios
- Aplicar efectos
- Repartir cartas
- Configurar la temporada
- Gestionar el mazo
- Consultar estadísticas

---

# 📄 Licencia

Proyecto privado desarrollado para uso exclusivo de la Munchinking League.