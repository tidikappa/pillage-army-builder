import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  factions,
  ArmyUnit,
  Faction,
  UnitRole,
  getEffectiveFaction,
  Supplement,
  SUPPLEMENT_LABELS,
  armyHasDogHandlerTalent,
  unitCarriesWarDogs,
  DOG_HANDLER_BONUS_PER_MODEL,
  isCommandUnit,
} from "../../data/gameData";
import { getUnitDisplayIcon, getUnitDisplayName } from "./unitNaming";
import { validateArmy } from "./validation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle, Download, RotateCcw, ShieldAlert, Wallet, Trophy, Flame, Save, Globe, Plus, Minus, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { UnitForm } from "./UnitForm";
import { UnitCard } from "./UnitCard";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import containerBg from "figma:asset/57207223c848fe507d04a74d9ec51cd6651e3027.png";
import spearSeparator from "figma:asset/5ab2f6353c027b93b9e17736b753efe042f656c5.png";
import redBanner from "figma:asset/c1da3000e94ae65acf7da1287e23d10eff8fbf64.png";
import blueBanner from "figma:asset/0bcbf8c8072cd6467fa46891d6970a2c22c684e8.png";
import bannerTop from "figma:asset/banner_top.png";
import bannerBottom from "figma:asset/banner_bottom.png";
import { useTranslation } from "./TranslationContext";
import { useAuth } from "../../lib/AuthContext";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

interface LoadArmyState {
  loadArmy?: {
    id?: string;
    armyName: string;
    factionId: string;
    budget: number;
    units: ArmyUnit[];
    fogEnabled?: boolean;
    fogPercent?: number;
  };
}

// Local-storage draft : the builder auto-saves the in-progress army so the
// user doesn't lose work on refresh / accidental close. Cleared on successful
// Supabase save and on "Dissoudre".
const DRAFT_KEY = "pillage_draft_v1";

interface DraftPayload {
  armyName: string;
  selectedFactionId: string;
  budget: number;
  army: ArmyUnit[];
  fogEnabled?: boolean;
  fogPercent?: number;
}

const FOG_PERCENT_PRESETS = [10, 15, 20, 25];
const DEFAULT_FOG_PERCENT = 20;

function readDraft(): DraftPayload | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    const isEmpty =
      !parsed.selectedFactionId && (!parsed.army || parsed.army.length === 0) && !parsed.armyName;
    if (isEmpty) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // localStorage may be unavailable (private mode), silently ignore.
  }
}

export function ArmyBuilder() {
  const { t, tData, language } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const loadState = (location.state as LoadArmyState | null)?.loadArmy;

  const [selectedFactionId, setSelectedFactionId] = React.useState<string>(loadState?.factionId ?? "");
  const [budget, setBudget] = React.useState<number>(loadState?.budget ?? 500);
  const [armyName, setArmyName] = React.useState<string>(loadState?.armyName ?? "");
  const [army, setArmy] = React.useState<ArmyUnit[]>(loadState?.units ?? []);
  const [editingId, setEditingId] = React.useState<string | undefined>(loadState?.id);
  const [saving, setSaving] = React.useState(false);

  // "Fog of war" variant.
  const [fogEnabled, setFogEnabled] = React.useState<boolean>(loadState?.fogEnabled ?? false);
  const [fogPercent, setFogPercent] = React.useState<number>(loadState?.fogPercent ?? DEFAULT_FOG_PERCENT);

  // Pending draft banner: set if a localStorage draft exists at mount and the
  // user didn't explicitly load a list via navigation state.
  const [draftToRestore, setDraftToRestore] = React.useState<DraftPayload | null>(() => {
    if (loadState) return null;
    return readDraft();
  });

  React.useEffect(() => {
    if (loadState) {
      // Loading from "Mes listes" / fork overrides any draft and clears it.
      clearDraft();
      setDraftToRestore(null);
      navigate(location.pathname, { replace: true, state: null });
      toast.info(`Liste "${loadState.armyName || "sans nom"}" chargée`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save to localStorage. Skipped while a draft restoration is
  // pending so the user's choice on the banner isn't overwritten by an empty
  // draft.
  React.useEffect(() => {
    if (draftToRestore) return;
    const handle = setTimeout(() => {
      const isEmpty = !selectedFactionId && army.length === 0 && !armyName;
      if (isEmpty) {
        clearDraft();
        return;
      }
      try {
        const payload: DraftPayload = { armyName, selectedFactionId, budget, army, fogEnabled, fogPercent };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch {
        // Quota exceeded or private mode, ignore silently.
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [armyName, selectedFactionId, budget, army, fogEnabled, fogPercent, draftToRestore]);

  const restoreDraft = () => {
    if (!draftToRestore) return;
    setArmyName(draftToRestore.armyName);
    setSelectedFactionId(draftToRestore.selectedFactionId);
    setBudget(draftToRestore.budget);
    setArmy(draftToRestore.army);
    setFogEnabled(draftToRestore.fogEnabled ?? false);
    setFogPercent(draftToRestore.fogPercent ?? DEFAULT_FOG_PERCENT);
    setDraftToRestore(null);
    toast.success(t("draftRestored"));
  };

  const discardDraft = () => {
    clearDraft();
    setDraftToRestore(null);
    toast.info(t("draftDiscarded"));
  };

  const selectedFaction = factions.find(f => f.id === selectedFactionId);

  const hasDogHandler = armyHasDogHandlerTalent(army);

  // Cost of a single model. `dogHandler` is passed explicitly so the revealed
  // (fog) list can recompute costs against the visible-only army.
  const computeUnitCostWith = (unit: ArmyUnit, dogHandler: boolean): number => {
    if (!selectedFaction) return 0;
    const effective = getEffectiveFaction(unit, selectedFaction);
    const unitType = effective.units.find((u) => u.id === unit.unitTypeId);
    if (!unitType) return 0;
    let cost = unitType.baseCost;
    unit.equipment.forEach((eqId) => {
      const eq = effective.availableEquipment.find((e) => e.id === eqId);
      if (eq) {
        const eqCost = eq.costs[unit.unitTypeId as UnitRole];
        if (eqCost !== null && eqCost !== undefined) cost += eqCost as number;
      }
    });
    // "Éducateur canin" talent : +10 po per model carrying War Dogs.
    if (dogHandler && unitCarriesWarDogs(unit)) {
      cost += DOG_HANDLER_BONUS_PER_MODEL;
    }
    return cost;
  };

  const computeUnitCost = (unit: ArmyUnit): number => computeUnitCostWith(unit, hasDogHandler);

  const calculateTotalPoints = () => {
    if (!selectedFaction) return 0;
    return army.reduce((total, unit) => total + computeUnitCost(unit) * (unit.quantity || 1), 0);
  };

  const calculateMercenaryPoints = () => {
    if (!selectedFaction) return 0;
    return army.reduce((total, unit) => {
      if (!unit.sourceFactionId || unit.sourceFactionId === selectedFaction.id) return total;
      return total + computeUnitCost(unit) * (unit.quantity || 1);
    }, 0);
  };

  const getValidationErrors = () => {
    if (!selectedFaction) return [];
    return validateArmy(army, selectedFaction, t);
  };

  const currentPoints = calculateTotalPoints();
  const remainingPoints = budget - currentPoints;
  const isOverBudget = remainingPoints < 0;

  const totalArmyModels = army.reduce((sum, u) => sum + (u.quantity || 1), 0);
  const moralThreshold = Math.ceil(totalArmyModels / 2);

  const validationErrors = getValidationErrors();

  // --- Fog of war ---------------------------------------------------------
  // A unit is effectively hidden only if flagged AND not a command model
  // (command models must always stay visible to the opponent).
  const isUnitHidden = (u: ArmyUnit): boolean => Boolean(u.hidden) && !isCommandUnit(u);

  // Talent equipment ids hidden on an otherwise-visible unit.
  const hiddenTalentsOf = (u: ArmyUnit): string[] => {
    if (!selectedFaction || isUnitHidden(u)) return [];
    const eff = getEffectiveFaction(u, selectedFaction);
    return (u.hiddenEquipment ?? []).filter((eqId) =>
      eff.availableEquipment.find((e) => e.id === eqId)?.type === "talent"
    );
  };

  // The list stripped of everything hidden : hidden units removed, hidden
  // talents removed from the units that stay. Used for the revealed PDF.
  const visibleArmy = React.useMemo(() => {
    if (!fogEnabled) return army;
    return army
      .filter((u) => !isUnitHidden(u))
      .map((u) => {
        const hidden = hiddenTalentsOf(u);
        return hidden.length
          ? { ...u, equipment: u.equipment.filter((id) => !hidden.includes(id)) }
          : u;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [army, fogEnabled, selectedFaction]);

  const hiddenPoints = React.useMemo(() => {
    if (!fogEnabled || !selectedFaction) return 0;
    return army.reduce((sum, u) => {
      const qty = u.quantity || 1;
      if (isUnitHidden(u)) return sum + computeUnitCost(u) * qty;
      const eff = getEffectiveFaction(u, selectedFaction);
      const talentCost = hiddenTalentsOf(u).reduce((s, eqId) => {
        const eq = eff.availableEquipment.find((e) => e.id === eqId);
        const c = eq?.costs[u.unitTypeId as UnitRole];
        return s + (typeof c === "number" ? c : 0);
      }, 0);
      return sum + talentCost * qty;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [army, fogEnabled, selectedFaction, hasDogHandler]);

  // Strict cap : hidden po must stay ≤ floor(budget × fog%). "Even if it
  // doesn't round cleanly" → you can't exceed the exact fractional value.
  const fogCap = Math.floor((budget * fogPercent) / 100);
  const hasHidden = fogEnabled && hiddenPoints > 0;

  const fogViolations: string[] = [];
  if (fogEnabled && hiddenPoints > fogCap) {
    fogViolations.push(
      t("err_fogCapExceeded")
        .replace("$1", String(hiddenPoints))
        .replace("$2", String(fogCap))
        .replace("$3", String(fogPercent))
    );
  }

  const allViolations = [...validationErrors, ...fogViolations];

  // Talents currently present in the army, deduped by talent id with the
  // list of units carrying each one. Used by the "Talents" tab in the
  // faction-bonus reminder block.
  const activeTalents = React.useMemo(() => {
    if (!selectedFaction) return [] as { id: string; name: string; desc: string; carriers: string[] }[];
    const seen = new Map<string, { id: string; name: string; desc: string; carriers: string[] }>();
    army.forEach((unit) => {
      const eff = getEffectiveFaction(unit, selectedFaction);
      unit.equipment.forEach((eqId) => {
        const eq = eff.availableEquipment.find((e) => e.id === eqId);
        if (eq?.type !== "talent") return;
        const name = tData("equipment", eq.id, eq.name);
        const desc = tData("equipment", `${eq.id}_desc`, eq.description || "");
        const carrier = getUnitDisplayName(unit, eff, language, tData);
        const existing = seen.get(eq.id);
        if (existing) {
          if (!existing.carriers.includes(carrier)) existing.carriers.push(carrier);
        } else {
          seen.set(eq.id, { id: eq.id, name, desc, carriers: [carrier] });
        }
      });
    });
    return [...seen.values()];
  }, [army, selectedFaction, language, tData]);

  // Which tab is shown in the faction-bonus reminder block.
  const [bonusTab, setBonusTab] = React.useState<"faction" | "talents">("faction");
  // Accordion : which reminder items are expanded to show their full text.
  const [expandedBonus, setExpandedBonus] = React.useState<Set<string>>(new Set());
  const toggleBonusItem = (key: string) => {
    setExpandedBonus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddUnit = (unitTypeId: string, equipmentIds: string[], quantity: number, sourceFactionId?: string, foederatiAllyId?: string) => {
    const newTalents = equipmentIds.filter(id => 
      selectedFaction?.availableEquipment.find(e => e.id === id)?.type === 'talent'
    );

    if (newTalents.length > 0) {
      if (quantity > 1) {
          toast.error(t('err_recruitUniqueTalent'));
          return;
      }

      const existingTalents = new Set<string>();
      army.forEach(u => {
        u.equipment.forEach(eqId => {
          const eq = selectedFaction?.availableEquipment.find(e => e.id === eqId);
          if (eq?.type === 'talent') existingTalents.add(eqId);
        });
      });

      const duplicates = newTalents.filter(t => existingTalents.has(t));
      if (duplicates.length > 0) {
        const names = duplicates.map(id => selectedFaction?.availableEquipment.find(e => e.id === id)?.name).join(", ");
        toast.error(t('err_talentTaken').replace('$1', names));
        return;
      }
    }

    const newUnit: ArmyUnit = {
      instanceId: Math.random().toString(36).substring(7),
      unitTypeId: unitTypeId as UnitRole,
      equipment: equipmentIds,
      quantity: quantity,
      sourceFactionId: sourceFactionId && sourceFactionId !== selectedFactionId ? sourceFactionId : undefined,
      foederatiAllyId: foederatiAllyId || undefined,
    };
    setArmy([...army, newUnit]);
    toast.success(quantity > 1 ? t("unitsAdded") : t("unitAdded"));
  };

  const handleRemoveUnit = (instanceId: string) => {
    setArmy(army.filter(u => u.instanceId !== instanceId));
    setSelectedInstanceIds(prev => {
      const next = new Set(prev);
      next.delete(instanceId);
      return next;
    });
    toast.info(t("unitRemoved"));
  };

  const [selectedInstanceIds, setSelectedInstanceIds] = React.useState<Set<string>>(new Set());

  const toggleUnitSelection = (instanceId: string) => {
    setSelectedInstanceIds(prev => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  };

  const clearSelection = () => setSelectedInstanceIds(new Set());

  const handleBatchDelete = () => {
    const count = selectedInstanceIds.size;
    if (count === 0) return;
    if (!confirm(t("batchDeleteConfirm").replace("$1", count.toString()))) return;
    setArmy(army.filter(u => !selectedInstanceIds.has(u.instanceId)));
    clearSelection();
    toast.success(t("batchDeleteSuccess").replace("$1", count.toString()));
  };

  const handleUpdateQuantity = (instanceId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const unit = army.find(u => u.instanceId === instanceId);
    if (unit && newQuantity > unit.quantity) {
       const hasTalent = unit.equipment.some(id => 
          selectedFaction?.availableEquipment.find(e => e.id === id)?.type === 'talent'
       );
       if (hasTalent) {
          toast.error(t('err_duplicateUnique'));
          return;
       }
    }
    setArmy(army.map(u => u.instanceId === instanceId ? { ...u, quantity: newQuantity } : u));
  };

  const handleUpdateUnit = (instanceId: string, unitTypeId: string, equipmentIds: string[], quantity: number, sourceFactionId?: string, foederatiAllyId?: string) => {
    const unitToUpdate = army.find(u => u.instanceId === instanceId);
    if (!unitToUpdate) return;

    // Check for unique talents
    const newTalents = equipmentIds.filter(id => 
      selectedFaction?.availableEquipment.find(e => e.id === id)?.type === 'talent'
    );

    if (newTalents.length > 0) {
      if (quantity > 1) {
          toast.error(t('err_recruitUniqueTalent'));
          return;
      }

      const existingTalents = new Set<string>();
      army.forEach(u => {
        // Skip the unit we're updating
        if (u.instanceId === instanceId) return;
        
        u.equipment.forEach(eqId => {
          const eq = selectedFaction?.availableEquipment.find(e => e.id === eqId);
          if (eq?.type === 'talent') existingTalents.add(eqId);
        });
      });

      const duplicates = newTalents.filter(t => existingTalents.has(t));
      if (duplicates.length > 0) {
        const names = duplicates.map(id => selectedFaction?.availableEquipment.find(e => e.id === id)?.name).join(", ");
        toast.error(t('err_talentTaken').replace('$1', names));
        return;
      }
    }

    const willBeCommand =
      unitTypeId === "warlord" ||
      equipmentIds.includes("spec_banner") ||
      equipmentIds.includes("spec_horn");

    setArmy(army.map(u => u.instanceId === instanceId ? {
      ...u,
      unitTypeId: unitTypeId as UnitRole,
      equipment: equipmentIds,
      quantity: quantity,
      sourceFactionId: sourceFactionId && sourceFactionId !== selectedFactionId ? sourceFactionId : undefined,
      foederatiAllyId: foederatiAllyId || undefined,
      // Fog : a command model can never stay hidden; drop hidden-talent ids
      // that no longer belong to the unit after the edit.
      hidden: willBeCommand ? false : u.hidden,
      hiddenEquipment: (u.hiddenEquipment ?? []).filter((id) => equipmentIds.includes(id)),
    } : u));
    toast.success(t("unitUpdated"));
  };

  const handleUpdateCustomName = (instanceId: string, customName: string) => {
    setArmy(army.map(u => u.instanceId === instanceId ? { ...u, customName: customName || undefined } : u));
  };

  const handleUpdateCustomIcon = (instanceId: string, customIconId: string | undefined) => {
    setArmy(army.map(u => u.instanceId === instanceId ? { ...u, customIconId } : u));
  };

  const handleToggleHidden = (instanceId: string) => {
    setArmy(army.map(u =>
      u.instanceId === instanceId
        ? (isCommandUnit(u) ? u : { ...u, hidden: !u.hidden })
        : u
    ));
  };

  const handleToggleHiddenEquipment = (instanceId: string, equipmentId: string) => {
    setArmy(army.map(u => {
      if (u.instanceId !== instanceId) return u;
      const cur = u.hiddenEquipment ?? [];
      const next = cur.includes(equipmentId)
        ? cur.filter(x => x !== equipmentId)
        : [...cur, equipmentId];
      return { ...u, hiddenEquipment: next.length ? next : undefined };
    }));
  };

  const handleMoveUnit = (instanceId: string, direction: -1 | 1) => {
    const idx = army.findIndex(u => u.instanceId === instanceId);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= army.length) return;
    const next = [...army];
    [next[idx], next[target]] = [next[target], next[idx]];
    setArmy(next);
  };

  const handleReset = () => {
    if (confirm(t("confirmReset"))) {
      setArmy([]);
      setEditingId(undefined);
      clearDraft();
      toast.success(t("armyReset"));
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!user) {
      navigate("/login", { state: { from: "/" } });
      return;
    }
    if (!isSupabaseConfigured) {
      toast.error("Supabase n'est pas configuré (voir SUPABASE_SETUP.md)");
      return;
    }
    if (!selectedFaction) {
      toast.error("Sélectionne une faction avant de sauvegarder");
      return;
    }
    if (army.length === 0) {
      toast.error("Ton armée est vide");
      return;
    }
    setSaving(true);
    const authorName =
      (user.user_metadata as { author_name?: string } | undefined)?.author_name ?? user.email ?? "Anonyme";
    const payload = {
      user_id: user.id,
      author_name: authorName,
      army_name: armyName || "Sans nom",
      faction_id: selectedFactionId,
      budget,
      units: army,
      is_public: publish,
      fog_enabled: fogEnabled,
      fog_percent: fogPercent,
    };

    if (editingId) {
      const { error } = await supabase.from("armies").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      clearDraft();
      toast.success(publish ? "Liste publiée" : "Liste mise à jour");
    } else {
      const { data, error } = await supabase.from("armies").insert(payload).select("id").single();
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data) setEditingId(data.id as string);
      clearDraft();
      toast.success(publish ? "Liste publiée dans la galerie" : "Liste sauvegardée");
    }
  };

  const handleFactionChange = (val: string) => {
    if (army.length > 0) {
      if (confirm(t("confirmFactionChange"))) {
        setArmy([]);
        setSelectedFactionId(val);
      }
    } else {
      setSelectedFactionId(val);
    }
  };

  const svgToPng = (svgString: string, size = 96): Promise<string | null> =>
    new Promise((resolve) => {
      try {
        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            return resolve(null);
          }
          ctx.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch {
        resolve(null);
      }
    });

  const renderUnitIcon = async (unit: ArmyUnit): Promise<string | null> => {
    const effective = getEffectiveFaction(unit, selectedFaction!);
    const Icon = getUnitDisplayIcon(unit, effective);
    const element = React.createElement(Icon, {
      width: 48,
      height: 48,
      stroke: "#cc6512",
      strokeWidth: 2,
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    });
    let svgString = renderToStaticMarkup(element);
    if (!svgString.includes("xmlns=")) {
      svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    // Replace currentColor (used by Lucide + custom icons) with the orange tint
    svgString = svgString.replace(/currentColor/g, "#cc6512");
    return svgToPng(svgString, 96);
  };

  const handleExportPDF = async () => {
    if (!selectedFaction) return;
    const doc = new jsPDF();

    // Pre-render an icon PNG for every unit, keyed by instance id so both the
    // complete and the revealed tables reuse the same images.
    const iconEntries = await Promise.all(
      army.map(async (u) => [u.instanceId, await renderUnitIcon(u)] as const)
    );
    const iconByInstance = new Map<string, string | null>(iconEntries);

    // Talents present in a given list, deduped by id with their carriers.
    const collectTalents = (list: ArmyUnit[]) => {
      const seen = new Map<string, { name: string; desc: string; carriers: string[] }>();
      list.forEach((unit) => {
        const eff = getEffectiveFaction(unit, selectedFaction);
        unit.equipment.forEach((eqId) => {
          const eq = eff.availableEquipment.find((e) => e.id === eqId);
          if (eq?.type !== "talent") return;
          const name = tData("equipment", eq.id, eq.name);
          const desc = tData("equipment", `${eq.id}_desc`, eq.description || "");
          const carrier = getUnitDisplayName(unit, eff, language, tData);
          const existing = seen.get(eq.id);
          if (existing) {
            if (!existing.carriers.includes(carrier)) existing.carriers.push(carrier);
          } else {
            seen.set(eq.id, { name, desc, carriers: [carrier] });
          }
        });
      });
      return [...seen.values()];
    };

    const buildTableData = (list: ArmyUnit[], dogHandler: boolean, markHidden: boolean) =>
      list.map((unit) => {
        const effective = getEffectiveFaction(unit, selectedFaction);
        const unitType = effective.units.find((u) => u.id === unit.unitTypeId);
        if (!unitType) return ["", "", "", ""];
        const hiddenTalents = markHidden ? hiddenTalentsOf(unit) : [];
        const equipment = unit.equipment
          .map((id) => effective.availableEquipment.find((e) => e.id === id))
          .filter(Boolean);
        const formatEquip = (e: any) => {
          const cost = e.costs[unit.unitTypeId as UnitRole];
          const equipName = tData("equipment", e.id, e.name);
          const tag = hiddenTalents.includes(e.id) ? ` [${t("fogHiddenMarker")}]` : "";
          return `${equipName}${cost ? ` (${cost} po)` : ""}${tag}`;
        };

        const getCategoryString = (type: string) =>
          equipment.filter((e) => e?.type === type).map(formatEquip).join(", ");

        const protection = getCategoryString("protection");
        const melee = getCategoryString("melee");
        const ranged = getCategoryString("ranged");
        const special = getCategoryString("special");
        const talent = getCategoryString("talent");

        const descriptionParts: string[] = [];
        if (protection) descriptionParts.push(`${t("protectionLabel")}: ${protection}`);
        if (melee) descriptionParts.push(`${t("meleeLabel")}: ${melee}`);
        if (ranged) descriptionParts.push(`${t("rangedLabel")}: ${ranged}`);
        if (special) descriptionParts.push(`${t("pdfSpecialLabel")}: ${special}`);
        if (talent) descriptionParts.push(`${t("pdfTalentsLabel")}: ${talent}`);

        let singleCost = unitType.baseCost;
        equipment.forEach((e) => {
          if (e) singleCost += (e.costs[unit.unitTypeId as UnitRole] || 0) as number;
        });
        if (dogHandler && unitCarriesWarDogs(unit)) singleCost += DOG_HANDLER_BONUS_PER_MODEL;
        const qty = unit.quantity || 1;

        const displayName = getUnitDisplayName(unit, effective, language, tData);
        const isMerc = Boolean(unit.sourceFactionId && unit.sourceFactionId !== selectedFaction.id);
        const mercSuffix = isMerc ? ` [${tData("factions", effective.id, effective.name)}]` : "";
        const hiddenSuffix = markHidden && isUnitHidden(unit) ? ` — ${t("pdfFogHiddenTag")}` : "";

        const costCell = qty > 1
          ? `${singleCost * qty} po\n(${singleCost} po/u)`
          : `${singleCost} po`;

        return ["", `${displayName} (x${qty})${mercSuffix}${hiddenSuffix}`, descriptionParts.join("\n"), costCell];
      });

    // Renders one full list section (title, summary, violations, unit table,
    // faction bonuses + talents). Returns nothing; the caller adds pages.
    const renderListSection = (opts: {
      title: string;
      subtitle?: string;
      list: ArmyUnit[];
      points: number;
      models: number;
      violations: string[];
      markHidden: boolean;
      dogHandler: boolean;
      talents: { name: string; desc: string; carriers: string[] }[];
      boldRows?: boolean[];
    }) => {
      let currentY = 20;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(opts.title, 14, currentY);
      doc.setFont("helvetica", "normal");

      if (opts.subtitle) {
        currentY += 7;
        doc.setFontSize(11);
        doc.setTextColor(120, 120, 120);
        doc.text(opts.subtitle, 14, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 9;
      } else {
        currentY += 10;
      }

      doc.setFontSize(12);
      const factionName = tData("factions", selectedFaction.id, selectedFaction.name);
      doc.text(`Faction: ${factionName}`, 14, currentY);

      currentY += 6;
      doc.text(`${t("spent")}: ${opts.points} / ${budget} po`, 14, currentY);
      if (opts.points > budget) {
        doc.setTextColor(200, 0, 0);
        doc.text(language === "fr" ? "ATTENTION : Budget dépassé" : "WARNING: Over budget", 100, currentY);
        doc.setTextColor(0, 0, 0);
      }

      currentY += 6;
      doc.text(
        `${t("totalModelsLabel")}: ${opts.models}   ·   ${t("pdfMoralSummary")}: ${Math.ceil(opts.models / 2)}`,
        14,
        currentY
      );

      currentY += 10;

      if (opts.violations.length > 0) {
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(t("restrictionsViolated") + ":", 14, currentY);
        currentY += 6;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        opts.violations.forEach((err) => {
          const splitText = doc.splitTextToSize(`- ${err}`, 180);
          doc.text(splitText, 14, currentY);
          currentY += splitText.length * 5;
        });
        doc.setTextColor(0, 0, 0);
        currentY += 5;
      }

      const iconUrls = opts.list.map((u) => iconByInstance.get(u.instanceId) ?? null);

      autoTable(doc, {
        startY: currentY,
        head: [["", t("pdfUnit"), t("pdfEquipment"), t("pdfCost")]],
        body: buildTableData(opts.list, opts.dogHandler, opts.markHidden),
        theme: "striped",
        headStyles: { fillColor: [180, 83, 9] },
        columnStyles: {
          0: { cellWidth: 14, halign: "center" },
          1: { cellWidth: 50 },
          3: { cellWidth: 22, halign: "right" },
        },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          if (opts.boldRows?.[data.row.index]) data.cell.styles.fontStyle = "bold";
        },
        didDrawCell: (data) => {
          if (data.section !== "body") return;
          if (data.column.index !== 0) return;
          const dataUrl = iconUrls[data.row.index];
          if (!dataUrl) return;
          const padding = 1.5;
          const size = Math.max(0, Math.min(data.cell.height - padding * 2, 10));
          const x = data.cell.x + (data.cell.width - size) / 2;
          const y = data.cell.y + (data.cell.height - size) / 2;
          try {
            doc.addImage(dataUrl, "PNG", x, y, size, size);
          } catch {
            /* swallow — icon is decorative */
          }
        },
      });

      let ruleY = ((doc as any).lastAutoTable.finalY || currentY) + 15;

      if (selectedFaction.specialRules.length > 0) {
        if (ruleY > 270) {
          doc.addPage();
          ruleY = 20;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(t("factionBonus") + ":", 14, ruleY);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        ruleY += 6;
        selectedFaction.specialRules.forEach((rule) => {
          const translatedRule = tData("factionRules", rule, rule);
          const splitText = doc.splitTextToSize(`- ${translatedRule}`, 180);
          if (ruleY + splitText.length * 5 > 280) {
            doc.addPage();
            ruleY = 20;
          }
          doc.text(splitText, 14, ruleY);
          ruleY += splitText.length * 5;
        });
      }

      if (opts.talents.length > 0) {
        ruleY += 8;
        if (ruleY > 265) {
          doc.addPage();
          ruleY = 20;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(t("talentsReminderTab") + ":", 14, ruleY);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        ruleY += 6;
        opts.talents.forEach((talent) => {
          const carriers = talent.carriers.length ? ` (${talent.carriers.join(", ")})` : "";
          const line = talent.desc
            ? `- ${talent.name}${carriers} : ${talent.desc}`
            : `- ${talent.name}${carriers}`;
          const splitText = doc.splitTextToSize(line, 180);
          if (ruleY + splitText.length * 5 > 280) {
            doc.addPage();
            ruleY = 20;
          }
          doc.text(splitText, 14, ruleY);
          ruleY += splitText.length * 5;
        });
      }
    };

    const baseTitle = armyName || "Liste d'armée - Pillage";

    // Complete list (reference). When fog is active, hidden units are grouped
    // at the end and rendered in bold so they stand out.
    const completeList = hasHidden
      ? [...army.filter((u) => !isUnitHidden(u)), ...army.filter((u) => isUnitHidden(u))]
      : army;

    renderListSection({
      title: baseTitle,
      subtitle: hasHidden ? t("pdfFogComplete") : undefined,
      list: completeList,
      points: currentPoints,
      models: totalArmyModels,
      violations: allViolations,
      markHidden: hasHidden,
      dogHandler: hasDogHandler,
      talents: collectTalents(army),
      boldRows: hasHidden ? completeList.map((u) => isUnitHidden(u)) : undefined,
    });

    // Revealed list (opponent copy) : only produced when something is hidden.
    if (hasHidden) {
      doc.addPage();
      const revealedDog = armyHasDogHandlerTalent(visibleArmy);
      const revealedPoints = visibleArmy.reduce(
        (s, u) => s + computeUnitCostWith(u, revealedDog) * (u.quantity || 1),
        0
      );
      const revealedModels = visibleArmy.reduce((s, u) => s + (u.quantity || 1), 0);
      renderListSection({
        title: baseTitle,
        subtitle: t("pdfFogRevealed"),
        list: visibleArmy,
        points: revealedPoints,
        models: revealedModels,
        violations: [],
        markHidden: false,
        dogHandler: revealedDog,
        talents: collectTalents(visibleArmy),
      });
    }

    const slug = (s: string) =>
      s.trim().toLowerCase()
        .normalize("NFD").replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "armee";
    const factionSlug = slug(tData("factions", selectedFaction.id, selectedFaction.name));
    const nameSlug = slug(armyName || "armee");
    doc.save(`${nameSlug}_${factionSlug}_${currentPoints}po.pdf`);
    toast.success(t("pdfDownloaded"));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-32">

      {/* Auto-save : pending draft restoration */}
      {draftToRestore && (
        <div className="bg-[#0F5F5E] border-2 border-white/20 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          <div className="flex-1 text-white text-sm leading-relaxed">
            <div className="font-bold uppercase tracking-widest text-xs mb-1">
              {t("draftBannerTitle")}
            </div>
            <div className="opacity-90">
              {t("draftBannerBody")
                .replace("$1", draftToRestore.armyName || t("draftBannerNoName"))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={restoreDraft}
              className="bg-white text-[#0F5F5E] hover:bg-stone-200 rounded-none px-4 font-bold uppercase tracking-widest text-xs"
            >
              {t("draftBannerRestore")}
            </Button>
            <Button
              onClick={discardDraft}
              variant="ghost"
              className="text-white hover:bg-white/10 rounded-none px-4 font-bold uppercase tracking-widest text-xs"
            >
              {t("draftBannerDiscard")}
            </Button>
          </div>
        </div>
      )}

      {/* Intro (the logo + WIP badge live in the global header) */}
      <div className="flex flex-col items-center justify-center py-2 text-center space-y-2">
          <h2 className="text-5xl font-bold text-[#232221] font-['UnifrakturCook'] mb-2 drop-shadow-sm">
              {t('appTitle')}
          </h2>
          <p className="text-[#232221] font-medium max-w-md mx-auto leading-relaxed">
              {t('appSubtitle')}
          </p>
      </div>
      
      {/* Header / Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Configuration Card */}
        <Card 
          className="md:col-span-7 bg-transparent border-0 shadow-none rounded-none p-10 drop-shadow-2xl group relative"
          style={{ backgroundImage: `url(${containerBg})`, backgroundSize: '100% 100%' }}
        >
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white font-serif tracking-wide text-xl uppercase">
              {t('configTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 pl-1">{t('armyNameLabel')}</label>
              <Input 
                placeholder={t('armyNamePlaceholder')}
                value={armyName}
                onChange={(e) => setArmyName(e.target.value)}
                className="h-12 rounded-none bg-black/40 border-white/10 text-stone-200 focus:ring-[#cc6512]/50 focus:border-[#cc6512]/50 px-5 text-base font-medium transition-[background,border-color] duration-180 ease-out hover:bg-black/60 placeholder:text-stone-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 pl-1">{t('factionLabel')}</label>
              <Select value={selectedFactionId} onValueChange={handleFactionChange}>
                <SelectTrigger className="h-12 rounded-none bg-black/40 border-white/10 text-stone-200 focus:ring-[#cc6512]/50 focus:border-[#cc6512]/50 px-5 text-base font-medium transition-[background,border-color] duration-180 ease-out hover:bg-black/60">
                  <SelectValue placeholder={t('factionPlaceholder')} />
                </SelectTrigger>
                <SelectContent className="bg-[#1c1917]/95 backdrop-blur-xl border-[#cc6512]/30 text-stone-200 rounded-none shadow-2xl">
                  {(["base", "orient", "finis_imperii"] as Supplement[]).map((supp) => {
                    const group = factions.filter(f => (f.supplement ?? 'base') === supp);
                    if (group.length === 0) return null;
                    return (
                      <SelectGroup key={supp}>
                        <SelectLabel className="text-[10px] uppercase tracking-widest text-[#cc6512]/80 font-bold px-2 pt-3 pb-1">
                          {SUPPLEMENT_LABELS[supp]}
                        </SelectLabel>
                        {group.map(f => (
                          <SelectItem key={f.id} value={f.id} className="focus:bg-[#cc6512]/30 focus:text-[#cc6512]-100 cursor-pointer py-3 font-serif">
                            {tData('factions', f.id, f.name)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-5 pt-2">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 pl-1">{t('budgetLabel')}</label>
              <div className="flex flex-wrap gap-3">
                {[250, 500, 600, 800].map(pts => (
                  <button
                    key={pts}
                    onClick={() => setBudget(pts)}
                    className={`
                      px-3 py-1 rounded-none text-xs font-bold transition-[background,border-color,color] duration-180 ease-out border
                      ${budget === pts 
                        ? "bg-[#cc6512] border-[#cc6512]/50 text-white shadow-[0_0_15px_rgba(204,101,18,0.4)] scale-105" 
                        : "bg-black/30 border-white/5 text-stone-500 hover:text-stone-300 hover:bg-white/5 hover:border-white/10"}
                    `}
                  >
                    {pts} PO
                  </button>
                ))}
                <div className="flex items-center bg-black/30 rounded-none border border-white/5 pl-4 pr-1 overflow-hidden focus-within:border-[#cc6512]/30 focus-within:ring-1 focus-within:ring-[#cc6512]/30 transition-[border-color,box-shadow] duration-180 ease-out">
                  <span className="text-xs text-stone-500 font-bold uppercase tracking-wider mr-2">{t('otherBudget')}</span>
                  <Input 
                    type="number" 
                    className="w-20 border-none bg-transparent h-9 focus-visible:ring-0 text-right pr-2 text-stone-200 font-bold" 
                    placeholder="Custom" 
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Status Card */}
        <Card 
          className={`md:col-span-5 bg-transparent border-0 rounded-none p-10 relative ${isOverBudget ? "drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "drop-shadow-[0_0_15px_rgba(204,101,18,0.3)]"}`}
          style={{ backgroundImage: `url(${containerBg})`, backgroundSize: '100% 100%' }}
        >
          <CardHeader className="pb-4">
            <CardTitle className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-white font-serif tracking-wide text-xl uppercase">
                <span>{t('treasuryTitle')}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Points Display */}
            <div className="flex items-end justify-between">
                <div className="flex flex-col">
                    <span className="text-xs text-stone-500 uppercase tracking-widest font-bold mb-1">{t('spent')}</span>
                    <span className={`text-4xl font-['UnifrakturCook'] font-bold ${isOverBudget ? "text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" : "text-stone-200"}`}>
                        {currentPoints}
                    </span>
                </div>
                <div className="h-12 w-[1px] bg-white/10 mx-4" />
                <div className="flex flex-col items-end">
                    <span className="text-xs text-stone-500 uppercase tracking-widest font-bold mb-1">{t('remaining')}</span>
                    <span className={`text-4xl font-['UnifrakturCook'] font-bold ${remainingPoints < 0 ? "text-red-500" : "text-[#cc6512] drop-shadow-[0_0_8px_rgba(204,101,18,0.4)]"}`}>
                        {remainingPoints}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 relative pt-2">
              <Progress 
                value={(currentPoints / budget) * 100} 
                className={`h-3 rounded-none bg-black/60 border border-white/5 overflow-hidden 
                    ${isOverBudget 
                        ? "[&>div]:bg-red-600" 
                        : "[&>div]:bg-gradient-to-r [&>div]:from-[#cc6512] [&>div]:via-[#cc6512] [&>div]:to-[#fbbc23] [&>div]:shadow-[0_0_10px_rgba(251,188,35,0.5)]"}
                `} 
              />
            </div>

            {isOverBudget && (
              <div className="bg-red-950/40 border border-red-900/50 rounded-none p-3 flex items-start gap-3 text-red-200">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-red-400 uppercase tracking-wide text-xs mb-1">{t('criticalDeficit')}</p>
                  <p className="opacity-80">{t('deficitMessage')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {selectedFaction && (
        <div className="space-y-8 animate-in fade-in duration-300 slide-in-from-bottom-2">

          {/* Fog of war : toggle + agreed hidden cap + live readout */}
          <div className="bg-[#1c1917]/80 border border-white/10 rounded-none p-5 sm:p-6 space-y-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <EyeOff className="w-5 h-5 text-sky-300 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-serif font-bold tracking-wide uppercase text-sm">{t("fogTitle")}</span>
                    <span className="text-[9px] uppercase tracking-widest text-sky-300/90 font-bold border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5">
                      {t("fogBeta")}
                    </span>
                  </div>
                  <p className="text-stone-400 text-xs leading-relaxed max-w-2xl mt-1">{t("fogHint")}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">{t("fogEnableLabel")}</span>
                <Switch checked={fogEnabled} onCheckedChange={setFogEnabled} />
              </label>
            </div>

            {fogEnabled && (
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center gap-4 justify-between animate-in fade-in slide-in-from-top-1 duration-160">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mr-1">{t("fogMaxLabel")}</span>
                  {FOG_PERCENT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFogPercent(p)}
                      className={`px-3 py-1 rounded-none text-xs font-bold transition-[background,border-color,color] duration-160 ease-out border ${
                        fogPercent === p
                          ? "bg-sky-500 border-sky-400/60 text-white shadow-[0_0_12px_rgba(56,189,248,0.4)] scale-105"
                          : "bg-black/30 border-white/5 text-stone-500 hover:text-stone-300 hover:bg-white/5 hover:border-white/10"
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                  <div className="flex items-center bg-black/30 rounded-none border border-white/5 pl-3 pr-1 focus-within:border-sky-400/40">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={fogPercent}
                      onChange={(e) => setFogPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-14 border-none bg-transparent h-8 focus-visible:ring-0 text-right pr-1 text-stone-200 font-bold"
                    />
                    <span className="text-xs text-stone-500 font-bold">%</span>
                  </div>
                </div>
                <div className={`text-sm font-bold tabular-nums ${hiddenPoints > fogCap ? "text-red-400" : "text-sky-300"}`}>
                  {t("fogHiddenReadout")} : {hiddenPoints} / {fogCap} po
                </div>
              </div>
            )}
          </div>

          {/* Special Rules Banner — torn-paper parchment with solid teal middle */}
          {(selectedFaction.specialRules.length > 0 || activeTalents.length > 0) && (() => {
             // The Talents tab only exists when the army carries talents.
             const showTalentsTab = activeTalents.length > 0;
             const currentTab = showTalentsTab ? bonusTab : "faction";
             return (
             <>
               <div className="relative drop-shadow-[0_4px_25px_rgba(15,95,94,0.25)]">
                 {/* Top torn edge */}
                 <img
                   src={bannerTop}
                   alt=""
                   aria-hidden="true"
                   className="block w-full select-none pointer-events-none"
                 />

                 {/* Solid teal middle — width matches the visible (non-transparent) area of the banner PNG (1312/1336 ≈ 98.2%, so 0.9% on each side). */}
                 <div className="bg-[#5BA5A4] mx-[0.9%]">
                   {/* Header : tabs when talents exist, otherwise a static title */}
                   <div className="flex items-center gap-3 px-10 pt-10 pb-4">
                     <Flame className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] shrink-0" />
                     {showTalentsTab ? (
                       <div className="flex items-center gap-2 flex-wrap">
                         <button
                           type="button"
                           onClick={() => setBonusTab("faction")}
                           className={`font-serif font-bold tracking-[0.15em] uppercase text-sm px-3 py-1 rounded-none transition-colors duration-160 ease-out ${
                             currentTab === "faction"
                               ? "bg-white/20 text-white shadow-inner"
                               : "text-white/60 hover:text-white/90"
                           }`}
                         >
                           {t("factionBonus")}{" "}
                           <span className="text-white/60">({selectedFaction.specialRules.length})</span>
                         </button>
                         <button
                           type="button"
                           onClick={() => setBonusTab("talents")}
                           className={`font-serif font-bold tracking-[0.15em] uppercase text-sm px-3 py-1 rounded-none transition-colors duration-160 ease-out ${
                             currentTab === "talents"
                               ? "bg-white/20 text-white shadow-inner"
                               : "text-white/60 hover:text-white/90"
                           }`}
                         >
                           {t("talentsReminderTab")}{" "}
                           <span className="text-white/60">({activeTalents.length})</span>
                         </button>
                       </div>
                     ) : (
                       <>
                         <h3 className="text-white font-serif font-bold tracking-[0.25em] uppercase text-base drop-shadow">
                           {t('factionBonus')}
                         </h3>
                         <span className="ml-auto text-[10px] uppercase tracking-widest text-white/70 font-bold">
                           {selectedFaction.specialRules.length}
                         </span>
                       </>
                     )}
                   </div>

                   {/* Decorative thin gradient divider under the header */}
                   <div className="mx-10 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                   {currentTab === "faction" ? (
                     /* Faction rules — collapsible: summary (title) + expand for full text */
                     <ul className="px-10 pb-10 pt-4 divide-y divide-white/15">
                     {selectedFaction.specialRules.map((rule, idx) => {
                       const translated = tData('factionRules', rule, rule);
                       const colonIdx = translated.indexOf(':');
                       const hasTitle = colonIdx > 0 && colonIdx < 70;
                       const title = hasTitle ? translated.slice(0, colonIdx).trim() : translated.trim();
                       const desc = hasTitle ? translated.slice(colonIdx + 1).trim() : "";
                       const key = `faction-${idx}`;
                       const isOpen = expandedBonus.has(key);
                       const hasDetail = desc.length > 0;
                       return (
                         <li key={idx} className="py-2.5 first:pt-1">
                           <button
                             type="button"
                             onClick={() => hasDetail && toggleBonusItem(key)}
                             className={`w-full flex items-start gap-2.5 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
                             aria-expanded={isOpen}
                           >
                             {hasDetail ? (
                               <span className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center border border-white/40 text-white transition-colors duration-160 ease-out hover:bg-white/15">
                                 {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                               </span>
                             ) : (
                               <span className="mt-0.5 shrink-0 w-5 h-5" aria-hidden="true" />
                             )}
                             <span className="font-sans font-bold text-white tracking-wide text-base drop-shadow leading-snug">
                               {title}
                             </span>
                           </button>
                           {hasDetail && isOpen && (
                             <p className="text-white/95 text-sm leading-relaxed pl-[30px] pt-1.5 animate-in fade-in slide-in-from-top-1 duration-160">
                               {desc}
                             </p>
                           )}
                         </li>
                       );
                     })}
                     </ul>
                   ) : (
                     /* Active talents — same collapsible pattern */
                     <ul className="px-10 pb-10 pt-4 divide-y divide-white/15">
                     {activeTalents.map((talent) => {
                       const key = `talent-${talent.id}`;
                       const isOpen = expandedBonus.has(key);
                       const hasDetail = talent.desc.length > 0;
                       return (
                         <li key={talent.id} className="py-2.5 first:pt-1">
                           <button
                             type="button"
                             onClick={() => hasDetail && toggleBonusItem(key)}
                             className={`w-full flex items-start gap-2.5 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
                             aria-expanded={isOpen}
                           >
                             {hasDetail ? (
                               <span className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center border border-white/40 text-white transition-colors duration-160 ease-out hover:bg-white/15">
                                 {isOpen ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                               </span>
                             ) : (
                               <span className="mt-0.5 shrink-0 w-5 h-5" aria-hidden="true" />
                             )}
                             <span className="flex items-baseline gap-2 flex-wrap min-w-0">
                               <span className="font-sans font-bold text-white tracking-wide text-base drop-shadow leading-snug">
                                 {talent.name}
                               </span>
                               <span className="text-[10px] uppercase tracking-widest text-white/70">
                                 {talent.carriers.join(", ")}
                               </span>
                             </span>
                           </button>
                           {hasDetail && isOpen && (
                             <p className="text-white/95 text-sm leading-relaxed pl-[30px] pt-1.5 animate-in fade-in slide-in-from-top-1 duration-160">
                               {talent.desc}
                             </p>
                           )}
                         </li>
                       );
                     })}
                     </ul>
                   )}
                 </div>

                 {/* Bottom torn edge */}
                 <img
                   src={bannerBottom}
                   alt=""
                   aria-hidden="true"
                   className="block w-full select-none pointer-events-none"
                 />
               </div>
               <div className="flex justify-center py-6">
                 <img src={spearSeparator} alt="Separator" className="w-full max-w-2xl opacity-80" />
               </div>
             </>
             );
          })()}

          {/* Validation errors panel, just above "Votre armée" so the player
              sees it next to the army he's editing. */}
          {allViolations.length > 0 && army.length > 0 && (
             <div
               className="shadow-[0_0_20px_rgba(220,38,38,0.1)] p-6 min-h-[100px] flex flex-col justify-center animate-in fade-in slide-in-from-top-2 duration-200 ease-out"
               style={{ backgroundImage: `url(${redBanner})`, backgroundSize: '100% 100%' }}
             >
               <div className="flex items-center gap-2 mb-2 px-2">
                  <ShieldAlert className="h-5 w-5 text-white drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]" />
                  <h4 className="font-serif font-bold tracking-wider text-white uppercase">{t('restrictionsViolated')}</h4>
               </div>
               <ul className="list-disc pl-9 space-y-1.5 text-sm font-medium text-white px-2">
                 {allViolations.map((error, idx) => (
                   <li key={idx}>{error}</li>
                 ))}
               </ul>
             </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center justify-between pt-2 border-b border-white/5 pb-4">
            <h2 className="text-3xl font-bold font-['UnifrakturCook'] tracking-tight text-[#232221]">
              {t('yourArmy')} <span className="text-[#cc6512] text-2xl ml-1 opacity-90">/ {tData('factions', selectedFaction.id, selectedFaction.name)}</span>
            </h2>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => handleSave(false)}
                disabled={army.length === 0 || saving}
                className="bg-stone-700 hover:bg-stone-600 text-white border border-white/10 rounded-none px-6 font-bold tracking-wider transition-[transform,background,box-shadow] duration-160 ease-out active:scale-[0.97]"
                title={user ? t("save") : t("save")}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? t("update") : t("save")}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={army.length === 0 || saving}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white border border-white/10 rounded-none px-6 font-bold tracking-wider transition-[transform,background,box-shadow] duration-160 ease-out active:scale-[0.97]"
                title={t("publish")}
              >
                <Globe className="w-4 h-4 mr-2" />
                {t("publish")}
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={army.length === 0}
                className="bg-[#cc6512] hover:bg-[#b0560f] text-white border border-[#cc6512]/20 shadow-[0_0_15px_rgba(204,101,18,0.2)] hover:shadow-[0_0_25px_rgba(204,101,18,0.4)] rounded-none px-8 font-bold tracking-wider transition-[transform,background,box-shadow] duration-160 ease-out active:scale-[0.97]"
              >
                <Download className="w-5 h-5 mr-2 text-white" />
                {t('exportPdf')}
              </Button>
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={army.length === 0}
                className="text-stone-500 hover:text-red-400 hover:bg-red-950/20 rounded-none transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Unit List Grid */}
          <div className="space-y-4 min-h-[200px]">
            {army.length === 0 ? (
              <>
                {/* Recruitment button : above the empty state to drive the
                    first action. Once the army has units, the button moves
                    below the list (see further down). */}
                <div className="drop-shadow-xl">
                  <UnitForm
                    faction={selectedFaction}
                    onAddUnit={handleAddUnit}
                    currentPoints={currentPoints}
                    maxPoints={budget}
                    army={army}
                  />
                </div>
                <div className="flex flex-col items-center justify-center py-24 rounded-none border-2 border-dashed border-white/5 bg-white/[0.02]">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1c1917] to-black flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                      <ShieldAlert className="w-8 h-8 text-stone-700" />
                  </div>
                  <p className="text-2xl font-serif text-stone-500 mb-2 tracking-wide">{t('emptyStateTitle')}</p>
                  <p className="text-stone-600 text-sm font-medium uppercase tracking-widest">{t('emptyStateSubtitle')}</p>
                </div>
              </>
            ) : (
              <>
                {/* Batch selection bar : appears as soon as the user ticks
                    at least one unit checkbox. */}
                {selectedInstanceIds.size > 0 && (
                  <div className="sticky top-2 z-20 bg-red-950/95 backdrop-blur-md border-2 border-red-500/70 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(239,68,68,0.3)] animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                    <div className="text-white text-sm font-bold uppercase tracking-widest inline-flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      {t("batchSelectedCount").replace("$1", selectedInstanceIds.size.toString())}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={clearSelection}
                        variant="ghost"
                        className="text-stone-200 hover:text-white rounded-none font-bold uppercase tracking-widest text-xs"
                      >
                        {t("batchCancel")}
                      </Button>
                      <Button
                        onClick={handleBatchDelete}
                        className="bg-red-600 hover:bg-red-500 text-white rounded-none font-bold uppercase tracking-widest text-xs"
                      >
                        {t("batchDelete")}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence initial={false}>
                    {army.map((unit, idx) => (
                      <motion.div
                        key={unit.instanceId}
                        layout
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                      >
                        <UnitCard
                          unit={unit}
                          faction={selectedFaction}
                          onRemove={handleRemoveUnit}
                          onUpdateQuantity={handleUpdateQuantity}
                          onUpdateUnit={handleUpdateUnit}
                          onUpdateCustomName={handleUpdateCustomName}
                          onUpdateCustomIcon={handleUpdateCustomIcon}
                          onMoveUp={(id) => handleMoveUnit(id, -1)}
                          onMoveDown={(id) => handleMoveUnit(id, 1)}
                          canMoveUp={idx > 0}
                          canMoveDown={idx < army.length - 1}
                          dogHandlerActive={hasDogHandler}
                          army={army}
                          isSelected={selectedInstanceIds.has(unit.instanceId)}
                          onToggleSelection={toggleUnitSelection}
                          fogEnabled={fogEnabled}
                          onToggleHidden={handleToggleHidden}
                          onToggleHiddenEquipment={handleToggleHiddenEquipment}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Recap : PO consommés + figurines + seuil de moral */}
                <div
                  className={`mt-6 p-5 border-2 bg-white shadow-lg ${
                    isOverBudget ? "border-red-700" : "border-[#cc6512]"
                  } flex flex-wrap items-end justify-between gap-x-8 gap-y-4`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className={`w-6 h-6 shrink-0 ${isOverBudget ? "text-red-700" : "text-[#cc6512]"}`} />
                    <div>
                      <div className="text-xs uppercase tracking-widest text-stone-700 font-bold">
                        {t("spent")} / {t("budgetLabel")}
                      </div>
                      <div className="font-['UnifrakturCook'] text-3xl leading-none mt-1">
                        <span className={isOverBudget ? "text-red-700" : "text-[#cc6512]"}>
                          {currentPoints}
                        </span>
                        <span className="text-stone-700"> / {budget}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-stone-700 font-bold">
                      {t("remaining")}
                    </div>
                    <div
                      className={`font-['UnifrakturCook'] text-3xl leading-none mt-1 ${
                        remainingPoints < 0 ? "text-red-700" : "text-stone-900"
                      }`}
                    >
                      {remainingPoints} PO
                    </div>
                  </div>
                  <div className="flex items-baseline gap-5 ml-auto">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">
                        {t("totalModelsLabel")}
                      </div>
                      <div className="text-base font-bold text-stone-800 leading-tight">
                        {totalArmyModels}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">
                        {t("moralThresholdLabel")}
                      </div>
                      <div className="text-base font-bold text-stone-800 leading-tight">
                        {moralThreshold}
                        <span className="text-xs text-stone-500 font-normal ml-1">/ {totalArmyModels}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Recruitment button : under the list once the army has units,
                so the user doesn't have to scroll back up to add more. */}
            {army.length > 0 && (
              <div className="mt-6 drop-shadow-xl">
                <UnitForm
                  faction={selectedFaction}
                  onAddUnit={handleAddUnit}
                  currentPoints={currentPoints}
                  maxPoints={budget}
                  army={army}
                />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}