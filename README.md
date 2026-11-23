# 🃏 Munchinking League

> Aplicación web complementaria (Mobile First & PWA) para la gestión oficial de Cartas Personalizadas de la **Munchinking League**.

---

## Visión general

**Munchinking League** complementa la competición deportiva gestionada en Biwenger actuando como el **registro oficial e inmutable de cartas** de la temporada:

- **Mano privada en abanico** (máximo 3 cartas por manager, ocultas por defecto).
- **Juego y descarte instantáneo** con retorno automático de la copia al mazo (`Deck`).
- **Generación oficial de mensajes para WhatsApp** listos para copiar y pegar en el grupo de la liga.
- **Reparto semanal automático** cada lunes e idempotente por semana ISO.
- **Historial diferenciado** (público, personal y administrativo) + **Centro de notificaciones** con revelación animada de nuevas cartas.

---

## Stack tecnológico (100% Free Tier)

| Capa               | Tecnología                                                                  |
| ------------------ | --------------------------------------------------------------------------- |
| Frontend           | React + TypeScript + Vite + Tailwind CSS + TanStack Router + TanStack Query |
| API / Contratos    | tRPC (tipado extremo a extremo) + Zod                                       |
| Backend Serverless | Cloudflare Workers (incluye Cron Trigger semanal)                           |
| Persistencia       | Cloudflare D1 (SQLite) + Drizzle ORM                                        |
| Recursos gráficos  | Estáticos de Pages y emblema de respaldo local; staging no necesita R2       |
| Hosting Frontend   | Cloudflare Pages                                                            |

---

## Estructura prevista del monorepo

```text
munchinking-league/
├── apps/
│   ├── web/          # SPA React + PWA (Cloudflare Pages)
│   └── api/          # Servidor tRPC + Cron semanal (Cloudflare Workers)
├── packages/
│   ├── domain/       # Entidades y reglas puras del juego
│   ├── shared/       # Tipos, enums y esquemas Zod compartidos
│   └── config/       # Configuraciones base de TS / ESLint
├── db/
│   ├── schema/       # Esquemas Drizzle ORM
│   ├── migrations/   # Migraciones SQL versionadas para D1
│   └── seed/         # Semillas de desarrollo y catálogo de cartas
└── docs/             # Especificación funcional, técnica y plan de ejecución
```

---

## Documentación completa

Consulta el índice maestro en [`docs/README.md`](./docs/README.md):

- [`docs/00-glossary.md`](./docs/00-glossary.md) — Lenguaje ubicuo del dominio.
- [`docs/01-user-flows-and-stories.md`](./docs/01-user-flows-and-stories.md) — Flujos de usuario e historias con criterios de aceptación.
- [`docs/02-functional-specification.md`](./docs/02-functional-specification.md) — Especificación funcional del MVP.
- [`docs/03-architecture.md`](./docs/03-architecture.md) — Arquitectura por capas, seguridad y concurrencia en D1.
- [`docs/04-domain-model.md`](./docs/04-domain-model.md) — Modelo de dominio e invariantes.
- [`docs/05-data-model.md`](./docs/05-data-model.md) — Modelo relacional SQLite / Drizzle ORM.
- [`docs/06-api-contract.md`](./docs/06-api-contract.md) — Contrato completo de procedimientos tRPC.
- [`docs/07-project-structure.md`](./docs/07-project-structure.md) — Organización detallada de paquetes y capas.
- [`docs/08-design-system.md`](./docs/08-design-system.md) — Sistema de diseño, anatomía de cartas, rarezas y PWA.
- [`docs/09-card-catalog-and-templates.md`](./docs/09-card-catalog-and-templates.md) — Plantillas de WhatsApp y catálogo semilla de cartas.
- [`docs/10-roadmap-and-execution-plan.md`](./docs/10-roadmap-and-execution-plan.md) — Plan de infraestructura Cloudflare y ejecución por fases.

---

## Estado y próximo paso

La Fase 3 incorpora acceso por sesión, mano privada, juego y descarte con confirmación, mensaje para WhatsApp y carrusel público. El [preview de develop](https://develop.munchinking-league.pages.dev/login) utiliza el Worker de staging bajo el mismo origen. Las cuentas de la semilla **solo se utilizan en local**.

**Fase 4 verificada en local (20/11/2026).** Sobre `develop`, se conserva la Fase 3 y se añaden la biblioteca con búsqueda y filtro de rareza, el historial público y personal paginado, la lectura de avisos sincronizada entre pestañas y el perfil con cuatro métricas. Vitest: 20/20; lint, typecheck y build correctos. No hubo commit, push ni despliegue de Fase 4: el preview sigue en la entrega anterior. Para publicar esta entrega, el Worker y la web deben ser de la misma versión.

Para trabajar en local, desde la raíz y con Node 22+ y Corepack: instalar (`corepack pnpm install --frozen-lockfile`), preparar D1 local (`corepack pnpm db:setup:local`) y arrancar en dos terminales `corepack pnpm dev:api` y `corepack pnpm dev:web`. Abrir `http://localhost:5173`. La semilla comienza con las cartas en el mazo: una mano vacía es el estado esperado antes del reparto.

**Si ya tienes datos locales**, ejecuta `corepack pnpm db:migrate:local` desde la raíz en lugar de `db:setup:local`. Aplica las migraciones pendientes sin volver a sembrar D1. En cada entorno, la migración `0001` debe aplicarse **antes** de arrancar o desplegar el nuevo Worker.

**Catálogo T26/27.** En una D1 dev existente y migrada, ejecuta `corepack pnpm db:catalog:local` desde la raíz. Para generar y revisar el SQL sin aplicarlo, usa `corepack pnpm db:catalog:sql`. El actualizador reconoce los IDs de la liga y temporada del seed dev; si no existen, no carga nada. No crea cuentas, no cambia credenciales ni resiembra manos. En una D1 local **nueva**, `corepack pnpm db:setup:local` carga directamente las 33 definiciones oficiales y ninguna demo.

La dotación operativa es de 3 copias por común, 2 por rara y 1 por épica: 71 copias para las 33 cartas. Los IDs estables permiten repetir la carga sin duplicar ni recuperar cartas en mano. Se retiran globalmente solo las 13 definiciones originales de demostración (por ID y slug), sin borrar sus copias, movimientos ni avisos. Las demos que estén en mano se pueden jugar o descartar; al volver al mazo no se reparten. La biblioteca solo muestra cartas habilitadas con copias en la temporada activa.

**Fase 5 verificada en local (20/11/2026).** Con una sesión `ADMIN`, abre `/admin` para filtrar el historial, devolver cartas, enviar avisos y consultar o confirmar el reparto semanal. Las 28 pruebas pasan, incluidas las de concurrencia y doble reparto pendientes de Fase 2. No hubo commit, push ni despliegue de Fase 5.

En staging está confirmado el horario del cron, no un reparto real: no hay temporada activa ni lotes `CRON`. La [bitácora de Fase 5](../Documentacion/bitacoras/2026-11-20-fase5-administracion-reparto.md) separa las pruebas locales de las consultas remotas. La Fase 6 (catálogo, QA en dispositivos físicos y producción) no está autorizada. Véase la [hoja de ruta](./docs/10-roadmap-and-execution-plan.md).
