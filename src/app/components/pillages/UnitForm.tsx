import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Checkbox } from "../ui/checkbox";
import { Faction, UnitType, Equipment, UnitRole } from "../../data/gameData";
import { Plus, Minus, Shield, Sword, Crosshair, Zap, Sparkles, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { useTranslation } from "./TranslationContext";

import containerBg from "figma:asset/57207223c848fe507d04a74d9ec51cd6651e3027.png";

interface UnitFormProps {
  faction: Faction;
  onAddUnit: (unitTypeId: string, equipmentIds: string[], quantity: number) => void;
  currentPoints: number;
  maxPoints: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  editMode?: boolean;
  unitToEdit?: {
    unitTypeId: string;
    equipment: string[];
    quantity: number;
  };
}

export function UnitForm({ faction, onAddUnit, currentPoints, maxPoints, isOpen: externalIsOpen, onOpenChange, editMode = false, unitToEdit }: UnitFormProps) {
  const { t, tData } = useTranslation();
  const [selectedUnitId, setSelectedUnitId] = React.useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = React.useState<string[]>([]);
  const [quantity, setQuantity] = React.useState(1);
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;
  
  const optionsRef = React.useRef<HTMLDivElement>(null);

  const selectedUnit = faction.units.find((u) => u.id === selectedUnitId);

  // Reset form when opening
  React.useEffect(() => {
    if (isOpen) {
      if (editMode && unitToEdit) {
        // Initialize with existing unit data
        setSelectedUnitId(unitToEdit.unitTypeId);
        setSelectedEquipment(unitToEdit.equipment);
        setQuantity(unitToEdit.quantity);
      } else {
        // Reset for new unit
        setSelectedUnitId("");
        setSelectedEquipment([]);
        setQuantity(1);
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
      // Special defaults for Byzantine Kataphraktoi (Mandatory equipment)
      if (faction.id === 'byzantines' && selectedUnitId === 'huscarl') {
          setSelectedEquipment([
              'protection_shield', 
              'protection_armor', 
              'weapon_spear', 
              'weapon_base', 
              'spec_horse'
          ]);
          return;
      }

      const defaults = ['protection', 'melee', 'ranged'].map(type => {
        const freeOption = faction.availableEquipment.find(e => {
           if (e.type !== type) return false;
           const cost = e.costs[selectedUnitId as UnitRole];
           return cost === 0;
        });
        return freeOption ? freeOption.id : null;
      }).filter(Boolean) as string[];
      
      setSelectedEquipment(defaults); 
    }
  }, [selectedUnitId, faction, editMode, unitToEdit]);

  const handleEquipmentToggle = (eqId: string, type: string) => {
    setSelectedEquipment((prev) => {
      // Special restriction for Byzantine Kataphraktoi
      if (faction.id === 'byzantines' && selectedUnitId === 'huscarl') {
          const mandatoryIds = ['protection_shield', 'protection_armor', 'weapon_spear', 'weapon_base', 'spec_horse'];
          
          // Prevent modifying mandatory protection/melee
          if (type === 'protection' || type === 'melee') return prev;
          
          // Prevent modifying mandatory special (Horse), allow others
          if (type === 'special' && mandatoryIds.includes(eqId)) return prev;
      }

      const eq = faction.availableEquipment.find(e => e.id === eqId);
      if (!eq) return prev;

      let next = [...prev];

      if (type === 'protection') {
        // "Sans protection" id varies by faction: prot_none, protection_none, etc.
        const noneItem = faction.availableEquipment.find(
          item => item.type === 'protection' && item.name === 'Sans protection'
        );
        const noneId = noneItem?.id;
        const isNoneSelection = noneId !== undefined && eqId === noneId;

        if (isNoneSelection) {
           // Selecting "no protection" wipes any armour/shield.
           return next.filter(id => {
             const item = faction.availableEquipment.find(e => e.id === id);
             return item?.type !== 'protection';
           }).concat(eqId);
        }

        // Selecting an armour / shield: kick out "no protection" first.
        if (noneId) next = next.filter(id => id !== noneId);

        if (next.includes(eqId)) {
           next = next.filter(id => id !== eqId);
           const hasProtection = next.some(id => faction.availableEquipment.find(e => e.id === id)?.type === 'protection');
           if (!hasProtection && noneId) {
              const noneCost = noneItem?.costs[selectedUnitId as UnitRole];
              if (noneCost !== null && noneCost !== undefined) next.push(noneId);
           }
        } else {
           next.push(eqId);
        }
        if (faction.id === 'rus' && eqId === 'prot_shield' && next.includes('prot_shield')) {
           const baseCount = next.filter(id => id === 'mel_base').length;
           if (baseCount > 1) {
              next = next.filter(id => id !== 'mel_base');
              next.push('mel_base');
           }
        }
      }
      else if (type === 'special') {
        if (next.includes(eqId)) next = next.filter(id => id !== eqId);
        else next.push(eqId);
      } 
      else if (type === 'talent') {
         if (next.includes(eqId)) {
           next = next.filter(id => id !== eqId);
         } else {
           const currentTalents = next.filter(id => faction.availableEquipment.find(e => e.id === id)?.type === 'talent').length;
           if (currentTalents < 2) next.push(eqId);
         }
      }
      else if (type === 'melee') {
        const isMagyarNoble = faction.id === 'magyars' && (selectedUnitId === 'warlord' || selectedUnitId === 'huscarl');

        if (next.includes(eqId)) {
           // Toggling OFF
           next = next.filter(id => id !== eqId);
        } else if (isMagyarNoble) {
           next.push(eqId);
        } else {
           // Toggling ON
           const isHuscarl = selectedUnitId === 'huscarl';
           
           // Magyars: Can combine Spear and Sabre
           if (faction.id === 'magyars' && (eqId === 'weapon_spear' || eqId === 'weapon_sabre')) {
               const meleeIds = faction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
               const otherComboId = eqId === 'weapon_spear' ? 'weapon_sabre' : 'weapon_spear';
               // Keep the other combo item if present, remove all other melee
               next = next.filter(id => !meleeIds.includes(id) || id === otherComboId);
           }
           // If selecting Danish Axe
           if (eqId === 'mel_axe') {
               const meleeIds = faction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
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
               const meleeIds = faction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
               // Keep Base. Remove Axe (unless Huscarl logic allows, but rule says Lance+Base, not Lance+Axe), Improvised.
               // Assuming Lance cannot combine with Axe.
               next = next.filter(id => !meleeIds.includes(id) || id === 'mel_base');
           }
           // If selecting Base Weapon
           else if (eqId === 'mel_base') {
               const meleeIds = faction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
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
               const meleeIds = faction.availableEquipment.filter(e => e.type === 'melee').map(e => e.id);
               next = next.filter(id => !meleeIds.includes(id));
           }
           
           next.push(eqId);
        }

        // Axe vs Ranged logic (Applied after selection)
        if (next.includes('mel_axe')) {
           const activeRanged = next.find(id => {
              const item = faction.availableEquipment.find(e => e.id === id);
              return item?.type === 'ranged' && item.id !== 'ran_none';
           });
           if (activeRanged) {
              next = next.filter(id => id !== activeRanged);
              if (faction.availableEquipment.some(e => e.id === 'ran_none')) {
                 next.push('ran_none');
              }
           }
        }
      }
      else {
        const isMagyarNoble = faction.id === 'magyars' && (selectedUnitId === 'warlord' || selectedUnitId === 'huscarl');

        if (isMagyarNoble) {
           if (next.includes(eqId)) next = next.filter(id => id !== eqId);
           else next.push(eqId);
        } else {
           const othersOfType = faction.availableEquipment.filter(e => e.type === type).map(e => e.id);
           next = next.filter(id => !othersOfType.includes(id));
           next.push(eqId);
        }

        const isRanged = type === 'ranged';
        if (isRanged && eqId !== 'ran_none') {
          if (faction.id === 'rus') {
             const baseCount = next.filter(id => id === 'mel_base').length;
             if (baseCount > 1) {
                 const idx = next.lastIndexOf('mel_base');
                 if (idx > -1) next.splice(idx, 1);
             }
          }

          if (next.includes('mel_axe')) {
            next = next.filter(id => id !== 'mel_axe');
            const freeMelee = faction.availableEquipment.find(e => 
               e.type === 'melee' && e.costs[selectedUnitId as UnitRole] === 0
            );
            if (freeMelee) next.push(freeMelee.id);
            else if (faction.availableEquipment.some(e => e.id === 'mel_base')) next.push('mel_base');
          }
        }
      }
      return next;
    });
  };

  const toggleRusDualWield = (checked: boolean) => {
    setSelectedEquipment(prev => {
       if (checked) {
         let next = prev.filter(id => id !== 'prot_shield');
         
         // Remove ranged weapons (except ran_none)
         const rangedIds = faction.availableEquipment
             .filter(e => e.type === 'ranged' && e.id !== 'ran_none')
             .map(e => e.id);
         next = next.filter(id => !rangedIds.includes(id));
         
         if (faction.availableEquipment.some(e => e.id === 'ran_none')) {
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

  const calculateCurrentCost = () => {
    if (!selectedUnit) return 0;
    let cost = selectedUnit.baseCost;
    selectedEquipment.forEach(id => {
      const eq = faction.availableEquipment.find(e => e.id === id);
      if (eq) {
        const eqCost = eq.costs[selectedUnit.id as UnitRole];
        if (eqCost !== null) cost += eqCost;
      }
    });
    return cost;
  };

  const unitCost = calculateCurrentCost();
  const totalCost = unitCost * quantity;
  const remainingBudget = maxPoints - currentPoints;
  const canAfford = totalCost <= remainingBudget;

  const handleSave = () => {
    if (selectedUnitId) {
      onAddUnit(selectedUnitId, selectedEquipment, quantity);
      setIsOpen(false);
    }
  };

  const handleUnitToggle = (unitId: string) => {
    setSelectedUnitId(prev => prev === unitId ? "" : unitId);
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
                    const isSelected = selectedUnitId === unit.id;
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

                        {type === 'protection' || type === 'melee' || (type === 'ranged' && faction.id === 'magyars' && (selectedUnit.id === 'warlord' || selectedUnit.id === 'huscarl')) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {faction.availableEquipment
                                .filter(e => e.type === type)
                                .map((eq) => {
                                    const cost = eq.costs[selectedUnit.id as UnitRole];
                                    if (cost === null) return null;
                                    const isChecked = selectedEquipment.includes(eq.id);
                                    const equipName = tData('equipment', eq.id, eq.name);

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
                                            </Label>
                                        </div>
                                        <span className={`text-xs font-bold font-mono ${isChecked ? "text-[#cc6512]" : "text-stone-600"}`}>{cost > 0 ? `+${cost}` : '0'}</span>
                                        
                                        {faction.id === 'rus' && eq.id === 'mel_base' && isChecked && (
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
                            value={selectedEquipment.find(id => faction.availableEquipment.find(e => e.id === id)?.type === type) || ''}
                            onValueChange={(val) => handleEquipmentToggle(val, type)}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                            >
                            {faction.availableEquipment
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
                        {faction.availableEquipment
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
                        {faction.availableEquipment
                            .filter(e => e.type === 'talent')
                            .map((eq) => {
                            const cost = eq.costs[selectedUnit.id as UnitRole];
                            if (cost === null) return null;
                            
                            const isSelected = selectedEquipment.includes(eq.id);
                            const currentTalentCount = selectedEquipment.filter(id => faction.availableEquipment.find(e => e.id === id)?.type === 'talent').length;
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
                        disabled={!canAfford}
                        className={`
                            rounded-none px-8 font-bold tracking-wider shadow-lg transition-all
                            ${canAfford 
                                ? "bg-[#cc6512] hover:bg-[#b0560f] text-white hover:scale-105" 
                                : "bg-stone-800 text-stone-500 cursor-not-allowed"}
                        `}
                        >
                        {t('recruit')}
                        </Button>
                    </div>
                </div>
                {!canAfford && (
                    <p className="text-center text-xs text-red-500 font-bold uppercase tracking-widest animate-pulse">
                        {t('insufficientBudget')}
                    </p>
                )}
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}