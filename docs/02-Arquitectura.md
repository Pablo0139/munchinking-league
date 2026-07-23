# Arquitectura

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Arquitectura |
| Versión | 2.0 |
| Estado | Aprobado |
| Última actualización | 23/07/2026 |

---

# 1. Objetivo

Este documento define la arquitectura técnica de Munchinking League.

El objetivo es disponer de una arquitectura moderna, escalable y completamente desarrollada en TypeScript, aprovechando al máximo el ecosistema Cloudflare y manteniendo el proyecto preparado para futuras integraciones con Biwenger.

---

# 2. Objetivos de la arquitectura

La arquitectura debe cumplir los siguientes objetivos:

- Coste cero (plan gratuito).
- Fácil mantenimiento.
- Escalable.
- Alto rendimiento.
- Seguridad.
- Mobile First.
- Preparada para futuras animaciones.
- Tipado extremo a extremo.
- Independencia respecto a Biwenger.

---

# 3. Principios

Durante el desarrollo se seguirán los siguientes principios.

## Simplicidad

Cada componente deberá tener una única responsabilidad.

---

## Desacoplamiento

La lógica del juego nunca dependerá del frontend.

---

## Escalabilidad

Toda decisión debe permitir crecer sin grandes cambios estructurales.

---

## Tipado

Todo el proyecto utilizará TypeScript.

No se aceptará código JavaScript.

---

## Reutilización

Los componentes deberán ser reutilizables.

---

## Mobile First

La interfaz estará diseñada primero para móviles.

---

# 4. Stack tecnológico

| Capa | Tecnología |
|-------|------------|
| Frontend | React |
| Lenguaje | TypeScript |
| Build | Vite |
| Router | TanStack Router |
| Estado servidor | TanStack Query |
| Comunicación | tRPC |
| Backend | Cloudflare Workers |
| ORM | Drizzle ORM |
| Base de datos | Cloudflare D1 |
| Almacenamiento | Cloudflare R2 |
| CSS | Tailwind CSS |
| Repositorio | GitHub |
| Hosting | Cloudflare Pages |

---

# 5. Arquitectura general

```text
                 Navegador

                      │

                  React

                      │

             TanStack Router

                      │

             TanStack Query

                      │

                    tRPC

                      │

          Cloudflare Workers

                      │

                Drizzle ORM

                      │

             Cloudflare D1

                      │

             Cloudflare R2
```

Toda la comunicación entre frontend y backend se realizará mediante procedimientos tRPC.

No existirán endpoints REST públicos.

---

# 6. Monorepo

El proyecto seguirá una estructura monorepo.

```text
munchinking-league/

├── apps/
│   └── web/
│
├── packages/
│   ├── server/
│   ├── database/
│   ├── shared/
│   └── ui/
│
├── docs/
│
└── package.json
```

---

# 7. Descripción de carpetas

## apps/web

Aplicación React.

Contendrá:

- Pantallas
- Navegación
- Componentes específicos
- Hooks
- Gestión de sesión

---

## packages/server

Contendrá toda la lógica del backend.

Incluye:

- Procedimientos tRPC
- Servicios
- Casos de uso
- Reglas del juego

---

## packages/database

Responsable de:

- Esquema Drizzle
- Migraciones
- Conexión con D1

---

## packages/shared

Código compartido entre frontend y backend.

Ejemplos:

- Tipos
- Interfaces
- Enumerados
- Constantes
- Validaciones

---

## packages/ui

Biblioteca de componentes.

Ejemplos:

- Cartas
- Botones
- Diálogos
- Badges
- Modales
- Animaciones

---

# 8. Arquitectura por capas

La aplicación estará organizada en cuatro capas.

```text
Presentación

↓

Aplicación

↓

Dominio

↓

Persistencia
```

Cada capa solo podrá acceder a la inmediatamente inferior.

---

# 9. Capa de presentación

Responsable de la interfaz.

Incluye:

- React
- Componentes
- Formularios
- Navegación
- Animaciones

No contendrá reglas de negocio.

---

# 10. Capa de aplicación

Coordina las operaciones del sistema.

Ejemplos:

- Jugar carta.
- Descartar carta.
- Repartir cartas.
- Devolver carta.

Esta capa orquesta los casos de uso.

No conoce detalles de la base de datos.

---

# 11. Capa de dominio

Es el núcleo de Munchinking League.

Aquí reside toda la lógica funcional.

Ejemplos:

- Gestión del mazo.
- Estados de una carta.
- Reglas de reparto.
- Gestión de temporadas.
- Gestión de ligas.
- Historial.
- Validaciones.
- Generación de mensajes.

El dominio nunca dependerá del framework utilizado.
# 12. Capa de persistencia

La capa de persistencia será la única responsable del acceso a la base de datos.

Nunca contendrá reglas de negocio.

Toda la comunicación con Cloudflare D1 se realizará mediante Drizzle ORM.

Sus responsabilidades serán:

- Consultar datos.
- Crear registros.
- Actualizar información.
- Eliminar registros cuando sea necesario.
- Gestionar transacciones.

Los repositorios actuarán como intermediarios entre el dominio y la base de datos.

---

# 13. Comunicación entre Frontend y Backend

La comunicación se realizará mediante **tRPC**.

Esta decisión proporciona:

- Tipado extremo a extremo.
- Eliminación de clientes REST manuales.
- Autocompletado completo en el IDE.
- Detección de errores en tiempo de compilación.
- Compartición automática de tipos entre frontend y backend.

Ejemplo:

```ts
await trpc.cards.play.mutate({
  cardId,
  targetManagerId
});
```

El frontend nunca realizará llamadas `fetch()` directamente a la API.

Toda la comunicación estará encapsulada por tRPC.

---

# 14. Gestión del estado

La aplicación utilizará dos tipos de estado.

## Estado del servidor

Gestionado mediante TanStack Query.

Responsable de:

- Cachear consultas.
- Refrescar información.
- Invalidar datos.
- Reintentos automáticos.

Ejemplos:

- Mano de cartas.
- Historial.
- Biblioteca.
- Notificaciones.

---

## Estado local

Gestionado mediante React.

Ejemplos:

- Carta seleccionada.
- Modal abierto.
- Mostrar/Ocultar cartas.
- Animaciones.
- Formularios.

---

# 15. Navegación

La navegación utilizará TanStack Router.

Las rutas estarán completamente tipadas.

Ejemplo:

```text
/

/login

/home

/history

/library

/profile

/admin
```

Cada pantalla se cargará mediante lazy loading cuando sea posible.

---

# 16. Motor del mazo

El mazo constituye el núcleo funcional de la aplicación.

Cada temporada dispondrá de un único mazo.

Cada copia física de una carta será única.

Una carta únicamente podrá encontrarse en uno de estos estados:

- En el mazo.
- En la mano de un manager.

Cuando una carta sea:

- Jugada.
- Descartada.

Volverá inmediatamente al mazo.

El historial conservará permanentemente el registro de la acción realizada.

---

# 17. Motor de acciones

Toda acción realizada por un manager generará un registro permanente.

Ejemplos:

- Carta jugada.
- Carta descartada.
- Carta validada.
- Carta devuelta.

Las acciones nunca serán eliminadas.

Constituyen el historial oficial de la temporada.

---

# 18. Motor de mensajes

Cada carta podrá generar automáticamente un mensaje para WhatsApp.

El mensaje será construido a partir de una plantilla.

Ejemplo:

```
🃏 Pablo ha jugado "Presi-Culo"

🎯 Objetivo: Juan

📅 Jornada 12
```

Las variables serán sustituidas automáticamente.

El usuario podrá copiar el mensaje con un único botón.

La aplicación nunca enviará mensajes automáticamente.

---

# 19. Motor de notificaciones

Todas las notificaciones serán internas.

Tipos:

- Nueva carta.
- Carta validada.
- Carta devuelta.
- Aviso administrativo.

Las notificaciones push quedan fuera del MVP.

El icono de notificaciones mostrará un contador con un máximo visual de **9+**.

---

# 20. Gestión de temporadas

Cada liga podrá almacenar múltiples temporadas.

Solo podrá existir una temporada activa.

Todas las operaciones de la aplicación se realizarán siempre sobre dicha temporada.

Las temporadas cerradas permanecerán disponibles únicamente para consulta.

---

# 21. Gestión de ligas

La arquitectura permitirá gestionar múltiples ligas.

Aunque la versión 1.0 únicamente utilizará una, todas las entidades estarán asociadas a una liga.

Esto permitirá ampliar el proyecto sin modificar el modelo principal.

---

# 22. Seguridad

La autenticación utilizará JWT.

Cada petición verificará:

- Usuario autenticado.
- Liga.
- Temporada activa.
- Permisos.

Los administradores dispondrán de permisos adicionales.

Nunca se confiará en información enviada desde el cliente.

---

# 23. Rendimiento

Objetivos de rendimiento:

- Tiempo de carga inicial inferior a 2 segundos.
- Navegación fluida.
- Carga diferida de componentes pesados.
- Optimización automática de imágenes.
- Consultas cacheadas mediante TanStack Query.

---

# 24. Gestión de errores

Todos los procedimientos devolverán respuestas consistentes.

Ejemplo:

```ts
{
  success: false,
  error: {
    code: "CARD_NOT_FOUND",
    message: "La carta no existe."
  }
}
```

Los errores internos nunca serán expuestos al usuario.

Todos los errores críticos serán registrados para facilitar su diagnóstico.

---

# 25. Despliegue

El proyecto utilizará integración continua mediante GitHub.

Cada cambio aceptado en la rama principal generará automáticamente un nuevo despliegue.

Infraestructura:

Frontend

↓

Cloudflare Pages

Backend

↓

Cloudflare Workers

Base de datos

↓

Cloudflare D1

Archivos

↓

Cloudflare R2

Todo el sistema funcionará dentro del ecosistema Cloudflare.

---

# 26. Integración futura con Biwenger

La aplicación no dependerá de Biwenger.

Si en el futuro se dispone de una integración oficial, se desarrollará un módulo independiente encargado de:

- Autenticación.
- Sincronización.
- Aplicación automática de efectos.

El resto del sistema permanecerá inalterado.

---

# 27. Decisiones arquitectónicas

Las siguientes decisiones forman parte de la arquitectura del proyecto:

- Mobile First.
- Full TypeScript.
- Arquitectura por capas.
- Monorepo.
- Comunicación mediante tRPC.
- Sin API REST pública.
- Cloudflare como infraestructura completa.
- Historial inmutable.
- Un único mazo por temporada.
- Una única temporada activa.
- Preparación para múltiples ligas.
- Separación completa respecto a Biwenger.

---

# 28. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Arquitectura inicial basada en API REST. |
| 2.0 | Migración a arquitectura Full TypeScript con tRPC, TanStack Router, TanStack Query, Drizzle ORM, monorepo y actualización del modelo de infraestructura. |