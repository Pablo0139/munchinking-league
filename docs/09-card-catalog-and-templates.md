# Catálogo de Cartas, Reglas de Semilla y Plantillas de WhatsApp

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Catálogo de Cartas, Reglas de Semilla y Plantillas de WhatsApp |
| Archivo | `09-card-catalog-and-templates.md` |
| Versión | 1.0 |
| Estado | APPROVED |
| Última actualización | 17/11/2026 |

---

# 1. Objetivo

Estandarizar:

1. El **motor determinista de plantillas de WhatsApp** (variables permitidas, sanitización y formato oficial para el grupo).
2. La **estructura canónica del seed** (`db/seed/`) para cargar la liga, managers y el catálogo de `CardDefinition` sin tocar código cuando se ajusten textos o número de copias antes de iniciar temporada.
3. El **juego base de cartas de referencia / desarrollo** listo para pruebas locales y adaptable 1:1 al reglamento oficial de cartas de la Munchinking League.

---

# 2. Motor de Plantillas de WhatsApp

## 2.1 Variables soportadas

El servicio `WhatsappMessageFormatter` en `apps/api/src/whatsapp/` únicamente interpolará marcadores explícitos encerrados entre dobles llaves `{{variable}}`, sin evaluar expresiones arbitrarias:

| Variable | Origen | Obligatoria | Ejemplo |
|----------|--------|-------------|---------|
| `{{managerName}}` | `manager.displayName` del jugador que usa la carta | Sí | `Bar Zacarías` |
| `{{teamName}}` | `manager.teamName` (o `displayName` si no existe) | No | `Bar Zacarías` |
| `{{cardName}}` | `cardDefinition.name` | Sí | `Presi-Culo` |
| `{{cardNickname}}` | `cardDefinition.nickname` | Sí | `El decreto del palco` |
| `{{rarityLabel}}` | Traducción legible de `cardDefinition.rarity` | Sí | `Épica` |
| `{{targetManager}}` | `targetManager.displayName` cuando `targetType = 'MANAGER'` | Condicional | `Manu Eleven` |
| `{{targetLabel}}` | Texto validado cuando `targetType = 'PLAYER' \| 'FREE_TEXT'` | Condicional | `Lamine Yamal` |
| `{{playedAt}}` | Fecha/hora formateada en `Europe/Madrid` (`DD/MM/YYYY HH:mm`) | Sí | `17/11/2026 20:14` |
| `{{movementShortId}}` | Primeros 8 caracteres del UUID de `CardMovement` para trazabilidad | Sí | `8f3a19c2` |

## 2.2 Formato envolvente oficial

Para que cualquier mensaje pegado en el grupo de WhatsApp sea inmediatamente reconocible y auditable por el administrador, el formateador genera:

```text
🃏 *MUNCHINKING LEAGUE — CARTA JUGADA*
👤 *Manager:* {{managerName}}
✨ *Carta:* {{cardName}} _{{cardNickname}}_ ({{rarityLabel}})
🎯 *Objetivo:* {{targetResolved}}

📜 *Efecto:*
{{customBodyRendered}}

🕒 {{playedAt}} · Ref: #{{movementShortId}}
```

*(Si `targetType = 'NONE'`, la línea `🎯 *Objetivo:*` se omite automáticamente).*

## 2.3 Reglas de validación y seguridad del texto

- Se eliminan saltos de línea múltiples o caracteres de control en `targetLabel` y `notes`.
- Se neutralizan asteriscos/guiones bajos desbalanceados introducidos en `targetLabel` para no romper el formato Markdown de WhatsApp.
- Longitud máxima de `targetLabel`: `120` caracteres.

---

# 3. Contrato JSON/TypeScript de Semilla (`CardCatalogSeed`)

El catálogo se define de forma declarativa en `db/seed/cards.seed.ts` validado con Zod antes de insertarse en D1:

```ts
export interface CardDefinitionSeed {
  slug: string;
  name: string;
  nickname: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  targetType: 'NONE' | 'MANAGER' | 'PLAYER' | 'FREE_TEXT';
  defaultCopies: number;
  description: string;
  usageRules: string;
  imageKey: string; // Ruta relativa en Cloudflare R2, ej: "cards/presi-culo.webp"
  whatsappTemplate: string;
}
```

## Dimensionamiento recomendado del Mazo (`Deck`) para 8–10 managers

- Mano máxima por manager: `3` cartas → hasta `30` copias podrían estar simultáneamente en manos si los 10 managers acumularan 3 cartas.
- Por tanto, el mazo de una `Season` debe inicializarse siempre con **un mínimo recomendado de `36` a `45` `CardCopy` totales** (por ejemplo: 12–16 definiciones sumando ~40 copias por rareza) para garantizar que el `DECK` nunca quede vacío ni predecible incluso con todas las manos llenas.

| Rareza | Copias recomendadas por definición | Peso aproximado en el mazo |
|--------|------------------------------------|----------------------------|
| `COMMON` | `4` a `5` copias | ~50% |
| `RARE` | `3` copias | ~28% |
| `EPIC` | `2` copias | ~15% |
| `LEGENDARY` | `1` copia | ~7% |

---

# 4. Catálogo Base Inicial (Semilla de Desarrollo y Plantilla Oficial)

La siguiente tabla incluye cartas ya mencionadas en la documentación del proyecto (como `Presi-Culo`) junto con arquetipos completos que cubren los cuatro niveles de rareza y los cuatro tipos de objetivo (`NONE`, `MANAGER`, `PLAYER`, `FREE_TEXT`) para validar el 100% de los flujos desde el primer día y sustituir/ampliar textos definitivos de la temporada en un único archivo seed:

| Slug | Nombre | Apodo | Rareza | Objetivo | Copias | Plantilla de cuerpo WhatsApp |
|------|--------|-------|--------|----------|--------|------------------------------|
| `presi-culo` | Presi-Culo | El decreto del palco | `EPIC` | `MANAGER` | `3` | `{{managerName}} activa *Presi-Culo* contra *{{targetManager}}*. El palco ha hablado y toca acatar la sanción presidencial.` |
| `clausulazo-congelado` | Blindaje Express | Aquí no toca nadie | `RARE` | `PLAYER` | `3` | `{{managerName}} blinda a *{{targetLabel}}* esta jornada. Queda protegido según las reglas de Blindaje Express.` |
| `impuesto-revolucionario` | Sablazo Federativo | Pasa por caja | `COMMON` | `MANAGER` | `5` | `{{managerName}} aplica *Sablazo Federativo* sobre *{{targetManager}}*. El administrador ajustará el cargo correspondiente en Biwenger.` |
| `prima-por-objetivo` | Maletín Transparente | Incentivo totalmente legal | `COMMON` | `NONE` | `5` | `{{managerName}} reclama su *Maletín Transparente* para esta jornada. Pendiente de abono manual por administración.` |
| `veto-de-alineacion` | Lesión Diplomática | Molestias en el calentamiento | `EPIC` | `PLAYER` | `2` | `{{managerName}} señala a *{{targetLabel}}* con *Lesión Diplomática*. Revisar aplicación en la jornada vigente.` |
| `inspeccion-hacienda` | Auditoría Nocturna | Papeles sobre la mesa | `RARE` | `MANAGER` | `3` | `{{managerName}} lanza una *Auditoría Nocturna* contra *{{targetManager}}*.` |
| `subvencion-municipal` | Recalificación | Terrenos junto al estadio | `COMMON` | `NONE` | `5` | `{{managerName}} activa *Recalificación* y solicita la inyección económica prevista en el reglamento.` |
| `mercado-intervenido` | Puja Fantasma | Humo en la prensa | `COMMON` | `FREE_TEXT` | `4` | `{{managerName}} juega *Puja Fantasma* indicando: "{{targetLabel}}".` |
| `indulto-comite` | Recurso al TAD | Defecto de forma | `RARE` | `FREE_TEXT` | `3` | `{{managerName}} presenta *Recurso al TAD* sobre: "{{targetLabel}}".` |
| `doble-capitania` | Brazalete de Oro | Hoy mando yo | `RARE` | `PLAYER` | `3` | `{{managerName}} otorga el *Brazalete de Oro* a *{{targetLabel}}* para esta jornada.` |
| `caos-en-el-sorteo` | Bolas Calientes | Mano inocente | `EPIC` | `MANAGER` | `2` | `{{managerName}} usa *Bolas Calientes* afectando a *{{targetManager}}*.` |
| `corona-munchinking` | Golpe de Estado | El trono cambia de dueño | `LEGENDARY` | `MANAGER` | `1` | `👑 ¡CARTA LEGENDARIA! {{managerName}} desata *Golpe de Estado* contra *{{targetManager}}*.` |
| `amnistia-dorada` | Decreto Real | Borrón y cuenta nueva | `LEGENDARY` | `NONE` | `1` | `👑 ¡CARTA LEGENDARIA! {{managerName}} proclama *Decreto Real* para esta jornada.` |

**Total semilla base:** `13` definiciones · `40` `CardCopy` en `DECK` al inicializar temporada (cumple la holgura de seguridad `> 30` copias para hasta 10 managers).

> **Nota operativa:** Antes de abrir la temporada real en producción, basta con revisar/editar `db/seed/cards.production.json` (respetando el mismo contrato `CardDefinitionSeed`) y subir las ilustraciones `.webp` a Cloudflare R2 bajo la clave `imageKey`.

---

# 5. Semilla de Participantes para Desarrollo vs Producción

- **`db/seed/dev.seed.ts`:** crea la liga `Munchinking League`, la temporada activa `Temporada 2026/2027`, 1 cuenta `ADMIN` + 8 cuentas `MANAGER` con contraseñas locales de prueba únicamente válidas en SQLite local (`.wrangler/state`) y las 40 `CardCopy` iniciales en `DECK`.
- **Script administrativo de alta real (`db/seed/provision-production.ts`):** lee la lista real de managers de la liga (sin contraseñas en Git), genera contraseñas temporales aleatorias de alta entropía en local para entregárselas por privado a cada manager y almacena únicamente su `password_hash` PBKDF2 en Cloudflare D1 remoto.

---

# 6. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Estandarización del motor de plantillas de WhatsApp, dimensionamiento matemático del mazo y catálogo semilla completo validable. |
