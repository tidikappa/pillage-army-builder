import { describe, it, expect } from "vitest";
import { factions, ArmyUnit, UnitRole, Faction } from "../../data/gameData";
import { validateArmy } from "./validation";

// Test helper : identity translator. Error strings come back with their raw
// $1/$2/$3/$4 placeholders, which lets us match on the stable key prefix.
const t = (key: string) => key;

const getFaction = (id: string): Faction => {
  const f = factions.find((x) => x.id === id);
  if (!f) throw new Error(`Test fixture: faction ${id} missing in gameData`);
  return f;
};

let nextId = 0;
const unit = (
  role: UnitRole,
  equipment: string[] = [],
  quantity = 1,
  extra: Partial<ArmyUnit> = {}
): ArmyUnit => ({
  instanceId: `u${++nextId}`,
  unitTypeId: role,
  equipment,
  quantity,
  ...extra,
});

const has = (errors: string[], key: string) =>
  errors.some((e) => e.includes(key));

describe("validateArmy — warlord requirement", () => {
  it("flags an army without a warlord", () => {
    const errors = validateArmy(
      [unit("warrior", ["mel_base"], 5)],
      getFaction("vikings"),
      t
    );
    expect(has(errors, "err_noWarlord")).toBe(true);
  });

  it("Saxons can field an army with no warlord", () => {
    const errors = validateArmy(
      [unit("warrior", ["mel_base"], 5)],
      getFaction("saxons"),
      t
    );
    expect(has(errors, "err_noWarlord")).toBe(false);
  });

  it("caps warlords at 1 base + 1 per 20 warriors", () => {
    const errors = validateArmy(
      [unit("warlord", []), unit("warlord", []), unit("warrior", [], 5)],
      getFaction("vikings"),
      t
    );
    expect(has(errors, "err_tooManyWarlords")).toBe(true);
  });

  it("accepts 2 warlords when you have at least 20 warriors", () => {
    const errors = validateArmy(
      [unit("warlord", []), unit("warlord", []), unit("warrior", [], 20)],
      getFaction("vikings"),
      t
    );
    expect(has(errors, "err_tooManyWarlords")).toBe(false);
  });
});

describe("validateArmy — banner & horn caps", () => {
  it("blocks more than one banner across the army", () => {
    const errors = validateArmy(
      [
        unit("warlord", []),
        unit("warrior", ["mel_base", "spec_banner"], 1),
        unit("warrior", ["mel_base", "spec_banner"], 1),
      ],
      getFaction("vikings"),
      t
    );
    expect(has(errors, "err_oneBanner")).toBe(true);
  });

  it("blocks more than one horn across the army", () => {
    const errors = validateArmy(
      [
        unit("warlord", []),
        unit("warrior", ["mel_base", "spec_horn"], 1),
        unit("warrior", ["mel_base", "spec_horn"], 1),
      ],
      getFaction("vikings"),
      t
    );
    expect(has(errors, "err_oneHorn")).toBe(true);
  });

  it("accepts exactly one banner and one horn on different units", () => {
    const errors = validateArmy(
      [
        unit("warlord", []),
        unit("warrior", ["mel_base", "spec_banner"], 1),
        unit("warrior", ["mel_base", "spec_horn"], 1),
      ],
      getFaction("vikings"),
      t
    );
    expect(has(errors, "err_oneBanner")).toBe(false);
    expect(has(errors, "err_oneHorn")).toBe(false);
  });
});

describe("validateArmy — shooter cap", () => {
  it("blocks more than 25% shooters in a generic faction", () => {
    const errors = validateArmy(
      [
        unit("warlord", []),
        // 4 shooters, 3 melee → 4/7 = 57% > 25%
        unit("warrior", ["mel_base", "ran_bow"], 4),
        unit("warrior", ["mel_base"], 2),
      ],
      getFaction("vikings"),
      t
    );
    expect(has(errors, "err_tooManyShooters")).toBe(true);
  });

  it("allows up to 50% shooters for Welsh", () => {
    const errors = validateArmy(
      [
        unit("warlord", []),
        // 4 shooters out of 9 models = 44% < 50%
        unit("warrior", ["mel_base", "ran_bow"], 4),
        unit("warrior", ["mel_base"], 4),
      ],
      getFaction("welsh"),
      t
    );
    expect(has(errors, "err_tooManyShooters")).toBe(false);
  });

  it("counts mel_hasta as ranged for the shooter cap", () => {
    // Romans: 1 warlord + 4 hasta warriors out of 5 total = 80% "shooters"
    const errors = validateArmy(
      [
        unit("warlord", ["mel_base"]),
        unit("warrior", ["mel_hasta"], 4),
      ],
      getFaction("romans"),
      t
    );
    expect(has(errors, "err_tooManyShooters")).toBe(true);
  });

  it("does not apply the cap to Magyars", () => {
    const errors = validateArmy(
      [
        unit("warlord", []),
        // All shooters
        unit("warrior", ["mel_base", "ran_bow"], 8),
      ],
      getFaction("magyars"),
      t
    );
    expect(has(errors, "err_tooManyShooters")).toBe(false);
  });

  it("does not count ran_none as a shooter", () => {
    const errors = validateArmy(
      [
        unit("warlord", []),
        unit("warrior", ["mel_base", "ran_none"], 4),
      ],
      getFaction("vikings"),
      t
    );
    expect(has(errors, "err_tooManyShooters")).toBe(false);
  });
});

describe("validateArmy — talents", () => {
  it("flags the same unique talent used twice across two warlords", () => {
    // Foederati is irish_specific... actually a roman-specific talent we can reuse.
    const errors = validateArmy(
      [
        unit("warlord", ["talent_foederati"], 1, { foederatiAllyId: "saxons" }),
        unit("warlord", ["talent_foederati"], 1, { foederatiAllyId: "saxons" }),
      ],
      getFaction("romans"),
      t
    );
    expect(has(errors, "err_uniqueTalent")).toBe(true);
  });

  it("accepts two warlords with different talents", () => {
    const errors = validateArmy(
      [
        unit("warlord", ["talent_foederati"], 1, { foederatiAllyId: "saxons" }),
        unit("warlord", ["talent_contubernium"], 1),
        unit("warrior", ["mel_base"], 20),
      ],
      getFaction("romans"),
      t
    );
    expect(has(errors, "err_uniqueTalent")).toBe(false);
  });
});

describe("validateArmy — empty army", () => {
  it("returns no errors for an empty army", () => {
    expect(validateArmy([], getFaction("vikings"), t)).toEqual([]);
  });
});
