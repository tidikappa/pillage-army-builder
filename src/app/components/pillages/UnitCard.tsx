import React from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Trash2, Shield, Sword, Crosshair, Zap, Plus, Minus, Sparkles, Pencil, Check, X, ChevronUp, ChevronDown } from "lucide-react";
import {
  ArmyUnit,
  Faction,
  Equipment,
  UnitRole,
  getEffectiveFaction,
  unitCarriesWarDogs,
  DOG_HANDLER_BONUS_PER_MODEL,
} from "../../data/gameData";
import { useTranslation } from "./TranslationContext";
import { UnitForm } from "./UnitForm";
import { getUnitDisplayName, getUnitDisplayIcon, ICON_REGISTRY } from "./unitNaming";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RotateCw } from "lucide-react";

interface UnitCardProps {
  unit: ArmyUnit;
  faction: Faction;
  onRemove: (instanceId: string) => void;
  onUpdateQuantity?: (instanceId: string, newQuantity: number) => void;
  onUpdateUnit?: (
    instanceId: string,
    unitTypeId: string,
    equipmentIds: string[],
    quantity: number,
    sourceFactionId?: string
  ) => void;
  onUpdateCustomName?: (instanceId: string, customName: string) => void;
  onUpdateCustomIcon?: (instanceId: string, customIconId: string | undefined) => void;
  onMoveUp?: (instanceId: string) => void;
  onMoveDown?: (instanceId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  dogHandlerActive?: boolean;
  /** Full army composition, threaded down so the edit modal can apply army-wide rules. */
  army?: ArmyUnit[];
}

import containerBg from "figma:asset/57207223c848fe507d04a74d9ec51cd6651e3027.png";

export function UnitCard({ unit, faction, onRemove, onUpdateQuantity, onUpdateUnit, onUpdateCustomName, onUpdateCustomIcon, onMoveUp, onMoveDown, canMoveUp = false, canMoveDown = false, dogHandlerActive = false, army }: UnitCardProps) {
  const { t, tData, language } = useTranslation();
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState<string>(unit.customName ?? "");
  const effectiveFaction = getEffectiveFaction(unit, faction);
  const isMercenary = Boolean(unit.sourceFactionId && unit.sourceFactionId !== faction.id);
  const unitType = effectiveFaction.units.find(u => u.id === unit.unitTypeId);

  if (!unitType) return null;

  const getEquipment = (ids: string[]) => {
    return ids.map(id => effectiveFaction.availableEquipment.find(e => e.id === id)).filter(Boolean) as Equipment[];
  };

  const equipment = getEquipment(unit.equipment);

  const singleUnitCost =
    unitType.baseCost +
    equipment.reduce((sum, e) => {
      const cost = e.costs[unitType.id as UnitRole];
      return sum + (cost || 0);
    }, 0) +
    (dogHandlerActive && unitCarriesWarDogs(unit) ? DOG_HANDLER_BONUS_PER_MODEL : 0);

  const quantity = unit.quantity || 1;
  const totalCost = singleUnitCost * quantity;

  const UnitIcon = getUnitDisplayIcon(unit, faction);

  const unitName = getUnitDisplayName(unit, faction, language, tData);
  const hasCustomName = Boolean(unit.customName && unit.customName.trim());

  const commitRename = () => {
    onUpdateCustomName?.(unit.instanceId, nameDraft.trim());
    setIsRenaming(false);
  };
  const cancelRename = () => {
    setNameDraft(unit.customName ?? "");
    setIsRenaming(false);
  };

  const renderEquipmentList = (type: string, icon: any) => {
    const items = equipment.filter(e => e.type === type);
    if (items.length === 0) return null;
    const Icon = icon;
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-stone-600 py-0.5">
        <Icon className="w-3.5 h-3.5 shrink-0 text-stone-500" />
        <span className="tracking-wide uppercase">
            {items.map(e => {
                const cost = e.costs[unitType.id as UnitRole];
                const eName = tData('equipment', e.id, e.name);
                const dogSuffix = e.id === 'spec_dogs' ? ` ×${dogHandlerActive ? 4 : 3}` : '';
                return `${eName}${dogSuffix}${cost ? ` (${cost} po)` : ''}`;
            }).join(", ")}
        </span>
      </div>
    );
  };

  return (
    <>
    <Card 
        className="group relative overflow-hidden border-0 bg-transparent rounded-none shadow-lg"
        style={{ backgroundImage: `url(${containerBg})`, backgroundSize: '100% 100%' }}
    >
      
      <CardContent className="p-8 pl-10">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-5">
          
          {/* Left: Reorder + Icon + Details */}
          <div className="flex gap-3 sm:gap-5 flex-1 items-start">
            {/* Reorder arrows */}
            {(onMoveUp || onMoveDown) && (
              <div className="flex flex-col items-center bg-black/20 rounded-none border border-white/10 shrink-0 mt-1">
                <button
                  type="button"
                  onClick={() => onMoveUp?.(unit.instanceId)}
                  disabled={!canMoveUp}
                  className="h-6 w-7 flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Monter d'une position"
                  title="Monter"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveDown?.(unit.instanceId)}
                  disabled={!canMoveDown}
                  className="h-6 w-7 flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border-t border-white/10"
                  aria-label="Descendre d'une position"
                  title="Descendre"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {/* Icon Box (clickable when onUpdateCustomIcon is provided) */}
            <div className="relative shrink-0">
              {onUpdateCustomIcon ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Changer l'icône"
                      title="Changer l'icône"
                      className={`h-14 w-14 rounded-none bg-black/40 border ${unit.customIconId ? "border-[#cc6512]/60" : "border-white/5"} flex items-center justify-center shadow-inner hover:bg-black/60 hover:border-[#cc6512]/60 transition-colors`}
                    >
                      <UnitIcon className="w-7 h-7 text-stone-200" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    className="w-64 p-3 rounded-none bg-[#1c1917]/95 border border-white/15 backdrop-blur-md text-stone-200 shadow-2xl"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">
                          Icône
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateCustomIcon(unit.instanceId, undefined)}
                          className="text-[10px] uppercase font-bold tracking-wider text-stone-400 hover:text-[#cc6512] inline-flex items-center gap-1"
                        >
                          <RotateCw className="w-3 h-3" /> Auto
                        </button>
                      </div>
                      <div className="grid grid-cols-6 gap-1">
                        {Object.entries(ICON_REGISTRY).map(([id, { component: Icon, label }]) => {
                          const isActive = unit.customIconId === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => onUpdateCustomIcon(unit.instanceId, id)}
                              title={label}
                              aria-label={label}
                              className={`h-9 w-9 flex items-center justify-center rounded-none border transition-colors ${
                                isActive
                                  ? "bg-[#cc6512]/20 border-[#cc6512] text-[#cc6512]"
                                  : "bg-black/40 border-white/10 text-stone-300 hover:border-[#cc6512]/40 hover:text-[#cc6512]"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="h-14 w-14 rounded-none bg-black/40 border border-white/5 flex items-center justify-center shadow-inner">
                  <UnitIcon className="w-7 h-7 text-stone-200" />
                </div>
              )}
            </div>

            <div className="space-y-3 w-full">
              <div className="flex items-baseline justify-between w-full gap-2">
                  {isRenaming ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                        placeholder={unitName}
                        className="flex-1 bg-black/50 border border-white/20 px-2 py-1 text-white font-serif rounded-none focus:outline-none focus:border-[#cc6512]"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" onClick={commitRename} aria-label="Valider">
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-stone-400" onClick={cancelRename} aria-label="Annuler">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <h3 className="font-bold text-lg font-serif tracking-wide text-white flex items-center gap-2 flex-wrap min-w-0">
                      <span className="truncate">{unitName}</span>
                      {isMercenary && (
                        <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold font-sans">
                          Merc · {tData("factions", effectiveFaction.id, effectiveFaction.name)}
                        </span>
                      )}
                      {hasCustomName && (
                        <span className="text-[10px] uppercase tracking-widest text-stone-500 font-sans font-medium">
                          ({tData("roles", unitType.id, unitType.name)})
                        </span>
                      )}
                      {quantity > 1 && (
                        <span className="text-xs text-[#cc6512] font-sans font-bold bg-[#cc6512]/10 px-1.5 py-0.5 rounded-none border border-[#cc6512]/20">
                          x{quantity}
                        </span>
                      )}
                      {onUpdateCustomName && (
                        <button
                          type="button"
                          onClick={() => { setNameDraft(unit.customName ?? ""); setIsRenaming(true); }}
                          className="text-stone-500 hover:text-[#cc6512] transition-colors p-0.5"
                          aria-label="Renommer l'unité"
                          title="Renommer l'unité"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </h3>
                  )}
                  {/* Mobile Price Badge */}
                  <Badge variant="outline" className="sm:hidden text-sm font-bold px-2 py-0.5 border-[#cc6512]/20 text-[#cc6512] bg-[#cc6512]/5 shrink-0">
                      {totalCost} PO
                  </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 border-l border-white/5 pl-3">
                {renderEquipmentList('protection', Shield)}
                {renderEquipmentList('melee', Sword)}
                {renderEquipmentList('ranged', Crosshair)}
                {renderEquipmentList('special', Zap)}
                {renderEquipmentList('talent', Sparkles)}
              </div>
            </div>
          </div>
          
          {/* Right: Controls & Price */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 w-full sm:w-auto justify-between sm:justify-start border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0 mt-2 sm:mt-0">
            <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">{t('totalCost')}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold font-['UnifrakturCook'] text-[#cc6512]">
                    {totalCost} PO
                  </span>
                  {quantity > 1 && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                      ({singleUnitCost}/u)
                    </span>
                  )}
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Quantity Controls */}
                <div className="flex items-center bg-black/20 rounded-none border border-white/10 p-1">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-none text-stone-400 hover:text-white hover:bg-white/5 transition-all"
                    disabled={quantity <= 1}
                    onClick={() => onUpdateQuantity?.(unit.instanceId, quantity - 1)}
                >
                    <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-bold text-stone-200 font-mono">{quantity}</span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-none text-stone-400 hover:text-white hover:bg-white/5 transition-all"
                    onClick={() => onUpdateQuantity?.(unit.instanceId, quantity + 1)}
                >
                    <Plus className="w-3 h-3" />
                </Button>
                </div>

                <Button
                variant="ghost"
                size="icon"
                className="text-stone-500 hover:text-red-400 hover:bg-red-950/20 transition-colors rounded-none h-9 w-9"
                onClick={() => onRemove(unit.instanceId)}
                aria-label={t('remove')}
                >
                <Trash2 className="w-4 h-4" />
                </Button>

                <Button
                variant="ghost"
                size="icon"
                className="text-stone-500 hover:text-blue-400 hover:bg-blue-950/20 transition-colors rounded-none h-9 w-9"
                onClick={() => setIsEditOpen(true)}
                aria-label={t('edit')}
                >
                <Pencil className="w-4 h-4" />
                </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Edit Modal */}
    {onUpdateUnit && (
      <UnitForm
        faction={faction}
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        onAddUnit={(unitTypeId, equipmentIds, qty, sourceFactionId) => {
          onUpdateUnit(unit.instanceId, unitTypeId, equipmentIds, qty, sourceFactionId);
          setIsEditOpen(false);
        }}
        editMode={true}
        unitToEdit={{
          instanceId: unit.instanceId,
          unitTypeId: unit.unitTypeId,
          equipment: unit.equipment,
          quantity: unit.quantity,
          sourceFactionId: unit.sourceFactionId,
        }}
        currentPoints={0}
        maxPoints={999999}
        army={army}
      />
    )}
    </>
  );
}