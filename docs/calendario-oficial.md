# Calendario opcional T26/27

`calendar.list()` devuelve `{ seasonId, zone, rounds }` para la temporada activa de la liga del administrador. `calendar.save({ seasonId, roundNumber, expectedRevision, firstStart, lastStart, endAt, endKind })` devuelve `{ revision }`. Revisión 0 crea; una revisión positiva actualiza solo si todavía coincide. No hay borrado, importación ni carga inicial. Introducir minutos civiles de Europe/Madrid; se permite `+01:00` o `+02:00` si concuerda con esa hora. Una hora repetida exige desfase y una hora inexistente se rechaza. Los instantes devueltos son UTC ISO con milisegundos.

## Integración del servidor

Export de `apps/api/src/services/season-calendar.ts`:

```ts
validateScheduledWindow(db: D1Database, seasonId: string, slug: string, nowIso: string): Promise<ScheduledWindow>
interface ScheduledWindow {
  status: 'open' | 'closed' | 'external';
  reason: string;
  round: CalendarRound | null;
  firstFiveMinuteGrace: boolean;
}
interface CalendarRound {
  roundNumber: number; firstStart: string; lastStart: string; endAt: string;
  endKind: 'planned' | 'actual'; revision: number;
}
```

Usar la temporada de la copia autenticada y el reloj del servidor. `closed` rechaza por horario; `external` conserva la confirmación existente, no es autorización automática; `open` solo acredita el horario. Plantillas, mercado, alineaciones bloqueadas, puntos, compras y partidos de futbolistas no se deducen del calendario. La gracia se limita a las restricciones de inicio expresamente exceptuadas. La selección es por cronología, no por el mayor número de jornada. No se salta una próxima jornada con ventana cerrada para elegir otra posterior. Los errores de infraestructura distintos de la ausencia de tabla se propagan.

## Ventanas contrastadas (páginas físicas del PDF v1.0)

| Cartas | Condición de calendario |
|---|---|
| Capitán Obligatorio, Jugador Inútil, Subir al primer equipo, Caja misteriosa (15, 20, 21) | Desde el primer inicio incluido hasta el último excluido. Gracia específica durante los primeros 5 minutos, sin ampliar la ventana. |
| Cambio de jugador (16) | Mismos inicios, **sin** gracia. |
| Titular obligatorio, Jugador Prohibido (15); Jugador nº12 (16) | Desde las 07:00 del día de inicio. Las dos primeras, hasta dos horas antes incluidas; nº12, antes del saque inicial. |
| Cesión Obligatoria, Prohibido Capitán y Ariete, 2 pa 2 (18, 22) | Antes de entrar en las dos horas previas, sin apertura a las 07:00. |
| Blindaje de Cartas, Super-Capitán (19, 23) | Desde el lunes de la semana de inicio a las 07:00 hasta el primer inicio, excluido. |
| Equipo vetado (22) | Al menos cuatro días completos antes del próximo inicio. Si el cómputo civil y 96 h discrepan por DST, confirmar externamente. |
| Alineación Congelada (23) | Después del primer inicio, durante ese día civil y con alineaciones bloqueadas (condición externa). |
| Egoísta, Intercambio puntuación de jugador (17, 20) | Al finalizar: antes del fin confirmado no está abierta para esa jornada, en el fin está abierta y después se confirma externamente. Sin caducidad inventada. |
| Cambio de Puntuación (23) | Desde fin real hasta fin real +24 h inclusive. Busca la jornada finalizada, incluso si ya empezó la siguiente. Un fin previsto no prueba la finalización. Si solo queda histórico fuera de ventana, confirmar qué jornada corresponde. |
| Blindaje de Clausulazos, Carta Espejo, Clausulazo Directo (19, 24) | Dependen del domingo de cláusulas, la jugada recibida o el mercado dominical, no del horario de jornada. Mantener sus comprobaciones específicas. |
| Fondo de inversión, Cupón de descuento, Sobre trucado, Tragaperras, Cheque Misterioso, Venta Máxima, Esclavitud, Bono de representación, Mus, Empresa pantalla, Jugador Mercado Prioritario, Lesión de cruzado (16–24) | Sin ventana de activación por jornada. No confundir requisitos externos ni plazos del efecto con el momento de activación. |

## Expiración de Escudos

Para **Blindaje de Cartas**, la próxima jornada seleccionada al activar es aquella **hasta cuyo fin** dura el escudo. Guardar `(seasonId, roundNumber)` con la activación aceptada, no volver a elegir «la siguiente» al consultar la protección. `round.endAt` con `endKind: 'planned'` es una previsión revisable, no una caducidad definitiva. Releer esa misma jornada por su clave al evaluar el escudo: con fin `actual`, ya no protege cuando `now >= endAt`; con fin incierto o sin jornada vinculada, pedir confirmación externa. No aplicar el blindaje a efectos anteriores a la activación.

No reutilizar indiscriminadamente ese fin: Alineación Congelada protege hasta que pase la jornada **posterior a la de activación**; requiere identificar esa segunda jornada. Blindaje de Clausulazos protege el domingo objetivo, no hasta el fin de una jornada. El módulo no crea ni modifica escudos o movimientos.