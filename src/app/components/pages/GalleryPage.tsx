import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { factions, ArmyUnit } from "../../data/gameData";
import { ArmyView } from "../pillages/ArmyView";
import { useTranslation } from "../pillages/TranslationContext";
import { useAuth } from "../../lib/AuthContext";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ChevronDown, ChevronUp, Coins, User, Calendar, ShieldAlert, Trash2, AlertTriangle, Star, GitFork, Link as LinkIcon, Columns, X } from "lucide-react";
import { toast } from "sonner";
import { validateArmy } from "../pillages/validation";
import { ReportArmyButton } from "../pillages/ReportArmyButton";

const ALL = "__all__";
const FAVORITES = "__favorites__";

// Budget tiers — each tier includes everything from the previous tier up to
// its own value. "800plus" has no upper bound.
type BudgetTier = "all" | "250" | "500" | "600" | "800" | "800plus";
const BUDGET_TIERS: { value: BudgetTier; label: string }[] = [
  { value: "all", label: "Tous les budgets" },
  { value: "250", label: "Jusqu'à 250 po" },
  { value: "500", label: "Jusqu'à 500 po" },
  { value: "600", label: "Jusqu'à 600 po" },
  { value: "800", label: "Jusqu'à 800 po" },
  { value: "800plus", label: "Plus de 800 po" },
];
const matchesBudgetTier = (budget: number, tier: BudgetTier): boolean => {
  switch (tier) {
    case "all": return true;
    case "250": return budget <= 250;
    case "500": return budget > 250 && budget <= 500;
    case "600": return budget > 500 && budget <= 600;
    case "800": return budget > 600 && budget <= 800;
    case "800plus": return budget > 800;
  }
};

export function GalleryPage() {
  const { t, tData } = useTranslation();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [armies, setArmies] = React.useState<SavedArmy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [factionFilter, setFactionFilter] = React.useState<string>(ALL);
  const [budgetFilter, setBudgetFilter] = React.useState<BudgetTier>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());

  // Load the current user's favorite army ids.
  React.useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setFavorites(new Set());
      return;
    }
    supabase
      .from("army_favorites")
      .select("army_id")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) return;
        setFavorites(new Set((data ?? []).map((r) => (r as { army_id: string }).army_id)));
      });
  }, [user]);

  const toggleFavorite = async (armyId: string) => {
    if (!user) {
      navigate("/login", { state: { from: "/gallery" } });
      return;
    }
    const isFav = favorites.has(armyId);
    // Optimistic update
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(armyId);
      else next.add(armyId);
      return next;
    });
    if (isFav) {
      const { error } = await supabase
        .from("army_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("army_id", armyId);
      if (error) {
        toast.error(error.message);
        // Revert
        setFavorites((prev) => new Set(prev).add(armyId));
      }
    } else {
      const { error } = await supabase
        .from("army_favorites")
        .insert({ user_id: user.id, army_id: armyId });
      if (error) {
        toast.error(error.message);
        setFavorites((prev) => {
          const next = new Set(prev);
          next.delete(armyId);
          return next;
        });
      }
    }
  };

  const forkIntoBuilder = (a: SavedArmy) => {
    navigate("/", {
      state: {
        loadArmy: {
          armyName: `${t("forkPrefix")} ${a.army_name || ""}`.trim(),
          factionId: a.faction_id,
          budget: a.budget,
          units: a.units as ArmyUnit[],
          // No `id` → saved as a new entry, the original is untouched.
        },
      },
    });
    toast.success(t("forkLoaded"));
  };

  // Comparison "seed" : the first army the user picked. Clicking another
  // army's compare button navigates to /comparer/:a/vs/:b.
  const [compareSeed, setCompareSeed] = React.useState<SavedArmy | null>(null);

  const onCompareClick = (a: SavedArmy) => {
    if (!compareSeed) {
      setCompareSeed(a);
      toast.info(t("compareSeedPicked").replace("$1", a.army_name || "Sans nom"));
      return;
    }
    if (compareSeed.id === a.id) {
      setCompareSeed(null);
      return;
    }
    navigate(`/comparer/${compareSeed.id}/vs/${a.id}`);
    setCompareSeed(null);
  };

  const copyArmyLink = async (armyId: string) => {
    const url = `${window.location.origin}/galerie/${armyId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("linkCopyFailed"));
    }
  };

  const adminDelete = async (army: SavedArmy) => {
    if (
      !confirm(
        `Modération : supprimer définitivement la liste "${army.army_name || "Sans nom"}" de ${army.author_name} ?`
      )
    )
      return;
    const { error } = await supabase.from("armies").delete().eq("id", army.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setArmies((prev) => prev.filter((a) => a.id !== army.id));
    toast.success("Liste supprimée (modération)");
  };

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase n'est pas configuré. Voir SUPABASE_SETUP.md.");
      setLoading(false);
      return;
    }
    supabase
      .from("armies")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setArmies((data as SavedArmy[]) ?? []);
        setLoading(false);
      });
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const availableFactions = React.useMemo(() => {
    const ids = new Set(armies.map((a) => a.faction_id));
    return factions.filter((f) => ids.has(f.id));
  }, [armies]);

  const filtered = armies.filter((a) => {
    if (factionFilter !== ALL && a.faction_id !== factionFilter) return false;
    if (!matchesBudgetTier(a.budget, budgetFilter)) return false;
    if (showFavoritesOnly && !favorites.has(a.id)) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-[#232221]">
        {t("galleryTitle")}
      </h2>

      {isAdmin && (
        <div className="bg-red-950/60 border border-red-700/50 px-4 py-3 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-100">
            <span className="font-bold uppercase tracking-widest">{t("moderatorModeActive")}</span>{" "}
            {t("moderatorModeHelp")}
          </p>
        </div>
      )}

      {compareSeed && (
        <div className="sticky top-2 z-20 bg-[#0F5F5E] border-2 border-white/20 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(15,95,94,0.4)] backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          <div className="text-white text-sm inline-flex items-center gap-2">
            <Columns className="w-4 h-4 shrink-0" />
            <span className="font-bold uppercase tracking-widest text-xs">
              {t("compareSeedBanner").replace("$1", compareSeed.army_name || "Sans nom")}
            </span>
          </div>
          <Button
            variant="ghost"
            onClick={() => setCompareSeed(null)}
            className="text-white hover:bg-white/10 rounded-none font-bold uppercase tracking-widest text-xs"
          >
            <X className="w-4 h-4 mr-1" />
            {t("compareCancel")}
          </Button>
        </div>
      )}

      {/* Filter bar : favorites chip + faction select + budget select */}
      {armies.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {user && (
            <button
              onClick={() => setShowFavoritesOnly((v) => !v)}
              className={`h-10 px-4 text-xs font-bold uppercase tracking-wider border-2 transition-all inline-flex items-center gap-1.5 rounded-none shadow-md ${
                showFavoritesOnly
                  ? "bg-amber-500 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  : "bg-black/80 border-amber-500/50 text-stone-100 hover:border-amber-400 hover:bg-black/90 hover:text-white"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
              {t("favoritesFilter")} ({favorites.size})
            </button>
          )}

          <Select value={factionFilter} onValueChange={setFactionFilter}>
            <SelectTrigger className="h-10 w-auto min-w-[200px] rounded-none bg-black/80 border-2 border-[#cc6512]/50 text-stone-100 hover:border-[#cc6512] hover:bg-black/90 focus:ring-2 focus:ring-[#cc6512]/40 focus:border-[#cc6512] uppercase tracking-wider text-xs font-bold shadow-md transition-all">
              <SelectValue placeholder={t("factionFilterLabel")} />
            </SelectTrigger>
            <SelectContent className="bg-[#1c1917]/95 backdrop-blur-xl border-[#cc6512]/30 text-stone-200 rounded-none">
              <SelectItem value={ALL} className="focus:bg-[#cc6512]/30 cursor-pointer py-2 font-serif">
                {t("allFactionsLabel")} ({armies.length})
              </SelectItem>
              {availableFactions.map((f) => {
                const count = armies.filter((a) => a.faction_id === f.id).length;
                return (
                  <SelectItem key={f.id} value={f.id} className="focus:bg-[#cc6512]/30 cursor-pointer py-2 font-serif">
                    {tData("factions", f.id, f.name)} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select value={budgetFilter} onValueChange={(v) => setBudgetFilter(v as BudgetTier)}>
            <SelectTrigger className="h-10 w-auto min-w-[170px] rounded-none bg-black/80 border-2 border-[#cc6512]/50 text-stone-100 hover:border-[#cc6512] hover:bg-black/90 focus:ring-2 focus:ring-[#cc6512]/40 focus:border-[#cc6512] uppercase tracking-wider text-xs font-bold shadow-md transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1c1917]/95 backdrop-blur-xl border-[#cc6512]/30 text-stone-200 rounded-none">
              {BUDGET_TIERS.map((tier) => {
                const count = armies.filter((a) => matchesBudgetTier(a.budget, tier.value)).length;
                return (
                  <SelectItem key={tier.value} value={tier.value} className="focus:bg-[#cc6512]/30 cursor-pointer py-2 font-serif">
                    {tier.label} ({count})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {loading && <p className="text-stone-200">Chargement...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && armies.length === 0 && (
        <p className="text-stone-200 italic">{t("noPublicArmies")}</p>
      )}
      {!loading && !error && armies.length > 0 && filtered.length === 0 && (
        <p className="text-stone-200 italic">
          {showFavoritesOnly ? t("noFavorites") : t("noArmiesForFaction")}
        </p>
      )}

      <ul className="space-y-4">
        {filtered.map((a) => {
          const faction = factions.find((f) => f.id === a.faction_id);
          const isOpen = expanded.has(a.id);
          const isFav = favorites.has(a.id);
          const violationCount = faction
            ? validateArmy(a.units as ArmyUnit[], faction, t).length
            : 0;
          const cardBorder = violationCount > 0
            ? "border border-red-700/50 hover:border-red-500/70"
            : isFav
              ? "border-y border-r border-white/15 border-l-4 border-l-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.18)] hover:border-l-amber-300"
              : "border border-white/15 hover:border-[#cc6512]/40";
          return (
            <li key={a.id}>
              <Card className={`bg-black/70 rounded-none text-stone-100 shadow-xl transition-colors ${cardBorder}`}>
                <CardHeader
                  className="cursor-pointer p-5"
                  onClick={() => toggle(a.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-3xl text-stone-100 leading-tight drop-shadow-sm">
                        {a.army_name || "Sans nom"}
                      </h3>
                      <div className="text-sm font-bold uppercase tracking-widest text-[#cc6512] mt-1">
                        {faction ? tData("factions", faction.id, faction.name) : a.faction_id}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-stone-300">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-medium">{a.author_name}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {new Date(a.created_at).toLocaleDateString()}
                        </span>
                        {isFav && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-400/60 text-amber-200 text-[10px] font-bold uppercase tracking-widest shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                            <Star className="w-3 h-3 fill-current" /> Favori
                          </span>
                        )}
                      </div>
                      {violationCount > 0 && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-red-950/50 border border-red-700/50 text-red-200 text-[11px] font-bold uppercase tracking-widest">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          {violationCount} {t("restrictionsViolated")}
                        </div>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-[#cc6512]/15 border border-[#cc6512]/40 px-3 py-1.5 shrink-0">
                      <Coins className="w-4 h-4 text-[#cc6512]" />
                      <span className="text-lg font-['UnifrakturCook'] font-bold text-[#cc6512] leading-none">
                        {a.budget}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-[#cc6512]/80 ml-0.5">
                        po
                      </span>
                    </div>
                  </div>

                  {/* Action bar : compact buttons (icon + label) under the
                      card header, separated by a subtle divider. */}
                  <div
                    className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      onClick={() => toggleFavorite(a.id)}
                      className={`h-8 px-2 rounded-none transition-all inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                        isFav
                          ? "bg-amber-500/25 border border-amber-400/70 text-amber-300 hover:bg-amber-500/35 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                          : "text-stone-300 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent"
                      }`}
                      aria-label={isFav ? t("favoriteRemove") : t("favoriteAdd")}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
                      <span>{t("ctaFavorite")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => forkIntoBuilder(a)}
                      className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 transition-[transform,background,color] duration-160 ease-out active:scale-[0.97] text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-[#cc6512] hover:bg-[#cc6512]/10 border border-transparent"
                      aria-label={t("forkInBuilder")}
                    >
                      <GitFork className="w-3.5 h-3.5" />
                      <span>{t("ctaImport")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => copyArmyLink(a.id)}
                      className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 transition-[transform,background,color] duration-160 ease-out active:scale-[0.97] text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-[#cc6512] hover:bg-[#cc6512]/10 border border-transparent"
                      aria-label={t("copyLink")}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{t("ctaLink")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onCompareClick(a)}
                      className={`h-8 px-2 rounded-none transition-all inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                        compareSeed?.id === a.id
                          ? "text-teal-300 bg-teal-500/20 border border-teal-400/50 hover:bg-teal-500/30"
                          : "text-stone-300 hover:text-teal-300 hover:bg-teal-500/10 border border-transparent"
                      }`}
                      aria-label={t("compareTrigger")}
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>{t("ctaCompare")}</span>
                    </Button>
                    <ReportArmyButton army={a} />
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        onClick={() => adminDelete(a)}
                        className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 transition-[transform,background,color] duration-160 ease-out active:scale-[0.97] text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-transparent"
                        aria-label="Supprimer en tant que modérateur"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t("ctaDelete")}</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => toggle(a.id)}
                      className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 transition-[transform,background,color] duration-160 ease-out active:scale-[0.97] text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-[#cc6512] hover:bg-[#cc6512]/10 border border-transparent ml-auto"
                      aria-label={isOpen ? "Replier" : "Déplier"}
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>{isOpen ? t("ctaCollapse") : t("ctaExpand")}</span>
                    </Button>
                  </div>
                </CardHeader>
                {isOpen && (
                  <CardContent className="border-t border-white/10 pt-4">
                    <ArmyView
                      factionId={a.faction_id}
                      budget={a.budget}
                      units={a.units as ArmyUnit[]}
                    />
                  </CardContent>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
