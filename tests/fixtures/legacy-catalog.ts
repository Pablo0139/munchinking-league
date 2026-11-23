import type { CardDefinitionSeed } from '../../packages/shared/src';

export const LEGACY_TEST_CATALOG: readonly CardDefinitionSeed[] = [
  {
    slug: 'presi-culo',
    name: 'Presi-Culo',
    nickname: 'El decreto del palco',
    rarity: 'EPIC',
    targetType: 'MANAGER',
    defaultCopies: 3,
    description: 'Impone la sanción o condición presidencial prevista sobre un manager rival.',
    usageRules: 'Debe jugarse y anunciarse en WhatsApp antes del inicio de la jornada.',
    imageUrl: '/assets/cards/presi-culo.webp',
    whatsappTemplate:
      '{{managerName}} activa *Presi-Culo* contra *{{targetManager}}*. El palco ha hablado y toca acatar la sanción presidencial.'
  },
  {
    slug: 'clausulazo-congelado',
    name: 'Blindaje Express',
    nickname: 'Aquí no toca nadie',
    rarity: 'RARE',
    targetType: 'PLAYER',
    defaultCopies: 3,
    description: 'Protege temporalmente a un jugador propio frente a acciones rivales.',
    usageRules: 'Indica el nombre exacto del jugador en tu plantilla actual.',
    imageUrl: '/assets/cards/clausulazo-congelado.webp',
    whatsappTemplate:
      '{{managerName}} blinda a *{{targetLabel}}* esta jornada. Queda protegido según las reglas de Blindaje Express.'
  },
  {
    slug: 'impuesto-revolucionario',
    name: 'Sablazo Federativo',
    nickname: 'Pasa por caja',
    rarity: 'COMMON',
    targetType: 'MANAGER',
    defaultCopies: 5,
    description: 'Aplica una tasa federativa directa al presupuesto del manager objetivo.',
    usageRules: 'Aplicable una vez por manager objetivo durante la misma semana.',
    imageUrl: '/assets/cards/impuesto-revolucionario.webp',
    whatsappTemplate:
      '{{managerName}} aplica *Sablazo Federativo* sobre *{{targetManager}}*. El administrador ajustará el cargo correspondiente en Biwenger.'
  },
  {
    slug: 'prima-por-objetivo',
    name: 'Maletín Transparente',
    nickname: 'Incentivo totalmente legal',
    rarity: 'COMMON',
    targetType: 'NONE',
    defaultCopies: 5,
    description: 'Reclama la prima económica directa estipulada en el reglamento de la liga.',
    usageRules: 'Uso inmediato en cualquier momento previo al cierre de mercado semanal.',
    imageUrl: '/assets/cards/prima-por-objetivo.webp',
    whatsappTemplate:
      '{{managerName}} reclama su *Maletín Transparente* para esta jornada. Pendiente de abono manual por administración.'
  },
  {
    slug: 'veto-de-alineacion',
    name: 'Lesión Diplomática',
    nickname: 'Molestias en el calentamiento',
    rarity: 'EPIC',
    targetType: 'PLAYER',
    defaultCopies: 2,
    description: 'Señala a un jugador concreto para aplicar la restricción de alineación vigente.',
    usageRules: 'Debe comunicarse con antelación mínima según ventana oficial de la jornada.',
    imageUrl: '/assets/cards/veto-de-alineacion.webp',
    whatsappTemplate:
      '{{managerName}} señala a *{{targetLabel}}* con *Lesión Diplomática*. Revisar aplicación en la jornada vigente.'
  },
  {
    slug: 'inspeccion-hacienda',
    name: 'Auditoría Nocturna',
    nickname: 'Papeles sobre la mesa',
    rarity: 'RARE',
    targetType: 'MANAGER',
    defaultCopies: 3,
    description: 'Somete a revisión las cuentas o movimientos recientes del manager rival.',
    usageRules: 'Selecciona al manager rival sobre el que recae la inspección.',
    imageUrl: '/assets/cards/inspeccion-hacienda.webp',
    whatsappTemplate: '{{managerName}} lanza una *Auditoría Nocturna* contra *{{targetManager}}*.'
  },
  {
    slug: 'subvencion-municipal',
    name: 'Recalificación',
    nickname: 'Terrenos junto al estadio',
    rarity: 'COMMON',
    targetType: 'NONE',
    defaultCopies: 5,
    description: 'Otorga una inyección presupuestaria directa al club del manager.',
    usageRules: 'No requiere seleccionar objetivo.',
    imageUrl: '/assets/cards/subvencion-municipal.webp',
    whatsappTemplate:
      '{{managerName}} activa *Recalificación* y solicita la inyección económica prevista en el reglamento.'
  },
  {
    slug: 'mercado-intervenido',
    name: 'Puja Fantasma',
    nickname: 'Humo en la prensa',
    rarity: 'COMMON',
    targetType: 'FREE_TEXT',
    defaultCopies: 4,
    description: 'Interviene una operación concreta del mercado según detalle indicado.',
    usageRules: 'Especifica brevemente la operación o jugador del mercado afectado.',
    imageUrl: '/assets/cards/mercado-intervenido.webp',
    whatsappTemplate: '{{managerName}} juega *Puja Fantasma* indicando: "{{targetLabel}}".'
  },
  {
    slug: 'indulto-comite',
    name: 'Recurso al TAD',
    nickname: 'Defecto de forma',
    rarity: 'RARE',
    targetType: 'FREE_TEXT',
    defaultCopies: 3,
    description: 'Suspende o recurre un efecto adverso recibido siguiendo las normas del comité.',
    usageRules: 'Indica en el texto qué sanción o jugada recurres.',
    imageUrl: '/assets/cards/indulto-comite.webp',
    whatsappTemplate: '{{managerName}} presenta *Recurso al TAD* sobre: "{{targetLabel}}".'
  },
  {
    slug: 'doble-capitania',
    name: 'Brazalete de Oro',
    nickname: 'Hoy mando yo',
    rarity: 'RARE',
    targetType: 'PLAYER',
    defaultCopies: 3,
    description: 'Designa un jugador propio para bonificación especial de capitanía.',
    usageRules: 'Debe declararse antes del comienzo de la jornada.',
    imageUrl: '/assets/cards/doble-capitania.webp',
    whatsappTemplate:
      '{{managerName}} otorga el *Brazalete de Oro* a *{{targetLabel}}* para esta jornada.'
  },
  {
    slug: 'caos-en-el-sorteo',
    name: 'Bolas Calientes',
    nickname: 'Mano inocente',
    rarity: 'EPIC',
    targetType: 'MANAGER',
    defaultCopies: 2,
    description: 'Altera el orden o ventaja de un manager rival en el evento semanal.',
    usageRules: 'Requiere elegir al manager afectado.',
    imageUrl: '/assets/cards/caos-en-el-sorteo.webp',
    whatsappTemplate: '{{managerName}} usa *Bolas Calientes* afectando a *{{targetManager}}*.'
  },
  {
    slug: 'corona-munchinking',
    name: 'Golpe de Estado',
    nickname: 'El trono cambia de dueño',
    rarity: 'LEGENDARY',
    targetType: 'MANAGER',
    defaultCopies: 1,
    description: 'Carta legendaria de máximo impacto directo contra un rival de la liga.',
    usageRules: 'Copia única en el mazo. Uso sujeto a las reglas de cartas legendarias.',
    imageUrl: '/assets/cards/corona-munchinking.webp',
    whatsappTemplate:
      '👑 ¡CARTA LEGENDARIA! {{managerName}} desata *Golpe de Estado* contra *{{targetManager}}*.'
  },
  {
    slug: 'amnistia-dorada',
    name: 'Decreto Real',
    nickname: 'Borrón y cuenta nueva',
    rarity: 'LEGENDARY',
    targetType: 'NONE',
    defaultCopies: 1,
    description: 'Carta legendaria de inmunidad o bonificación extraordinaria para tu club.',
    usageRules: 'Copia única en el mazo. No requiere objetivo.',
    imageUrl: '/assets/cards/amnistia-dorada.webp',
    whatsappTemplate:
      '👑 ¡CARTA LEGENDARIA! {{managerName}} proclama *Decreto Real* para esta jornada.'
  }
];

