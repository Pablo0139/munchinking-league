import { MAX_TARGET_LABEL_LENGTH, type SeasonCard } from '@munchinking/shared';
import { DomainRuleError } from './errors';
import { sanitizeInlineWhatsappText } from './whatsapp-template';

export interface SeasonPlayContext {
  actorId: string;
  managerNames: ReadonlyMap<string, string>;
  nowIso: string;
  mirror?: { id: string; cardName: string; senderId: string; senderName: string; effect: string };
  roll?: (sides: number) => number;
}

export interface SeasonPlayResult {
  summary: string;
  targetLabel: string | null;
  targetManagerId: string | null;
  details: string[];
}

function invalid(message: string): never {
  throw new DomainRuleError('TARGET_REQUIRED', message);
}

const unsafeInline = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
function inline(raw: string, label: string, limit = MAX_TARGET_LABEL_LENGTH): string {
  if (typeof raw !== 'string' || raw.length > limit || unsafeInline.test(raw)) invalid(`${label}: texto no válido.`);
  const text = sanitizeInlineWhatsappText(raw.normalize('NFC'));
  return text || invalid(`Falta ${label}.`);
}

const euros = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' });
const eur = (amount: number) => `${euros.format(amount)} €`;

// Unidades de entrada: euros, sin agrupadores. El tope es técnico, no una regla de liga.
function cents(raw: string, label: string): number {
  if (!/^\d{1,10}(?:[.,]\d{1,2})?$/u.test(raw)) invalid(`${label}: indica euros sin separadores de miles.`);
  const [whole, fraction = ''] = raw.split(/[.,]/u);
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (result <= 0 || result > 100_000_000_000) invalid(`${label}: debe ser positivo y no superar mil millones de euros.`);
  return result;
}

function cryptoRoll(sides: number): number {
  const sample = new Uint32Array(1);
  const limit = 2 ** 32 - (2 ** 32 % sides);
  do { crypto.getRandomValues(sample); } while (sample[0]! >= limit);
  return sample[0]! % sides + 1;
}

const madrid = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const dayMs = 86_400_000;

export function resolveSeasonPlay(card: SeasonCard, choices: Record<string, string>, context: SeasonPlayContext): SeasonPlayResult {
  if (!choices || typeof choices !== 'object' || ![null, Object.prototype].includes(Object.getPrototypeOf(choices))) {
    invalid('Se esperaba un registro de selecciones.');
  }
  const allowed = new Set(card.fields.map(field => field.key));
  if (Reflect.ownKeys(choices).some(key => typeof key !== 'string' || !allowed.has(key))) {
    throw new DomainRuleError('UNEXPECTED_TARGET', 'Hay selecciones que no corresponden a esta carta.');
  }
  const manager = (id: string) => inline(context.managerNames.get(id) ?? '', 'nombre del mánager de la liga');
  const now = new Date(context.nowIso);
  if (!Number.isFinite(now.getTime()) || !/(?:Z|[+-]\d\d:\d\d)$/u.test(context.nowIso)) invalid('Se requiere una fecha con zona horaria.');
  const local = Object.fromEntries(madrid.formatToParts(now).map(p => [p.type, p.value]));
  const after = (days: number) => new Date(now.getTime() + days * dayMs).toISOString();
  const roll = (sides: number) => {
    const n = (context.roll ?? cryptoRoll)(sides);
    if (!Number.isInteger(n) || n < 1 || n > sides) invalid(`Tirada d${sides} no válida.`);
    return n;
  };
  const result: SeasonPlayResult = { summary: card.description, targetManagerId: null, targetLabel: null, details: [] };
  const values: Record<string, string> = Object.create(null);
  const players = new Set<string>();
  const managers: string[] = [];
  for (const { key, kind, label, options } of card.fields) {
    if (!Object.hasOwn(choices, key)) invalid(`Falta ${label}.`);
    const raw = choices[key]!;
    const cleaned = inline(raw, label);
    let display = cleaned;
    switch (kind) {
      case 'choice':
        if (!options?.includes(raw)) invalid(`${label}: opción no válida.`);
        display = raw;
        break;
      case 'manager': case 'rival':
        display = manager(raw);
        if (kind === 'rival' && raw === context.actorId) invalid(`${label}: elige a otro mánager.`);
        if (managers.includes(raw)) invalid('Los dos mánagers deben ser distintos.');
        managers.push(raw);
        break;
      case 'player': {
        const identity = cleaned.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
        if (players.has(identity)) invalid('No se puede repetir futbolista.');
        players.add(identity);
        result.targetLabel ??= cleaned;
        break;
      }
      case 'text': result.targetLabel = cleaned; break;
      case 'money': display = eur(cents(raw, label) / 100); break;
      case 'movement': continue; // Se describe con la fuente validada, nunca con el ID como objetivo.
    }
    values[key] = display;
    result.details.push(`${label}: ${display}`);
  }
  if (managers.length === 1) result.targetManagerId = managers[0]!;
  if (managers.length) result.targetLabel = managers.map(manager).join(' y ');

  let check: string | undefined;
  switch (card.slug) {
    case 'capitan-obligatorio': result.summary = `${values.rival} debe designar capitán a ${values.player}.`; break;
    case 'titular-obligatorio': result.summary = `${values.rival} debe alinear a ${values.player} como titular.`; break;
    case 'jugador-prohibido': result.summary = `Ningún mánager puede alinear a ${values.player} esta jornada.`; break;
    case 'jugador-inutil': result.summary = `${values.player} no aporta puntos esta jornada.`; break;
    case 'jugador-n12': result.summary = `Sumar también los puntos de ${values.player}, de la plantilla propia y no alineado.`; break;
    case 'cambio-de-jugador': result.summary = `Contar los puntos de ${values.incoming} en lugar de los de ${values.outgoing}.`; break;
    case 'egoista': result.summary = `Restar 10 puntos a ${values.teammate} y sumarlos a quien juega la carta.`; break;
    case 'cesion-obligatoria': result.summary = `${values.rival} debe ceder a ${values.player} por el precio mínimo.`; break;
    case 'venta-maxima': result.summary = `Vender a ${values.player} por su cotización máxima desde el 1 de agosto.`; break;
    case 'intercambio-puntuacion-jugador': result.summary = `Intercambiar la peor puntuación propia con la mejor de ${values.rival}; solo puntos base de alineados con al menos un minuto.`; break;
    case 'subir-al-primer-equipo': result.summary = `Sumar también los puntos base de ${values.player}, titular de ${values.teammate}, si su valor de mercado no supera ${eur(10_000_000)}.`; break;
    case 'equipo-vetado': result.summary = `En la siguiente jornada nadie podrá alinear futbolistas de ${values.club} ni sumar sus puntos.`; break;
    case 'empresa-pantalla': result.summary = `Autorizar la compraventa de ${values.player} con ${values.teammate} a valor de mercado, si comparten escudería.`; break;
    case '2-pa-2': result.summary = `Reto a ${values.squad}. ${card.description}`; break;
    case 'super-capitan': result.summary = `${values.player}: triplicar sus puntos como capitán en la próxima jornada. No le afectan nuevas cartas.`; break;
    case 'alineacion-congelada': result.summary = `${values.rival} debe repetir alineación la jornada siguiente; su plantilla queda protegida de clausulazos hasta que termine.`; break;
    case 'cambio-de-puntuacion': result.summary = `Intercambiar los totales finales de ${values.first} y ${values.second} solo si ambos alcanzan 30 puntos tras aplicar todos los efectos.`; break;
    case 'jugador-mercado-prioritario': result.summary = `Reservar en exclusiva la puja por ${values.player} si está en el mercado libre y no es el jugador del Martes Loco.`; break;
    case 'fondo-de-inversion': {
      const stake = Number(choices.amount) * 1_000_000, weeks = Number(choices.weeks);
      const percent = [120, 150, 200][weeks - 1]!;
      result.summary = `Descontar ${eur(stake)} ahora. Retorno total (${percent} %): ${eur(stake * percent / 100)}. Vencimiento: ${after(7 * weeks)}.`;
      break;
    }
    case 'cupon-de-descuento': case 'bono-de-representacion': {
      const coupon = card.slug === 'cupon-de-descuento', rate = coupon ? 15 : 10;
      const base = cents((coupon ? choices.marketValue : choices.purchasePrice)!, 'Importe');
      const payout = Math.round(base * rate / 100) / 100;
      result.summary = `Abonar ${eur(payout)} por ${values.player}: ${rate} % de ${eur(base / 100)}.`;
      check = coupon ? 'Compra reciente en el mercado y cotización; excluir clausulazo y Martes Loco.' : 'Precio, comprador y fecha de compra en Biwenger: debe coincidir con el día de activación.';
      break;
    }
    case 'tragaperras': {
      const dice = [roll(5), roll(5), roll(5)], stake = Number(choices.amount) * 1_000_000;
      const distinct = new Set(dice).size, percent = distinct === 1 ? 300 : distinct === 2 ? 150 : 0;
      result.summary = `Apuesta: ${eur(stake)}. 3d5: ${dice.join(', ')} (${['', 'trío', 'pareja', 'tres distintas'][distinct]}). Retorno total (${percent} %): ${eur(stake * percent / 100)}. Neto: ${eur(stake * (percent - 100) / 100)}.`;
      break;
    }
    case 'cheque-misterioso': {
      const face = roll(6);
      result.summary = `D6: ${face}. Abonar ${eur(face * 1_000_000)}.`;
      break;
    }
    case 'esclavitud': {
      const face = roll(6);
      result.summary = `D6: ${face}. Próximo pago de salarios: ${face === 6 ? 'el doble' : '0 €'}.`;
      break;
    }
    case 'sobre-trucado': {
      const face = roll(6);
      result.targetLabel = values[`player${face}`]!;
      result.summary = `Sobre ${values.pack}, d6: ${face}. Sustituir el futbolista del sobre por ${result.targetLabel}.`;
      check = 'Verificar el pago del sobre y que los seis futbolistas estén libres y cumplan sus criterios.';
      break;
    }
    case 'caja-misteriosa':
      result.summary = `${values.player}: ${values.mode === card.fields.find(f => f.key === 'mode')?.options?.[0] ? 'fijar en 7 puntos' : 'mantener los puntos base hasta 7 y duplicar solo el exceso'}. Sin un minuto disputado no hay efecto.`;
      break;
    case 'carta-espejo': {
      const src = context.mirror;
      if (!src || src.id !== choices.movement || src.senderId === context.actorId) invalid('Se requiere la jugada recibida y su emisor original.');
      const name = inline(src.cardName, 'carta de origen');
      if (name.localeCompare('Cambio de Puntuación', 'es', { sensitivity: 'base' }) === 0) invalid('Cambio de Puntuación no se puede reflejar.');
      const sender = manager(src.senderId);
      if (!src.effect.trim() || unsafeInline.test(src.effect)) invalid('Efecto de origen no válido.');
      result.targetManagerId = src.senderId;
      result.targetLabel = sender;
      result.summary = `Replicar ${name} solo contra ${sender}: «${src.effect}». No se anula la jugada original.`;
      result.details.push(`Jugada de origen: ${src.id} · ${name} · Emisor: ${sender}`);
      check = 'Comprobar el blindaje del emisor.';
      break;
    }
    case 'clausulazo-directo': {
      const ms = ((Number(local.hour) * 60 + Number(local.minute)) * 60 + Number(local.second)) * 1000 + now.getUTCMilliseconds();
      if (local.weekday !== 'Sun' || ms < 10 * 3_600_000 || ms > 22 * 3_600_000) invalid('Mercado cerrado: domingo de 10:00 a 22:00 (Europe/Madrid).');
      result.summary = `Resolver directamente el clausulazo de ${values.player} (${values.rival}) sin continuar la subasta.`;
      check = 'Comprobar la subasta, la titularidad y las protecciones del futbolista.';
      break;
    }
    case 'blindaje-de-clausulazos': {
      // Nunca protege retroactivamente el domingo en curso.
      const date = new Date(Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day)));
      date.setUTCDate(date.getUTCDate() + 7 - date.getUTCDay());
      result.summary = `Proteger a ${values.player} frente a clausulazos el domingo ${date.toISOString().slice(0, 10)}.`;
      check = 'Confirmar que el futbolista pertenece a tu plantilla.';
      break;
    }
    case 'lesion-de-cruzado':
      result.summary = `Vender a ${values.player} al mercado antes del vencimiento: ${after(3)}. Sin venta, se pierde sin compensación.`;
      check = 'Confirmar titularidad y venta dentro del plazo.';
      break;
    case 'mus': break; // El módulo de obligaciones realiza los descartes/bloqueos.
    default:
      // Las reglas declarativas son la fuente de verdad cuando no hay nada que sortear o calcular.
      break;
  }
  result.details.push(`Resultado: ${result.summary}`, `Reglamento T26/27, pág. ${card.page}: ${card.usageRules}`);
  if (!check && !['mus', 'fondo-de-inversion', 'tragaperras', 'cheque-misterioso', 'esclavitud'].includes(card.slug)) {
    check = 'Contrastar las condiciones de la descripción y del reglamento con los datos reales de la liga.';
  }
  if (check) result.details.push(`Verificación externa: ${check}`);
  return result;
}