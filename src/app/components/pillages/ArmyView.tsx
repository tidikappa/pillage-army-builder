import React from "react";
import {
  factions,
  ArmyUnit,
  UnitRole,
  Equipment,
  getEffectiveFaction,
  armyHasDogHandlerTalent,
  unitCarriesWarDogs,
  DOG_HANDLER_BONUS_PER_MODEL,
} from "../../data/gameData";
import { Card, CardContent } from "../ui/card";
import { Shield, Sword, Crosshair, Zap, Sparkles, ShieldAlert } from "lucide-react";
import { useTranslation } from "./TranslationContext";
import { getUnitDisplayName, getUnitDisplayIcon } from "./unitNaming";
import { validateArmy } from "./validation";

interface ArmyViewProps {
  factionId: string;
  budget: number;
  units: ArmyUnit[];
}

export function ArmyView({ factionId, budget, units }: ArmyViewProps) {
  const { t, tData, language } = useTranslation();
  const faction = factions.find((f) => f.id === factionId);

  if (!faction) {
    return <p className="text-stone-400">Faction inconnue : {factionId}</p>;
  }

  const dogHandlerActive = armyHasDogHandlerTalent(units);

  const total = units.reduce((sum, unit) => {
    const effective = getEffectiveFaction(unit, faction);
    const ut = effective.units.find((u) => u.id === unit.unitTypeId);
    if (!ut) return sum;
    let cost = ut.baseCost;
    unit.equipment.forEach((eqId) => {
      const eq = effective.availableEquipment.find((e) => e.id === eqId);
      if (eq) cost += eq.costs[unit.unitTypeId as UnitRole] ?? 0;
    });
    if (dogHandlerActive && unitCarriesWarDogs(unit)) {
      cost += DOG_HANDLER_BONUS_PER_MODEL;
    }
    return sum + cost * (unit.quantity || 1);
  }, 0);

  const totalModels = units.reduce((sum, u) => sum + (u.quantity || 1), 0);
  const moralThreshold = Math.ceil(totalModels / 2);
  const validationErrors = validateArmy(units, faction, t);

  return (
    <div className="space-y-4">
      {validationErrors.length > 0 && (
        <div className="bg-red-950/40 border border-red-700/50 px-4 py-3 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-100 space-y-1">
            <div className="font-bold uppercase tracking-widest text-red-300 text-xs">
              {t("restrictionsViolated")}
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/10 pb-3">
        <div className="font-serif text-stone-200 uppercase tracking-wider">
          {tData("factions", faction.id, faction.name)}
        </div>
        <div className="flex items-center gap-4 text-sm text-stone-300 flex-wrap">
          <span>
            <span className={total > budget ? "text-red-400" : "text-[#cc6512]"}>{total}</span> /{" "}
            {budget} po
          </span>
          <span className="text-stone-500" aria-hidden>·</span>
          <span>
            <span className="text-stone-100 font-bold">{totalModels}</span>{" "}
            <span className="text-stone-400">{t("figurinesUnit")}</span>
          </span>
          <span className="text-stone-500" aria-hidden>·</span>
          <span title={t("moralThresholdLabel")}>
            <span className="text-xs uppercase tracking-widest text-stone-400">{t("moralThresholdLabel")} :</span>{" "}
            <span className="text-stone-100 font-bold">{moralThreshold}</span>
          </span>
        </div>
      </div>

      {units.length === 0 ? (
        <p className="text-stone-500 italic">Aucune unité.</p>
      ) : (
        <ul className="space-y-3">
          {units.map((unit, idx) => {
            const effective = getEffectiveFaction(unit, faction);
            const isMerc = Boolean(unit.sourceFactionId && unit.sourceFactionId !== faction.id);
            const ut = effective.units.find((u) => u.id === unit.unitTypeId);
            if (!ut) return null;
            const equipment = unit.equipment
              .map((id) => effective.availableEquipment.find((e) => e.id === id))
              .filter(Boolean) as Equipment[];
            const singleCost =
              ut.baseCost +
              equipment.reduce((s, e) => s + (e.costs[unit.unitTypeId as UnitRole] ?? 0), 0) +
              (dogHandlerActive && unitCarriesWarDogs(unit) ? DOG_HANDLER_BONUS_PER_MODEL : 0);
            const qty = unit.quantity || 1;

            const UnitIcon = getUnitDisplayIcon(unit, effective);
            const displayName = getUnitDisplayName(unit, effective, language, tData);
            return (
              <li key={idx}>
                <Card className="bg-black/40 border-white/10 rounded-none">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-serif text-stone-200 flex items-center gap-2 min-w-0 flex-wrap">
                        <UnitIcon className="w-4 h-4 text-[#cc6512] shrink-0" aria-hidden="true" />
                        <span className="truncate">{displayName}</span>
                        {isMerc && (
                          <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
                            Merc · {tData("factions", effective.id, effective.name)}
                          </span>
                        )}
                        <span className="text-stone-500 shrink-0">×{qty}</span>
                      </div>
                      <div className="text-sm text-[#cc6512] font-bold shrink-0 text-right">
                        <div>
                          {singleCost * qty} po
                          {qty > 1 && (
                            <span className="text-[10px] font-mono text-stone-400 ml-1">({singleCost}/u)</span>
                          )}
                        </div>
                        {dogHandlerActive && unitCarriesWarDogs(unit) && (
                          <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mt-0.5">
                            +{DOG_HANDLER_BONUS_PER_MODEL * qty} po · éducateur canin
                          </div>
                        )}
                      </div>
                    </div>
                    <EquipmentLine icon={Shield} items={equipment.filter((e) => e.type === "protection")} unit={unit} faction={faction} tData={tData} dogHandlerActive={dogHandlerActive} />
                    <EquipmentLine icon={Sword} items={equipment.filter((e) => e.type === "melee")} unit={unit} faction={faction} tData={tData} dogHandlerActive={dogHandlerActive} />
                    <EquipmentLine icon={Crosshair} items={equipment.filter((e) => e.type === "ranged")} unit={unit} faction={faction} tData={tData} dogHandlerActive={dogHandlerActive} />
                    <EquipmentLine icon={Zap} items={equipment.filter((e) => e.type === "special")} unit={unit} faction={faction} tData={tData} dogHandlerActive={dogHandlerActive} />
                    <EquipmentLine icon={Sparkles} items={equipment.filter((e) => e.type === "talent")} unit={unit} faction={faction} tData={tData} dogHandlerActive={dogHandlerActive} />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EquipmentLine({
  icon: Icon,
  items,
  tData,
  dogHandlerActive,
}: {
  icon: any;
  items: Equipment[];
  unit: ArmyUnit;
  faction: any;
  tData: (type: any, id: string, defaultVal: string) => string;
  dogHandlerActive?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-stone-400">
      <Icon className="w-3.5 h-3.5 text-stone-500" />
      <span>
        {items
          .map((e) => {
            const label = tData("equipment", e.id, e.name);
            return e.id === "spec_dogs" ? `${label} ×${dogHandlerActive ? 4 : 3}` : label;
          })
          .join(", ")}
      </span>
    </div>
  );
}
