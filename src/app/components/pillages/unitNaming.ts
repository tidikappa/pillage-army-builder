import React from "react";
import { ArmyUnit, Faction } from "../../data/gameData";
import {
  Sword,
  Crown,
  Shield,
  ShieldHalf,
  Axe,
  Flag,
  Megaphone,
  PawPrint,
  Skull,
  Heart,
  Crosshair,
  Hammer,
  Flame,
  Mountain,
  Users,
  Wind,
  TreeDeciduous,
  type LucideIcon,
} from "lucide-react";

// Custom horseshoe icon (horse / cavalry). Inline SVG keeps the same stroke style as Lucide.
export const HorseIcon = ({ className = "", ...props }: React.SVGProps<SVGSVGElement>) =>
  React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      ...props,
    },
    React.createElement("path", { d: "M6 4 v9 a6 6 0 0 0 12 0 V4" }),
    React.createElement("line", { x1: "4", y1: "4", x2: "8", y2: "4" }),
    React.createElement("line", { x1: "16", y1: "4", x2: "20", y2: "4" }),
    React.createElement("circle", { cx: "9", cy: "18", r: "0.6", fill: "currentColor" }),
    React.createElement("circle", { cx: "15", cy: "18", r: "0.6", fill: "currentColor" }),
  );

// Custom bow + arrow icon (archer). Curve on the left = bow, line through middle = arrow.
export const BowIcon = ({ className = "", ...props }: React.SVGProps<SVGSVGElement>) =>
  React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      ...props,
    },
    // bow curve
    React.createElement("path", { d: "M6 3 C 12 8 12 16 6 21" }),
    // string
    React.createElement("line", { x1: "6", y1: "3", x2: "6", y2: "21" }),
    // arrow shaft
    React.createElement("line", { x1: "9", y1: "12", x2: "20", y2: "12" }),
    // arrow head
    React.createElement("polyline", { points: "17 9 20 12 17 15" }),
  );

export type Specialization =
  | "horseman"
  | "archer"
  | "lancer"
  | "shielded"
  | "infantry"
  | null;

const isHorse = (id: string) => id === "spec_horse";
const isBow = (id: string) => id === "ran_bow" || id === "ran_sling" || id === "ran_jav";
const isSpear = (id: string) => id === "mel_spear" || id === "weapon_spear";
const isShield = (id: string) =>
  id === "prot_shield" || id === "protection_shield";

/**
 * Detects the specialization of a unit from its equipment.
 * Order of priority: cavalry > archer > lancer > shielded.
 */
export function detectSpecialization(equipmentIds: string[]): Specialization {
  if (equipmentIds.some(isHorse)) return "horseman";
  if (equipmentIds.some(isBow)) return "archer";
  if (equipmentIds.some(isSpear)) return "lancer";
  if (equipmentIds.some(isShield)) return "shielded";
  return "infantry";
}

/**
 * Translation keys for specializations, applied only to the "warrior" role
 * (other roles already have proper names like Warlord, Healer, etc.).
 */
const SPEC_LABEL_KEYS: Record<Exclude<Specialization, null>, { fr: string; en: string }> = {
  horseman: { fr: "Cavalier", en: "Horseman" },
  archer: { fr: "Guerrier archer", en: "Warrior archer" },
  lancer: { fr: "Guerrier lancier", en: "Warrior spearman" },
  shielded: { fr: "Guerrier", en: "Warrior" },
  infantry: { fr: "Guerrier", en: "Warrior" },
};

/**
 * Returns the display name of a unit, taking into account:
 * - customName (highest priority)
 * - derived name from equipment for the "warrior" role
 * - the unit type's base name otherwise
 */
export function getUnitDisplayName(
  unit: ArmyUnit,
  faction: Faction,
  language: "fr" | "en",
  tData: (type: any, id: string, defaultVal: string) => string
): string {
  if (unit.customName && unit.customName.trim()) return unit.customName.trim();

  const unitType = faction.units.find((u) => u.id === unit.unitTypeId);
  if (!unitType) return "?";

  if (unit.unitTypeId === "warrior") {
    const spec = detectSpecialization(unit.equipment);
    if (spec) {
      return SPEC_LABEL_KEYS[spec][language];
    }
  }

  return tData("roles", unitType.id, unitType.name);
}

/**
 * Curated registry of icons available to the user when overriding a unit's
 * icon manually. Keys are stable IDs persisted in ArmyUnit.customIconId.
 */
export const ICON_REGISTRY: Record<string, { component: any; label: string }> = {
  sword: { component: Sword, label: "Épée" },
  crown: { component: Crown, label: "Couronne" },
  bow: { component: BowIcon, label: "Arc" },
  horse: { component: HorseIcon, label: "Cheval" },
  shield: { component: Shield, label: "Bouclier" },
  shield_half: { component: ShieldHalf, label: "Demi-bouclier" },
  axe: { component: Axe, label: "Hache" },
  flag: { component: Flag, label: "Bannière" },
  horn: { component: Megaphone, label: "Cor" },
  paw: { component: PawPrint, label: "Patte" },
  skull: { component: Skull, label: "Crâne" },
  heart: { component: Heart, label: "Cœur" },
  crosshair: { component: Crosshair, label: "Cible" },
  hammer: { component: Hammer, label: "Marteau" },
  flame: { component: Flame, label: "Flamme" },
  mountain: { component: Mountain, label: "Montagne" },
  users: { component: Users, label: "Troupe" },
  wind: { component: Wind, label: "Vent" },
  tree: { component: TreeDeciduous, label: "Arbre" },
};

export function getIconById(id: string | undefined) {
  if (!id) return null;
  return ICON_REGISTRY[id]?.component ?? null;
}

/**
 * Returns the icon component to display for a unit, taking into account its
 * role and equipment.
 * - warlord → Crown
 * - warrior + horse → HorseIcon
 * - warrior + bow → BowIcon
 * - warrior (anything else) → Sword
 * - other roles → fall back to the unit type's default icon
 */
export function getUnitDisplayIcon(unit: ArmyUnit, faction: Faction) {
  // 1. User-chosen custom icon wins if set.
  const custom = getIconById(unit.customIconId);
  if (custom) return custom;

  // 2. Otherwise derive from role / equipment.
  if (unit.unitTypeId === "warlord") return Crown;

  if (unit.unitTypeId === "warrior") {
    const spec = detectSpecialization(unit.equipment);
    if (spec === "horseman") return HorseIcon;
    if (spec === "archer") return BowIcon;
    return Sword;
  }

  const unitType = faction.units.find((u) => u.id === unit.unitTypeId);
  return unitType?.icon ?? Sword;
}

/**
 * Kept for backward compatibility: returns the same icon as above but only
 * for the warrior specialization (used by callers that don't pass a faction).
 */
export function getSpecializationIcon(equipmentIds: string[]) {
  const spec = detectSpecialization(equipmentIds);
  if (spec === "horseman") return HorseIcon;
  if (spec === "archer") return BowIcon;
  return Sword;
}
