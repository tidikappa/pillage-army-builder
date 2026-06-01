export type Language = 'fr' | 'en';

export const translations = {
  fr: {
    armyName: "Nom de l'Armée",
    faction: "Faction",
    budget: "Budget de Recrutement",
    treasury: "Trésorerie",
    spent: "Dépensé",
    remaining: "Restant",
    other: "Autre",
    deficit: "Déficit Critique",
    deficitMsg: "Vos coffres sont vides. Réduisez votre armée.",
    restrictions: "Restrictions Violées",
    specialRules: "Bonus de Faction",
    exportPdf: "EXPORTER PDF",
    reset: "Voulez-vous vraiment dissoudre votre armée ?",
    changeFaction: "Changer de faction va dissoudre votre armée actuelle. Continuer ?",
    emptyArmy: "La plaine est vide",
    assembleTroops: "Rassemblez vos troupes ci-dessous",
    recruitUnit: "RECRUTER UNE UNITÉ",
    reinforce: "Renforcez vos rangs",
    recruitment: "Recrutement",
    tacticalReminders: "Rappels Tactiques",
    unitClass: "Classe de l'unité",
    armorShield: "Armure & Bouclier",
    meleeWeapons: "Armement de contact",
    rangedWeapons: "Armes de tir",
    specialOptions: "Options Spéciales",
    talents: "Talents (Max 2)",
    quantity: "Quantité",
    cost: "Coût",
    cancel: "Annuler",
    confirm: "Confirmer",
    pdfTitle: "Liste d'armée - Pillage",
    total: "Total",
    unit: "Unité",
    equipments: "Équipements / Talents",
    delete: "Supprimer",
    duplicate: "Dupliquer",
    yourArmy: "Votre Armée",
    selectFaction: "Sélectionnez une faction dans le panneau de configuration pour commencer à forger votre légende.",
    warlordTitle: "Seigneur de Guerre",
    configuration: "Configuration de Guerre",
    selectAllegiance: "Sélectionner votre allégeance...",
    pdfDownloaded: "PDF téléchargé !",
    unitRecruited: "Unité recrutée avec succès",
    unitsRecruited: "Unités recrutées avec succès",
    unitRemoved: "Unité retirée",
    armyReset: "Armée réinitialisée",
    cantDuplicateUnique: "Impossible de dupliquer un chef avec des talents uniques.",
    cantRecruitMultipleUnique: "Impossible de recruter plusieurs unités avec des talents uniques simultanément.",
    talentTaken: "Le talent est déjà pris par un autre chef.",
    mustHaveWarlord: "Votre armée doit contenir au moins un Chef.",
    tooManyWarlords: "Trop de Chefs",
    bannerLimit: "Votre armée ne peut posséder qu'une seule bannière.",
    hornLimit: "Votre armée ne peut posséder qu'un seul cor de guerre.",
    tooManyShooters: "Trop de tireurs à pied",
    tooManyCavalry: "Trop de cavaliers",
    limit: "Limite",
    of: "de",
    models: "figurines",
    chooseLanguage: "Langue"
  },
  en: {
    armyName: "Army Name",
    faction: "Faction",
    budget: "Recruitment Budget",
    treasury: "Treasury",
    spent: "Spent",
    remaining: "Remaining",
    other: "Other",
    deficit: "Critical Deficit",
    deficitMsg: "Your coffers are empty. Reduce your army.",
    restrictions: "Violated Restrictions",
    specialRules: "Faction Bonuses",
    exportPdf: "EXPORT PDF",
    reset: "Do you really want to dissolve your army?",
    changeFaction: "Changing faction will dissolve your current army. Continue?",
    emptyArmy: "The plain is empty",
    assembleTroops: "Assemble your troops below",
    recruitUnit: "RECRUIT UNIT",
    reinforce: "Reinforce your ranks",
    recruitment: "Recruitment",
    tacticalReminders: "Tactical Reminders",
    unitClass: "Unit Class",
    armorShield: "Armor & Shield",
    meleeWeapons: "Melee Weapons",
    rangedWeapons: "Ranged Weapons",
    specialOptions: "Special Options",
    talents: "Talents (Max 2)",
    quantity: "Quantity",
    cost: "Cost",
    cancel: "Cancel",
    confirm: "Confirm",
    pdfTitle: "Army List - Pillage",
    total: "Total",
    unit: "Unit",
    equipments: "Equipments / Talents",
    delete: "Delete",
    duplicate: "Duplicate",
    yourArmy: "Your Army",
    selectFaction: "Select a faction in the configuration panel to start forging your legend.",
    warlordTitle: "Warlord",
    configuration: "War Configuration",
    selectAllegiance: "Select your allegiance...",
    pdfDownloaded: "PDF downloaded!",
    unitRecruited: "Unit recruited successfully",
    unitsRecruited: "Units recruited successfully",
    unitRemoved: "Unit removed",
    armyReset: "Army reset",
    cantDuplicateUnique: "Cannot duplicate a Warlord with unique talents.",
    cantRecruitMultipleUnique: "Cannot recruit multiple units with unique talents simultaneously.",
    talentTaken: "The talent is already taken by another Warlord.",
    mustHaveWarlord: "Your army must contain at least one Warlord.",
    tooManyWarlords: "Too many Warlords",
    bannerLimit: "Your army can only have one banner.",
    hornLimit: "Your army can only have one war horn.",
    tooManyShooters: "Too many shooters",
    tooManyCavalry: "Too many cavalry",
    limit: "Limit",
    of: "of",
    models: "models",
    chooseLanguage: "Language"
  }
};

export const dataTranslations: Record<string, Record<string, string>> = {
  // Common roles
  warrior: { fr: "Guerrier", en: "Warrior" },
  warlord: { fr: "Chef", en: "Warlord" },
  berserker: { fr: "Berserker", en: "Berserker" },
  huscarl: { fr: "Huscarl", en: "Huscarl" },
  healer: { fr: "Soigneur", en: "Healer" },
  chariot: { fr: "Chariot", en: "Chariot" },
  
  // Common equipment
  prot_none: { fr: "Sans protection", en: "No Protection" },
  prot_armor: { fr: "Armure", en: "Armor" },
  prot_shield: { fr: "Bouclier", en: "Shield" },
  
  // Also need to handle prefixed versions like protection_none, protection_armor
  protection_none: { fr: "Sans protection", en: "No Protection" },
  protection_armor: { fr: "Armure", en: "Armor" },
  protection_shield: { fr: "Bouclier", en: "Shield" },

  mel_imp: { fr: "Arme improvisée", en: "Improvised Weapon" },
  weapon_improvised: { fr: "Arme improvisée", en: "Improvised Weapon" },

  mel_spear: { fr: "Lance", en: "Spear" },
  weapon_spear: { fr: "Lance", en: "Spear" },

  mel_base: { fr: "Arme de base", en: "Base Weapon" },
  weapon_base: { fr: "Arme de base", en: "Base Weapon" },
  
  weapon_sabre: { fr: "Sabre", en: "Saber" },

  mel_axe: { fr: "Hache danoise", en: "Danish Axe" },
  
  ran_none: { fr: "Aucune", en: "None" },
  
  ran_sling: { fr: "Fronde", en: "Sling" },
  ranged_sling: { fr: "Fronde", en: "Sling" },

  ran_jav: { fr: "Javelot", en: "Javelin" },
  ranged_javelin: { fr: "Javelot", en: "Javelin" },

  ran_bow: { fr: "Arc", en: "Bow" },
  ran_xbow: { fr: "Arbalète", en: "Crossbow" },
  ranged_composite_bow: { fr: "Arc composite", en: "Composite Bow" },

  spec_horse: { fr: "Cheval", en: "Horse" },
  spec_banner: { fr: "Bannière", en: "Banner" },
  spec_horn: { fr: "Cor de guerre", en: "War Horn" },
  spec_dogs: { fr: "Chiens de guerre", en: "War Dogs" },

  // Factions
  magyars: { fr: "Magyars", en: "Magyars" },
  byzantines: { fr: "Byzantins", en: "Byzantines" },
  rus: { fr: "Rus / Varègues", en: "Rus / Varangians" },
  franks: { fr: "Francs Carolingiens", en: "Carolingian Franks" },
  anglosaxons: { fr: "Anglo-Saxons", en: "Anglo-Saxons" },
  normans: { fr: "Normands", en: "Normans" },
  vikings: { fr: "Vikings", en: "Vikings" },
  irish: { fr: "Irlandais", en: "Irish" },
  bretons: { fr: "Bretons", en: "Bretons" },
  welsh: { fr: "Gallois", en: "Welsh" },
  scots: { fr: "Ecossais", en: "Scots" },
};

export function t(key: keyof typeof translations['fr'], lang: Language): string {
  return translations[lang][key] || translations['fr'][key];
}

export function tData(id: string, originalName: string, lang: Language): string {
  if (lang === 'fr') return originalName;
  if (dataTranslations[id] && dataTranslations[id][lang]) {
    return dataTranslations[id][lang];
  }
  // Fallback for common terms if ID doesn't match
  const commonMap: Record<string, string> = {
    'Guerrier': 'Warrior',
    'Chef': 'Warlord',
    'Berserker': 'Berserker',
    'Huscarl': 'Huscarl',
    'Soigneur': 'Healer',
    'Chariot': 'Chariot',
    'Armure': 'Armor',
    'Bouclier': 'Shield',
    'Sans protection': 'No Protection',
    'Lance': 'Spear',
    'Arme de base': 'Base Weapon',
    'Hache danoise': 'Danish Axe',
    'Cheval': 'Horse',
    'Bannière': 'Banner',
    'Cor de guerre': 'War Horn',
  };
  if (commonMap[originalName]) return commonMap[originalName];

  return originalName;
}
