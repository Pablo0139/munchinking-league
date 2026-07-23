# Arquitectura

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Arquitectura |
| Versión | 2.1 |
| Estado | Aprobado |
| Última actualización | 23/07/2026 |

---

# 1. Objetivo

Este documento define la arquitectura técnica de Munchinking League.

La arquitectura ha sido diseñada para construir una aplicación moderna, completamente tipada y preparada para evolucionar durante varias temporadas sin necesidad de rediseñar su núcleo.

Toda la aplicación se desarrollará utilizando TypeScript de extremo a extremo y estará desplegada íntegramente sobre la infraestructura de Cloudflare.

El diseño separa completamente la lógica del juego de cualquier integración externa, permitiendo incorporar en el futuro una integración con Biwenger sin modificar el dominio principal.

---

# 2. Objetivos

La arquitectura deberá cumplir los siguientes objetivos.

- Coste de infraestructura cero.
- Arquitectura sencilla.
- Alto rendimiento.
- Escalabilidad.
- Mantenibilidad.
- Seguridad.
- Mobile First.
- Preparación para animaciones.
- Tipado extremo a extremo.
- Independencia respecto a Biwenger.

---

# 3. Principios arquitectónicos

## Separación de responsabilidades

Cada componente tendrá una única responsabilidad claramente definida.

---

## Dominio independiente

Las reglas del juego nunca dependerán del framework, de la base de datos ni de la interfaz de usuario.

Toda la lógica funcional deberá residir en el dominio.

---

## Tipado completo

Todo el proyecto utilizará TypeScript.

No existirá código JavaScript.

Toda comunicación entre frontend y backend estará completamente tipada mediante tRPC.

---

## Arquitectura evolutiva

Todas las decisiones deberán facilitar la incorporación de nuevas funcionalidades sin modificar la estructura existente.

La incorporación de nuevas cartas, efectos, temporadas o ligas no deberá requerir cambios estructurales.

---

## Modelo basado en movimientos

El sistema no almacenará estados históricos.

Toda modificación sobre una copia física de una carta se registrará mediante un **CardMovement**.

El historial será siempre una consulta sobre dichos movimientos.

Este patrón garantiza un registro inmutable de toda la actividad del sistema.

---

## Mobile First

La aplicación se diseñará primero para dispositivos móviles.

Posteriormente se adaptará a escritorio.

---

# 4. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React |
| Lenguaje | TypeScript |
| Bundler | Vite |
| Router | TanStack Router |
| Estado remoto | TanStack Query |
| Comunicación | tRPC |
| Backend | Cloudflare Workers |
| ORM | Drizzle ORM |
| Base de datos | Cloudflare D1 |
| Archivos | Cloudflare R2 |
| Estilos | Tailwind CSS |
| Repositorio | GitHub |
| Despliegue | Cloudflare Pages |

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

No existirán endpoints REST públicos.

Toda la comunicación entre cliente y servidor se realizará mediante procedimientos tRPC.

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

Esta estructura permitirá compartir tipos, componentes y lógica entre todas las capas del sistema.

---

# 7. Organización del código

## apps/web

Contendrá exclusivamente la aplicación React.

Responsabilidades:

- Pantallas.
- Navegación.
- Componentes específicos.
- Gestión de sesión.
- Comunicación mediante tRPC.

---

## packages/server

Contendrá toda la lógica de negocio.

Incluye:

- Procedimientos tRPC.
- Casos de uso.
- Servicios de dominio.
- Reglas del juego.

---

## packages/database

Responsable del acceso a datos.

Incluye:

- Esquema Drizzle.
- Migraciones.
- Conexión con Cloudflare D1.

Nunca contendrá reglas de negocio.

---

## packages/shared

Contendrá todos los elementos compartidos entre frontend y backend.

Ejemplos:

- Tipos.
- Interfaces.
- Enumerados.
- Validaciones.
- Constantes.

---

## packages/ui

Biblioteca de componentes reutilizables.

Ejemplos:

- Card.
- CardFan.
- Dialog.
- Button.
- Badge.
- NotificationBadge.
- BottomNavigation.
- Modales.
- Componentes animados.

Todo el diseño visual de la aplicación residirá en este paquete.

---

# 8. Arquitectura por capas

La aplicación se dividirá en cuatro capas claramente diferenciadas.

```text
Presentación

↓

Aplicación

↓

Dominio

↓

Persistencia
```

Cada capa únicamente podrá depender de la inmediatamente inferior.

Esta restricción evita el acoplamiento entre la interfaz y las reglas del juego.
# 9. Capa de Presentación

La capa de presentación es responsable exclusivamente de la experiencia de usuario.

Incluye:

- Pantallas.
- Componentes React.
- Navegación.
- Formularios.
- Animaciones.
- Gestión de estado local.

No contendrá ninguna regla de negocio.

Toda la lógica relacionada con el juego será delegada a la capa de aplicación mediante procedimientos tRPC.

---

# 10. Capa de Aplicación

La capa de aplicación coordina la ejecución de los casos de uso.

No contiene reglas de negocio complejas.

Su responsabilidad consiste en:

- Validar permisos.
- Orquestar servicios.
- Ejecutar transacciones.
- Gestionar errores.
- Devolver respuestas tipadas.

Ejemplos de casos de uso:

- Repartir carta.
- Jugar carta.
- Descartar carta.
- Devolver carta.
- Obtener historial.
- Consultar biblioteca.
- Obtener notificaciones.

---

# 11. Capa de Dominio

El dominio constituye el núcleo de Munchinking League.

Aquí residen todas las reglas del juego.

Las principales entidades del dominio son:

- League
- Season
- Manager
- CardDefinition
- CardCopy
- Deck
- CardMovement
- Notification

El dominio nunca conocerá:

- React.
- Cloudflare.
- Drizzle.
- D1.
- tRPC.

De esta forma podrá evolucionar independientemente de la tecnología utilizada.

---

# 12. Capa de Persistencia

La persistencia será la única responsable del acceso a Cloudflare D1.

Se implementará mediante Drizzle ORM.

Responsabilidades:

- Consultar datos.
- Crear registros.
- Actualizar entidades.
- Gestionar transacciones.
- Ejecutar migraciones.

No contendrá lógica funcional.

---

# 13. Comunicación Cliente-Servidor

Toda la comunicación entre el frontend y el backend se realizará mediante tRPC.

No existirán endpoints REST públicos.

Ejemplo:

```ts
await trpc.card.play.mutate({
  cardCopyId,
  targetManagerId
});
```

Las ventajas de esta aproximación son:

- Tipado extremo a extremo.
- Autocompletado.
- Eliminación de clientes REST.
- Detección de errores en compilación.
- Compartición automática de tipos.

---

# 14. Gestión del estado

El estado se dividirá en dos categorías.

## Estado remoto

Gestionado mediante TanStack Query.

Responsable de:

- Cachear consultas.
- Sincronizar datos.
- Invalidar caché.
- Reintentos automáticos.

Ejemplos:

- Mano.
- Historial.
- Biblioteca.
- Notificaciones.

---

## Estado local

Gestionado mediante React.

Ejemplos:

- Carta seleccionada.
- Modal abierto.
- Animaciones.
- Mostrar u ocultar cartas.
- Formularios.

---

# 15. Navegación

La navegación utilizará TanStack Router.

Principales rutas:

```text
/

/login

/home

/history

/library

/profile

/admin
```

Todas las rutas estarán completamente tipadas.

Las pantallas se cargarán mediante lazy loading cuando sea posible.

---

# 16. Motor de CardMovement

El corazón del sistema es el registro de movimientos de cartas.

Cada modificación realizada sobre una CardCopy generará un CardMovement.

Los movimientos son inmutables.

Nunca se eliminan.

Nunca se modifican.

El estado histórico del sistema puede reconstruirse completamente a partir de ellos.

---

## Zonas

Toda CardCopy únicamente podrá encontrarse en una de las siguientes zonas.

- Deck
- Hand
- Played
- Discarded

Estas zonas representan la ubicación lógica de una copia física.

---

## Tipos de movimiento

Los movimientos registrados serán:

- Deal
- Play
- Discard
- ReturnToDeck
- ReturnToHand

Cada movimiento indicará:

- Copia afectada.
- Zona origen.
- Zona destino.
- Manager responsable.
- Fecha.
- Motivo.

---

## Ventajas

Este modelo permite:

- Reconstruir el historial completo.
- Obtener estadísticas.
- Auditar cualquier acción.
- Simplificar la lógica del juego.
- Mantener un registro inmutable.

El historial deja de ser una entidad propia y pasa a ser una vista derivada de los movimientos.

---

# 17. Motor del Deck

Cada Season dispone de un único Deck.

El Deck contiene todas las CardCopy pertenecientes a la temporada.

Cuando un manager recibe una carta:

```text
Deck

↓

Hand
```

Cuando juega una carta:

```text
Hand

↓

Played

↓

Deck
```

Cuando descarta una carta:

```text
Hand

↓

Discarded

↓

Deck
```

Cuando un administrador devuelve una carta:

```text
Played

↓

Hand
```

El Deck nunca desaparece.

Nunca necesita reconstruirse.

Siempre contiene todas las cartas que no están en la mano de un manager.

---

# 18. Motor de Mensajes

Cada CardDefinition podrá disponer de una plantilla para WhatsApp.

Cuando un manager juegue una carta, el sistema generará automáticamente un mensaje.

La generación consistirá en sustituir variables como:

- Manager.
- Carta.
- Objetivo.
- Jornada (si aplica).

El mensaje podrá copiarse con un único botón.

La aplicación nunca enviará mensajes automáticamente.
# 19. Motor de Notificaciones

Las notificaciones informan a los managers de todos los eventos relevantes ocurridos durante la temporada.

Todas las notificaciones serán internas a la aplicación.

## Tipos de notificación

- Nueva carta recibida.
- Carta devuelta.
- Carta validada.
- Aviso del administrador.

Cada notificación pertenecerá a un único manager.

Las notificaciones podrán encontrarse en dos estados:

- No leída.
- Leída.

No se eliminarán automáticamente.

---

# 20. Seguridad

Toda la autenticación estará basada en JWT.

Cada petición comprobará automáticamente:

- Usuario autenticado.
- Liga activa.
- Temporada activa.
- Permisos del usuario.

La autorización siempre será validada en el servidor.

Nunca se confiará en datos enviados por el cliente.

Los administradores dispondrán de permisos adicionales para ejecutar operaciones de gestión.

---

# 21. Gestión de temporadas

Cada liga podrá almacenar múltiples temporadas.

Una temporada representa una edición completa de la competición.

Reglas:

- Solo podrá existir una temporada activa.
- Todas las operaciones se realizarán sobre la temporada activa.
- Las temporadas finalizadas permanecerán disponibles únicamente para consulta.
- El inicio de una nueva temporada no eliminará el historial de temporadas anteriores.

---

# 22. Gestión de recursos

Las imágenes de las cartas, logotipos y demás recursos gráficos se almacenarán en Cloudflare R2.

La aplicación accederá a ellos mediante URLs públicas servidas a través de la CDN de Cloudflare.

Ventajas:

- Baja latencia.
- Caché global.
- Coste cero dentro del plan gratuito.
- Escalabilidad.

---

# 23. Rendimiento

La arquitectura deberá cumplir los siguientes objetivos:

- Tiempo de carga inicial inferior a dos segundos.
- Navegación fluida.
- Componentes cargados bajo demanda (Lazy Loading).
- Cacheado automático de consultas mediante TanStack Query.
- Optimización automática de imágenes.
- Reutilización de componentes para minimizar renderizados.

---

# 24. Gestión de errores

Todos los procedimientos tRPC devolverán respuestas consistentes.

Ejemplo:

```ts
{
  success: false,
  error: {
    code: "CARD_NOT_FOUND",
    message: "La carta seleccionada no existe."
  }
}
```

Los errores internos nunca serán mostrados al usuario.

Los errores críticos serán registrados para facilitar su diagnóstico.

---

# 25. Despliegue

Todo el proyecto se desplegará automáticamente desde GitHub.

La infraestructura estará compuesta por:

```text
Frontend
    │
    ▼
Cloudflare Pages

Backend
    │
    ▼
Cloudflare Workers

Base de datos
    │
    ▼
Cloudflare D1

Archivos
    │
    ▼
Cloudflare R2
```

Cada cambio aceptado en la rama principal generará un nuevo despliegue automático.

---

# 26. Integración futura con Biwenger

La arquitectura ha sido diseñada para que la integración con Biwenger sea completamente independiente del núcleo del sistema.

En una futura versión podrá añadirse un módulo específico encargado de:

- Autenticación.
- Sincronización de datos.
- Obtención de jornadas.
- Aplicación automática de efectos.
- Sincronización de plantillas y jugadores.

El resto del sistema permanecerá inalterado.

---

# 27. Escalabilidad

La arquitectura permitirá incorporar nuevas funcionalidades sin modificar el núcleo de la aplicación.

Entre ellas:

- Nuevas cartas.
- Nuevas rarezas.
- Nuevos tipos de efecto.
- Nuevas temporadas.
- Múltiples ligas.
- Integración con servicios externos.
- Estadísticas avanzadas.
- Logros.
- Aplicación móvil nativa.

---

# 28. Decisiones arquitectónicas

Las siguientes decisiones forman parte de la arquitectura oficial del proyecto.

## Arquitectura

- Arquitectura por capas.
- Monorepo.
- Full TypeScript.
- Mobile First.

## Frontend

- React.
- Vite.
- TanStack Router.
- TanStack Query.
- Tailwind CSS.

## Backend

- Cloudflare Workers.
- tRPC.
- Drizzle ORM.

## Persistencia

- Cloudflare D1.
- Cloudflare R2.

## Dominio

- Una única temporada activa por liga.
- Un único Deck por temporada.
- CardDefinition como definición de una carta.
- CardCopy como copia física de una carta.
- CardMovement como registro inmutable de movimientos.
- El historial se obtiene consultando los CardMovement.
- Las cartas jugadas y descartadas regresan inmediatamente al Deck.
- Las cartas devueltas regresan directamente a la Hand del manager.

---

# 29. Convenciones del proyecto

Con el objetivo de mantener una nomenclatura consistente, el código utilizará siempre inglés para las entidades principales del dominio.

| Dominio | Código |
|----------|--------|
| Liga | League |
| Temporada | Season |
| Manager | Manager |
| Carta | CardDefinition |
| Copia de carta | CardCopy |
| Mazo | Deck |
| Mano | Hand |
| Movimiento | CardMovement |
| Notificación | Notification |
| Biblioteca | CardCatalog |

La interfaz de usuario continuará mostrando estos conceptos en español.

---

# 30. Conclusiones

La arquitectura de Munchinking League se basa en cuatro principios fundamentales:

- Un dominio desacoplado de la tecnología.
- Un modelo basado en movimientos inmutables.
- Tipado completo de extremo a extremo.
- Infraestructura gratuita y escalable.

Estas decisiones permitirán mantener una base sólida sobre la que evolucionar el proyecto durante múltiples temporadas sin necesidad de rediseñar su núcleo.

---

# 31. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Arquitectura inicial basada en API REST. |
| 2.0 | Migración a arquitectura Full TypeScript con tRPC, TanStack Router, TanStack Query, Drizzle ORM y monorepo. |
| 2.1 | Refactorización del dominio mediante CardDefinition, CardCopy y CardMovement. Eliminación del concepto de Acción e introducción del modelo basado en movimientos. |