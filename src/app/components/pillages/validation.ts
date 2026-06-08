import {
  ArmyUnit,
  Faction,
  UnitRole,
  getEffectiveFaction,
  armyHasDogHandlerTalent,
  unitCarriesWarDogs,
  DOG_HANDLER_BONUS_PER_MODEL,
} from "../../data/gameData";

type Translator = (key: string) => string;

/**
 * Pure validation function for an army. Returns the localised error messages
 * (using `t` for keys, falling back to defaults). Used by both the live
 * builder (to surface restrictions while editing) and by the read-only army
 * cards (Galerie / Mes listes) to flag saved armies that break the rules.
 */
export function validateArmy(army: ArmyUnit[], faction: Faction, t: Translator): string[] {
  const errors: string[] = [];
  let totalModels = 0;
  let warlordCount = 0;
  let warriorCount = 0;
  let bannerCount = 0;
  let hornCount = 0;
  let shooterCount = 0;
  let cavalryCount = 0;
  let mercenaryWarlord = false;
  const usedTalents = new Set<string>();

  const hasDogHandler = armyHasDogHandlerTalent(army);
  const computeUnitCost = (unit: ArmyUnit): number => {
    const eff = getEffectiveFaction(unit, faction);
    const ut = eff.units.find((u) => u.id === unit.unitTypeId);
    if (!ut) return 0;
    let cost = ut.baseCost;
    unit.equipment.forEach((eqId) => {
      const eq = eff.availableEquipment.find((e) => e.id === eqId);
      if (eq) {
        const c = eq.costs[unit.unitTypeId as UnitRole];
        if (c !== null && c !== undefined) cost += c as number;
      }
    });
    // "Éducateur canin" talent : +10 po per model carrying War Dogs.
    if (hasDogHandler && unitCarriesWarDogs(unit)) {
      cost += DOG_HANDLER_BONUS_PER_MODEL;
    }
    return cost;
  };

  const totalPoints = army.reduce(
    (s, u) => s + computeUnitCost(u) * (u.quantity || 1),
    0
  );
  const mercenaryPoints = army.reduce((s, u) => {
    if (!u.sourceFactionId || u.sourceFactionId === faction.id) return s;
    return s + computeUnitCost(u) * (u.quantity || 1);
  }, 0);

  army.forEach((unit) => {
    const qty = unit.quantity || 1;
    totalModels += qty;

    if (unit.unitTypeId === "warlord") {
      warlordCount += qty;
      if (unit.sourceFactionId && unit.sourceFactionId !== faction.id) {
        mercenaryWarlord = true;
      }
    }
    if (unit.unitTypeId === "warrior") warriorCount += qty;

    const effective = getEffectiveFaction(unit, faction);
    const items = unit.equipment
      .map((id) => effective.availableEquipment.find((e) => e.id === id))
      .filter(Boolean);

    let isShooter = false;
    let isCavalry = false;
    let hasBanner = false;
    let hasHorn = false;

    items.forEach((eq) => {
      // Defensive : melee weapons (mel_*) are never shooters, even if a
      // future entry gets miscategorised. "ran_none" stays excluded.
      const isMeleeId = typeof eq?.id === "string" && eq.id.startsWith("mel_");
      if (eq?.type === "ranged" && eq.id !== "ran_none" && !isMeleeId) {
        isShooter = true;
      }
      if (eq?.id === "spec_horse") isCavalry = true;
      if (eq?.id === "spec_banner") hasBanner = true;
      if (eq?.id === "spec_horn") hasHorn = true;
      if (eq?.type === "talent") {
        if (usedTalents.has(eq.id)) {
          errors.push(t("err_uniqueTalent").replace("$1", eq.name));
        }
        usedTalents.add(eq.id);
      }
    });

    if (isCavalry) cavalryCount += qty;
    else if (isShooter) shooterCount += qty;

    if (hasBanner) bannerCount += qty;
    if (hasHorn) hornCount += qty;
  });

  // Saxons have the "Sans roi" rule: a warlord is not required.
  if (army.length > 0 && warlordCount === 0 && faction.id !== "saxons") {
    errors.push(t("err_noWarlord"));
  }
  const allowedWarlords = 1 + Math.floor(warriorCount / 20);
  if (warlordCount > allowedWarlords) {
    errors.push(
      t("err_tooManyWarlords")
        .replace("$1", warlordCount.toString())
        .replace("$2", allowedWarlords.toString())
    );
  }
  if (bannerCount > 1) errors.push(t("err_oneBanner"));
  if (hornCount > 1) errors.push(t("err_oneHorn"));

  // Shooters cap: 25% by default, 50% for Welsh, unlimited for Magyars.
  if (faction.id !== "magyars") {
    const shooterRatio = faction.id === "welsh" ? 0.5 : 0.25;
    const shooterPercent = Math.round(shooterRatio * 100);
    const maxShooters = Math.ceil(totalModels * shooterRatio);
    if (shooterCount > maxShooters) {
      errors.push(
        t("err_tooManyShooters")
          .replace("$1", shooterCount.toString())
          .replace("$2", maxShooters.toString())
          .replace("$3", totalModels.toString())
          .replace("$4", shooterPercent.toString())
      );
    }
  }

  // Cavalry cap: 25% by default, unlimited for Magyars and Huns.
  if (faction.id !== "magyars" && faction.id !== "huns") {
    const maxCavalry = Math.ceil(totalModels * 0.25);
    if (cavalryCount > maxCavalry) {
      errors.push(
        t("err_tooManyCavalry")
          .replace("$1", cavalryCount.toString())
          .replace("$2", maxCavalry.toString())
          .replace("$3", totalModels.toString())
      );
    }
  }

  if (faction.id === "picts") {
    // Pict warriors get free chainmail, but the count is limited to 2 per chef.
    const pictArmorCount = army.reduce((sum, u) => {
      if (u.unitTypeId !== "warrior") return sum;
      const hasArmor = u.equipment.some((id) => id === "prot_armor" || id === "protection_armor");
      return sum + (hasArmor ? u.quantity || 1 : 0);
    }, 0);
    const allowedArmor = warlordCount * 2;
    if (pictArmorCount > allowedArmor) {
      errors.push(
        t("err_pictArmor")
          .replace("$1", pictArmorCount.toString())
          .replace("$2", warlordCount.toString())
          .replace("$3", allowedArmor.toString())
      );
    }
  }

  if (faction.id === "byzantines") {
    if (mercenaryWarlord) errors.push(t("err_byzantineWarlord"));
    if (totalPoints > 0 && mercenaryPoints > totalPoints / 2) {
      errors.push(
        t("err_mercenaryQuota")
          .replace("$1", mercenaryPoints.toString())
          .replace("$2", totalPoints.toString())
          .replace("$3", Math.floor(totalPoints / 2).toString())
      );
    }
  }

  return errors;
}
