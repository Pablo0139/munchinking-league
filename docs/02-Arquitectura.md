# Arquitectura del Sistema

**Proyecto:** Munchinking League Companion

**Documento:** Arquitectura

**Versión:** 1.0

---

# 1. Objetivo

Este documento define la arquitectura técnica de Munchinking League Companion.

El objetivo es diseñar una aplicación:

- Escalable.
- Fácil de mantener.
- Gratuita.
- Preparada para futuras funcionalidades.
- Independiente de Biwenger.

---

# 2. Principios de diseño

Durante todo el desarrollo se seguirán los siguientes principios.

## Separación de responsabilidades

La aplicación se divide en tres partes completamente independientes:

- Frontend
- Backend
- Base de datos

Cada una tiene una única responsabilidad.

---

## API First

Toda la comunicación entre frontend y backend se realizará mediante una API REST.

El frontend nunca accederá directamente a la base de datos.

---

## Mobile First

Toda la interfaz estará diseñada pensando primero en dispositivos móviles.

Posteriormente se adaptará a escritorio.

---

## Componentes reutilizables

Toda la interfaz se desarrollará utilizando componentes reutilizables.

Nunca se duplicará código visual.

---

## Preparado para animaciones

Aunque inicialmente las animaciones no se desarrollen, toda la arquitectura visual estará preparada para incorporarlas posteriormente.

---

# 3. Arquitectura general

```
                Internet
                     │
                     ▼
         Cloudflare Pages
             (Frontend)
                     │
                     ▼
        Cloudflare Workers
             (Backend)
                     │
                     ▼
           Cloudflare D1
            (Base Datos)
```

---

# 4. Frontend

## Tecnología

- React
- TypeScript
- Vite
- TailwindCSS

---

## Responsabilidades

El frontend será responsable únicamente de:

- Mostrar información.
- Gestionar la navegación.
- Validar formularios.
- Mostrar animaciones.
- Consumir la API.

Nunca contendrá lógica de negocio.

---

## Estructura

```
frontend/

src/

components/

pages/

layouts/

hooks/

services/

types/

assets/

styles/
```

---

## Componentes

Todos los componentes deberán ser reutilizables.

Ejemplos:

```
Button

Card

Dialog

Input

Navbar

Header

Avatar

Notification

Modal
```

---

# 5. Backend

## Tecnología

Cloudflare Workers

---

## Responsabilidades

El backend será responsable de:

- Autenticación.
- Gestión de usuarios.
- Gestión de cartas.
- Gestión del mazo.
- Historial.
- Administración.
- Validaciones.
- API REST.

---

## Organización

```
backend/

controllers/

services/

repositories/

middlewares/

routes/

models/

utils/
```

---

## Flujo

```
Petición

↓

Router

↓

Controller

↓

Service

↓

Repository

↓

Base de datos
```

Cada capa tendrá una única responsabilidad.

---

# 6. Base de datos

Se utilizará Cloudflare D1.

Motivos:

- Gratuita.
- SQLite.
- Muy rápida.
- Integración directa con Workers.
- Copias automáticas.

---

## Organización

Inicialmente existirán las siguientes entidades.

```
Usuarios

Cartas

Inventario

Historial

Acciones

Configuración
```

---

# 7. API REST

Toda la comunicación utilizará JSON.

Ejemplo.

```
Frontend

↓

POST

/api/login

↓

Backend

↓

JSON

↓

Respuesta
```

---

## Endpoints iniciales

```
POST /login

POST /logout

GET /me

GET /cards

GET /library

POST /cards/play

GET /history

GET /users

POST /admin/apply
```

---

# 8. Autenticación

La autenticación utilizará sesiones.

Flujo.

```
Login

↓

Usuario

↓

Backend

↓

Validación

↓

Sesión

↓

Cookie segura

↓

Frontend
```

Las contraseñas nunca se almacenarán en texto plano.

Se utilizará hash.

---

# 9. Seguridad

Toda petición deberá pasar por:

- Autenticación.
- Autorización.
- Validación.

No existirán rutas públicas salvo:

```
/login
```

---

# 10. Gestión de errores

Toda respuesta devolverá:

```
200

Correcto
```

```
400

Petición incorrecta
```

```
401

No autenticado
```

```
403

Sin permisos
```

```
404

No encontrado
```

```
500

Error interno
```

---

# 11. Flujo de una acción

Ejemplo:

Un manager juega una carta.

```
Manager

↓

Pulsa

Jugar

↓

Frontend

↓

POST /cards/play

↓

Backend

↓

Valida

↓

Guarda acción

↓

Estado

Pendiente

↓

Respuesta

OK
```

Posteriormente.

```
Administrador

↓

Consulta pendientes

↓

Aplica efecto

↓

Marca

Aplicada

↓

Historial
```

---

# 12. Diseño visual

Toda la interfaz seguirá un único sistema visual.

Características.

- Tema oscuro.
- Mucho contraste.
- Cartas grandes.
- Colores vivos.
- Sombras.
- Bordes redondeados.
- Iconografía consistente.

---

# 13. Responsive

La aplicación deberá funcionar correctamente en:

- Móvil
- Tablet
- Escritorio

El móvil será el dispositivo prioritario.

---

# 14. Preparación para animaciones

Las cartas deberán construirse pensando en futuras animaciones.

Cada carta tendrá la siguiente estructura.

```
Card

├── Front

├── Back

├── Glow

├── Shadow

├── Overlay

└── Animation
```

Esto permitirá incorporar posteriormente:

- Giro 3D.
- Flip.
- Brillo.
- Partículas.
- Explosiones.
- Aparición.
- Desaparición.

Sin modificar el componente principal.

---

# 15. Flujo de desarrollo

Se utilizará Git Flow simplificado.

```
main

↓

develop

↓

feature/login

feature/cards

feature/history

feature/admin
```

Nunca se desarrollará directamente sobre la rama principal.

---

# 16. Despliegue

Cada commit en la rama principal generará automáticamente una nueva versión.

```
GitHub

↓

Cloudflare Pages

↓

Deploy automático

↓

Aplicación publicada
```

---

# 17. Copias de seguridad

La base de datos deberá exportarse periódicamente.

También se conservarán:

- Configuración.
- Cartas.
- Historial.

---

# 18. Escalabilidad

La arquitectura deberá permitir añadir en el futuro:

- Integración con Biwenger.
- Notificaciones push.
- Aplicación móvil.
- Chat entre managers.
- Estadísticas.
- Logros.
- Tienda.
- Temporadas.
- Eventos especiales.

Sin necesidad de modificar la arquitectura principal.

---

# 19. Decisiones de arquitectura

| Decisión | Motivo |
|----------|--------|
| React | Componentes reutilizables |
| TypeScript | Mayor mantenibilidad |
| TailwindCSS | Desarrollo rápido y consistente |
| Cloudflare Pages | Hosting gratuito |
| Cloudflare Workers | Backend serverless |
| Cloudflare D1 | Base de datos SQL integrada |
| API REST | Separación entre frontend y backend |
| PWA | Experiencia similar a una aplicación móvil |

---

# 20. Conclusiones

La arquitectura ha sido diseñada para ser sencilla, mantenible y preparada para crecer durante varias temporadas de la Munchinking League.

El objetivo principal no es únicamente desarrollar una aplicación funcional, sino construir una plataforma capaz de incorporar nuevas mecánicas sin necesidad de rehacer el sistema.