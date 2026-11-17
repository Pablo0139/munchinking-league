# 🃏 Munchinking League — Índice de Documentación

> Documentación funcional, arquitectónica, de diseño y operativa de **Munchinking League**.

---

## Información general

| Campo | Valor |
|-------|-------|
| Proyecto | Munchinking League |
| Versión documental | 1.2 |
| Estado | Especificación completa — Lista para Fase 0 / Fase 1 |
| Última actualización | 17/11/2026 |

---

## Mapa canónico de documentos (`docs/`)

Todos los documentos siguen una única línea técnica coherente (**Monorepo TypeScript + React/Vite/Tailwind/TanStack + tRPC + Cloudflare Pages/Workers/D1/R2 + Drizzle ORM**) y respetan el lenguaje ubicuo congelado en `00-glossary.md`:

| Orden | Archivo | Propósito | Estado |
|-------|---------|-----------|--------|
| 00 | [`00-glossary.md`](./00-glossary.md) | Lenguaje ubicuo (`League`, `Season`, `Manager`, `CardDefinition`, `CardCopy`, `CardMovement`, `DistributionBatch`, `TargetType`). | FROZEN v1.1 |
| 01 | [`01-user-flows-and-stories.md`](./01-user-flows-and-stories.md) | Mapa de navegación, flujos extremo a extremo e historias de usuario (`HU-01`..`HU-11`) con criterios de aceptación. | APPROVED v1.0 |
| 02 | [`02-functional-specification.md`](./02-functional-specification.md) | Alcance del MVP, reglas del juego, pantallas, casos excepcionales y requisitos no funcionales. | APPROVED v1.1 |
| 03 | [`03-architecture.md`](./03-architecture.md) | Arquitectura por capas, seguridad de sesiones en Workers, atomicidad en D1 y Cron semanal. | APPROVED v1.1 |
| 04 | [`04-domain-model.md`](./04-domain-model.md) | Entidades, agregados, invariantes, eventos y ciclo de vida de las cartas. | APPROVED v1.1 |
| 05 | [`05-data-model.md`](./05-data-model.md) | Esquema relacional completo para Cloudflare D1 + Drizzle ORM, claves foráneas, índices únicos parciales y `CHECK`. | APPROVED v1.2 |
| 06 | [`06-api-contract.md`](./06-api-contract.md) | Contrato completo de procedimientos tRPC (`auth`, `manager`, `cards`, `history`, `library`, `notifications`, `distribution`, `admin`). | APPROVED v1.1 |
| 07 | [`07-project-structure.md`](./07-project-structure.md) | Estructura física del monorepo (`apps/web`, `apps/api`, `packages/domain`, `packages/shared`, `packages/config`, `db/`). | APPROVED v1.1 |
| 08 | [`08-design-system.md`](./08-design-system.md) | Paleta morada oficial, tipografía, anatomía 5:7 de cartas, rarezas accesibles (forma + color), abanico y PWA. | APPROVED v1.0 |
| 09 | [`09-card-catalog-and-templates.md`](./09-card-catalog-and-templates.md) | Motor determinista de plantillas de WhatsApp, dimensionamiento del mazo y catálogo semilla inicial. | APPROVED v1.0 |
| 10 | [`10-roadmap-and-execution-plan.md`](./10-roadmap-and-execution-plan.md) | Dimensionamiento Cloudflare Free Tier, checklist de infraestructura (Fase 0) y plan de desarrollo por fases (Fases 1–6). | APPROVED v1.0 |

---

## Orden de lectura recomendado

1. **Negocio y producto:** `00-glossary.md` → `02-functional-specification.md` → `01-user-flows-and-stories.md` → `09-card-catalog-and-templates.md`.
2. **Diseño y experiencia móvil:** `08-design-system.md`.
3. **Ingeniería y datos:** `03-architecture.md` → `04-domain-model.md` → `05-data-model.md` → `06-api-contract.md` → `07-project-structure.md`.
4. **Puesta en marcha e infraestructura:** `10-roadmap-and-execution-plan.md`.