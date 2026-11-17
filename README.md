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
| Recursos gráficos  | Cloudflare R2                                                               |
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

## Próximo paso inmediato

Ejecutar **Fase 0** (aprovisionamiento gratuito en Cloudflare D1/R2/Workers/Pages) y **Fase 1** (scaffolding del monorepo `pnpm` + dominio + migraciones Drizzle) siguiendo [`docs/10-roadmap-and-execution-plan.md`](./docs/10-roadmap-and-execution-plan.md).
