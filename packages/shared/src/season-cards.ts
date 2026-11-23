export interface SeasonField {
  key: string;
  label: string;
  kind: 'player' | 'text' | 'manager' | 'rival' | 'choice' | 'money' | 'movement';
  options?: readonly string[];
}

export interface SeasonCard {
  slug: string;
  name: string;
  nickname: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC';
  description: string;
  usageRules: string;
  fields: readonly SeasonField[];
  /** Página física del PDF del reglamento T26-27 v1.0, contando desde 1. */
  page: number;
}

const player = (label: string, key = 'player'): SeasonField => ({ key, label, kind: 'player' });
const choice = (key: string, label: string, options: readonly string[]): SeasonField =>
  ({ key, label, kind: 'choice', options });
const rival: SeasonField = { key: 'rival', label: 'Mánager rival', kind: 'rival' };
// La pertenencia a la misma escudería se valida con los datos de la temporada.
const teammate: SeasonField = { key: 'teammate', label: 'Mánager compañero de tu escudería', kind: 'rival' };

const anytime = 'Disponible en cualquier momento.';
const morning = 'El día de inicio de la jornada, desde las 07:00 hasta dos horas antes del primer partido.';
const beforeCutoff = 'Debe jugarse antes de entrar en las dos horas previas al primer partido de la jornada.';
const live = 'Desde el inicio de la jornada hasta el comienzo de su último partido.';
const notStarted = 'No se puede elegir a un futbolista cuyo partido ya haya empezado, salvo durante los primeros cinco minutos desde el inicio del primer partido de la jornada.';
const monday = 'Desde el lunes a las 07:00 hasta el inicio del primer partido de la jornada.';
const baseOnly = 'Se usa la puntuación base, sin capitanía, ariete ni efectos de otras cartas.';

export const SEASON_CARDS: readonly SeasonCard[] = [
  {
    slug: 'capitan-obligatorio', name: 'Capitán Obligatorio', nickname: 'El que nunca hace nada', rarity: 'COMMON', page: 15,
    description: 'Designas al futbolista que llevará el brazalete en el equipo de otro mánager.',
    usageRules: `${live} Si ya ha empezado el partido del elegido o el del capitán original, no puedes hacer el cambio. Ambas restricciones se suspenden durante los primeros cinco minutos desde el inicio del primer partido de la jornada.`,
    fields: [rival, player('Nuevo capitán del mánager rival')]
  },
  {
    slug: 'titular-obligatorio', name: 'Titular obligatorio', nickname: 'El hijo del entrenador', rarity: 'COMMON', page: 15,
    description: 'Obligas a otro mánager a alinear al futbolista que elijas de su plantilla.',
    usageRules: morning, fields: [rival, player('Titular de la plantilla rival')]
  },
  {
    slug: 'jugador-prohibido', name: 'Jugador Prohibido', nickname: 'Invitación cumpleaños hermana de Neymar', rarity: 'COMMON', page: 15,
    description: 'Ningún mánager puede alinear al futbolista elegido en esa jornada.',
    usageRules: morning, fields: [player('Futbolista vetado para toda la liga')]
  },
  {
    slug: 'jugador-inutil', name: 'Jugador Inútil', nickname: 'Cheryshev te quiero', rarity: 'COMMON', page: 15,
    description: 'El futbolista elegido no aporta puntos en esta jornada.',
    usageRules: `${live} ${notStarted}`, fields: [player('Futbolista que no puntuará')]
  },
  {
    slug: 'jugador-n12', name: 'Jugador nº12', nickname: 'Jimmy vive', rarity: 'COMMON', page: 16,
    description: 'Sumas en esta jornada los puntos de un jugador de tu plantilla que no hayas alineado.',
    usageRules: 'El día de inicio de la jornada, entre las 07:00 y el comienzo del primer partido. Puedes elegirlo aunque un efecto le impida ser titular.',
    fields: [player('Futbolista propio no alineado')]
  },
  {
    slug: 'cambio-de-jugador', name: 'Cambio de jugador', nickname: 'Protocolo de conmoción', rarity: 'COMMON', page: 16,
    description: 'Un futbolista no alineado de tu plantilla puntúa en lugar de uno de tus titulares.',
    usageRules: `${live} Debías tener al sustituto antes del inicio de la jornada y su partido aún no puede haber empezado.`,
    fields: [player('Titular sustituido', 'outgoing'), player('Futbolista propio no alineado que entra', 'incoming')]
  },
  {
    slug: 'fondo-de-inversion', name: 'Fondo de inversión', nickname: 'El lobo de Wall Street', rarity: 'COMMON', page: 16,
    description: 'Inviertes 1, 3 o 5 millones. El retorno total es del 120 % al cabo de una semana, del 150 % a las dos o del 200 % a las tres.',
    usageRules: `${anytime} La inversión se descuenta al jugar y se cobra el retorno al cumplirse el plazo elegido.`,
    fields: [choice('amount', 'Inversión (millones de euros)', ['1', '3', '5']), choice('weeks', 'Plazo (semanas)', ['1', '2', '3'])]
  },
  {
    slug: 'egoista', name: 'Egoísta', nickname: '', rarity: 'COMMON', page: 17,
    description: 'Le quitas diez puntos de la jornada a tu compañero de escudería y los sumas tú.',
    usageRules: 'Se juega al finalizar la jornada.', fields: [teammate]
  },
  {
    slug: 'cupon-de-descuento', name: 'Cupón de descuento', nickname: '', rarity: 'COMMON', page: 17,
    description: 'Cobras el 15 % del valor de mercado de un futbolista que acabas de comprar en el mercado.',
    usageRules: `${anytime} No sirve para compras por clausulazo ni para el jugador designado en el Martes Loco.`,
    fields: [player('Futbolista recién comprado'), { key: 'marketValue', label: 'Valor de mercado (euros)', kind: 'money' }]
  },
  {
    slug: 'sobre-trucado', name: 'Sobre trucado', nickname: 'El cromo de Iniesta', rarity: 'COMMON', page: 17,
    description: 'Eliges seis jugadores libres que cumplan los criterios del sobre elegido (Bronce o Plata), pagas el sobre y tiras un dado para determinar cuál te corresponde.',
    usageRules: `${anytime} El jugador indicado por el dado sustituye automáticamente al que salga al abrir el sobre.`,
    fields: [choice('pack', 'Tipo de sobre', ['Bronce', 'Plata']), ...[1, 2, 3, 4, 5, 6].map(n => player(`Jugador libre para la cara ${n}`, `player${n}`))]
  },
  {
    slug: 'tragaperras', name: 'Tragaperras', nickname: '', rarity: 'COMMON', page: 18,
    description: 'Apuestas 1, 3, 5 o 10 millones y tiras tres dados de cinco caras. Una pareja paga el 150 % de la apuesta y un trío el 300 %. Con tres caras distintas no cobras nada.',
    usageRules: `${anytime} El importe se descuenta antes de la tirada.`, fields: [choice('amount', 'Apuesta (millones de euros)', ['1', '3', '5', '10'])]
  },
  {
    slug: 'cheque-misterioso', name: 'Cheque Misterioso', nickname: 'Les palenques del Laporta', rarity: 'RARE', page: 18,
    description: 'Tiras un dado y cobras tantos millones como indique su cara, de uno a seis.', usageRules: anytime, fields: []
  },
  {
    slug: 'cesion-obligatoria', name: 'Cesión Obligatoria', nickname: '', rarity: 'RARE', page: 18,
    description: 'El mánager del jugador señalado debe cederlo por el precio mínimo.', usageRules: beforeCutoff,
    fields: [rival, player('Futbolista que debe ceder el mánager rival')]
  },
  {
    slug: 'prohibido-capitan-y-ariete', name: 'Prohibido Capitán y Ariete', nickname: 'A pelo y a pluma', rarity: 'RARE', page: 18,
    description: 'Toda la liga, incluido quien juega la carta, disputa esa jornada sin capitán ni ariete.', usageRules: beforeCutoff, fields: []
  },
  {
    slug: 'blindaje-de-clausulazos', name: 'Blindaje de Clausulazos', nickname: 'Nasser Al-Khelaïfi', rarity: 'RARE', page: 19,
    description: 'Proteges a un futbolista de tu plantilla frente a los clausulazos del domingo siguiente.',
    usageRules: 'Hay que activarla antes de ese domingo de cláusulas.', fields: [player('Futbolista propio que proteger')]
  },
  {
    slug: 'carta-espejo', name: 'Carta Espejo', nickname: '', rarity: 'RARE', page: 19,
    description: 'Replicas en el acto la carta recibida contra tu equipo o plantilla. La réplica solo puede dirigirse al mánager que la lanzó; el efecto original no se cancela.',
    usageRules: 'Se activa al recibir la carta. Salvo blindaje, ambos mánagers sufren el efecto. No refleja Cambio de Puntuación.',
    // El movimiento identifica la carta y su emisor. Si el efecto replica una elección
    // de futbolista, se aplica esa elección en la plantilla del emisor, no en un tercer equipo.
    fields: [{ key: 'movement', label: 'Jugada recibida que se refleja', kind: 'movement' }]
  },
  {
    slug: 'blindaje-de-cartas', name: 'Blindaje de Cartas', nickname: '', rarity: 'RARE', page: 19,
    description: 'Tu equipo y tu plantilla quedan protegidos de nuevas cartas hasta que termine la siguiente jornada.',
    usageRules: `${monday} Los efectos aplicados antes de activar la protección siguen vigentes.`, fields: []
  },
  {
    slug: 'venta-maxima', name: 'Venta Máxima', nickname: 'Morrata', rarity: 'RARE', page: 19,
    description: 'Vendes al futbolista por la cotización más alta que haya alcanzado desde el 1 de agosto.', usageRules: anytime, fields: [player('Futbolista que vendes')]
  },
  {
    slug: 'intercambio-puntuacion-jugador', name: 'Intercambio puntuación de jugador', nickname: 'Presi-culo', rarity: 'RARE', page: 20,
    description: 'Intercambias la peor puntuación de tu alineación por la mejor de la alineación del mánager elegido.',
    usageRules: `Al finalizar la jornada. Solo entran en la comparación quienes hayan disputado al menos un minuto. ${baseOnly}`, fields: [rival]
  },
  {
    slug: 'subir-al-primer-equipo', name: 'Subir al primer equipo', nickname: '', rarity: 'RARE', page: 20,
    description: 'Un titular de tu compañero de escudería puntúa también para ti. Su valor de mercado no puede superar los 10 millones.',
    usageRules: `${live} ${notStarted} ${baseOnly}`, fields: [teammate, player('Titular del compañero de escudería')]
  },
  {
    slug: 'exclavitud', name: 'Exclavitud', nickname: '', rarity: 'RARE', page: 20,
    description: 'La tirada de un dado decide tu siguiente pago de salarios: del 1 al 5 no pagas; con un 6 pagas el doble.', usageRules: anytime, fields: []
  },
  {
    slug: 'bono-de-representacion', name: 'Bono de representación', nickname: 'Jorge Mendes', rarity: 'RARE', page: 21,
    description: 'Ingresas el 10 % del precio que haya pagado otro mánager por el futbolista seleccionado.',
    usageRules: `${anytime} Solo cuentan compras cuya fecha en Biwenger coincida con el día de activación.`,
    fields: [player('Futbolista comprado'), { key: 'buyer', label: 'Mánager rival comprador', kind: 'rival' }, { key: 'purchasePrice', label: 'Precio de compra (euros)', kind: 'money' }]
  },
  {
    slug: 'mus', name: 'Mus', nickname: '', rarity: 'RARE', page: 21,
    description: 'Cada mánager excepto tú debe descartar una carta del rango más alto que tenga: primero épica, después rara y por último común. Si hay empate, elige cuál de ese rango descarta.',
    usageRules: `${anytime} El afectado no puede jugar otra carta hasta descartar. Si tenía la mano vacía al activarse Mus, no queda bloqueado.`, fields: []
  },
  {
    slug: 'caja-misteriosa', name: 'Caja misteriosa', nickname: 'Sin ánimo de lucro, ¿tú qué prefieres?', rarity: 'RARE', page: 21,
    description: 'Para un futbolista propio eliges entre fijar su puntuación en siete o duplicar solo la parte que exceda de siete.',
    usageRules: `${live} ${notStarted} ${baseOnly} Sin al menos un minuto disputado en esa jornada, la carta no surte efecto.`,
    fields: [player('Futbolista de tu plantilla'), choice('mode', 'Efecto sobre los puntos base', ['Fijar la puntuación en 7', 'Duplicar solo los puntos por encima de 7'])]
  },
  {
    slug: 'equipo-vetado', name: 'Equipo vetado', nickname: 'Antimadridista', rarity: 'RARE', page: 22,
    description: 'En la siguiente jornada ningún mánager podrá alinear futbolistas del club real elegido ni sumar sus puntos.',
    usageRules: 'Debe anunciarse con al menos cuatro días de antelación al inicio de la jornada.',
    fields: [{ key: 'club', label: 'Equipo real de la liga de fútbol', kind: 'text' }]
  },
  {
    slug: 'empresa-pantalla', name: 'Empresa pantalla', nickname: '', rarity: 'RARE', page: 22,
    description: 'Autoriza una compraventa de un futbolista entre dos mánagers de la misma escudería.',
    usageRules: `${anytime} El precio de compra debe coincidir con el valor de mercado.`, fields: [teammate, player('Futbolista objeto de la compraventa')]
  },
  {
    slug: '2-pa-2', name: '2 pa 2', nickname: 'Bot Lane', rarity: 'RARE', page: 22,
    description: 'Retas a otra escudería. Al cierre de la jornada se suman los dos mejores futbolistas de cada mánager: cuatro puntuaciones por escudería. Cada miembro de la ganadora recibe la diferencia entre ambos totales.',
    usageRules: beforeCutoff, fields: [{ key: 'squad', label: 'Escudería rival a la que retas', kind: 'text' }]
  },
  {
    slug: 'super-capitan', name: 'Super-Capitán', nickname: 'Iker Casillas', rarity: 'EPIC', page: 23,
    description: 'Nombras a tu capitán para la próxima jornada: sus puntos se multiplican por tres en vez de por dos.',
    usageRules: `${monday} Desde la activación no le afectan nuevas cartas, pero se mantienen las aplicadas anteriormente.`, fields: [player('Tu próximo capitán')]
  },
  {
    slug: 'alineacion-congelada', name: 'Alineación Congelada', nickname: 'Walt Disney', rarity: 'EPIC', page: 23,
    description: 'El mánager elegido deberá repetir alineación y futbolistas en la jornada siguiente. Toda su plantilla queda protegida de clausulazos hasta que termine esa jornada.',
    usageRules: 'Solo el día de inicio de la jornada, una vez comenzado el primer partido y bloqueadas las alineaciones. Si ese día ya se vendió un jugador de la plantilla, se deshace la venta por el mismo importe y se recupera al futbolista. En la jornada siguiente sí se pueden cambiar el capitán y el ariete.', fields: [rival]
  },
  {
    slug: 'cambio-de-puntuacion', name: 'Cambio de Puntuación', nickname: 'Negreira', rarity: 'EPIC', page: 23,
    description: 'Dos mánagers distintos intercambian sus puntuaciones de la jornada. Puedes ser uno de ellos o elegir a otros dos.',
    usageRules: 'El plazo termina 24 horas después del final de la jornada. Primero se aplican todas las restricciones y los efectos positivos o negativos de normas y cartas; ambos totales resultantes deben alcanzar al menos 30 puntos para poder intercambiarlos.',
    fields: [{ key: 'first', label: 'Primer mánager (puedes ser tú)', kind: 'manager' }, { key: 'second', label: 'Segundo mánager (puedes ser tú)', kind: 'manager' }]
  },
  {
    slug: 'clausulazo-directo', name: 'Clausulazo Directo', nickname: 'Su Florentineza', rarity: 'EPIC', page: 24,
    description: 'Cierras directamente el clausulazo seleccionado sin que prosiga la subasta.',
    usageRules: 'Se juega el domingo, al abrirse el mercado de clausulazos.', fields: [rival, player('Futbolista objeto del clausulazo')]
  },
  {
    slug: 'jugador-mercado-prioritario', name: 'Jugador Mercado Prioritario', nickname: '', rarity: 'EPIC', page: 24,
    description: 'Te reservas en exclusiva la puja por un futbolista del mercado libre.',
    usageRules: `${anytime} Queda excluido el jugador designado en el Martes Loco.`, fields: [player('Futbolista del mercado libre')]
  },
  {
    slug: 'lesion-de-cruzado', name: 'Lesión de cruzado', nickname: '', rarity: 'EPIC', page: 24,
    description: 'El futbolista señalado debe venderse al mercado en un plazo de tres días.',
    usageRules: `${anytime} Si vence el plazo sin venta, se pierde al futbolista sin recibir dinero.`, fields: [rival, player('Futbolista que debe venderse')]
  }
];

export function findSeasonCard(slug: string): SeasonCard | undefined {
  return SEASON_CARDS.find(card => card.slug === slug);
}