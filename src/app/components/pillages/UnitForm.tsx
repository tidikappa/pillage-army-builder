import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Checkbox } from "../ui/checkbox";
import {
  Faction,
  UnitType,
  Equipment,
  UnitRole,
  factions as allFactions,
  DOG_HANDLER_TALENT_ID,
  WAR_DOGS_EQUIPMENT_ID,
  DOG_HANDLER_BONUS_PER_MODEL,
} from "../../data/gameData";

/**
 * Resolves cross-rule equipment conflicts. The user's most recent action
 * (`lastAddedId`) wins — items it conflicts with are dropped.
 *
 * Rules covered:
 * - Spear ↔ any ranged weapon: mutually exclusive.
 * - Banner XOR Horn on the same unit.
 * - Banner or Horn → no ranged weapon, no Danish axe.
 * - War dogs → forces "no protection" and limits melee to improvised / base / spear.
 */
function resolveEquipmentConflicts(
  equipment: string[],
  lastAddedId: string | null,
  ctxFaction: Faction
): string[] {
  let next = [...equipment];
  const has = (id: string) => next.includes(id);
  const drop = (...ids: string[]) => {
    next = next.filter((id) => !ids.includes(id));
  };

  const protectionEquip = ctxFaction.availableEquipment.filter((e) => e.type === "protection");
  const rangedEquip = ctxFaction.availableEquipment.filter((e) => e.type === "ranged");
  const meleeEquip = ctxFaction.availableEquipment.filter((e) => e.type === "melee");
  const noneProtection = protectionEquip.find((e) => e.name === "Sans protection");
  const noneRanged = rangedEquip.find((e) => e.name === "Aucune");

  const isRealRanged = (id: string) => {
    const item = rangedEquip.find((e) => e.id === id);
    return item !== undefined && item.name !== "Aucune";
  };
  const isArmorOrShield = (id: string) => {
    const item = protectionEquip.find((e) => e.id === id);
    return item !== undefined && item.name !== "Sans protection";
  };
  const isMelee = (id: string) => meleeEquip.some((e) => e.id === id);
  const forceNoRanged = () => {
    const removed = next.filter(isRealRanged);
    if (removed.length > 0) {
      drop(...removed);
      if (noneRanged && !has(noneRanged.id)) next.push(noneRanged.id);
    }
  };

  // --- Spear ↔ Ranged: last action wins ---
  if (lastAddedId === "mel_spear" && has("mel_spear")) {
    forceNoRanged();
  } else if (lastAddedId && isRealRanged(lastAddedId) && has(lastAddedId) && has("mel_spear")) {
    drop("mel_spear");
  }

  // --- Banner XOR Horn on same unit: last one added wins ---
  if (lastAddedId === "spec_banner" && has("spec_banner")) drop("spec_horn");
  if (lastAddedId === "spec_horn" && has("spec_horn")) drop("spec_banner");

  // --- Banner or Horn ↔ Axe / Ranged ---
  if (lastAddedId === "spec_banner" || lastAddedId === "spec_horn") {
    if (has(lastAddedId)) {
      drop("mel_axe");
      forceNoRanged();
    }
  } else if ((has("spec_banner") || has("spec_horn")) && lastAddedId) {
    // The user just added an axe or a ranged weapon → kick out the banner/horn.
    if (lastAddedId === "mel_axe" && has("mel_axe")) {
      drop("spec_banner", "spec_horn");
    }
    if (isRealRanged(lastAddedId) && has(lastAddedId)) {
      drop("spec_banner", "spec_horn");
    }
  }

  // --- War dogs ↔ protection / restricted melee ---
  const allowedDogMelee = new Set(["mel_imp", "mel_base", "mel_spear"]);

  if (lastAddedId === "spec_dogs" && has("spec_dogs")) {
    // The user just added dogs → adjust protection + melee around it, and
    // drop incompatible items (banner, real ranged).
    const protToRemove = next.filter(isArmorOrShield);
    if (protToRemove.length > 0) drop(...protToRemove);
    if (noneProtection && !has(noneProtection.id)) next.push(noneProtection.id);

    const meleeToRemove = next.filter((id) => isMelee(id) && !allowedDogMelee.has(id));
    if (meleeToRemove.length > 0) drop(...meleeToRemove);
    if (!next.some(isMelee)) {
      const base = meleeEquip.find((e) => e.id === "mel_base");
      if (base) next.push(base.id);
    }

    drop("spec_banner");
    forceNoRanged();
  } else if (has("spec_dogs") && lastAddedId) {
    // Dogs are kept from before; the user added something else. If it's an
    // armor/shield, a banned melee, a real ranged weapon, or a banner, drop
    // the dogs to honour the new choice.
    if (isArmorOrShield(lastAddedId) && has(lastAddedId)) {
      drop("spec_dogs");
    }
    if (isMelee(lastAddedId) && !allowedDogMelee.has(lastAddedId) && has(lastAddedId)) {
      drop("spec_dogs");
    }
    if (isRealRanged(lastAddedId) && has(lastAddedId)) {
      drop("spec_dogs");
    }
    if (lastAddedId === "spec_banner" && has("spec_banner")) {
      drop("spec_dogs");
    }
  }

  return next;
}
import { Plus, Minus, Shield, Sword, Crosshair, Zap, Sparkles, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useTranslation } from "./TranslationContext";

import containerBg from "figma:asset/57207223c848fe507d04a74d9ec51cd6651e3027.png";

interface UnitFormProps {
  faction: Faction;
  onAddUnit: (
    unitTypeId: string,
    equipmentIds: string[],
    quantity: number,
    sourceFactionId?: string
  ) => void;
  currentPoints: number;
  maxPoints: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  unitToEdit?: {
    instanceId?: string;
    unitTypeId: string;
    equipment: string[];
    quantity: number;
    sourceFactionId?: string;
  };
  /**
   * Current army composition. Used for cross-unit rules like the Pict
   * "free chainmail" bonus (max 2 warriors per chef).
   */
  army?: import("../../data/gameData").ArmyUnit[];
}

export function UnitForm({ faction, onAddUnit, currentPoints, maxPoints, isOpen: externalIsOpen, onOpenChange, editMode = false, unitToEdit, army = [] }: UnitFormProps) {
  const { t, tData } = useTranslation();
  const [selectedUnitId, setSelectedUnitId] = React.useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = React.useState<string[]>([]);
  const [quantity, setQuantity] = React.useState(1);
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  // When set, the user has chosen a mercenary from this other faction.
  const [mercFactionId, setMercFactionId] = React.useState<string | null>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;

  const optionsRef = React.useRef<HTMLDivElement>(null);

  // Effective faction: the mercenary's source faction if set, otherwise the
  // army's main faction. Used for unit lookup, equipment options and rules.
  const effectiveFaction = React.useMemo(() => {
    if (mercFactionId) {
      return allFactions.find((f) => f.id === mercFactionId) ?? faction;
    }
    return faction;
  }, [faction, mercFactionId]);

  const selectedUnit = effectiveFaction.units.find((u) => u.id === selectedUnitId);

  // Pict "free chainmail" rule (Pillards de forts romains).
  // Slots = 2 × number of chefs; counted across all warrior units that wear
  // an armour, EXCLUDING the unit currently being edited so toggling it
  // off-then-on doesn't appear over the limit.
  const pictArmorState = React.useMemo(() => {
    if (faction.id !== "picts") return null;
    const chefCount = army
      .filter((u) => u.unitTypeId === "warlord")
      .reduce((s, u) => s + (u.quantity || 1), 0);
    const otherArmored = army
      .filter((u) => u.unitTypeId === "warrior")
      .filter((u) => u.equipment.includes("prot_armor"))
      .filter((u) => !unitToEdit?.instanceId || u.instanceId !== unitToEdit.instanceId)
      .reduce((s, u) => s + (u.quantity || 1), 0);
    return {
      slotsTotal: chefCount * 2,
      slotsRemaining: Math.max(0, chefCount * 2 - otherArmored),
      chefCount,
    };
  }, [faction.id, army, unitToEdit?.instanceId]);

  // Available mercenaries: only when the army's faction is Byzantine.
  // Rule: all non-warlord units from other factions are recruitable.
  const mercenaries = React.useMemo(() => {
    if (faction.id !== "byzantines") return [];
    return allFactions
      .filter((f) => f.id !== "byzantines")
      .flatMap((f) =>
        f.units
          .filter((u) => u.id !== "warlord")
          .map((u) => ({ sourceFaction: f, unit: u }))
      );
  }, [faction.id]);

  // Reset form when opening
  React.useEffect(() => {
    if (isOpen) {
      if (editMode && unitToEdit) {
        // Initialize with existing unit data
        setSelectedUnitId(unitToEdit.unitTypeId);
        setSelectedEquipment(unitToEdit.equipment);
        setQuantity(unitToEdit.quantity);
        setMercFactionId(unitToEdit.sourceFactionId ?? null);
      } else {
        // Reset for new unit
        setSelectedUnitId("");
        setSelectedEquipment([]);
        setQuantity(1);
        setMercFactionId(null);
      }
    }
  }, [isOpen, editMode, unitToEdit]);

  // Scroll to options when unit is selected
  React.useEffect(() => {
    if (selectedUnitId && optionsRef.current) {
      setTimeout(() => {
        optionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedUnitId]);

  // Default selections when unit changes
  React.useEffect(() => {
    // Skip auto-initialization when in edit mode
    if (editMode && unitToEdit) return;

    if (selectedUnitId) {
      setQuantity(1);
      // Mandatory equipment for Kataphraktoi-like huscarls. Each entry lists
      // the equipment IDs that are locked in for the unit.
      const KATAPHRAKTOI_LOADOUT: Record<string, string[]> = {
        byzantines: ['protection_shield', 'protection_armor', 'weapon_spear', 'weapon_base', 'spec_horse'],
        romans: ['prot_armor', 'mel_kontos', 'mel_base', 'spec_horse'],
        huns: ['prot_armor', 'mel_kontos', 'mel_base', 'spec_horse'],
      };
      const mandatoryLoadout = KATAPHRAKTOI_LOADOUT[effectiveFaction.id];
      if (mandatoryLoadout && selectedUnitId === 'huscarl' && !mercFactionId) {
          setSelectedEquipment([...mandatoryLoadout]);
          return;
      }

      const defaults = ['protection', 'melee', 'ranged'].map(type => {
        const freeOption = effectiveFaction.availableEquipment.find(e => {
           if (e.type !== type) return false;
           const cost = e.costs[selectedUnitId as UnitRole];
           return cost === 0;
        });
        return freeOption ? freeOption.id : null;
      }).filter(Boolean) as string[];

      setSelectedEquipment(defaults);
    }
  }, [selectedUnitId, effectiveFaction, mercFactionId, editMode, unitToEdit]);

  const handleEquipmentToggle = (eqId: string, type: string) => {
    setSelectedEquipment((prev) => {
      // Lock-in equipment for Kataphraktoi-style huscarls in Byzantines, Romans and Huns.
      const KATAPHRAKTOI_LOADOUT: Record<string, string[]> = {
        byzantines: ['protection_shield', 'protection_armor', 'weapon_spear', 'weapon_base', 'spec_horse'],
        romans: ['prot_armor', 'mel_kontos', 'mel_base', 'spec_horse'],
        huns: ['prot_armor', 'mel_kontos', 'mel_base', 'spec_horse'],
      };
      const mandatoryIds = KATAPHRAKTOI_LOADOUT[effectiveFaction.id];
      if (mandatoryIds && selectedUnitId === 'huscarl') {
          // Block changes to the mandatory categories (protection + melee).
          if (type === 'protection' || type === 'melee') return prev;
          // Allow special toggles EXCEPT the mandatory horse / lasso etc.
          if (type === 'special' && mandatoryIds.includes(eqId)) return prev;
      }

      const eq = effectiveFaction.availableEquipment.find(e => e.id === eqId);
      if (!eq) return prev;

      let next = [...prev];

      if (type === 'protection') {
        // "Sans protection" id varies by faction: prot_none, protection_none, etc.
        const noneItem = effectiveFaction.availableEquipment.find(
          item => item.type === 'protection' && item.name === 'Sans protection'
        );
        const noneId = noneItem?.id;
        const isNoneSelection = noneId !== undefined && eqId === noneId;

        if (isNoneSelection) {
           // Selecting "no protection" wipes any armour/shield.
           return next.filter(id => {
             const item = effectiveFaction.availableEquipment.find(e => e.id === id);
             return item?.type !== 'protection';
           }).concat(eqId);
        }

        // Selecting an armour / shield: kick out "no protection" first.
        if (noneId) next = next.filter(id => id !== noneId);

        if (next.includes(eqId)) {
           next = next.filter(id => id !== eqId);
           const hasProtection = next.some(id => effectiveFaction.availableEquipment.find(e => e.id === id)?.type === 'protection');
           if (!hasProtection && noneId) {
              const noneCost = noneItem?.costs[selectedUnitId as UnitRole];
              if (noneCost !== null && noneCost !== undefined) next.push(noneId);
           }
        } else {
           next.push(eqId);
        }
        if (effectiveFaction.id === 'rus' && eqId === 'prot_shield' && next.includes('prot_shield')) {
           const baseCount = next.filter(id => id === 'mel_base').length;
           if (baseCount > 1) {
              next = next.filter(id => id !== 'mel_base');
              next.push('mel_base');
           }
        }
      }
      else if (type === 'special') {
        if (next.includes(eqId)) {
          next = next.filter(id => id !== eqId);
        } else {
          // Banner XOR Horn on the same unit: drop the other one when adding either.
          if (eqId === 'spec_banner') next = next.filter(id => id !== 'spec_horn');
          if (eqId === 'spec_horn') next = next.filter(id => id !== 'spec_banner');
          next.push(eqId);
        }
      }
      else if (type === 'talent') {
         if (next.includes(eqId)) {
           next = next.filter(id => id !== eqId);
         } else {
           const currentTalents = next.filter(id => effectiveFaction.availableEquipment.find(e => e.id === id)?.type === 'talent').length;
           if (currentTalents < 2) next.push(eqId);
         }
      }
      else if (type === 'melee') {
        const isMagyarNoble = effectiveFaction.id === 'magyars' && (selectedUnitId === 'warlord' || selectedUnitId === 'huscarl');

        if (next.includes(eqId)) {
           // Toggling OFF
           next = next.filter(id => id !== eqId);
        } else if (isMagyarNoble) {
           next.push(eqId);
        } else {
           // Toggling ON
           const isHuscarl = selectedUnitId === 'huscarl';
           
           // Magyars: Can combine Spear and Sabre
           if (effectiveFaction.id === 'magyars' && (eqId === 'weapon_spear' || eqId === 'weapon_sabre')) {
               const meleeIds = effectiveFaction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
               const otherComboId = eqId === 'weapon_spear' ? 'weapon_sabre' : 'weapon_spear';
               // Keep the other combo item if present, remove all other melee
               next = next.filter(id => !meleeIds.includes(id) || id === otherComboId);
           }
           // If selecting Danish Axe
           if (eqId === 'mel_axe') {
               const meleeIds = effectiveFaction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
               if (isHuscarl) {
                   // Huscarl: Keep Base, remove others (Spear, Improvised)
                   next = next.filter(id => !meleeIds.includes(id) || id === 'mel_base');
               } else {
                   // Standard: Remove all other melee
                   next = next.filter(id => !meleeIds.includes(id));
               }
           }
           // If selecting Lance
           else if (eqId === 'mel_spear') {
               const meleeIds = effectiveFaction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
               // Keep Base. Remove Axe (unless Huscarl logic allows, but rule says Lance+Base, not Lance+Axe), Improvised.
               // Assuming Lance cannot combine with Axe.
               next = next.filter(id => !meleeIds.includes(id) || id === 'mel_base');
           }
           // If selecting Base Weapon
           else if (eqId === 'mel_base') {
               const meleeIds = effectiveFaction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
               // Keep Spear. Keep Axe ONLY if Huscarl.
               next = next.filter(id => {
                   if (!meleeIds.includes(id)) return true;
                   if (id === 'mel_spear') return true;
                   if (id === 'mel_axe' && isHuscarl) return true;
                   return false;
               });
           }
           else {
               // Other (Improvised): Exclusive
               const meleeIds = effectiveFaction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
               next = next.filter(id => !meleeIds.includes(id));
           }
           
           next.push(eqId);
        }

        // Axe vs Ranged logic (Applied after selection)
        if (next.includes('mel_axe')) {
           const activeRanged = next.find(id => {
              const item = effectiveFaction.availableEquipment.find(e => e.id === id);
              return item?.type === 'ranged' && item.id !== 'ran_none';
           });
           if (activeRanged) {
              next = next.filter(id => id !== activeRanged);
              if (effectiveFaction.availableEquipment.some(e => e.id === 'ran_none')) {
                 next.push('ran_none');
              }
           }
        }
      }
      else {
        const isMagyarNoble = effectiveFaction.id === 'magyars' && (selectedUnitId === 'warlord' || selectedUnitId === 'huscarl');

        if (isMagyarNoble) {
           if (next.includes(eqId)) next = next.filter(id => id !== eqId);
           else next.push(eqId);
        } else {
           const othersOfType = effectiveFaction.availableEquipment.filter(e => e.type === type).map(e => e.id);
           next = next.filter(id => !othersOfType.includes(id));
           next.push(eqId);
        }

        const isRanged = type === 'ranged';
        if (isRanged && eqId !== 'ran_none') {
          if (effectiveFaction.id === 'rus') {
             const baseCount = next.filter(id => id === 'mel_base').length;
             if (baseCount > 1) {
                 const idx = next.lastIndexOf('mel_base');
                 if (idx > -1) next.splice(idx, 1);
             }
          }

          if (next.includes('mel_axe')) {
            next = next.filter(id => id !== 'mel_axe');
            const freeMelee = effectiveFaction.availableEquipment.find(e =>
               e.type === 'melee' && e.costs[selectedUnitId as UnitRole] === 0
            );
            if (freeMelee) next.push(freeMelee.id);
            else if (effectiveFaction.availableEquipment.some(e => e.id === 'mel_base')) next.push('mel_base');
          }
        }
      }
      // Resolve cross-rule conflicts based on the user's most recent action.
      const lastAddedId = next.includes(eqId) ? eqId : null;
      return resolveEquipmentConflicts(next, lastAddedId, effectiveFaction);
    });
  };

  const toggleRusDualWield = (checked: boolean) => {
    setSelectedEquipment(prev => {
       if (checked) {
         let next = prev.filter(id => id !== 'prot_shield');
         
         // Remove ranged weapons (except ran_none)
         const rangedIds = effectiveFaction.availableEquipment
             .filter(e => e.type === 'ranged' && e.id !== 'ran_none')
             .map(e => e.id);
         next = next.filter(id => !rangedIds.includes(id));
         
         if (effectiveFaction.availableEquipment.some(e => e.id === 'ran_none')) {
             if (!next.includes('ran_none')) next.push('ran_none');
         }

         return next.concat('mel_base');
       } else {
         const idx = prev.lastIndexOf('mel_base');
         if (idx > -1) {
            const newArr = [...prev];
            newArr.splice(idx, 1);
            return newArr;
         }
         return prev;
       }
    });
  };

  // "Éducateur canin" talent : if a warlord in the army carries it (either an
  // existing unit other than the one being edited, or the current draft itself
  // when editing a warlord), every model with War Dogs costs 10 more po.
  const dogHandlerActive = React.useMemo(() => {
    const onCurrentDraft = selectedEquipment.includes(DOG_HANDLER_TALENT_ID);
    const editingId = unitToEdit?.instanceId;
    const onOtherUnit = army.some(
      (u) => u.instanceId !== editingId && u.equipment.includes(DOG_HANDLER_TALENT_ID)
    );
    return onCurrentDraft || onOtherUnit;
  }, [army, selectedEquipment, unitToEdit?.instanceId]);

  const calculateCurrentCost = () => {
    if (!selectedUnit) return 0;
    let cost = selectedUnit.baseCost;
    selectedEquipment.forEach(id => {
      const eq = effectiveFaction.availableEquipment.find(e => e.id === id);
      if (eq) {
        const eqCost = eq.costs[selectedUnit.id as UnitRole];
        if (eqCost !== null) cost += eqCost;
      }
    });
    if (dogHandlerActive && selectedEquipment.includes(WAR_DOGS_EQUIPMENT_ID)) {
      cost += DOG_HANDLER_BONUS_PER_MODEL;
    }
    return cost;
  };

  const unitCost = calculateCurrentCost();
  const totalCost = unitCost * quantity;
  const remainingBudget = maxPoints - currentPoints;
  const canAfford = totalCost <= remainingBudget;

  const handleSave = () => {
    if (selectedUnitId) {
      onAddUnit(selectedUnitId, selectedEquipment, quantity, mercFactionId ?? undefined);
      setIsOpen(false);
    }
  };

  const handleUnitToggle = (unitId: string) => {
    setSelectedUnitId((prev) => (prev === unitId ? "" : unitId));
    // Clicking a native unit resets the mercenary mode.
    setMercFactionId(null);
  };

  const handleMercToggle = (sourceFactionId: string, unitId: string) => {
    const isCurrent = selectedUnitId === unitId && mercFactionId === sourceFactionId;
    if (isCurrent) {
      setSelectedUnitId("");
      setMercFactionId(null);
    } else {
      setMercFactionId(sourceFactionId);
      setSelectedUnitId(unitId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!editMode && (
      <DialogTrigger asChild>
        <Button className="w-full h-16 text-lg gap-3 bg-[#cc6512] hover:bg-[#b0560f] text-white shadow-[0_0_25px_rgba(204,101,18,0.3)] border border-[#cc6512]/30 rounded-none group transition-all duration-300 hover:scale-[1.01]">
          <div className="bg-black/20 p-2 rounded-none group-hover:bg-black/30 transition-colors">
            <Plus className="w-6 h-6 text-white/90" />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-serif font-bold tracking-wide text-white">{t('recruitTitle').toUpperCase()}</span>
            <span className="text-[10px] uppercase tracking-widest opacity-70 font-sans font-medium">{t('recruitSubtitle')}</span>
          </div>
        </Button>
      </DialogTrigger>
      )}
      <DialogContent 
        className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-transparent border-0 shadow-none drop-shadow-2xl rounded-none text-stone-200 [&>button]:scale-150 [&>button]:top-8 [&>button]:right-8 [&>button]:text-stone-400 hover:[&>button]:text-[#cc6512] transition-colors"
        style={{ backgroundImage: `url(${containerBg})`, backgroundSize: '100% 100%' }}
      >
        
        <div className="flex-1 flex flex-col overflow-hidden p-10 pb-0">
            {/* Header */}
            <DialogHeader className="pb-4 border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-['UnifrakturCook'] tracking-wide text-white drop-shadow-sm">
                    {t('recruitTitle')}
                </DialogTitle>
            </div>
            <DialogDescription className="text-stone-500 text-sm mt-1">
                {t('recruitDescription')}
            </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto pt-2 custom-scrollbar">
            <div className="space-y-10 pb-10">
                
                {faction.specialRules.length > 0 && (
                <div className="mt-4 bg-blue-950/20 border border-blue-900/30 rounded-none p-4 backdrop-blur-sm">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                        <Shield className="w-3 h-3" /> {t('tacticalReminders')}
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-blue-200/70 font-medium">
                    {faction.specialRules.map((rule, idx) => (
                        <li key={idx}>{tData('factionRules', rule, rule)}</li>
                    ))}
                    </ul>
                </div>
                )}

                {/* Unit Selection Grid */}
                <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 pl-1">{t('unitType')}</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {faction.units.map((unit) => {
                    const Icon = unit.icon;
                    const isSelected = selectedUnitId === unit.id && !mercFactionId;
                    const unitName = tData('roles', unit.id, unit.name);
                    return (
                        <button
                        key={unit.id}
                        onClick={() => handleUnitToggle(unit.id)}
                        type="button"
                        className={`
                            group relative cursor-pointer rounded-none border p-5 flex flex-col items-center gap-3 transition-all duration-300 focus:outline-none
                            ${isSelected 
                            ? "border-[#cc6512]/50 bg-[#cc6512]/10 shadow-[0_0_20px_rgba(204,101,18,0.15)] scale-[1.02]" 
                            : "border-white/5 hover:border-[#cc6512]/20 bg-[#1c1917]/60 hover:bg-[#2c2525]/60"}
                        `}
                        >
                        <div className={`p-3 rounded-none transition-all duration-500 ${isSelected ? 'bg-[#cc6512]/20 shadow-inner' : 'bg-black/20 group-hover:bg-black/30'}`}>
                            <Icon className={`w-8 h-8 transition-colors duration-300 ${isSelected ? 'text-[#cc6512] drop-shadow-[0_0_8px_rgba(204,101,18,0.5)]' : 'text-stone-500 group-hover:text-stone-300'}`} />
                        </div>
                        <span className={`font-serif font-bold text-sm uppercase tracking-wider text-center transition-colors ${isSelected ? 'text-[#cc6512]' : 'text-stone-400 group-hover:text-stone-200'}`}>{unitName}</span>
                        <div className={`mt-auto text-xs font-bold px-2 py-0.5 rounded-none ${isSelected ? 'bg-[#cc6512]/20 text-[#cc6512] border border-[#cc6512]/20' : 'text-stone-600 bg-black/20'}`}>
                            {unit.baseCost} PTS
                        </div>
                        
                        {/* Active Indicator */}
                        {isSelected && <div className="absolute inset-0 rounded-none border-2 border-[#cc6512]/20 pointer-events-none" />}
                        </button>
                    );
                    })}
                </div>
                </div>

                {mercenaries.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 pl-1">
                      Mercenaires
                    </Label>
                    <p className="text-xs text-stone-500 pl-1 -mt-2">
                      Jusqu'à 50% de votre armée peut être composée d'unités d'autres factions. Le Chef doit rester Byzantin.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {mercenaries.map(({ sourceFaction, unit }) => {
                        const Icon = unit.icon;
                        const isSelected = selectedUnitId === unit.id && mercFactionId === sourceFaction.id;
                        const unitName = tData("roles", unit.id, unit.name);
                        const factionName = tData("factions", sourceFaction.id, sourceFaction.name);
                        return (
                          <button
                            key={`${sourceFaction.id}_${unit.id}`}
                            type="button"
                            onClick={() => handleMercToggle(sourceFaction.id, unit.id)}
                            className={`
                              group relative cursor-pointer rounded-none border p-5 flex flex-col items-center gap-2 transition-all duration-300 focus:outline-none
                              ${isSelected
                                ? "border-amber-500/60 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.18)] scale-[1.02]"
                                : "border-white/5 hover:border-amber-500/30 bg-[#1c1917]/60 hover:bg-[#2c2525]/60"}
                            `}
                          >
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 border ${isSelected ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-black/30 border-white/10 text-stone-500 group-hover:text-stone-300"}`}>
                              {factionName}
                            </span>
                            <div className={`p-3 rounded-none transition-all duration-500 ${isSelected ? "bg-amber-500/20 shadow-inner" : "bg-black/20 group-hover:bg-black/30"}`}>
                              <Icon className={`w-7 h-7 transition-colors duration-300 ${isSelected ? "text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-stone-500 group-hover:text-stone-300"}`} />
                            </div>
                            <span className={`font-serif font-bold text-sm uppercase tracking-wider text-center transition-colors ${isSelected ? "text-amber-300" : "text-stone-400 group-hover:text-stone-200"}`}>
                              {unitName}
                            </span>
                            <div className={`mt-auto text-xs font-bold px-2 py-0.5 rounded-none ${isSelected ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "text-stone-600 bg-black/20"}`}>
                              {unit.baseCost} PTS
                            </div>
                            {isSelected && <div className="absolute inset-0 rounded-none border-2 border-amber-500/30 pointer-events-none" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedUnit && (
                <div ref={optionsRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    
                    {['protection', 'melee', 'ranged'].map((type) => (
                    <div key={type} className="space-y-4">
                        <div className="flex items-center gap-2 text-stone-400 pb-1">
                        {type === 'protection' && <Shield className="w-4 h-4 text-[#cc6512]" />}
                        {type === 'melee' && <Sword className="w-4 h-4 text-[#cc6512]" />}
                        {type === 'ranged' && <Crosshair className="w-4 h-4 text-[#cc6512]" />}
                        <Label className="text-xs font-bold uppercase tracking-[0.15em]">
                            {type === 'protection' ? t('protectionLabel') : type === 'melee' ? t('meleeLabel') : t('rangedLabel')}
                        </Label>
                        </div>

                        {type === 'protection' || type === 'melee' || (type === 'ranged' && effectiveFaction.id === 'magyars' && (selectedUnit.id === 'warlord' || selectedUnit.id === 'huscarl')) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {effectiveFaction.availableEquipment
                                .filter(e => e.type === type)
                                .map((eq) => {
                                    const cost = eq.costs[selectedUnit.id as UnitRole];
                                    if (cost === null) return null;
                                    const isChecked = selectedEquipment.includes(eq.id);
                                    const equipName = tData('equipment', eq.id, eq.name);

                                    // Pict free chainmail: hide the option for warriors when there are no remaining slots.
                                    const isPictWarriorArmor =
                                      pictArmorState !== null &&
                                      selectedUnit.id === 'warrior' &&
                                      eq.id === 'prot_armor';
                                    if (isPictWarriorArmor) {
                                      const noSlots = pictArmorState!.slotsTotal === 0;
                                      const noRemaining = pictArmorState!.slotsRemaining < quantity;
                                      // Hide when no chefs in the army yet, OR when no remaining slots and not currently selected.
                                      if (noSlots) return null;
                                      if (noRemaining && !isChecked) return null;
                                    }

                                    return (
                                    <div key={eq.id}
                                        onClick={() => handleEquipmentToggle(eq.id, type)}
                                        className={`relative flex items-center justify-between p-3 rounded-none border cursor-pointer transition-all duration-200
                                            ${isChecked ? "bg-[#cc6512]/10 border-[#cc6512]/30" : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                id={eq.id}
                                                checked={isChecked}
                                                className="border-stone-600 data-[state=checked]:bg-[#cc6512] data-[state=checked]:border-[#cc6512] rounded-none shadow-sm pointer-events-none"
                                            />
                                            <Label htmlFor={eq.id} className="cursor-pointer font-medium text-stone-300 pointer-events-none">
                                                {equipName}
                                                {isPictWarriorArmor && (
                                                  <span className="block text-[10px] text-[#cc6512]/80 font-normal normal-case tracking-normal">
                                                    {pictArmorState!.slotsRemaining} / {pictArmorState!.slotsTotal} cottes libres (2 par chef)
                                                  </span>
                                                )}
                                            </Label>
                                        </div>
                                        <span className={`text-xs font-bold font-mono ${isChecked ? "text-[#cc6512]" : "text-stone-600"}`}>{cost > 0 ? `+${cost}` : '0'}</span>
                                        
                                        {effectiveFaction.id === 'rus' && eq.id === 'mel_base' && isChecked && (
                                            <div className="absolute top-full left-0 right-0 pt-2 px-3 pb-2 z-20 bg-[#1c1917] border border-t-0 border-white/10 rounded-none -mt-1 shadow-xl" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox 
                                                            id="rus-dual-wield"
                                                            checked={selectedEquipment.filter(id => id === 'mel_base').length > 1}
                                                            onCheckedChange={(chk) => toggleRusDualWield(chk as boolean)}
                                                            className="h-3.5 w-3.5 border-stone-600 data-[state=checked]:bg-[#cc6512]"
                                                        />
                                                        <Label htmlFor="rus-dual-wield" className="text-xs cursor-pointer text-[#cc6512]/80">
                                                            2ème arme de base
                                                        </Label>
                                                    </div>
                                                    <span className="text-xs font-mono text-[#cc6512]">+{cost}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <RadioGroup 
                            value={selectedEquipment.find(id => effectiveFaction.availableEquipment.find(e => e.id === id)?.type === type) || ''}
                            onValueChange={(val) => handleEquipmentToggle(val, type)}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                            >
                            {effectiveFaction.availableEquipment
                                .filter(e => e.type === type)
                                .map((eq) => {
                                const cost = eq.costs[selectedUnit.id as UnitRole];
                                if (cost === null) return null;
                                const isChecked = selectedEquipment.includes(eq.id);
                                const equipName = tData('equipment', eq.id, eq.name);

                                return (
                                    <div key={eq.id} 
                                        onClick={() => handleEquipmentToggle(eq.id, type)}
                                        className={`relative overflow-hidden flex flex-col justify-center p-3 rounded-none border cursor-pointer transition-all duration-200
                                            ${isChecked ? "bg-[#cc6512]/10 border-[#cc6512]/30" : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"}
                                        `}
                                    >
                                        <div className="flex items-center justify-between z-10">
                                            <div className="flex items-center gap-3">
                                                <RadioGroupItem value={eq.id} id={eq.id} className="border-stone-600 text-[#cc6512] pointer-events-none" />
                                                <Label htmlFor={eq.id} className="cursor-pointer font-medium text-stone-300 pointer-events-none">
                                                    {equipName}
                                                </Label>
                                            </div>
                                            <span className={`text-xs font-bold font-mono ${isChecked ? "text-[#cc6512]" : "text-stone-600"}`}>{cost > 0 ? `+${cost}` : '0'}</span>
                                        </div>
                                        
                                        {isChecked && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#cc6512]" />}
                                        

                                    </div>
                                );
                                })}
                            </RadioGroup>
                        )}
                    </div>
                    ))}

                    <div className="space-y-4">
                    <div className="flex items-center gap-2 text-stone-400 pb-1">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <Label className="text-xs font-bold uppercase tracking-[0.15em]">{t('specialOptions')}</Label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {effectiveFaction.availableEquipment
                        .filter(e => e.type === 'special')
                        .map((eq) => {
                            const cost = eq.costs[selectedUnit.id as UnitRole];
                            if (cost === null) return null;
                            const isChecked = selectedEquipment.includes(eq.id);
                            const equipName = tData('equipment', eq.id, eq.name);

                            return (
                            <div key={eq.id} 
                                onClick={() => handleEquipmentToggle(eq.id, 'special')}
                                className={`flex items-center justify-between p-3 rounded-none border cursor-pointer transition-all duration-200
                                    ${isChecked ? "bg-amber-950/20 border-amber-500/30" : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <Checkbox 
                                        id={eq.id} 
                                        checked={isChecked}
                                        className="border-stone-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600 pointer-events-none"
                                    />
                                    <Label htmlFor={eq.id} className="cursor-pointer font-medium text-stone-300 pointer-events-none">
                                        {equipName}
                                    </Label>
                                </div>
                                <span className={`text-xs font-bold font-mono ${isChecked ? "text-amber-400" : "text-stone-600"}`}>{cost > 0 ? `+${cost}` : '0'}</span>
                            </div>
                            );
                        })}
                    </div>
                    </div>

                    {selectedUnit.id === 'warlord' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-purple-400 pb-1">
                        <Sparkles className="w-4 h-4" />
                        <Label className="text-xs font-bold uppercase tracking-[0.15em]">{t('talentsTitle')}</Label>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                        {effectiveFaction.availableEquipment
                            .filter(e => e.type === 'talent')
                            .map((eq) => {
                            const cost = eq.costs[selectedUnit.id as UnitRole];
                            if (cost === null) return null;
                            
                            const isSelected = selectedEquipment.includes(eq.id);
                            const currentTalentCount = selectedEquipment.filter(id => effectiveFaction.availableEquipment.find(e => e.id === id)?.type === 'talent').length;
                            const disabled = !isSelected && currentTalentCount >= 2;
                            const talentName = tData('equipment', eq.id, eq.name);
                            const talentDesc = tData('equipment', `${eq.id}_desc`, eq.description || '');

                            return (
                                <div key={eq.id} 
                                    onClick={() => !disabled && handleEquipmentToggle(eq.id, 'talent')}
                                    className={`flex flex-col border rounded-none p-4 transition-all
                                    ${isSelected 
                                        ? "bg-purple-950/20 border-purple-500/40 shadow-[0_0_10px_rgba(147,51,234,0.1)] cursor-pointer" 
                                        : disabled 
                                            ? "opacity-40 bg-black/10 border-white/5 cursor-not-allowed" 
                                            : "bg-black/20 border-white/5 hover:border-purple-500/30 hover:bg-purple-900/10 cursor-pointer"}
                                    `}
                                >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                    <Checkbox 
                                        checked={isSelected}
                                        className="border-stone-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                                        disabled={disabled}
                                    />
                                    <span className={`font-bold font-serif tracking-wide ${isSelected ? "text-purple-300" : "text-stone-400"}`}>
                                        {talentName}
                                    </span>
                                    </div>
                                    <span className={`text-xs font-mono font-bold ${isSelected ? "text-purple-400" : "text-stone-600"}`}>
                                        {cost > 0 ? `+${cost} PO` : t('free')}
                                    </span>
                                </div>
                                <p className="text-xs text-stone-500 pl-7 leading-relaxed">
                                    {talentDesc}
                                </p>
                                </div>
                            );
                            })}
                        </div>
                    </div>
                    )}
                </div>
                )}
            </div>
            </div>
        </div>

        {/* Footer Controls - Fixed at Bottom */}
        {selectedUnit && (
            <div className="shrink-0 z-20 px-10 pb-10 pt-4 flex flex-col gap-4">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center border border-white/10 rounded-none bg-black/20">
                        <button 
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="p-3 hover:bg-white/5 text-stone-400 transition-colors"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-stone-200 text-lg">{quantity}</span>
                        <button 
                            onClick={() => setQuantity(q => q + 1)}
                            className="p-3 hover:bg-white/5 text-stone-400 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        </div>
                        <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-stone-500">{t('totalCost')}</span>
                        <span className={`text-2xl font-bold font-['UnifrakturCook'] ${canAfford ? 'text-[#cc6512]' : 'text-red-500'}`}>
                            {totalCost} PO
                        </span>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        <Button
                        onClick={handleSave}
                        className="rounded-none px-8 font-bold tracking-wider shadow-lg transition-all bg-[#cc6512] hover:bg-[#b0560f] text-white hover:scale-105"
                        >
                        {t('recruit')}
                        </Button>
                    </div>
                </div>
                {!canAfford && (
                    <p className="text-center text-xs text-red-500 font-bold uppercase tracking-widest">
                        {t('insufficientBudget')}
                    </p>
                )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}