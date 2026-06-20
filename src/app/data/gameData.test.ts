import { describe, it, expect } from "vitest";
import {
  factions,
  ArmyUnit,
  getEffectiveFaction,
  armyHasDogHandlerTalent,
  unitCarriesWarDogs,
  DOG_HANDLER_TALENT_ID,
  WAR_DOGS_EQUIPMENT_ID,
  DOG_HANDLER_BONUS_PER_MODEL,
  FOEDERATI_TALENT_ID,
  ROMAN_FACTION_IDS,
  getFoederatiAllyId,
  getFoederatiAllyCandidates,
  unitHasFoederati,
} from "./gameData";

let nextId = 0;
const unit = (
  role: ArmyUnit["unitTypeId"],
  equipment: string[] = [],
  extra: Partial<ArmyUnit> = {}
): ArmyUnit => ({
  instanceId: `u${++nextId}`,
  unitTypeId: role,
  equipment,
  quantity: 1,
  ...extra,
});

describe("Dog Handler helpers", () => {
  it("DOG_HANDLER_BONUS_PER_MODEL is 10", () => {
    expect(DOG_HANDLER_BONUS_PER_MODEL).toBe(10);
  });

  it("detects the talent on a warlord", () => {
    const army: ArmyUnit[] = [unit("warlord", [DOG_HANDLER_TALENT_ID])];
    expect(armyHasDogHandlerTalent(army)).toBe(true);
  });

  it("returns false when no unit carries the talent", () => {
    expect(armyHasDogHandlerTalent([unit("warrior", ["mel_base"])])).toBe(false);
  });

  it("detects war dogs on a unit", () => {
    expect(
      unitCarriesWarDogs(unit("warrior", ["mel_base", WAR_DOGS_EQUIPMENT_ID]))
    ).toBe(true);
    expect(unitCarriesWarDogs(unit("warrior", ["mel_base"]))).toBe(false);
  });
});

describe("Foederati helpers", () => {
  it("ROMAN_FACTION_IDS contains 'romans'", () => {
    expect(ROMAN_FACTION_IDS).toContain("romans");
  });

  it("unitHasFoederati flags only units with the talent equipped", () => {
    expect(unitHasFoederati(unit("warlord", [FOEDERATI_TALENT_ID]))).toBe(true);
    expect(unitHasFoederati(unit("warlord", []))).toBe(false);
  });

  it("getFoederatiAllyId returns the first warlord's pinned ally", () => {
    const army: ArmyUnit[] = [
      unit("warrior", ["mel_base"]),
      unit("warlord", [FOEDERATI_TALENT_ID], { foederatiAllyId: "saxons" }),
    ];
    expect(getFoederatiAllyId(army)).toBe("saxons");
  });

  it("getFoederatiAllyId is null when no warlord carries it", () => {
    expect(getFoederatiAllyId([unit("warrior", ["mel_base"])])).toBeNull();
  });

  it("getFoederatiAllyCandidates returns Finis Imperii non-Roman factions", () => {
    const cands = getFoederatiAllyCandidates();
    expect(cands.length).toBeGreaterThan(0);
    // No Romans
    expect(cands.find((f) => ROMAN_FACTION_IDS.includes(f.id))).toBeUndefined();
    // All Finis Imperii
    expect(cands.every((f) => f.supplement === "finis_imperii")).toBe(true);
  });
});

describe("getEffectiveFaction", () => {
  it("returns the main faction when the unit has no sourceFactionId", () => {
    const main = factions.find((f) => f.id === "byzantines")!;
    const u = unit("warrior", ["mel_base"]);
    expect(getEffectiveFaction(u, main).id).toBe("byzantines");
  });

  it("returns the source faction for a mercenary / ally unit", () => {
    const main = factions.find((f) => f.id === "byzantines")!;
    const u = unit("warrior", ["mel_base"], { sourceFactionId: "vikings" });
    expect(getEffectiveFaction(u, main).id).toBe("vikings");
  });

  it("falls back to the main faction if sourceFactionId is unknown", () => {
    const main = factions.find((f) => f.id === "byzantines")!;
    const u = unit("warrior", ["mel_base"], { sourceFactionId: "no_such_faction" });
    expect(getEffectiveFaction(u, main).id).toBe("byzantines");
  });
});

describe("factions catalog", () => {
  it("has at least 3 supplements represented", () => {
    const supps = new Set(factions.map((f) => f.supplement));
    expect(supps.size).toBeGreaterThanOrEqual(3);
  });

  it("every faction has a unique id", () => {
    const ids = factions.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every faction defines a warlord unit", () => {
    factions.forEach((f) => {
      const hasWarlord = f.units.some((u) => u.id === "warlord");
      expect(hasWarlord, `faction ${f.id} has no warlord`).toBe(true);
    });
  });
});
