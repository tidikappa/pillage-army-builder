import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { factions, ArmyUnit, Faction, UnitRole, getEffectiveFaction, Supplement, SUPPLEMENT_LABELS } from "../../data/gameData";
import { getUnitDisplayIcon, getUnitDisplayName } from "./unitNaming";
import { validateArmy } from "./validation";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertTriangle, Download, RotateCcw, ShieldAlert, Wallet, Trophy, Flame, Save, Globe } from "lucide-react";
import { Input } from "../ui/input";
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
  };
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

  React.useEffect(() => {
    if (loadState) {
      navigate(location.pathname, { replace: true, state: null });
      toast.info(`Liste "${loadState.armyName || "sans nom"}" chargée`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedFaction = factions.find(f => f.id === selectedFactionId);

  const computeUnitCost = (unit: ArmyUnit): number => {
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
    return cost;
  };

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

  const handleAddUnit = (unitTypeId: string, equipmentIds: string[], quantity: number, sourceFactionId?: string) => {
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
    };
    setArmy([...army, newUnit]);
    toast.success(quantity > 1 ? t("unitsAdded") : t("unitAdded"));
  };

  const handleRemoveUnit = (instanceId: string) => {
    setArmy(army.filter(u => u.instanceId !== instanceId));
    toast.info(t("unitRemoved"));
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

  const handleUpdateUnit = (instanceId: string, unitTypeId: string, equipmentIds: string[], quantity: number, sourceFactionId?: string) => {
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

    setArmy(army.map(u => u.instanceId === instanceId ? {
      ...u,
      unitTypeId: unitTypeId as UnitRole,
      equipment: equipmentIds,
      quantity: quantity,
      sourceFactionId: sourceFactionId && sourceFactionId !== selectedFactionId ? sourceFactionId : undefined,
    } : u));
    toast.success(t("unitUpdated"));
  };

  const handleUpdateCustomName = (instanceId: string, customName: string) => {
    setArmy(army.map(u => u.instanceId === instanceId ? { ...u, customName: customName || undefined } : u));
  };

  const handleUpdateCustomIcon = (instanceId: string, customIconId: string | undefined) => {
    setArmy(army.map(u => u.instanceId === instanceId ? { ...u, customIconId } : u));
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
    };

    if (editingId) {
      const { error } = await supabase.from("armies").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(publish ? "Liste publiée" : "Liste mise à jour");
    } else {
      const { data, error } = await supabase.from("armies").insert(payload).select("id").single();
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data) setEditingId(data.id as string);
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

    let currentY = 20;
    doc.setFontSize(20);
    doc.text(armyName || "Liste d'armée - Pillage", 14, currentY);

    currentY += 10;
    doc.setFontSize(12);
    const factionName = tData("factions", selectedFaction.id, selectedFaction.name);
    doc.text(`Faction: ${factionName}`, 14, currentY);

    currentY += 6;
    const pointsText = `${t("spent")}: ${currentPoints} / ${budget} po`;
    doc.text(pointsText, 14, currentY);

    if (isOverBudget) {
      doc.setTextColor(200, 0, 0);
      doc.text(language === "fr" ? "ATTENTION : Budget dépassé" : "WARNING: Over budget", 100, currentY);
      doc.setTextColor(0, 0, 0);
    }

    currentY += 6;
    doc.text(
      `${t("totalModelsLabel")}: ${totalArmyModels}   ·   ${t("pdfMoralSummary")}: ${moralThreshold}`,
      14,
      currentY
    );

    currentY += 10;

    if (validationErrors.length > 0) {
      doc.setTextColor(200, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(t("restrictionsViolated") + ":", 14, currentY);
      currentY += 6;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      validationErrors.forEach((err) => {
        const splitText = doc.splitTextToSize(`- ${err}`, 180);
        doc.text(splitText, 14, currentY);
        currentY += splitText.length * 5;
      });
      doc.setTextColor(0, 0, 0);
      currentY += 5;
    }

    // Pre-render an icon PNG for every unit.
    const iconDataUrls = await Promise.all(army.map((u) => renderUnitIcon(u)));

    const tableData = army.map((unit) => {
      const effective = getEffectiveFaction(unit, selectedFaction);
      const unitType = effective.units.find((u) => u.id === unit.unitTypeId);
      if (!unitType) return ["", "", "", ""];
      const equipment = unit.equipment
        .map((id) => effective.availableEquipment.find((e) => e.id === id))
        .filter(Boolean);
      const formatEquip = (e: any) => {
        const cost = e.costs[unit.unitTypeId as UnitRole];
        const equipName = tData("equipment", e.id, e.name);
        return `${equipName}${cost ? ` (${cost} po)` : ""}`;
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
      const qty = unit.quantity || 1;

      const displayName = getUnitDisplayName(unit, effective, language, tData);
      const isMerc = Boolean(unit.sourceFactionId && unit.sourceFactionId !== selectedFaction.id);
      const mercSuffix = isMerc ? ` [${tData("factions", effective.id, effective.name)}]` : "";

      return ["", `${displayName} (x${qty})${mercSuffix}`, descriptionParts.join("\n"), `${singleCost * qty} po`];
    });

    autoTable(doc, {
      startY: currentY,
      head: [["", t("pdfUnit"), t("pdfEquipment"), t("pdfCost")]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [180, 83, 9] },
      columnStyles: {
        0: { cellWidth: 14, halign: "center" },
        1: { cellWidth: 50 },
        3: { cellWidth: 22, halign: "right" },
      },
      didDrawCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index !== 0) return;
        const dataUrl = iconDataUrls[data.row.index];
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

    const finalY = (doc as any).lastAutoTable.finalY || currentY;
    
    if (selectedFaction.specialRules.length > 0) {
        let ruleY = finalY + 15;
        
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

        selectedFaction.specialRules.forEach(rule => {
            // Translate the rule if possible
            const translatedRule = tData('factionRules', rule, rule);
            const splitText = doc.splitTextToSize(`- ${translatedRule}`, 180);
            if (ruleY + (splitText.length * 5) > 280) {
                doc.addPage();
                ruleY = 20;
            }
            doc.text(splitText, 14, ruleY);
            ruleY += (splitText.length * 5);
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
                className="h-12 rounded-none bg-black/40 border-white/10 text-stone-200 focus:ring-[#cc6512]/50 focus:border-[#cc6512]/50 px-5 text-base font-medium transition-all hover:bg-black/60 placeholder:text-stone-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-stone-500 pl-1">{t('factionLabel')}</label>
              <Select value={selectedFactionId} onValueChange={handleFactionChange}>
                <SelectTrigger className="h-12 rounded-none bg-black/40 border-white/10 text-stone-200 focus:ring-[#cc6512]/50 focus:border-[#cc6512]/50 px-5 text-base font-medium transition-all hover:bg-black/60">
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
                      px-3 py-1 rounded-none text-xs font-bold transition-all duration-300 border
                      ${budget === pts 
                        ? "bg-[#cc6512] border-[#cc6512]/50 text-white shadow-[0_0_15px_rgba(204,101,18,0.4)] scale-105" 
                        : "bg-black/30 border-white/5 text-stone-500 hover:text-stone-300 hover:bg-white/5 hover:border-white/10"}
                    `}
                  >
                    {pts} PO
                  </button>
                ))}
                <div className="flex items-center bg-black/30 rounded-none border border-white/5 pl-4 pr-1 overflow-hidden focus-within:border-[#cc6512]/30 focus-within:ring-1 focus-within:ring-[#cc6512]/30 transition-all">
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
              <div className="flex items-center gap-3 text-stone-300 font-serif tracking-wide text-xl uppercase">
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
        <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-4">

          {/* Global Validation Errors */}
          {validationErrors.length > 0 && army.length > 0 && (
             <div 
               className="shadow-[0_0_20px_rgba(220,38,38,0.1)] p-6 min-h-[100px] flex flex-col justify-center"
               style={{ backgroundImage: `url(${redBanner})`, backgroundSize: '100% 100%' }}
             >
               <div className="flex items-center gap-2 mb-2 px-2">
                  <ShieldAlert className="h-5 w-5 text-white drop-shadow-[0_0_5px_rgba(220,38,38,0.8)]" />
                  <h4 className="font-serif font-bold tracking-wider text-white uppercase">{t('restrictionsViolated')}</h4>
               </div>
               <ul className="list-disc pl-9 space-y-1.5 text-sm font-medium text-white px-2">
                 {validationErrors.map((error, idx) => (
                   <li key={idx}>{error}</li>
                 ))}
               </ul>
             </div>
          )}
          
          {/* Special Rules Banner — torn-paper parchment with solid teal middle */}
          {selectedFaction.specialRules.length > 0 && (
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
                   {/* Header */}
                   <div className="flex items-center gap-3 px-10 pt-10 pb-4">
                     <Flame className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
                     <h3 className="text-white font-serif font-bold tracking-[0.25em] uppercase text-base drop-shadow">
                       {t('factionBonus')}
                     </h3>
                     <span className="ml-auto text-[10px] uppercase tracking-widest text-white/70 font-bold">
                       {selectedFaction.specialRules.length}
                     </span>
                   </div>

                   {/* Decorative thin gradient divider under the header */}
                   <div className="mx-10 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                   {/* Rules list with thin dividers */}
                   <ul className="px-10 pb-10 pt-4 divide-y divide-white/15">
                   {selectedFaction.specialRules.map((rule, idx) => {
                     const translated = tData('factionRules', rule, rule);
                     const colonIdx = translated.indexOf(':');
                     const hasTitle = colonIdx > 0 && colonIdx < 70;
                     const title = hasTitle ? translated.slice(0, colonIdx).trim() : null;
                     const desc = hasTitle ? translated.slice(colonIdx + 1).trim() : translated.trim();
                     return (
                       <li key={idx} className="py-3.5 first:pt-2">
                         {title && (
                           <div className="font-serif font-bold text-white uppercase tracking-widest text-sm mb-1 drop-shadow">
                             {title}
                           </div>
                         )}
                         <p className="text-white/95 text-sm leading-relaxed">{desc}</p>
                       </li>
                     );
                   })}
                   </ul>
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
                className="bg-stone-700 hover:bg-stone-600 text-white border border-white/10 rounded-none px-6 font-bold tracking-wider transition-all"
                title={user ? t("save") : t("save")}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? t("update") : t("save")}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={army.length === 0 || saving}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white border border-white/10 rounded-none px-6 font-bold tracking-wider transition-all"
                title={t("publish")}
              >
                <Globe className="w-4 h-4 mr-2" />
                {t("publish")}
              </Button>
              <Button
                onClick={handleExportPDF}
                disabled={army.length === 0}
                className="bg-[#cc6512] hover:bg-[#b0560f] text-white border border-[#cc6512]/20 shadow-[0_0_15px_rgba(204,101,18,0.2)] hover:shadow-[0_0_25px_rgba(204,101,18,0.4)] rounded-none px-8 font-bold tracking-wider transition-all hover:scale-105"
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

          {/* Recruitment Button (Moved Here) */}
          <div className="mb-8 drop-shadow-xl">
            <UnitForm
              faction={selectedFaction}
              onAddUnit={handleAddUnit}
              currentPoints={currentPoints}
              maxPoints={budget}
              army={army}
            />
          </div>

          {/* Unit List Grid */}
          <div className="space-y-4 min-h-[200px]">
            {army.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 rounded-none border-2 border-dashed border-white/5 bg-white/[0.02]">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1c1917] to-black flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                    <ShieldAlert className="w-8 h-8 text-stone-700" />
                </div>
                <p className="text-2xl font-serif text-stone-500 mb-2 tracking-wide">{t('emptyStateTitle')}</p>
                <p className="text-stone-600 text-sm font-medium uppercase tracking-widest">{t('emptyStateSubtitle')}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {army.map((unit, idx) => (
                      <UnitCard
                      key={unit.instanceId}
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
                      dogHandlerActive={army.some(u => u.equipment.includes('talent_dog_handler'))}
                      army={army}
                      />
                  ))}
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
          </div>

        </div>
      )}
    </div>
  );
}