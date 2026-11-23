# Cartas T26/27: catálogo y guía del comisionado

Munchinking League · Guía operativa v2.0 · 20/11/2026.

**Fuente de las reglas:** [Reglamento SMDP T26/27 v1.0](../references/Reglamento%20Munchinking%20League%20SMDP%20-%20T26-27%20-%20v1.0.pdf), norma 7. Las páginas de esta guía son **físicas**, contando la portada como 1: la p. 14 (folio 13) contiene la regla general; las pp. 15–24, las 33 fichas. Para la implementación: [catálogo y campos por slug](../packages/shared/src/season-cards.ts), [resolución de efectos](../packages/domain/src/season-play.ts), [jugada oficial](../apps/api/src/services/official-play.ts) y [contrato de API](06-api-contract.md).

## Cómo operar una jugada

1. En la mano, abrir la carta, completar sus elecciones y confirmar las condiciones. La biblioteca y la mano usan la identidad y el apodo del catálogo cuando existe. El [formulario](../apps/web/src/features/hand/OfficialPlayForm.tsx) pide solo los campos del efecto, no un objetivo libre adicional. Cambiar una elección exige confirmar de nuevo.
2. El servidor comprueba copia, propietario, mano, temporada, elecciones y mánagers activos de la liga; aplica Mus, ventanas y protecciones cuando hay datos suficientes. Un nombre de futbolista o escudería **no** acredita identidad, plantilla ni afiliación. Al aceptar, mueve la copia al mazo y registra movimiento, elecciones y resultado; no queda pendiente de aprobación.
3. Copiar al grupo el **mensaje devuelto**. El [motor de plantillas](../packages/domain/src/whatsapp-template.ts) compone identidad, efecto, hora y referencia del movimiento; para las oficiales el servidor añade elecciones, resultado (incluidos dados), regla y, cuando procede, qué contrastar. No se repite el sorteo al copiar ni se envía el mensaje automáticamente.
4. El comisionado verifica los hechos externos y ejecuta el efecto correspondiente. **La app no consulta ni modifica Biwenger**, no lleva un saldo de dinero o puntos y no ejecuta ventas, pagos ni cobros al vencimiento. Descartar no activa la carta: vuelve al mazo. Previo aviso al grupo, corresponde compensación de 250.000 € (común), 500.000 € (rara) o 1.000.000 € (épica); la interfaz la recuerda, no la abona.

## Matriz de operación

En «Servidor» se indica lo específico de la carta **además** de los controles comunes. «Registra» significa que deja constancia de la elección, no que la haya verificado en una fuente deportiva. Los horarios de jornada de la [tabla de ventanas](calendario-oficial.md) solo se comprueban con calendario suficiente. «En juego» va del primer inicio incluido al último inicio excluido; la gracia de 5 minutos, donde se indica, se cuenta desde el **primer partido de la jornada**, no desde el de cada jugador. «Base» excluye capitán, ariete y otras cartas. M€ = millones de euros.

### Comunes (11 definiciones)

| Pág. | Carta y efecto | Servidor | Comisionado: comprobar y aplicar |
|---:|---|---|---|
| 15 | Capitán Obligatorio — cambiar el capitán rival | Registra rival y jugador; ventana en juego, veto y escudos aplicables. | Comprobar plantilla e inicio de **ambos** partidos (elegido y capitán original); excepción de 5 min. Cambiar el brazalete. |
| 15 | Titular obligatorio — imponer un titular rival | Registra ambos; desde las 07:00 del día de inicio hasta dos horas antes. | Confirmar plantilla rival y exigir la alineación. |
| 15 | Jugador Prohibido — veto de alineación para todos | Registra el nombre, no un propietario; misma ventana que Titular. | Identificar al jugador y excluirlo como titular en toda la liga. |
| 15 | Jugador Inútil — anular los puntos de un jugador | Registra el nombre; ventana en juego. | Verificar inicio de su partido (gracia de 5 min) y dejar su aportación en cero. |
| 16 | Jugador nº12 — sumar un suplente propio | Registra jugador; desde las 07:00 hasta antes del primer inicio. | Verificar que no está alineado y sumar sus puntos; puede estar vetado como titular. |
| 16 | Cambio de jugador — sustituir la aportación de un titular | Exige dos nombres distintos; ventana en juego, sin gracia. | Verificar titular y suplente propio adquirido antes de la jornada; el partido del suplente no debe haber empezado. Sustituir los puntos. |
| 16 | Fondo de inversión — invertir 1/3/5 M€ | Calcula vencimiento y retorno **total**: 120/150/200 % a 1/2/3 semanas. | Descontar la inversión ahora y abonar el retorno en la fecha indicada. |
| 17 | Egoísta — transferir 10 puntos del compañero al actor | Registra otro mánager; comprueba ventana de fin y escudo si constan. | Verificar misma escudería y cierre; restar a uno y sumar al otro. |
| 17 | Cupón de descuento — cobrar sobre el valor de mercado | Calcula el 15 % del valor declarado, al céntimo. | Acreditar compra reciente y cotización; excluir clausulazo y jugador del Martes Loco. Abonar. |
| 17 | Sobre trucado — sustituir el resultado de un sobre | Valida Bronce/Plata y seis nombres distintos; un d6 selecciona la posición. | Verificar pago, disponibilidad y criterios del sobre; sustituir por el jugador indicado. |
| 18 | Tragaperras — apostar 1/3/5/10 M€ | Tira 3d5; muestra caras, retorno total (0/150/300 % para distintas/pareja/trío) y neto. | Descontar apuesta y abonar el retorno; no sumar además el neto. |

### Raras (16 definiciones)

| Pág. | Carta y efecto | Servidor | Comisionado: comprobar y aplicar |
|---:|---|---|---|
| 18 | Cheque Misterioso — cobrar 1–6 M€ | Tira d6 y calcula el importe. | Abonar tantos millones como indique la cara registrada. |
| 18 | Cesión Obligatoria — cesión al mínimo | Registra rival y futbolista; antes de las dos horas previas al inicio. | Verificar propiedad y precio mínimo; tramitar cesión. |
| 18 | Prohibido Capitán y Ariete — anular ambos roles | Registra veto global antes de las dos horas previas; puede impedir un Capitán Obligatorio posterior. | Quitar ambos roles a todos, también al emisor; resolver conflictos individuales. |
| 19 | Blindaje de Clausulazos — proteger un jugador propio | Calcula el domingo **siguiente** en Madrid; guarda contra Clausulazo Directo coincidente. | Verificar propietario e identidad y hacer respetar el blindaje en el mercado. |
| 19 | Carta Espejo — replicar contra el emisor | Valida movimiento dirigido y vigente, deriva el emisor y comprueba la réplica; véase abajo. | Verificar inmediatez, plantilla del emisor y blindajes no acreditados; no cancelar el original. |
| 19 | Blindaje de Cartas — proteger equipo y plantilla | Ventana desde el lunes 07:00 hasta antes del primer inicio; vincula la jornada si consta. | Mantener efectos previos; proteger hasta fin de la jornada vinculada, resolviendo casos sin datos. |
| 19 | Venta Máxima — vender al máximo histórico | Registra jugador, no consulta cotizaciones. | Obtener máximo desde el 1 de agosto, verificar propiedad y ejecutar venta. |
| 20 | Intercambio puntuación de jugador — peor propio por mejor rival | Registra rival y ventana de fin. | Al cierre, comparar solo alineados con ≥1 minuto y puntuación base; intercambiar las dos aportaciones. |
| 20 | Subir al primer equipo — sumar también un titular del compañero | Registra otro mánager y jugador; ventana en juego. | Comprobar escudería, titularidad, valor ≤10 M€ e inicio del partido (gracia de 5 min); sumar solo base. |
| 20 | Exclavitud — modificar el siguiente pago salarial | Tira d6: 1–5 exime; 6 duplica. | Aplicar el resultado al importe real de la próxima nómina. |
| 21 | Bono de representación — cobrar por compra ajena | Valida comprador distinto y calcula el 10 % del precio declarado, al céntimo. | Contrastar comprador, precio pagado y fecha de adquisición en Biwenger (mismo día); abonar. |
| 21 | Mus — obligar a descartar del mayor rango | Bloquea jugadas de los afectados; valida rareza **al descartar**. No elige ni mueve cartas ajenas. | Cada afectado elige si hay empate; gestionar fuera la compensación por descarte. |
| 21 | Caja misteriosa — fijar 7 o duplicar solo el exceso sobre 7 | Registra jugador, modalidad y ventana en juego. | Verificar plantilla, inicio (gracia de 5 min) y ≥1 minuto; aplicar modalidad a puntos base. Sin minuto no hay efecto. |
| 22 | Equipo vetado — excluir un club real la próxima jornada | Registra club como texto; contrasta antelación mínima de cuatro días si es determinable. | Identificar club y jugadores; impedir alineación y puntuación para todos. |
| 22 | Empresa pantalla — autorizar compraventa interna | Registra otro mánager y futbolista; no acredita escudería. | Comprobar misma escudería y precio igual al valor de mercado; tramitar. |
| 22 | 2 pa 2 — enfrentar dos escuderías | Registra rival como texto; antes de las dos horas previas. | Al cierre sumar los dos mejores de cada mánager (cuatro por bando); dar la diferencia a **cada** miembro ganador. |

### Épicas (6 definiciones)

| Pág. | Carta y efecto | Servidor | Comisionado: comprobar y aplicar |
|---:|---|---|---|
| 23 | Super-Capitán — capitán ×3 en vez de ×2 | Registra jugador desde el lunes 07:00 hasta antes del primer inicio; protege selecciones adversas coincidentes. | Confirmar capitán propio, mantener efectos anteriores y aplicar multiplicador. No blindar al equipo entero. |
| 23 | Alineación Congelada — repetir el once rival la siguiente jornada | Registra rival el día del primer inicio, después del saque; protege su plantilla de Clausulazo Directo si identifica la jornada siguiente. | Verificar bloqueo del once, restituir ventas de ese día al mismo importe y exigir mismos jugadores; capitán y ariete sí pueden variar. |
| 23 | Cambio de Puntuación — intercambiar dos totales | Exige dos mánagers distintos (puede incluir al actor); ventana hasta 24 h tras fin real. No reflejable. | Aplicar primero todos los demás ajustes; solo intercambiar si **ambos** totales finales son ≥30. |
| 24 | Clausulazo Directo — cerrar sin continuar subasta | Valida rival, jugador y domingo 10:00–22:00 de Madrid; contrasta protecciones aplicables. | Acreditar apertura, subasta, titularidad y escudos; cerrar la operación fuera de la app. |
| 24 | Jugador Mercado Prioritario — reservar una puja | Registra jugador; no bloquea pujas externas. | Confirmar mercado libre y que no es el elegido del Martes Loco; hacer respetar la exclusiva. |
| 24 | Lesión de cruzado — venta forzosa | Registra rival y jugador y calcula vencimiento a tres días. | Comprobar titularidad y venta; vencido el plazo sin vender, retirar sin compensación. |

## Qué conflictos resuelve el servidor

- **Prioridad (p. 14):** ante efectos realmente incompatibles, primero la regla específica; si no la hay, prevalece la mayor rareza. No es un veto universal de raras contra comunes. Por ejemplo, el blindaje raro del domingo sí frena el clausulazo épico sobre **ese** futbolista; el veto raro de capitán/ariete ya activo impide otra designación por Capitán Obligatorio común en la misma jornada, incluso al emisor del veto.
- **Objetivo real:** [las protecciones locales](protecciones-locales.md) distinguen daño al equipo, daño al jugador y mera mención. Egoísta quita puntos y sí puede chocar con el blindaje del compañero; ser comprador en Bono no basta. Super-Capitán requiere el mismo nombre normalizado y, si consta, propietario coincidente. Jugador Prohibido/Inútil no identifican al dueño: no se inventa una plantilla ni se anula una carta global porque haya un protegido. Homónimos, capitán desplazado, empates y efectos individuales que requieran alineaciones se resuelven fuera.
- **Tiempo:** solo cuentan jugadas ya registradas de la temporada, no devueltas. Blindaje de Cartas y Super-Capitán usan su jornada vinculada; Congelada requiere la inmediatamente posterior a la de activación. Con fin real dejan de proteger al alcanzarlo; con fin previsto solo se bloquea con certeza antes del último inicio conocido. Falta de vínculo, hueco o solapamiento no demuestran vigencia. El blindaje del domingo se calcula por fecha civil, no por jornada.
- **Espejo dirigido (p. 19):** se elige un movimiento recibido en la temporada, con efecto adverso admitido, destinatario explícito, emisor activo, sin devolución ni réplica vigente del destinatario para ese origen. Una mención, un veto sin destinatario o Cambio de Puntuación no bastan. El servidor fija como único destino al emisor y exige elegir un futbolista de su plantilla si el efecto lo requiere; no conoce la plantilla real. Revalida el origen al escribir y aplica las protecciones al efecto y destino de la réplica. La jugada original permanece.
- **Mus (p. 21):** [obligaciones privadas](mus-local.md) para los demás mánagers con mano no vacía al activarse; quien entonces no tenía cartas no queda bloqueado por recibir una después. Mientras haya obligación no puede jugar; puede descartar cualquiera del mayor rango actual (épica > rara > común; `LEGENDARY` solo histórico, por encima). Un descarte válido satisface todos los Mus pendientes anteriores. Devolver administrativamente un Mus desactiva solo su origen, sin deshacer descartes.
- **Calendario opcional:** el administrador introduce jornadas en Madrid, sin importación ni horarios precargados. Ventana cerrada: rechazo; abierta: solo acredita horario; sin datos concluyentes: confirmación externa, no permiso reglamentario. Un fin previsto no prueba que haya acabado el partido. Véanse [ventanas y límites](calendario-oficial.md).

## Dotación y activación local

**33 definiciones, 71 copias iniciales:** 11 comunes × 3 + 16 raras × 2 + 6 épicas × 1. **3/2/1 y 71 son dotación operativa del seed, no cifras oficiales del PDF.** El límite reglamentario de mano es tres; no debe confundirse con las copias de una definición. Las definiciones oficiales usan `targetType: NONE`; los campos efectivos provienen del slug.

| Situación | Procedimiento desde la raíz del repo |
|---|---|
| Solo revisar la carga | `corepack pnpm db:catalog:sql` genera SQL; no lo aplica. |
| Desarrollo local existente | Con el Worker detenido, aplicar las migraciones locales pendientes (`corepack pnpm db:migrate:local`, incluidas 0003–0005) y después `corepack pnpm db:catalog:local`. No reinicializar ni ejecutar el seed limpio sobre esa base. |
| Desarrollo nuevo y vacío | `corepack pnpm db:setup:local` prepara esquema y seed de desarrollo. No es un procedimiento de actualización ni de producción. |

La [actualización de catálogo](../db/seed/upgrade-catalog.ts) se limita a la pareja de liga/temporada de desarrollo conocida. Conserva manos, copias existentes, movimientos, avisos y lotes. Deshabilita solo las 13 definiciones demo originales identificadas por ID **y** slug: sus copias ya en mano siguen siendo jugables o descartables por el flujo histórico; en mazo no cuentan como repartibles ni salen por reparto manual o CRON. No borrar históricos para activar el catálogo.

**Huecos y pendientes:** no hay fuente deportiva conectada para acreditar plantillas, partidos individuales, escuderías, precios, minutos o saldos.
