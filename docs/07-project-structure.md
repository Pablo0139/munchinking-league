# Estructura del Proyecto

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Estructura del Proyecto |
| Archivo | `07-project-structure.md` |
| Versión | 1.0 |
| Estado | DRAFT |
| Última actualización | 18/08/2026 |

---

# 1. Introducción

## 1.1 Objetivo

Este documento define la estructura física y lógica del código fuente de Munchinking League.

Su objetivo es establecer:

- La organización de carpetas.
- La separación de responsabilidades.
- La ubicación de cada tipo de código.
- Las dependencias permitidas entre capas.
- Las convenciones principales de organización.

La estructura deberá permitir desarrollar frontend y backend de forma independiente, manteniendo una separación clara entre presentación, aplicación, dominio y persistencia.

---

# 2. Principios de organización

El proyecto seguirá los siguientes principios:

- Separación entre frontend y backend.
- Separación entre dominio y persistencia.
- El dominio no dependerá de tecnologías concretas.
- El frontend no accederá directamente a la base de datos.
- La comunicación entre frontend y backend se realizará mediante tRPC.
- Las validaciones de negocio se realizarán en el backend.
- Los componentes visuales no contendrán lógica de negocio.
- El código compartido se ubicará en módulos explícitamente compartidos.
- Las operaciones de persistencia estarán aisladas de los casos de uso.
- Las cartas serán tratadas como una funcionalidad de dominio y no como simples elementos visuales.

---

# 3. Estructura general del repositorio

La estructura propuesta para el repositorio será:

    munchinking-league/
    │
    ├── apps/
    │   ├── web/
    │   └── api/
    │
    ├── packages/
    │   ├── domain/
    │   ├── shared/
    │   └── config/
    │
    ├── db/
    │
    ├── tests/
    │
    ├── docs/
    │
    ├── public/
    │
    ├── package.json
    ├── tsconfig.json
    ├── wrangler.toml
    └── README.md

La estructura exacta podrá adaptarse a las necesidades del framework elegido, pero se mantendrán las responsabilidades definidas en este documento.

---

# 4. Apps

El directorio `apps` contiene las aplicaciones ejecutables del proyecto.

## 4.1 apps/web

Contiene el frontend de Munchinking League.

Responsabilidades:

- Renderizado de la interfaz.
- Navegación.
- Gestión del estado visual.
- Componentes de interfaz.
- Animaciones.
- Interacción con el usuario.
- Consumo de la API tRPC.

No deberá contener:

- Consultas directas a la base de datos.
- Reglas de negocio.
- Lógica de autorización.
- Mutaciones directas sobre entidades de dominio.

---

## 4.2 apps/api

Contiene el backend de la aplicación.

Responsabilidades:

- Exposición de la API.
- Autenticación.
- Autorización.
- Ejecución de casos de uso.
- Validación de entradas.
- Acceso a persistencia mediante repositorios.
- Gestión de transacciones.
- Generación de mensajes de WhatsApp.
- Gestión de notificaciones.

La API será el único punto de entrada para las operaciones de negocio realizadas desde el frontend.

---

# 5. Packages

El directorio `packages` contiene código reutilizable entre aplicaciones.

## 5.1 packages/domain

Contiene el modelo de dominio y las reglas de negocio.

Aquí se encontrarán las entidades, value objects, tipos y reglas fundamentales de Munchinking League.

Entre otros:

- League.
- Season.
- Manager.
- CardDefinition.
- CardCopy.
- CardMovement.
- Notification.
- Reglas relacionadas con el estado de las cartas.

El dominio no deberá depender de:

- React.
- tRPC.
- Drizzle.
- Cloudflare.
- APIs HTTP.
- Componentes de UI.

---

## 5.2 packages/shared

Contiene elementos compartidos entre frontend y backend.

Podrá incluir:

- Tipos comunes.
- Constantes.
- Utilidades puras.
- Esquemas compartidos.
- Tipos de respuesta.
- Enumeraciones utilizadas por ambos lados.

No deberá utilizarse como un contenedor genérico para lógica de negocio.

Si una funcionalidad pertenece al dominio, deberá permanecer en `packages/domain`.

---

## 5.3 packages/config

Contiene configuración compartida del proyecto.

Podrá incluir:

- Configuración de TypeScript.
- Configuración de linting.
- Configuración de formato.
- Configuración común de herramientas.

No contendrá secretos.

---

# 6. Base de datos

La persistencia se ubicará en el directorio:

    db/

Su responsabilidad será exclusivamente la infraestructura de datos.

La estructura propuesta será:

    db/
    ├── schema/
    ├── migrations/
    ├── seed/
    └── index.ts

---

## 6.1 db/schema

Contendrá los esquemas de Drizzle ORM.

Aquí se definirán las tablas correspondientes al modelo de datos.

Entre otras:

- `user`
- `league`
- `season`
- `manager`
- `card_definition`
- `card_copy`
- `card_movement`
- `notification`

Los nombres concretos podrán ajustarse a las convenciones utilizadas por Drizzle.

---

## 6.2 db/migrations

Contendrá las migraciones de base de datos.

Las migraciones deberán mantenerse versionadas en Git.

No se modificarán manualmente migraciones ya aplicadas.

Los cambios estructurales de la base de datos deberán generar nuevas migraciones.

---

## 6.3 db/seed

Contendrá datos necesarios para inicializar entornos de desarrollo o pruebas.

Podrá utilizarse para:

- Crear una League.
- Crear una Season.
- Crear managers de prueba.
- Crear CardDefinition.
- Crear usuarios de prueba.

Los seeds no deberán utilizarse para introducir datos específicos de producción.

---

# 7. Backend

La estructura interna de `apps/api` seguirá una separación por responsabilidades.

Propuesta:

    apps/api/
    ├── src/
    │   ├── routers/
    │   ├── application/
    │   ├── infrastructure/
    │   ├── auth/
    │   ├── whatsapp/
    │   └── index.ts
    │
    └── package.json

---

# 8. API Routers

El directorio:

    apps/api/src/routers/

contendrá los routers tRPC.

La estructura será:

    routers/
    ├── auth.ts
    ├── manager.ts
    ├── cards.ts
    ├── history.ts
    ├── notifications.ts
    ├── distribution.ts
    ├── library.ts
    ├── admin.ts
    └── index.ts

Cada router será responsable de exponer los procedimientos correspondientes a su área funcional.

Los routers no deberán contener lógica de negocio compleja.

Su responsabilidad principal será:

1. Recibir la petición.
2. Validar la entrada.
3. Comprobar autenticación y autorización.
4. Invocar el caso de uso correspondiente.
5. Transformar el resultado en la respuesta de la API.

---

# 9. Application Layer

El directorio:

    apps/api/src/application/

contendrá los casos de uso de la aplicación.

Ejemplo:

    application/
    ├── auth/
    ├── cards/
    ├── distribution/
    ├── history/
    ├── notifications/
    └── admin/

Los casos de uso representarán operaciones completas del sistema.

Ejemplos:

- `Login`
- `PlayCard`
- `DiscardCard`
- `GetManagerHand`
- `GetPublicHistory`
- `GetPersonalHistory`
- `ExecuteDistribution`
- `MarkNotificationAsRead`
- `ReturnCard`

Los casos de uso serán responsables de coordinar:

- Dominio.
- Repositorios.
- Transacciones.
- Servicios necesarios.

---

# 10. Infrastructure Layer

El directorio:

    apps/api/src/infrastructure/

contendrá las implementaciones concretas de infraestructura.

Ejemplo:

    infrastructure/
    ├── repositories/
    ├── database/
    ├── sessions/
    └── services/

Aquí podrán encontrarse:

- Implementaciones de repositorios.
- Acceso a Drizzle.
- Gestión de sesiones.
- Servicios externos.
- Implementaciones específicas de Cloudflare.

El dominio y los casos de uso no deberán depender directamente de una implementación concreta cuando pueda utilizarse una abstracción.

---

# 11. Repositorios

Los repositorios deberán separar la lógica de acceso a datos de los casos de uso.

Ejemplo:

    infrastructure/repositories/
    ├── user.repository.ts
    ├── manager.repository.ts
    ├── season.repository.ts
    ├── card-definition.repository.ts
    ├── card-copy.repository.ts
    ├── card-movement.repository.ts
    └── notification.repository.ts

Las interfaces de repositorio que formen parte de la lógica de aplicación podrán definirse en la capa de aplicación o dominio, mientras que sus implementaciones concretas estarán en infraestructura.

---

# 12. Sistema de cartas

Las cartas constituyen una parte central de la aplicación.

Su código deberá distinguir entre:

- Definición de una carta.
- Copia concreta de una carta.
- Estado de una copia.
- Movimiento de una copia.
- Reglas de la carta.
- Presentación visual de la carta.

No se deberá mezclar la definición de una carta con su representación visual.

Por ejemplo:

    CardDefinition
        │
        ├── name
        ├── nickname
        ├── description
        ├── rarity
        └── image

Una `CardCopy` representa una instancia concreta de esa definición dentro de una Season.

---

# 13. Frontend

La estructura propuesta para `apps/web` será:

    apps/web/
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── features/
    │   ├── hooks/
    │   ├── lib/
    │   └── styles/
    │
    ├── public/
    └── package.json

---

# 14. App

El directorio:

    apps/web/src/app/

contendrá las páginas y rutas de la aplicación.

Las rutas principales previstas son:

- Login.
- Pantalla principal.
- Historial personal.
- Biblioteca.
- Notificaciones.
- Administración.

La navegación inferior estará disponible de forma persistente en las pantallas que formen parte de la aplicación autenticada.

---

# 15. Components

El directorio:

    apps/web/src/components/

contendrá componentes reutilizables de presentación.

Podrá organizarse en:

    components/
    ├── ui/
    ├── cards/
    ├── navigation/
    ├── notifications/
    └── history/

Ejemplos de componentes:

- `Card`
- `CardFan`
- `CardDetail`
- `BottomNavigation`
- `NotificationBadge`
- `NotificationList`
- `HistoryList`

Los componentes deberán evitar contener lógica de negocio.

---

# 16. Features

El directorio:

    apps/web/src/features/

contendrá lógica específica de cada funcionalidad de frontend.

Ejemplo:

    features/
    ├── authentication/
    ├── hand/
    ├── cards/
    ├── history/
    ├── notifications/
    ├── library/
    └── administration/

Una feature podrá contener:

- Componentes específicos.
- Hooks.
- Estado local.
- Transformaciones de datos.
- Lógica de interacción.

Las operaciones de negocio seguirán ejecutándose mediante la API.

---

# 17. Hooks

El directorio:

    apps/web/src/hooks/

contendrá hooks reutilizables del frontend.

No deberán utilizarse para ocultar reglas de negocio que deberían pertenecer al backend.

---

# 18. Lib

El directorio:

    apps/web/src/lib/

contendrá utilidades y configuración del frontend.

Podrá incluir:

- Cliente tRPC.
- Configuración de sesión.
- Utilidades de navegación.
- Funciones de presentación.
- Gestión del portapapeles.

---

# 19. Styles

El directorio:

    apps/web/src/styles/

contendrá los estilos globales y configuración visual de la aplicación.

La identidad visual deberá mantener las decisiones definidas para Munchinking League:

- Estética clara.
- Uso del morado como color principal.
- Tipografía sobria.
- Bordes de cartas consistentes.
- Rareza diferenciada mediante forma y color en la esquina inferior izquierda.

---

# 20. Flujo de una operación

Una operación típica seguirá el siguiente flujo:

    Frontend
        │
        ▼
    tRPC Router
        │
        ▼
    Application / Use Case
        │
        ▼
    Domain
        │
        ▼
    Repository
        │
        ▼
    Database

La respuesta seguirá el camino inverso.

---

# 21. Ejemplo: jugar una carta

Cuando un manager juega una carta:

    Card UI
        │
        ▼
    cards.play
        │
        ▼
    PlayCard use case
        │
        ├── validar manager
        ├── validar CardCopy
        ├── aplicar reglas
        ├── actualizar CardCopy
        ├── crear CardMovement
        └── generar mensaje WhatsApp
        │
        ▼
    Database
        │
        ▼
    Response
        │
        ├── CardCopy
        ├── CardMovement
        └── WhatsApp message

La carta pasa directamente a estado jugado.

No existe un estado intermedio de validación.

---

# 22. Dependencias entre capas

Las dependencias deberán respetar las siguientes reglas:

    Frontend
        ↓
    API
        ↓
    Application
        ↓
    Domain

La infraestructura podrá ser utilizada por Application mediante las abstracciones correspondientes.

El dominio no deberá depender de ninguna capa externa.

No estará permitido:

- `Domain → Database`
- `Domain → tRPC`
- `Domain → React`
- `Frontend → Database`
- `Frontend → Drizzle`

---

# 23. Configuración

La configuración dependiente del entorno deberá gestionarse mediante variables de entorno.

Ejemplos:

- Configuración de base de datos.
- Configuración de sesiones.
- Secretos de autenticación.
- Configuración de Cloudflare.

Los secretos nunca deberán almacenarse en Git.

Los valores necesarios para desarrollo deberán documentarse mediante un fichero de ejemplo, por ejemplo:

    .env.example

---

# 24. Assets

Los recursos visuales estarán organizados de forma que puedan distinguirse:

- Logo.
- Iconos.
- Imágenes de cartas.
- Recursos de interfaz.

Los assets específicos de una carta deberán poder asociarse a su `CardDefinition`.

La base de datos almacenará la referencia al recurso, no el archivo binario de la imagen.

---

# 25. Tests

Los tests se organizarán según la responsabilidad que estén verificando.

## 25.1 Tests de dominio

Verificarán reglas puras del dominio.

Ejemplos:

- Una carta no puede jugarse si no está en la mano.
- Una mano no puede superar el límite establecido.
- Una CardCopy puede volver al mazo.
- Las transiciones de estado son válidas.

---

## 25.2 Tests de aplicación

Verificarán casos de uso completos.

Ejemplos:

- Jugar una carta crea el movimiento correspondiente.
- Descartar una carta la devuelve al mazo.
- Ejecutar un reparto asigna cartas.
- Marcar una notificación como leída actualiza su estado.

---

## 25.3 Tests de API

Verificarán:

- Autenticación.
- Autorización.
- Validación de entradas.
- Respuestas.
- Errores.
- Acceso correcto a los casos de uso.

---

## 25.4 Tests de frontend

Verificarán principalmente:

- Renderizado.
- Interacciones.
- Navegación.
- Estados visuales.
- Comportamiento de componentes.

---

# 26. Convenciones de nombres

Se utilizarán las siguientes convenciones:

- Archivos TypeScript: `kebab-case`.
- Variables y funciones: `camelCase`.
- Clases: `PascalCase`.
- Componentes React: `PascalCase`.
- Tipos e interfaces: `PascalCase`.
- Constantes globales: `UPPER_SNAKE_CASE` cuando corresponda.

Los nombres deberán ser descriptivos y evitar abreviaturas innecesarias.

---

# 27. Imports

Los imports deberán respetar la arquitectura del proyecto.

No se permitirán imports que creen dependencias circulares entre capas.

Las dependencias deberán apuntar siempre hacia capas de menor nivel de abstracción.

Las reglas concretas de linting podrán reforzar estas restricciones.

---

# 28. Código compartido

Solo se moverá código a `packages/shared` cuando exista una necesidad real de compartirlo entre frontend y backend.

No se utilizará `shared` como mecanismo para evitar decidir dónde pertenece una funcionalidad.

La lógica de negocio permanecerá en `packages/domain`.

---

# 29. Documentación

El directorio `docs/` contendrá la documentación técnica y funcional del proyecto.

Los documentos deberán mantenerse sincronizados con la implementación.

La documentación actualmente definida incluye:

- `glossary.md`
- Documento funcional.
- Documento de arquitectura.
- Modelo de dominio.
- Modelo de datos.
- `06-api-contract.md`
- `07-project-structure.md`

Los nombres definitivos de los documentos podrán ajustarse a la estructura establecida en el repositorio.

---

# 30. Desarrollo local

El proyecto deberá poder ejecutarse localmente sin depender de servicios de producción.

El entorno local deberá disponer de:

- Base de datos de desarrollo.
- Datos iniciales mediante seed.
- Variables de entorno locales.
- Frontend.
- Backend.

---

# 31. Producción

El despliegue deberá mantener separadas las configuraciones de desarrollo y producción.

Las credenciales y secretos de producción serán gestionados por la plataforma de despliegue.

El código fuente no contendrá secretos ni credenciales.

---

# 32. Cloudflare

La infraestructura de producción utilizará los servicios de Cloudflare definidos en la arquitectura.

La dependencia con Cloudflare deberá permanecer principalmente en la capa de infraestructura.

El dominio y los casos de uso no deberán conocer detalles específicos de Cloudflare.

---

# 33. Regla general de arquitectura

Ante cualquier nueva funcionalidad deberá determinarse primero a qué capa pertenece.

La prioridad será:

1. UI y comportamiento visual → Frontend.
2. Comunicación con el cliente → API.
3. Coordinación de operaciones → Application.
4. Reglas de negocio → Domain.
5. Persistencia o servicios externos → Infrastructure.

No deberá colocarse código en una capa únicamente por comodidad si conceptualmente pertenece a otra.

---

# 34. Evolución del proyecto

La estructura deberá permitir añadir funcionalidades futuras sin modificar innecesariamente las existentes.

Entre las posibles ampliaciones se encuentran:

- Integración con Biwenger.
- Nuevas cartas.
- Nuevas reglas de cartas.
- Nuevas temporadas.
- Nuevas funciones administrativas.
- Nuevos tipos de notificaciones.
- Integraciones externas.

Estas ampliaciones deberán incorporarse respetando las mismas capas y responsabilidades.

---

# 35. Estado del documento

Este documento define la estructura propuesta para el proyecto y servirá como referencia durante la implementación.

Las decisiones de negocio deberán seguir siendo definidas en los documentos funcionales y de dominio.

Las decisiones de infraestructura deberán seguir siendo coherentes con el documento de arquitectura.

---

# 36. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Primera versión de la estructura del proyecto. |