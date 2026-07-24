# Arquitectura

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Arquitectura |
| Archivo | `03-architecture.md` |
| Versión | 1.0 |
| Estado | DRAFT |
| Última actualización | 24/07/2026 |

---

# 1. Introducción

## 1.1 Objetivo

Este documento describe la arquitectura técnica de Munchinking League.

Su finalidad es establecer una base sólida para el desarrollo de la aplicación, definiendo las tecnologías, los principios de diseño y la organización del sistema.

Las decisiones recogidas en este documento deberán mantenerse durante todo el desarrollo del proyecto para garantizar la coherencia de la aplicación.

---

## 1.2 Objetivos de la arquitectura

La arquitectura debe cumplir los siguientes objetivos:

- Simplicidad.
- Escalabilidad.
- Bajo coste de mantenimiento.
- Despliegue automático.
- Tipado de extremo a extremo.
- Separación clara entre dominio e infraestructura.
- Experiencia optimizada para dispositivos móviles.

---

# 2. Principios arquitectónicos

## 2.1 Arquitectura por capas

La aplicación seguirá una arquitectura por capas claramente diferenciadas.

Cada capa tendrá una única responsabilidad y dependerá únicamente de las capas inferiores.

La comunicación entre capas siempre será unidireccional.

---

## 2.2 Dominio como núcleo

El dominio representa el corazón de la aplicación.

Todas las reglas de negocio estarán definidas en el dominio.

Las decisiones técnicas nunca condicionarán el modelo del dominio.

El dominio será independiente de:

- React.
- Cloudflare.
- Drizzle ORM.
- tRPC.
- Cualquier tecnología de persistencia.

---

## 2.3 Tipado de extremo a extremo

Toda la aplicación utilizará TypeScript.

Los tipos definidos en el servidor serán compartidos por el cliente mediante tRPC.

No existirán modelos duplicados.

---

## 2.4 Mobile First

Toda la interfaz se diseñará pensando primero en dispositivos móviles.

Posteriormente se adaptará para escritorio.

Las funcionalidades serán exactamente las mismas en ambas plataformas.

---

## 2.5 Infraestructura Serverless

Toda la infraestructura se apoyará en servicios serverless.

No existirán servidores dedicados ni procesos permanentes.

Esto permitirá:

- Coste prácticamente nulo.
- Escalado automático.
- Mantenimiento reducido.

---

## 2.6 Convención de idioma

Se utilizarán dos idiomas de forma diferenciada.

### Código

Todo el código utilizará nombres en inglés.

Ejemplos:

- League
- Season
- Manager
- CardDefinition

### Interfaz

Todos los textos visibles para el usuario estarán en español.

---

# 3. Tecnologías

## 3.1 Frontend

El cliente estará desarrollado con:

- React
- TypeScript
- Vite
- Tailwind CSS
- TanStack Router
- TanStack Query

Estas tecnologías proporcionan una experiencia rápida, moderna y completamente tipada.

---

## 3.2 Backend

El servidor estará implementado mediante:

- Cloudflare Workers
- TypeScript
- tRPC

No existirán endpoints REST públicos.

Toda la comunicación entre cliente y servidor se realizará mediante procedimientos tRPC.

---

## 3.3 Persistencia

La información persistente se almacenará utilizando:

- Cloudflare D1
- Drizzle ORM

Las imágenes y recursos gráficos se almacenarán en:

- Cloudflare R2

---

## 3.4 Control de versiones

El código fuente se almacenará en GitHub.

Se utilizará un flujo basado en ramas.

La rama `main` contendrá siempre versiones estables.

La rama `develop` contendrá el trabajo en curso.

---

## 3.5 Despliegue

El despliegue será completamente automático.

Cada cambio aceptado en la rama principal generará una nueva versión de la aplicación.

La infraestructura será administrada por Cloudflare.

---

# 4. Arquitectura de alto nivel

La arquitectura general estará compuesta por los siguientes bloques.

```text
                 Navegador

                     │

             React + TypeScript

                     │

             TanStack Router

                     │

             TanStack Query

                     │

                   tRPC

                     │

          Cloudflare Workers

          ┌──────────┴──────────┐

          ▼                     ▼

   Drizzle ORM           Cloudflare R2

          │

          ▼

    Cloudflare D1
```

Cada componente tendrá una responsabilidad claramente definida.

La comunicación entre cliente y servidor se realizará exclusivamente mediante tRPC.

---

# 5. Arquitectura por capas

La aplicación se organizará en las siguientes capas.

```text
Presentación

↓

Aplicación

↓

Dominio

↓

Persistencia

↓

Infraestructura
```

Cada capa conocerá únicamente la inmediatamente inferior.

---

## 5.1 Capa de Presentación

Responsable de la interacción con el usuario.

Incluye:

- Pantallas.
- Componentes.
- Formularios.
- Navegación.
- Animaciones.

No contendrá reglas de negocio.

---

## 5.2 Capa de Aplicación

Coordina los casos de uso de la aplicación.

Sus responsabilidades son:

- Validar permisos.
- Orquestar operaciones.
- Gestionar transacciones.
- Invocar servicios del dominio.
- Construir las respuestas para el cliente.

No implementará reglas funcionales complejas.

---

## 5.3 Capa de Dominio

Contiene todas las reglas de negocio.

Las principales entidades del dominio son:

- League
- Season
- User
- Manager
- CardDefinition
- CardCopy
- CardMovement
- Notification

El dominio no conoce detalles de infraestructura ni de persistencia.

---

## 5.4 Capa de Persistencia

Responsable del acceso a los datos.

Utilizará Drizzle ORM sobre Cloudflare D1.

Sus funciones serán:

- Consultar información.
- Crear registros.
- Actualizar datos.
- Ejecutar migraciones.

No contendrá lógica de negocio.

---

## 5.5 Capa de Infraestructura

Agrupa todos los servicios externos utilizados por la aplicación.

Incluye:

- Cloudflare Workers.
- Cloudflare D1.
- Cloudflare R2.
- GitHub.
- Servicios de autenticación.

El resto de capas accederán a estos servicios únicamente a través de interfaces bien definidas.
# 6. Arquitectura del Frontend

El frontend será una Single Page Application (SPA) desarrollada con React y TypeScript.

Su responsabilidad será exclusivamente la interacción con el usuario.

No contendrá reglas de negocio.

---

## 6.1 Organización

La estructura principal será la siguiente:

```text
src/

├── app/

├── assets/

├── components/

├── features/

├── hooks/

├── layouts/

├── lib/

├── routes/

├── services/

├── styles/

├── types/

└── utils/
```

Cada carpeta tendrá una responsabilidad claramente definida.

---

## 6.2 Componentes

Los componentes React deberán ser:

- Reutilizables.
- Pequeños.
- Independientes.
- Tipados.

Los componentes únicamente recibirán datos mediante propiedades.

No accederán directamente a la base de datos ni ejecutarán lógica de negocio.

---

## 6.3 Pantallas

Cada pantalla representará una funcionalidad principal de la aplicación.

Se implementarán las siguientes rutas:

```text
/

/login

/home

/history

/library

/profile

/admin

/notifications
```

La navegación será gestionada mediante TanStack Router.

---

## 6.4 Estado

El estado del frontend se dividirá en dos categorías.

### Estado remoto

Gestionado mediante TanStack Query.

Responsable de:

- Cachear consultas.
- Revalidar datos.
- Invalidar caché.
- Gestionar carga y errores.

Ejemplos:

- Mano.
- Historial.
- Biblioteca.
- Notificaciones.

---

### Estado local

Gestionado mediante React.

Responsable de:

- Modales.
- Carta seleccionada.
- Mostrar u ocultar cartas.
- Animaciones.
- Formularios.

---

## 6.5 Navegación

Toda la aplicación utilizará una barra inferior fija.

Las opciones disponibles serán:

- Inicio.
- Historial.
- Biblioteca.
- Perfil.
- Administración (solo administradores).

La navegación superior quedará reservada para las notificaciones.

---

# 7. Arquitectura del Backend

El backend estará construido mediante Cloudflare Workers y tRPC.

Su única responsabilidad será ejecutar los casos de uso del sistema.

---

## 7.1 Organización

La estructura será la siguiente.

```text
src/

├── routers/

├── services/

├── repositories/

├── domain/

├── middleware/

├── db/

└── utils/
```

---

## 7.2 Routers

Los routers expondrán la API pública de la aplicación.

No contendrán lógica de negocio.

Su función será:

- Validar entrada.
- Invocar servicios.
- Devolver respuestas tipadas.

---

## 7.3 Servicios

Los servicios implementarán los casos de uso.

Ejemplos:

- Repartir cartas.
- Jugar carta.
- Descartar carta.
- Obtener historial.
- Generar notificaciones.

Los servicios coordinarán el dominio y la persistencia.

---

## 7.4 Repositorios

Los repositorios encapsularán completamente el acceso a D1.

El resto del sistema nunca realizará consultas SQL directamente.

---

# 8. Persistencia

Toda la persistencia será gestionada mediante Drizzle ORM.

La aplicación nunca accederá directamente a la base de datos.

---

## 8.1 Base de datos

Cloudflare D1 almacenará:

- Usuarios.
- Managers.
- Temporadas.
- Definiciones de cartas.
- Copias de cartas.
- Movimientos.
- Notificaciones.

---

## 8.2 Recursos estáticos

Cloudflare R2 almacenará:

- Imágenes de cartas.
- Logotipos.
- Iconografía personalizada.
- Recursos multimedia.

---

## 8.3 Migraciones

Todas las modificaciones del esquema de base de datos se realizarán mediante migraciones versionadas.

Nunca se modificarán tablas manualmente en producción.

---

# 9. Dominio

El dominio contiene todas las reglas del juego.

Es completamente independiente de la infraestructura.

---

## 9.1 Entidades principales

Las entidades del dominio son:

- League
- Season
- User
- Manager
- CardDefinition
- CardCopy
- CardMovement
- Notification

---

## 9.2 CardDefinition

Define las propiedades permanentes de una carta.

Incluye:

- Nombre.
- Apodo.
- Rareza.
- Descripción.
- Imagen.
- Plantilla del mensaje para WhatsApp.

Las CardDefinition son inmutables durante una temporada.

---

## 9.3 CardCopy

Representa una copia física de una CardDefinition.

Cada CardCopy:

- Tiene identidad propia.
- Pertenece a una Season.
- Puede ser repartida varias veces.
- Mantiene su historial completo de movimientos.

---

## 9.4 CardMovement

Todo cambio realizado sobre una CardCopy genera un CardMovement.

Los movimientos son:

- Inmutables.
- Cronológicos.
- Auditables.

Nunca podrán modificarse.

Nunca podrán eliminarse.

---

## 9.5 Ciclo de vida de una CardCopy

Durante una temporada una carta podrá recorrer el siguiente ciclo.

### Reparto

```text
Deck

↓

Hand
```

---

### Juego

```text
Hand

↓

Played

↓

Deck
```

---

### Descarte

```text
Hand

↓

Discarded

↓

Deck
```

---

### Devolución

```text
Played

↓

Hand
```

Cada transición generará un CardMovement independiente.

---

# 10. Flujo de datos

El flujo de información siempre seguirá el mismo recorrido.

```text
React

↓

tRPC Client

↓

Cloudflare Worker

↓

Service

↓

Repository

↓

Drizzle ORM

↓

Cloudflare D1
```

Las respuestas seguirán exactamente el camino inverso.

No existirán accesos directos entre el cliente y la base de datos.
# 11. Seguridad

La seguridad de la aplicación se basará en el principio de mínimo privilegio.

Cada usuario únicamente podrá acceder a los recursos que le correspondan según su rol.

---

## 11.1 Autenticación

El acceso a la aplicación requerirá autenticación.

Toda petición al backend deberá estar asociada a una sesión válida.

Las rutas protegidas no podrán ejecutarse sin autenticación previa.

---

## 11.2 Autorización

El backend será el responsable de validar los permisos del usuario autenticado.

La ocultación de opciones en la interfaz no sustituye la validación de permisos en el servidor.

---

## 11.3 Validación

Todas las entradas recibidas por la API deberán validarse antes de ejecutar cualquier caso de uso.

No se confiará en los datos enviados por el cliente.

---

## 11.4 Auditoría

Las operaciones relevantes quedarán registradas mediante CardMovement y Notification.

Este registro permitirá reconstruir cualquier acción realizada durante una temporada.

---

# 12. Rendimiento

La aplicación deberá ofrecer una experiencia fluida tanto en dispositivos móviles como en escritorio.

---

## 12.1 Cliente

El frontend minimizará el número de peticiones al servidor mediante:

- Caché de consultas.
- Reutilización de datos.
- Invalidación selectiva.

---

## 12.2 Servidor

Los casos de uso deberán minimizar el número de consultas a la base de datos.

Siempre que sea posible, una operación funcional deberá resolverse mediante una única transacción.

---

## 12.3 Recursos estáticos

Las imágenes y recursos gráficos se servirán desde Cloudflare R2.

Esto permitirá aprovechar la red de distribución global de Cloudflare y reducir los tiempos de carga.

---

# 13. Escalabilidad

Aunque el MVP está pensado para una única liga de entre ocho y diez managers, la arquitectura permitirá crecer sin cambios estructurales.

---

## 13.1 Escalabilidad horizontal

La infraestructura serverless permitirá atender múltiples usuarios concurrentes sin necesidad de administrar servidores.

---

## 13.2 Escalabilidad funcional

La arquitectura permitirá incorporar nuevas funcionalidades sin modificar el núcleo del dominio.

Ejemplos:

- Nuevas cartas.
- Nuevos tipos de notificaciones.
- Nuevos paneles administrativos.
- Estadísticas avanzadas.

---

## 13.3 Escalabilidad del dominio

El modelo de dominio permitirá soportar en el futuro:

- Varias ligas.
- Múltiples temporadas históricas.
- Nuevos roles.
- Nuevos tipos de eventos.

Estas capacidades no forman parte del MVP, pero la arquitectura no impedirá su incorporación.

---

# 14. Integración futura con Biwenger

La primera versión de Munchinking League funcionará de manera independiente a Biwenger.

Los efectos de las cartas serán aplicados manualmente por el administrador.

No obstante, la arquitectura contempla una futura integración.

---

## 14.1 Objetivos

Una futura integración podrá permitir:

- Obtener managers automáticamente.
- Sincronizar plantillas.
- Consultar jornadas.
- Aplicar automáticamente determinados efectos.

---

## 14.2 Desacoplamiento

Toda integración con sistemas externos deberá implementarse mediante una capa específica de servicios.

El dominio nunca dependerá directamente de APIs externas.

---

## 14.3 Sustitución

Si en el futuro cambia la forma de acceder a Biwenger, únicamente será necesario modificar dicha capa de integración.

El resto de la aplicación permanecerá inalterado.

---

# 15. Convenciones

Con el objetivo de mantener un código homogéneo durante todo el proyecto, se establecen las siguientes convenciones.

---

## 15.1 Idioma

- Código en inglés.
- Interfaz en español.
- Documentación funcional en español.

---

## 15.2 Nomenclatura

Las entidades del dominio utilizarán nombres en singular.

Ejemplos:

- Manager
- Season
- CardDefinition
- CardCopy

---

## 15.3 Responsabilidades

Cada módulo tendrá una única responsabilidad.

No se mezclarán responsabilidades de presentación, dominio o persistencia.

---

## 15.4 Dependencias

Las dependencias entre capas siempre serán descendentes.

Una capa nunca dependerá de una capa superior.

---

## 15.5 Persistencia

El acceso a la base de datos se realizará exclusivamente a través de repositorios.

No se ejecutarán consultas SQL desde servicios, routers o componentes del frontend.

---

## 15.6 Gestión del estado

El estado remoto pertenecerá a TanStack Query.

El estado local pertenecerá a React.

No se utilizará un gestor global de estado mientras no exista una necesidad real.

---

## 15.7 Trazabilidad

Toda operación relevante sobre una carta deberá generar un CardMovement.

No existirán modificaciones silenciosas del estado de una carta.

---

# 16. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Primera versión de la arquitectura de Munchinking League. |