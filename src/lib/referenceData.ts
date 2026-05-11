export type FailureMode = {
  category: 'dishwasher' | 'washer' | 'dryer' | 'refrigerator' | 'oven';
  name: string;
  symptoms: string[];
  errorCodePatterns?: string[];
  diyDifficulty: 'easy' | 'moderate' | 'advanced';
  callProIf?: string;
  typicalParts?: string[];
};

export const FAILURE_MODES: FailureMode[] = [
  // === DISHWASHER ===
  {
    category: 'dishwasher',
    name: 'Drain pump failure',
    symptoms: [
      'standing water in tub after cycle',
      'humming or buzzing from lower area during drain phase'
    ],
    errorCodePatterns: ['LE', 'OE', 'F21', '5E'],
    diyDifficulty: 'moderate',
    typicalParts: ['drain pump assembly']
  },
  {
    category: 'dishwasher',
    name: 'Door latch / interlock failure',
    symptoms: [
      'cycle will not start',
      'control panel lights but pumps are silent'
    ],
    errorCodePatterns: ['F02', 'DE', 'DO'],
    diyDifficulty: 'easy',
    typicalParts: ['door latch assembly', 'door switch']
  },
  {
    category: 'dishwasher',
    name: 'Clogged drain hose or air gap',
    symptoms: [
      'standing water in tub but pump runs',
      'water backs up into sink during cycle'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['drain hose']
  },
  {
    category: 'dishwasher',
    name: 'Heating element failure',
    symptoms: [
      'dishes not drying',
      'water not heating during wash cycle'
    ],
    errorCodePatterns: ['F22', 'HE'],
    diyDifficulty: 'moderate',
    typicalParts: ['heating element']
  },
  {
    category: 'dishwasher',
    name: 'Spray arm clog or break',
    symptoms: [
      'top rack dishes still dirty after cycle',
      'visibly damaged or stuck spray arm'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['spray arm assembly']
  },
  {
    category: 'dishwasher',
    name: 'Control board fault',
    symptoms: [
      'no response to button presses',
      'erratic cycle behavior',
      'all indicator lights blinking'
    ],
    errorCodePatterns: ['F01', 'CE'],
    diyDifficulty: 'advanced',
    callProIf: 'confidence is low or board is sealed unit',
    typicalParts: ['main control board']
  },
  {
    category: 'dishwasher',
    name: 'Inlet valve failure',
    symptoms: [
      'no water entering tub',
      'water hammer sound at start of cycle'
    ],
    errorCodePatterns: ['F03', 'IE'],
    diyDifficulty: 'moderate',
    typicalParts: ['water inlet valve']
  },

  // === WASHER ===
  {
    category: 'washer',
    name: 'Drain pump failure',
    symptoms: [
      'water remains in drum after cycle',
      'humming noise from base during drain phase',
      'will not advance to spin cycle'
    ],
    errorCodePatterns: ['LE', 'OE', '5E', 'F21', 'NF'],
    diyDifficulty: 'moderate',
    typicalParts: ['drain pump assembly']
  },
  {
    category: 'washer',
    name: 'Lid or door switch failure',
    symptoms: [
      'will not start when lid/door closed',
      'spin cycle will not engage'
    ],
    errorCodePatterns: ['DL', 'F02', 'DE'],
    diyDifficulty: 'easy',
    typicalParts: ['lid switch', 'door lock assembly']
  },
  {
    category: 'washer',
    name: 'Drive belt slipping or broken',
    symptoms: [
      'motor runs but drum does not turn',
      'rubber smell during spin cycle'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['drive belt']
  },
  {
    category: 'washer',
    name: 'Drum bearing wear',
    symptoms: [
      'loud grinding or roaring during spin',
      'visible drum play when pushed',
      'wet bearing area underneath'
    ],
    diyDifficulty: 'advanced',
    callProIf: 'requires tub removal and spider replacement',
    typicalParts: ['drum bearing kit', 'tub seal']
  },
  {
    category: 'washer',
    name: 'Inlet valve or hose failure',
    symptoms: [
      'no water filling',
      'leaking from rear of machine'
    ],
    errorCodePatterns: ['F08', 'IE'],
    diyDifficulty: 'easy',
    typicalParts: ['inlet valve', 'fill hose']
  },
  {
    category: 'washer',
    name: 'Out-of-balance / suspension failure',
    symptoms: [
      'machine walks across floor during spin',
      'loud banging during spin cycle'
    ],
    errorCodePatterns: ['UE', 'UB'],
    diyDifficulty: 'moderate',
    typicalParts: ['suspension rods', 'shock absorbers']
  },
  {
    category: 'washer',
    name: 'Motor coupler failure (top-load direct-drive)',
    symptoms: [
      'motor runs but no agitation',
      'plastic fragments visible under machine'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['motor coupler']
  },

  // === DRYER ===
  {
    category: 'dryer',
    name: 'Heating element failure',
    symptoms: [
      'drum turns but no heat',
      'clothes still wet after full cycle'
    ],
    errorCodePatterns: ['F01', 'HE'],
    diyDifficulty: 'moderate',
    typicalParts: ['heating element']
  },
  {
    category: 'dryer',
    name: 'Thermal fuse blown',
    symptoms: [
      'no heat suddenly after working fine',
      'dryer runs but cold'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['thermal fuse']
  },
  {
    category: 'dryer',
    name: 'Drive belt broken',
    symptoms: [
      'motor hums but drum does not turn',
      'drum spins freely by hand with no resistance'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['drive belt']
  },
  {
    category: 'dryer',
    name: 'Lint or vent restriction',
    symptoms: [
      'clothes take multiple cycles to dry',
      'dryer hot to the touch externally',
      'lint accumulation around door seal'
    ],
    diyDifficulty: 'easy',
    typicalParts: []
  },
  {
    category: 'dryer',
    name: 'Idler pulley wear',
    symptoms: [
      'loud squealing during operation',
      'thumping noise from drum area'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['idler pulley', 'drive belt']
  },
  {
    category: 'dryer',
    name: 'Door switch failure',
    symptoms: [
      'dryer will not start',
      'works only when door held closed in specific way'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['door switch']
  },
  {
    category: 'dryer',
    name: 'Gas valve or igniter failure (gas dryer)',
    symptoms: [
      'drum turns but no heat (gas dryer)',
      'clicking sound but no ignition'
    ],
    diyDifficulty: 'advanced',
    callProIf: 'gas appliance — gas line work required',
    typicalParts: ['gas valve solenoid kit', 'igniter']
  },

  // === REFRIGERATOR ===
  {
    category: 'refrigerator',
    name: 'Defrost heater failure',
    symptoms: [
      'frost buildup on rear of freezer compartment',
      'fridge section warm while freezer works'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['defrost heater', 'defrost thermostat']
  },
  {
    category: 'refrigerator',
    name: 'Door seal (gasket) failure',
    symptoms: [
      'visible gaps in door seal',
      'condensation around door edges',
      'compressor runs constantly'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['door gasket']
  },
  {
    category: 'refrigerator',
    name: 'Ice maker fault',
    symptoms: [
      'ice maker not producing ice',
      'water line frozen',
      'ice cubes hollow or undersized'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['ice maker assembly', 'water inlet valve']
  },
  {
    category: 'refrigerator',
    name: 'Evaporator fan failure',
    symptoms: [
      'fridge warm, freezer cold but not very cold',
      'no fan noise when door opened'
    ],
    diyDifficulty: 'moderate',
    typicalParts: ['evaporator fan motor']
  },
  {
    category: 'refrigerator',
    name: 'Compressor or sealed system failure',
    symptoms: [
      'both fridge and freezer warm',
      'compressor running but no cooling',
      'visible oil residue at fittings'
    ],
    diyDifficulty: 'advanced',
    callProIf: 'sealed refrigeration system — requires EPA certification',
    typicalParts: ['compressor (pro install)']
  },
  {
    category: 'refrigerator',
    name: 'Condenser coil dirty',
    symptoms: [
      'compressor runs constantly',
      'higher than normal temperatures'
    ],
    diyDifficulty: 'easy',
    typicalParts: []
  },
  {
    category: 'refrigerator',
    name: 'Drain tube clogged (water pooling)',
    symptoms: [
      'water collecting at bottom of fridge',
      'ice buildup in freezer floor'
    ],
    diyDifficulty: 'easy',
    typicalParts: []
  },

  // === OVEN ===
  {
    category: 'oven',
    name: 'Bake element failure (electric)',
    symptoms: [
      'oven not heating to set temperature',
      'visible break or burn spot on bake element'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['bake element']
  },
  {
    category: 'oven',
    name: 'Broil element failure (electric)',
    symptoms: [
      'broil function not working',
      'visible damage on broil element'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['broil element']
  },
  {
    category: 'oven',
    name: 'Oven thermostat / temp sensor fault',
    symptoms: [
      'oven temperature reads incorrectly',
      'food consistently over- or under-cooked',
      'temperature swings during cooking'
    ],
    errorCodePatterns: ['F1', 'F3', 'F30'],
    diyDifficulty: 'moderate',
    typicalParts: ['temperature sensor', 'thermostat']
  },
  {
    category: 'oven',
    name: 'Igniter failure (gas oven)',
    symptoms: [
      'oven not heating (gas)',
      'clicking sound but no flame',
      'weak glow from igniter when calling for heat'
    ],
    diyDifficulty: 'advanced',
    callProIf: 'gas appliance — confirm gas line work scope before DIY',
    typicalParts: ['oven igniter']
  },
  {
    category: 'oven',
    name: 'Door seal failure',
    symptoms: [
      'heat escaping from door edges',
      'long preheat times',
      'visible damage on door gasket'
    ],
    diyDifficulty: 'easy',
    typicalParts: ['oven door gasket']
  },
  {
    category: 'oven',
    name: 'Control board fault',
    symptoms: [
      'erratic display',
      'oven not responding to button presses',
      'unable to set temperature or function'
    ],
    errorCodePatterns: ['F2', 'F10'],
    diyDifficulty: 'advanced',
    callProIf: 'electronics work near gas/electric supply',
    typicalParts: ['main control board']
  }
];

export function selectRelevantModes(
  categoryHint: FailureMode['category'] | 'unknown',
  errorCode: string | null
): FailureMode[] {
  const normalizedCode = errorCode?.trim().toUpperCase() ?? null;

  // Tier 1: exact error-code match across all categories.
  if (normalizedCode) {
    const hits = FAILURE_MODES.filter(m =>
      m.errorCodePatterns?.some(p => p === normalizedCode)
    );
    if (hits.length > 0) return hits;
  }

  // Tier 2: category filter if known.
  if (categoryHint !== 'unknown') {
    return FAILURE_MODES.filter(m => m.category === categoryHint);
  }

  // Tier 3: all modes.
  return FAILURE_MODES;
}
