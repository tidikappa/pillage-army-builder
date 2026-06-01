import React from "react";
import { factions, ArmyUnit, UnitRole, Equipment } from "../../data/gameData";
import { Card, CardContent } from "../ui/card";
import { Shield, Sword, Crosshair, Zap, Sparkles } from "lucide-react";
import { useTranslation } from "./TranslationContext";

interface ArmyViewProps {
  factionId: string;
  budget: number;
  units: ArmyUnit[];
}

export function ArmyView({ factionId, budget, units }: ArmyViewProps) {
  const { t, tData } = useTranslation();
  const faction = factions.find((f) => f.id === factionId);

  if (!faction) {
    return <p className="text-stone-400">Faction inconnue : {factionId}</p>;
  }

  const total = units.reduce((sum, unit) => {
    const ut = faction.units.find((u) => u.id === unit.unitTypeId);
    if (!ut) return sum;
    let cost = ut.baseCost;
    unit.equipment.forEach((eqId) => {
      const eq = faction.availableEquipment.find((e) => e.id === eqId);
      if (eq) cost += eq.costs[unit.unitTypeId as UnitRole] ?? 0;
    });
    return sum + cost * (unit.quantity || 1);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-white/10 pb-3">
        <div className="font-serif text-stone-200 uppercase tracking-wider">
          {tData("factions", faction.id, faction.name)}
        </div>
        <div className="text-sm text-stone-400">
          <span className={total > budget ? "text-red-400" : "text-[#cc6512]"}>{total}</span> /{" "}
          {budget} po
        </div>
      </div>

      {units.length === 0 ? (
        <p className="text-stone-500 italic">Aucune unité.</p>
      ) : (
        <ul className="space-y-3">
          {units.map((unit, idx) => {
            const ut = faction.units.find((u) => u.id === unit.unitTypeId);
            if (!ut) return null;
            const equipment = unit.equipment
              .map((id) => faction.availableEquipment.find((e) => e.id === id))
              .filter(Boolean) as Equipment[];
            const singleCost =
              ut.baseCost +
              equipment.reduce((s, e) => s + (e.costs[unit.unitTypeId as UnitRole] ?? 0), 0);
            const qty = unit.quantity || 1;

            return (
              <li key={idx}>
                <Card className="bg-black/40 border-white/10 rounded-none">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-serif text-stone-200">
                        {tData("roles", ut.id, ut.name)} <span className="text-stone-500">×{qty}</span>
                      </div>
                      <div className="text-sm text-[#cc6512] font-bold">{singleCost * qty} po</div>
                    </div>
                    <EquipmentLine icon={Shield} items={equipment.filter((e) => e.type === "protection")} unit={unit} faction={faction} tData={tData} />
                    <EquipmentLine icon={Sword} items={equipment.filter((e) => e.type === "melee")} unit={unit} faction={faction} tData={tData} />
                    <EquipmentLine icon={Crosshair} items={equipment.filter((e) => e.type === "ranged")} unit={unit} faction={faction} tData={tData} />
                    <EquipmentLine icon={Zap} items={equipment.filter((e) => e.type === "special")} unit={unit} faction={faction} tData={tData} />
                    <EquipmentLine icon={Sparkles} items={equipment.filter((e) => e.type === "talent")} unit={unit} faction={faction} tData={tData} />
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
}: {
  icon: any;
  items: Equipment[];
  unit: ArmyUnit;
  faction: any;
  tData: (type: any, id: string, defaultVal: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-stone-400">
      <Icon className="w-3.5 h-3.5 text-stone-500" />
      <span>{items.map((e) => tData("equipment", e.id, e.name)).join(", ")}</span>
    </div>
  );
}
