# Sistema de Diseño y Experiencia de Usuario

| Campo | Valor |
|--------|-------|
| Proyecto | Munchinking League |
| Documento | Sistema de Diseño y Experiencia de Usuario |
| Archivo | `08-design-system.md` |
| Versión | 1.0 |
| Estado | APPROVED |
| Última actualización | 17/11/2026 |

---

# 1. Objetivo

Establecer las reglas visuales, tokens de interfaz, anatomía de las cartas, microinteracciones y requisitos de accesibilidad/PWA de **Munchinking League**.

La aplicación debe combinar **claridad de lectura en móvil** con **sensación táctil de juego de cartas coleccionables**, manteniendo coherencia con las decisiones ya fijadas en `07-project-structure.md`:

- Estética limpia y luminosa con contraste alto.
- **Morado real** como color primario de identidad.
- Tipografía sobria y altamente legible.
- Marcos de carta consistentes y reconocibles.
- Rareza diferenciada simultáneamente por **forma geométrica y color** en la esquina inferior izquierda (accesibilidad para daltonismo).

---

# 2. Principios visuales

1. **La carta es la protagonista:** en `/home` la mano en abanico ocupa entre el 52% y el 62% del alto útil de la pantalla móvil.
2. **Mobile First táctil:** áreas interactivas mínimas de `44x44 px`, navegación inferior alcanzable con el pulgar y respeto a `env(safe-area-inset-bottom)`.
3. **Privacidad por defecto:** las cartas en `/home` cargan boca abajo; revelar u ocultar la mano responde en menos de `250 ms`.
4. **Animación con propósito:** Framer Motion (o CSS 3D acelerado por GPU con `transform` y `opacity`) nunca bloquea la acción del usuario y respeta `prefers-reduced-motion`.

---

# 3. Tokens de color (Tailwind CSS / Variables CSS)

## 3.1 Superficies y texto

| Token | Hex | Uso principal |
|-------|-----|---------------|
| `--bg-canvas` | `#F7F5FB` | Fondo general claro con matiz lavanda muy sutil |
| `--bg-surface` | `#FFFFFF` | Tarjetas de interfaz, paneles, modales y barra inferior |
| `--bg-elevated` | `#EFEAF8` | Chips activos, cabeceras secundarias y estados seleccionados |
| `--border-subtle` | `#DFD7F0` | Bordes suaves de contenedores y divisores |
| `--text-primary` | `#1B1429` | Títulos, nombres de cartas y cuerpo principal (contraste AAA) |
| `--text-secondary` | `#594F6E` | Metadatos, fechas, apodos y ayudas contextuales |

## 3.2 Identidad y estados semánticos

| Token | Hex | Uso principal |
|-------|-----|---------------|
| `--brand-primary` | `#6D28D9` | Botones primarios (`Jugar`), pestaña activa, foco e identidad |
| `--brand-primary-hover` | `#5B21B6` | Estado hover / pressed del primario |
| `--brand-accent` | `#A855F7` | Destellos de apertura de sobre, degradados de cabecera y reverso |
| `--status-success` | `#15803D` | Confirmación de jugada y copiado a WhatsApp |
| `--status-warning` | `#B45309` | Avisos de mano completa (`3/3`) o confirmaciones |
| `--status-danger` | `#BE123C` | Acción destructiva (`Descartar`), errores y jugadas devueltas |

## 3.3 Sistema accesible de rarezas (Color + Forma)

Cada rareza combina color propio, etiqueta textual y emblema geométrico en la **esquina inferior izquierda** de la carta:

| Rareza (`rarity`) | Etiqueta UI | Color principal | Borde / Brillo | Forma geométrica |
|-------------------|-------------|-----------------|----------------|------------------|
| `COMMON` | Común | `#64748B` (Pizarra) | Borde neutro mate | Círculo `●` |
| `RARE` | Rara | `#0284C7` (Azul zafiro) | Borde azul satinado | Rombo `◆` |
| `EPIC` | Épica | `#7C3AED` (Morado amatista) | Borde morado con halo suave | Hexágono `⬡` |
| `LEGENDARY` | Legendaria | `#D97706` (Oro ámbar) | Borde dorado con reflejo sutil | Estrella de 4 puntas `✦` |

---

# 4. Tipografía y escala espacial

- **Familia principal UI y cuerpo:** `Inter`, `system-ui`, `-apple-system`, `sans-serif`.
- **Familia display para títulos de carta y cabeceras:** `Plus Jakarta Sans` o `Cinzel` / `Space Grotesk` con pesos `700`–`800` (cargada localmente o con `font-display: swap`).
- **Tamaños base móvil:**
  - Título de pantalla: `20px / 28px` (`font-bold`)
  - Nombre de carta enfocada: `18px / 24px` (`font-extrabold`)
  - Apodo de carta: `13px / 18px` (`italic`, `--text-secondary`)
  - Descripción / reglas de carta: `14px / 20px`
  - Metadatos / timestamps: `12px / 16px`

---

# 5. Anatomía del componente Carta (`Card`)

Proporción estándar fija: **`5 : 7`** (`aspect-[5/7]`), bordes redondeados `16px`, marco exterior de `3px` coloreado según rareza y sombra multicapa al elevarse.

```text
┌─────────────────────────────┐
│ [Objetivo/Icono]   [Copias] │  ← Cabecera compacta
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │     Ilustración 4:3     │ │  ← Imagen servida desde R2 (WebP/AVIF)
│ │                         │ │
│ └─────────────────────────┘ │
│ NOMBRE DE LA CARTA          │  ← Título fuerte
│ "Apodo humorístico"         │  ← Subtítulo en cursiva
│ ─────────────────────────── │
│ Texto breve del efecto y    │  ← Máx. 4 líneas en vista mano;
│ condición clave de uso.     │    completo con reglas en vista ampliada
│                             │
│ [⬡ ÉPICA]            [ML]   │  ← Esquina inf. izq.: Forma + Color rareza
└─────────────────────────────┘
```

## Reverso de carta (`CardBack`)

- Fondo morado profundo (`#2E1065` → `#4C1D95`) con filigrana geométrica simétrica y emblema central de **Munchinking League**.
- Impide distinguir qué carta o qué rareza tiene el manager mientras la mano está oculta.

---

# 6. Disposición en abanico (`CardFan`) y animaciones

## Geometría del abanico en `/home`

| Cartas en mano | Rotación por carta | Desplazamiento horizontal | Elevación central |
|----------------|--------------------|---------------------------|-------------------|
| `0` cartas | Estado vacío ilustrado ("Sin cartas en mano · Próximo reparto el lunes") | — | — |
| `1` carta | `0°` | `0 px` | `0 px` |
| `2` cartas | `-6°`, `+6°` | `-44 px`, `+44 px` | `0 px` |
| `3` cartas | `-11°`, `0°`, `+11°` | `-76 px`, `0 px`, `+76 px` | Carta central `-10 px` en eje Y |

## Catálogo de transiciones

1. **Mostrar / Ocultar mano (`Flip`):** giro `rotateY(180deg)` con `perspective: 1000px`, escalonado `45 ms` entre cartas (`staggerChildren`).
2. **Enfoque de carta (`Inspect`):** al pulsar una carta, se traslada al centro con `layoutId`, escala a `1.0` a ancho cómodo (`max-w-[300px]`), fondo oscurecido `backdrop-blur-xs bg-black/45` y botonera inferior clara: **Jugar** (primario morado) y **Descartar** (secundario borde rojo).
3. **Apertura semanal (`Reveal`):** sobre sellado o carta reversa centrada → toque del usuario → vibración háptica ligera opcional (`navigator.vibrate?.(20)`) → giro con halo del color de rareza → entrada a la mano.

---

# 7. Estructura responsive y PWA

- **Móvil (`< 768px`):** columna única centrada (`max-w-md mx-auto`), cabecera superior pegajosa (`56px`) y `BottomNavigation` fija (`64px` + `safe-area`).
- **Escritorio (`>= 768px`):** contenedor centrado tipo tablero (`max-w-5xl`), navegación lateral o superior limpia, mano más amplia y carrusel de historial público visible en paralelo sin perder las mismas acciones.
- **PWA instalable (`manifest.webmanifest`):**
  - `display: "standalone"`
  - `theme_color: "#6D28D9"`
  - `background_color: "#F7F5FB"`
  - Iconos `192x192`, `512x512` y `maskable` para instalación directa en iOS y Android sin pasar por tiendas. *(Sin caché offline de mutaciones, acorde a las restricciones del MVP).*

---

# 8. Historial de cambios

| Versión | Descripción |
|----------|-------------|
| 1.0 | Definición inicial completa del sistema de diseño, paleta, anatomía de cartas, rarezas accesibles, geometría del abanico y PWA. |
