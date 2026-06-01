import { Shield, Sword, Crosshair, Zap, Skull, User, Heart, Crown, Activity, Flag, Megaphone, PawPrint, TreeDeciduous, Wind, Wine, Target, Cross, FlaskConical, Timer, Eye, Flame, UserPlus } from "lucide-react";

export type EquipmentType = 'protection' | 'melee' | 'ranged' | 'special' | 'talent';

export type UnitRole = 'warrior' | 'warlord' | 'berserker' | 'huscarl' | 'healer' | 'chariot';

export const UNIT_ROLES: UnitRole[] = ['warrior', 'warlord', 'berserker', 'huscarl', 'healer', 'chariot'];

export interface UnitCosts {
  warrior: number | null;
  warlord: number | null;
  berserker: number | null;
  huscarl: number | null;
  healer: number | null;
  chariot: number | null;
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  costs: UnitCosts;
  icon?: any;
  description?: string;
}

export interface UnitType {
  id: UnitRole;
  name: string;
  baseCost: number; // This might be redundant if base cost is per faction, but we'll keep the ID/Name here
  icon?: any;
}

export interface Faction {
  id: string;
  name: string;
  description?: string;
  units: { id: UnitRole; name: string; baseCost: number; icon: any }[];
  availableEquipment: Equipment[];
  specialRules: string[];
}

// Helper to create costs
const c = (w: number|string, l: number|string, b: number|string, h: number|string, hl: number|string, ch: number|string): UnitCosts => {
  const parse = (v: number|string): number | null => {
    if (typeof v === 'number') return v;
    if (v === 'Gratuit') return 0;
    if (v === '-') return null;
    if (typeof v === 'string' && v.endsWith(' po')) return parseInt(v.replace(' po', ''), 10);
    if (typeof v === 'string' && v.endsWith(' po*')) return parseInt(v.replace(' po*', ''), 10); // Handle asterisk
    return null;
  };
  return {
    warrior: parse(w),
    warlord: parse(l),
    berserker: parse(b),
    huscarl: parse(h),
    healer: parse(hl),
    chariot: parse(ch),
  };
};

// Unit definitions (Templates)
const unitTemplates: Record<UnitRole, { name: string, icon: any }> = {
  warrior: { name: 'Guerrier', icon: User },
  warlord: { name: 'Chef', icon: Crown },
  berserker: { name: 'Berserker', icon: Skull },
  huscarl: { name: 'Huscarl', icon: Shield },
  healer: { name: 'Soigneur', icon: Heart },
  chariot: { name: 'Chariot', icon: Activity },
};

// --- DATA ENTRY ---


// Talents (available as equipment for Warlords)
const commonTalents: Equipment[] = [
  { 
    id: 'talent_quick', 
    name: 'Vif comme l’éclair', 
    type: 'talent', 
    icon: Zap, 
    costs: c('-', '50 po', '-', '-', '-', '-'),
    description: "Votre chef possède une présence d’esprit hors du commun et une capacité d’analyse importante. Le chef bénéficie d’un bonus de +1 à ses jets d’initiative."
  },
  { 
    id: 'talent_sport', 
    name: 'Entraînement sportif', 
    type: 'talent', 
    icon: Activity, 
    costs: c('-', '50 po', '-', '-', '-', '-'),
    description: "Votre chef a entraîné ses troupes pour en faire des sportifs accomplis. Vos figurines d'infanterie ne sont pas affectées par les malus de mouvement des obstacles franchissables et peuvent effectuer une charge en passant à travers de tels obstacles."
  },
  { 
    id: 'talent_runner', 
    name: 'Coureur des bois', 
    type: 'talent', 
    icon: Activity, 
    costs: c('-', '50 po', '-', '-', '-', '-'),
    description: "Vos troupes ont été spécialement entraînées pour progresser en milieu hostile. Les terrains difficiles deviennent des terrains normaux pour l’infanterie et divisent les mouvements de la cavalerie seulement par 2, au lieu de 4."
  },
  { 
    id: 'talent_ambush', 
    name: 'Roi des embuscades', 
    type: 'talent', 
    icon: User, 
    costs: c('-', '50 po', '-', '-', '-', '-'),
    description: "Votre chef décide de cacher des troupes dans les environs. Elles pourront se découvrir au moment opportun. Vous pouvez considérer jusqu’à 25% de vos figurines comme « en embuscade ». (Voir règles complètes pour déploiement)."
  },
  { 
    id: 'talent_shield_training', 
    name: 'Entraînement au bouclier', 
    type: 'talent', 
    icon: Shield, 
    costs: c('-', '30 po', '-', '-', '-', '-'),
    description: "Votre chef a entraîné ses troupes pour le combat rapproché. Les murs de boucliers nécessitent une figurine de moins pour être formés (soit 4 figurines au lieu de 5)."
  },
  { 
    id: 'talent_force_nature', 
    name: 'Force de la nature', 
    type: 'talent', 
    icon: TreeDeciduous, 
    costs: c('-', '30 po', '-', '-', '-', '-'),
    description: "On le compare souvent à un ours... Votre chef possède un point de vie supplémentaire (il passe de 3 à 4 points de vie)."
  },
  { 
    id: 'talent_mead_dispenser', 
    name: 'Distributeur d’hydromel', 
    type: 'talent', 
    icon: Wine, 
    costs: c('-', '40 po', '-', '-', '-', '-'),
    description: "Votre chef a généreusement distribué de l'hydromel. Toutes vos figurines possèdent +1 à leurs jets de distance de charge (mouvement normal + 1D3 + 1)."
  },
  { 
    id: 'talent_shooting_training', 
    name: 'Entraînement au tir', 
    type: 'talent', 
    icon: Target, 
    costs: c('-', '40 po', '-', '-', '-', '-'),
    description: "Votre chef a entraîné ses troupes aux armes de tir. Vos armes de tir ont désormais une portée augmentée de 2''."
  },
  { 
    id: 'talent_poison_specialist', 
    name: 'Spécialiste du poison', 
    type: 'talent', 
    icon: FlaskConical, 
    costs: c('-', '40 po', '-', '-', '-', '-'),
    description: "Au début de la partie, lancez 1D6. 1-2: rien. 3-4: chef ennemi sonné (pas d'action au T1). 5-6: chef ennemi perd 1 PV."
  },
  { 
    id: 'talent_horse_master', 
    name: 'Grand maître des chevaux', 
    type: 'talent', 
    icon: Crown, 
    costs: c('-', '30 po', '-', '-', '-', '-'),
    description: "Vos figurines de cavalerie n’ont pas de malus de mouvement pour passer les obstacles franchissables et ajoutent +1 à leurs jets pour franchir un obstacle (jamais de chute)."
  },
  { 
    id: 'talent_mole_eye', 
    name: 'OEil de taupe', 
    type: 'talent', 
    icon: Eye, 
    costs: c('-', '30 po', '-', '-', '-', '-'),
    description: "Votre chef, telle une pie bien entraînée, est capable de voir briller l’or même dans le noir. Lorsque votre chef procède à un jet de fouille, celui-ci est automatiquement réussi."
  },
  { 
    id: 'talent_fire_war', 
    name: 'Guerre du feu', 
    type: 'talent', 
    icon: Flame, 
    costs: c('-', '30 po', '-', '-', '-', '-'),
    description: "Un entraînement à la maîtrise du feu a été prodigué par votre chef au reste de ses troupes. Vos figurines bénéficient d’un bonus de +1 aux jets d’incendie."
  },
];

const saxonNormanTalents: Equipment[] = [
  { 
    id: 'talent_relic', 
    name: 'Porteur de relique', 
    type: 'talent', 
    icon: Crown, 
    costs: c('-', '60 po', '-', '-', '-', '-'),
    description: "Votre chef possède une sainte relique. Les figurines dans un rayon de 6'' de votre chef (lui-même inclus) peuvent relancer leurs jets ratés pour toucher au corps à corps."
  }
];

const normanTalents: Equipment[] = [
  { 
    id: 'talent_horses', 
    name: 'Chevaux de guerre', 
    type: 'talent', 
    icon: Activity, 
    costs: c('-', '50 po', '-', '-', '-', '-'),
    description: "Les destriers sont un avantage des Normands. Vos chevaux se défendent avec une classe d’armure PP, au lieu de SP habituellement."
  }
];

const irishBretonTalents: Equipment[] = [
  { 
    id: 'talent_dodge_master', 
    name: 'Maître de l’esquive', 
    type: 'talent', 
    icon: Wind, 
    costs: c('-', '40 po', '-', '-', '-', '-'),
    description: "L’ensemble de vos figurines d'infanterie possèdent +1 à leurs jets de fuite (réussite sur 3+)."
  }
];

const paganSlayerTalents: Equipment[] = [
  { 
    id: 'talent_pagan_slayer', 
    name: 'Tueur de païens', 
    type: 'talent', 
    icon: Cross, 
    costs: c('-', '40 po', '-', '-', '-', '-'),
    description: "Votre chef est dévoué au culte du Christ. Il possède +1 à ses jets pour toucher des Vikings uniquement."
  }
];

const bretonTalents: Equipment[] = [
   { 
    id: 'talent_harassment_master', 
    name: 'Maître du harcèlement', 
    type: 'talent', 
    icon: Timer, 
    costs: c('-', '40 po', '-', '-', '-', '-'),
    description: "Les cavaliers réussissent leurs jets de fuite sur 3+ au lieu de 4+."
  }
];

const welshTalents: Equipment[] = [
   { 
    id: 'talent_cutlass_master', 
    name: 'Maîtrise du coutelas', 
    type: 'talent', 
    icon: Sword, 
    costs: c('-', '40 po', '-', '-', '-', '-'),
    description: "Tous vos guerriers d’infanterie peuvent effectuer une attaque supplémentaire d’arme improvisée lors d’une charge."
  }
];

const saxonTalents: Equipment[] = [
   { 
    id: 'talent_thegn', 
    name: 'Thegn', 
    type: 'talent', 
    icon: UserPlus, 
    costs: c('-', '15 po', '-', '-', '-', '-'),
    description: "Désignez une figurine de votre armée, elle devient le thegn de votre chef. La première blessure de votre chef est annulée si le thegn se trouve dans un rayon de 2'' autour de lui."
  }
];

const irishSpecificTalents: Equipment[] = [
   { 
    id: 'talent_dog_handler', 
    name: 'Éducateur canin', 
    type: 'talent', 
    icon: PawPrint, 
    costs: c('-', '10 po', '-', '-', '-', '-'),
    description: "Vos maîtres-chiens possèdent non pas 3 mais 4 chiens. (Coût: 10 po par unité de maître-chien)."
  }
];

const provocateurTalents: Equipment[] = [
   { 
    id: 'talent_lewd_provocateur', 
    name: 'Provocateur lubrique', 
    type: 'talent', 
    icon: Megaphone,
    costs: c('-', '5 po', '-', '-', '-', '-'),
    description: "Votre chef expose ses attributs aux ennemis. Lors du tout premier combat de la partie, votre adversaire aura un malus de -1 à son jet pour toucher."
  }
];

const vikingTalents: Equipment[] = [
   { 
    id: 'talent_odin_vision', 
    name: 'Vision d’Odin', 
    type: 'talent', 
    icon: Eye, 
    costs: c('-', '10 po', '-', '-', '-', '-'),
    description: "Après avoir ingéré des champignons hallucinogènes... Il n’a pas besoin de ligne de vue pour charger ou tirer sur un adversaire."
  }
];

const genericEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', 'Gratuit', 'Gratuit', 'Gratuit', '-') },
  { id: 'prot_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '5 po', '5 po', '-', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '5 po', '5 po', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', 'Gratuit', '-', 'Gratuit', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '5 po', '-', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('10 po', '10 po', '10 po', '10 po', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('15 po', '15 po', '15 po', '15 po', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', 'Gratuit', 'Gratuit', 'Gratuit', 'Gratuit') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('10 po', '10 po', '-', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'ran_xbow', name: 'Arbalète', type: 'ranged', icon: Crosshair, costs: c('30 po', '30 po', '-', '-', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: Activity, costs: c('30 po', '30 po', '-', '30 po', '-', '-') },
  { id: 'spec_banner', name: 'Bannière', type: 'special', icon: Flag, costs: c('50 po', '50 po', '50 po', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('25 po', '25 po', '25 po', '-', '-', '-') },
  { id: 'spec_dogs', name: 'Chiens de guerre', type: 'special', icon: PawPrint, costs: c('40 po', '-', '-', '-', '-', '-') },
];

const irishEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'prot_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('30 po', '30 po', '-', '-', '-', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('10 po', '10 po', '-', '-', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('25 po', '25 po', '-', '-', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('40 po', '40 po', '-', '-', '-', '-') },
  { id: 'ran_xbow', name: 'Arbalète', type: 'ranged', icon: Crosshair, costs: c('25 po*', '25 po*', '-', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('30 po', '30 po', '-', '-', '-', '-') },
  { id: 'spec_dogs', name: 'Chiens de guerre', type: 'special', icon: PawPrint, costs: c('30 po', '-', '-', '-', '-', '-') },
];

const bretonEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'prot_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('15 po', '15 po', '-', '-', '-', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('15 po', '15 po', '-', '-', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', 'Gratuit') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('25 po', '25 po', '-', '-', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: Activity, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'spec_banner', name: 'Bannière', type: 'special', icon: Flag, costs: c('50 po', '50 po', '-', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('20 po', '20 po', '-', '-', '-', '-') },
];

const welshEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('15 po', '15 po', '-', '-', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: Activity, costs: c('35 po', '35 po', '-', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('20 po', '20 po', '-', '-', '-', '-') },
];

const rusEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', 'Gratuit', '-', '-', '-') },
  { id: 'prot_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '5 po', '-', '-', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '5 po', '-', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', 'Gratuit', '-', '-', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '5 po', '-', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('15 po', '15 po', '15 po', '-', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('30 po', '30 po', '30 po', '-', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', 'Gratuit', '-', '-', '-') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('10 po', '10 po', '10 po', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('15 po', '15 po', '15 po', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('30 po', '30 po', '30 po', '-', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: Activity, costs: c('30 po', '30 po', '-', '-', '-', '-') },
  { id: 'spec_banner', name: 'Bannière', type: 'special', icon: Flag, costs: c('50 po', '50 po', '-', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('25 po', '25 po', '-', '-', '-', '-') },
];

const franksEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'prot_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('10 po', '10 po', '-', '-', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', 'Gratuit') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('10 po', '10 po', '-', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('25 po', '25 po', '-', '-', '-', '-') },
  { id: 'ran_xbow', name: 'Arbalète', type: 'ranged', icon: Crosshair, costs: c('35 po', '35 po', '-', '-', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: Activity, costs: c('25 po', '25 po', '-', '-', '-', '-') },
  { id: 'spec_banner', name: 'Bannière', type: 'special', icon: Flag, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('25 po', '25 po', '-', '-', '-', '-') },
];

const angloSaxonEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', '-', 'Gratuit', 'Gratuit', '-') },
  { id: 'prot_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', '-', 'Gratuit', 'Gratuit', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('10 po', '10 po', '-', '10 po', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('15 po', '15 po', '-', '15 po', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', 'Gratuit', 'Gratuit', '-') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('2 po', '2 po', '-', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('10 po', '10 po', '-', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('25 po', '25 po', '-', '-', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: Activity, costs: c('35 po', '35 po', '-', '35 po', '-', '-') },
  { id: 'spec_banner', name: 'Bannière', type: 'special', icon: Flag, costs: c('50 po', '50 po', '-', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('25 po', '25 po', '-', '-', '-', '-') },
];

const normanEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'prot_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('10 po', '10 po', '-', '-', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', 'Gratuit', 'Gratuit') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('25 po', '25 po', '-', '-', '-', '-') },
  { id: 'ran_xbow', name: 'Arbalète', type: 'ranged', icon: Crosshair, costs: c('30 po', '30 po', '-', '-', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: Activity, costs: c('20 po', '20 po', '-', '-', '-', '-') },
  { id: 'spec_banner', name: 'Bannière', type: 'special', icon: Flag, costs: c('50 po', '50 po', '-', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('40 po', '40 po', '-', '-', '-', '-') },
];

const vikingEquipment: Equipment[] = [
  { id: 'prot_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', 'Gratuit', '-', 'Gratuit', '-') },
  { id: 'prot_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '5 po', '-', '-', '-') },
  { id: 'prot_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '5 po', '-', '-', '-') },
  { id: 'mel_imp', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', 'Gratuit', '-', 'Gratuit', '-') },
  { id: 'mel_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '5 po', '-', '-', '-') },
  { id: 'mel_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('10 po', '10 po', '10 po', '-', '-', '-') },
  { id: 'mel_axe', name: 'Hache danoise', type: 'melee', icon: Sword, costs: c('15 po', '15 po', '15 po', '-', '-', '-') },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', 'Gratuit', '-', 'Gratuit', '-') },
  { id: 'ran_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('5 po', '5 po', '5 po', '-', '-', '-') },
  { id: 'ran_jav', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('10 po', '10 po', '10 po', '-', '-', '-') },
  { id: 'ran_bow', name: 'Arc', type: 'ranged', icon: Crosshair, costs: c('20 po', '20 po', '20 po', '-', '-', '-') },
  { id: 'spec_banner', name: 'Bannière', type: 'special', icon: Flag, costs: c('50 po', '50 po', '50 po', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('20 po', '20 po', '20 po', '-', '-', '-') },
  { id: 'spec_dogs', name: 'Chiens de guerre', type: 'special', icon: PawPrint, costs: c('60 po', '-', '-', '-', '-', '-') },
];

// Faction Base Costs
const createUnits = (w: number|string, l: number|string, b: number|string, h: number|string, hl: number|string, ch: number|string) => {
  const costs = c(w, l, b, h, hl, ch);
  return UNIT_ROLES
    .filter(role => costs[role] !== null)
    .map(role => ({
      id: role,
      name: unitTemplates[role].name,
      icon: unitTemplates[role].icon,
      baseCost: costs[role] as number
    }));
};

const magyarEquipment: Equipment[] = [
  { id: 'protection_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', '-', 'Gratuit', 'Gratuit', '-') },
  { id: 'protection_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('10 po', '10 po', '-', '10 po', '-', '-') },
  { id: 'protection_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'weapon_improvised', name: 'Arme improvisée', type: 'melee', icon: Sword, costs: c('Gratuit', 'Gratuit', '-', 'Gratuit', 'Gratuit', '-') },
  { id: 'weapon_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'weapon_sabre', name: 'Sabre', type: 'melee', icon: Sword, costs: c('10 po', '10 po', '-', '10 po', '-', '-') },
  { id: 'ranged_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'ranged_javelin', name: 'Javelot', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', 'Gratuit', '-', '-') },
  { id: 'ranged_composite_bow', name: 'Arc composite', type: 'ranged', icon: Crosshair, costs: c('25 po', '25 po', '-', '25 po', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: PawPrint, costs: c('20 po', '20 po', '-', '20 po', '-', '-') },
];

const byzantineEquipment: Equipment[] = [
  { id: 'protection_none', name: 'Sans protection', type: 'protection', icon: User, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'protection_armor', name: 'Armure', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'protection_shield', name: 'Bouclier', type: 'protection', icon: Shield, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'weapon_improvised', name: 'Arme improvisée', type: 'melee', icon: Skull, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'weapon_spear', name: 'Lance', type: 'melee', icon: Sword, costs: c('5 po', '5 po', '-', '5 po', '-', '-') },
  { id: 'weapon_base', name: 'Arme de base', type: 'melee', icon: Sword, costs: c('10 po', '10 po', '-', '10 po', '-', '-') },
  { id: 'weapon_pike', name: 'Pique', type: 'melee', icon: Sword, costs: c('10 po', '10 po', '-', '-', '-', '-'), description: "La pique apporte un malus de -1 aux jets de défense de l'adversaire. Permet le soutien en profondeur (voir règles)." },
  { id: 'ran_none', name: 'Aucune', type: 'ranged', icon: Crosshair, costs: c('Gratuit', 'Gratuit', '-', '-', '-', '-') },
  { id: 'ranged_sling', name: 'Fronde', type: 'ranged', icon: Crosshair, costs: c('5 po', '5 po', '-', '-', '-', '-') },
  { id: 'ranged_composite_bow', name: 'Arc composite', type: 'ranged', icon: Crosshair, costs: c('25 po', '25 po', '-', '-', '-', '-') },
  { id: 'spec_horse', name: 'Cheval', type: 'special', icon: PawPrint, costs: c('25 po', '25 po', '-', '35 po', '-', '-'), description: "Le cheval du Kataphraktoi est considéré comme PC au lieu de SP." },
  { id: 'spec_banner', name: 'Bannière', type: 'special', icon: Flag, costs: c('45 po', '45 po', '-', '-', '-', '-') },
  { id: 'spec_horn', name: 'Cor de guerre', type: 'special', icon: Megaphone, costs: c('20 po', '20 po', '-', '-', '-', '-') },
];

const rusSpecificTalents: Equipment[] = [
  { 
    id: 'talent_fidelity', 
    name: "Fidélité à l'empereur", 
    type: 'talent', 
    icon: Shield, 
    costs: c('-', '25 po', '-', '-', '-', '-'),
    description: "La garde Varègue est d'une absolue fidélité à l'Empereur de Byzance. Les guerriers Rus et Varègues ont très souvent été employés par l'empereur de Constantinople. Votre armée fait ainsi partie de la garde Varègue de l'empereur. Aucun test de moral n'est nécessaire lorsque votre chef disparaît du champ de bataille"
  }
];

const magyarSpecificTalents: Equipment[] = [
  { 
    id: 'talent_horse_reserve', 
    name: 'Réserve de chevaux', 
    type: 'talent', 
    icon: PawPrint, 
    costs: c('-', '50 po', '-', '-', '-', '-'),
    description: "Les guerriers Magyars possédaient plusieurs chevaux pour se battre et en changer au cours de la bataille. Tout cavalier Magyar ayant perdu son destrier peut en retrouver un. Au début de sa phase de mouvement, une figurine de cavalier Magyar devenue fantassin le tour précédent peut lancer 1D6. Sur un résultat de 6 elle trouve un nouveau cheval et redevient une figurine de cavalier. Remplacer la figurine en conséquence. Le cavalier ne pourra pas se déplacer ce tour-ci. Si le lancer est un échec, la figurine peut effectuer sa phase de mouvement normalement, mais restera une figurine d'infanterie pour le reste de la partie"
  }
];

const byzantineSpecificTalents: Equipment[] = [
  { 
    id: 'talent_bribe', 
    name: 'Pot de vin', 
    type: 'talent', 
    icon: UserPlus, 
    costs: c('-', '50 po', '-', '-', '-', '-'),
    description: "Un sombre émissaire se promène dans le campement ennemi et offre une bourse bien remplie à l'un des guerriers positionné là... Avant la bataille, après le déploiement des troupes, le joueur Byzantin choisit un guerrier adverse (en dehors des personnages spéciaux et des équipements spéciaux) et lance 1D6. Sur un résultat de 4+, il intègre ce guerrier à son armée et le positionne où il le souhaite dans sa propre zone de déploiement"
  }
];

export const factions: Faction[] = [
  {
    id: 'generic',
    name: 'Générique',
    units: createUnits('10 po', '30 po', '50 po', '40 po', '30 po', '40 po'),
    availableEquipment: [...genericEquipment, ...commonTalents, ...provocateurTalents],
    specialRules: []
  },
  {
    id: 'irish',
    name: 'Irlandais / Scots / Pictes',
    units: createUnits('10 po', '30 po', '-', '-', '25 po', '-'),
    availableEquipment: [...irishEquipment, ...commonTalents, ...irishBretonTalents, ...irishSpecificTalents, ...provocateurTalents],
    specialRules: [
      "Ne sont pas affectés par les effets de vent violent",
      "N'ont pas accès à la règle mur de boucliers",
      "Les arbalètes ne sont disponibles que pour les Pictes"
    ]
  },
  {
    id: 'bretons',
    name: 'Bretons',
    units: createUnits('10 po', '30 po', '-', '-', '30 po', '30 po'),
    availableEquipment: [...bretonEquipment, ...commonTalents, ...irishBretonTalents, ...bretonTalents, ...provocateurTalents],
    specialRules: [
      "Ne sont pas affectés par les effets de vent violent et de forte pluie",
      "N'ont pas accès à la règle mur de boucliers"
    ]
  },
  {
    id: 'welsh',
    name: 'Gallois',
    units: createUnits('10 po', '30 po', '-', '-', '30 po', '-'),
    availableEquipment: [...welshEquipment, ...commonTalents, ...welshTalents, ...provocateurTalents],
    specialRules: [
      "Ne sont pas affectés par les effets de forte pluie ni de vent violent"
    ]
  },
  {
    id: 'rus',
    name: 'Rus et Varègues',
    units: createUnits('10 po', '30 po', '80 po', '-', '-', '-'),
    availableEquipment: [...rusEquipment, ...commonTalents, ...provocateurTalents, ...rusSpecificTalents],
    specialRules: [
      "Ne sont pas affectés par les effets de neige",
      "Les guerriers Rus' et Varègues peuvent porter deux armes de bases. Cela leur interdit de porter un bouclier"
    ]
  },
  {
    id: 'franks',
    name: 'Francs',
    units: createUnits('10 po', '20 po', '-', '-', '30 po', '40 po'),
    availableEquipment: [...franksEquipment, ...commonTalents, ...paganSlayerTalents],
    specialRules: []
  },
  {
    id: 'anglo_saxons',
    name: 'Anglo-Saxons',
    units: createUnits('10 po', '30 po', '-', '40 po', '40 po', '-'),
    availableEquipment: [...angloSaxonEquipment, ...commonTalents, ...saxonNormanTalents, ...paganSlayerTalents, ...saxonTalents, ...provocateurTalents],
    specialRules: [
      "Ne sont pas affectés par les effets de brouillard, sauf pour la portée des arcs"
    ]
  },
  {
    id: 'normans',
    name: 'Normands',
    units: createUnits('10 po', '20 po', '-', '-', '35 po', '50 po'),
    availableEquipment: [...normanEquipment, ...commonTalents, ...saxonNormanTalents, ...normanTalents, ...paganSlayerTalents],
    specialRules: [
      "Ne sont pas affectés par les effets de forte pluie"
    ]
  },
  {
    id: 'vikings',
    name: 'Vikings',
    units: createUnits('10 po', '30 po', '50 po', '-', '30 po', '-'),
    availableEquipment: [...vikingEquipment, ...commonTalents, ...vikingTalents, ...provocateurTalents],
    specialRules: [
      "Le moral des vikings ne peut pas subir de malus. Leur jet de moral n'échouera que sur un résultat de 1"
    ]
  },
  {
    id: 'magyars',
    name: 'Magyars',
    units: [
      ...createUnits('10 po', '30 po', '-', '-', '-', '-').map(u => u.id === 'warlord' ? { ...u, name: 'Bők Chef' } : u),
      { id: 'huscarl' as UnitRole, name: 'Bők', icon: Crown, baseCost: 25 }
    ],
    availableEquipment: [...magyarEquipment, ...commonTalents, ...provocateurTalents, ...magyarSpecificTalents],
    specialRules: [
      "Pas de limitation de tireurs ni de cavaliers",
      "L'arme de base chez les Magyars est le sabre. Elle possède cependant un malus de -1 aux jets pour toucher les figurines portant une armure",
      "Les guerriers Magyars n'ont pas accès à l'arc mais à l'arc composite. Ce dernier possède les mêmes caractéristiques qu'un arc mais avec une portée de 30\".",
      "Les figurines d'infanterie ont un malus de -1 à tous leurs jets de défense au corps à corps.",
      "Les figurines d'infanterie ont un malus de -1 à tous leurs jets de moral.",
      "Les figurines d'infanterie possèdent toutes un malus de -1\" de mouvement. Ce malus peut se cumuler avec d'autres comme les terrains difficiles, etc."
    ]
  },
  {
    id: 'byzantines',
    name: 'Byzantins',
    units: [
      ...createUnits('10 po', '30 po', '-', '-', '-', '-'),
      { id: 'huscarl' as UnitRole, name: 'Kataphraktoi', icon: Crown, baseCost: 20 }
    ],
    availableEquipment: [...byzantineEquipment, ...commonTalents, ...provocateurTalents, ...byzantineSpecificTalents],
    specialRules: [
      "Un guerrier équipé d'une pique peut soutenir une figurine alliée en contact avec l'ennemi, comme un lancier. Il peut également soutenir une figurine alliée à travers un autre soutien, en ligne droite.",
      "Règle de soutien Pique : Le piquier doit être en contact avec le soutien de la figurine engagée et une ligne droite doit passer par le centre de son socle, celui du soutien et celui de l'allié engagé.",
      "La pique apporte un malus de -1 aux jets de défense de l'adversaire.",
      "50% de votre armée Byzantine peut être composée de guerriers ou de personnages spéciaux issus d'autres armées. Votre chef doit obligatoirement être Byzantin.",
      "Le cheval du Kataphraktoi est considéré comme PC au lieu de SP."
    ]
  }
];

export interface ArmyUnit {
  instanceId: string;
  unitTypeId: UnitRole;
  equipment: string[]; // Array of equipment IDs
  quantity: number;
  customName?: string;
  /**
   * For mercenary recruitment (Byzantine rule). When set, this unit comes
   * from another faction; its baseCost / equipment / specialization are
   * resolved against that faction instead of the army's main faction.
   */
  sourceFactionId?: string;
  /**
   * Overrides the auto-derived icon. Value matches a key in ICON_REGISTRY
   * (see unitNaming.ts). When undefined, the icon is derived from the role
   * and equipment.
   */
  customIconId?: string;
}

/**
 * Returns the faction that owns this unit's stats and equipment.
 * For regular units, it's the army's main faction. For mercenary units
 * (sourceFactionId set), it's the source faction.
 */
export function getEffectiveFaction(unit: ArmyUnit, mainFaction: Faction): Faction {
  if (!unit.sourceFactionId || unit.sourceFactionId === mainFaction.id) return mainFaction;
  return factions.find((f) => f.id === unit.sourceFactionId) ?? mainFaction;
}
