import React from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { factions, ArmyUnit } from "../../data/gameData";
import { useAuth } from "../../lib/AuthContext";
import { useTranslation } from "../pillages/TranslationContext";
import { ArmyView } from "../pillages/ArmyView";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Globe,
  Lock,
  Coins,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { validateArmy } from "../pillages/validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

const ALL = "__all__";

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

export function MyListsPage() {
  const { user, loading } = useAuth();
  const { t, tData } = useTranslation();
  const navigate = useNavigate();
  const [armies, setArmies] = React.useState<SavedArmy[]>([]);
  const [fetching, setFetching] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [factionFilter, setFactionFilter] = React.useState<string>(ALL);
  const [budgetFilter, setBudgetFilter] = React.useState<BudgetTier>("all");

  const fetchArmies = React.useCallback(async () => {
    if (!user) return;
    setFetching(true);
    const { data, error } = await supabase
      .from("armies")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setArmies((data as SavedArmy[]) ?? []);
    setFetching(false);
  }, [user]);

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase n'est pas configuré. Voir SUPABASE_SETUP.md.");
      setFetching(false);
      return;
    }
    fetchArmies();
  }, [fetchArmies]);

  if (loading) return <p className="text-stone-200">Chargement...</p>;
  if (!user) return <Navigate to="/login" state={{ from: "/my-lists" }} replace />;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePublish = async (army: SavedArmy) => {
    const { error } = await supabase
      .from("armies")
      .update({ is_public: !army.is_public })
      .eq("id", army.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(army.is_public ? "Liste retirée de la galerie" : "Liste publiée dans la galerie");
    fetchArmies();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette liste ?")) return;
    const { error } = await supabase.from("armies").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Liste supprimée");
    fetchArmies();
  };

  const loadIntoBuilder = (army: SavedArmy) => {
    navigate("/", {
      state: {
        loadArmy: {
          armyName: army.army_name,
          factionId: army.faction_id,
          budget: army.budget,
          units: army.units as ArmyUnit[],
          id: army.id,
        },
      },
    });
  };

  const availableFactions = factions.filter((f) => armies.some((a) => a.faction_id === f.id));
  const filtered = armies.filter((a) => {
    if (factionFilter !== ALL && a.faction_id !== factionFilter) return false;
    if (!matchesBudgetTier(a.budget, budgetFilter)) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-[#232221]">{t("myListsTitle")}</h2>

      {/* Filter bar : faction select + budget select */}
      {armies.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
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

      {fetching && <p className="text-stone-200">Chargement...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!fetching && !error && armies.length === 0 && (
        <p className="text-stone-200 italic">
          Aucune liste sauvegardée.{" "}
          <Link to="/" className="text-[#cc6512] font-bold hover:underline">
            Construire une armée
          </Link>
          .
        </p>
      )}
      {!fetching && !error && armies.length > 0 && filtered.length === 0 && (
        <p className="text-stone-200 italic">{t("noArmiesForFaction")}</p>
      )}

      <ul className="space-y-4">
        {filtered.map((a) => {
          const faction = factions.find((f) => f.id === a.faction_id);
          const isOpen = expanded.has(a.id);
          const violationCount = faction
            ? validateArmy(a.units as ArmyUnit[], faction, t).length
            : 0;
          return (
            <li key={a.id}>
              <Card className={`bg-black/70 rounded-none text-stone-100 shadow-xl transition-colors ${violationCount > 0 ? "border border-red-700/50 hover:border-red-500/70" : "border border-white/15 hover:border-[#cc6512]/40"}`}>
                <CardHeader
                  className="cursor-pointer p-5"
                  onClick={() => toggle(a.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-['UnifrakturCook'] text-3xl text-stone-100 leading-tight drop-shadow-sm">
                          {a.army_name || "Sans nom"}
                        </h3>
                        {a.is_public ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 bg-[#cc6512]/20 border border-[#cc6512]/50 text-[#cc6512] font-bold"
                            title="Publique"
                          >
                            <Globe className="w-3 h-3" /> Publique
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 bg-stone-700/40 border border-stone-500/40 text-stone-300 font-bold"
                            title="Privée"
                          >
                            <Lock className="w-3 h-3" /> Privée
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold uppercase tracking-widest text-[#cc6512] mt-1">
                        {faction ? tData("factions", faction.id, faction.name) : a.faction_id}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-stone-300">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          {new Date(a.created_at).toLocaleDateString()}
                        </span>
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
                      onClick={() => loadIntoBuilder(a)}
                      className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-[#cc6512] hover:bg-[#cc6512]/10 border border-transparent"
                      aria-label={t("ctaEdit")}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{t("ctaEdit")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => togglePublish(a)}
                      className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-[#cc6512] hover:bg-[#cc6512]/10 border border-transparent"
                      aria-label={a.is_public ? t("ctaUnpublish") : t("ctaPublish")}
                    >
                      {a.is_public ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      <span>{a.is_public ? t("ctaUnpublish") : t("ctaPublish")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => remove(a.id)}
                      className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent"
                      aria-label={t("ctaDelete")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t("ctaDelete")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => toggle(a.id)}
                      className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-[#cc6512] hover:bg-[#cc6512]/10 border border-transparent ml-auto"
                      aria-label={isOpen ? t("ctaCollapse") : t("ctaExpand")}
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
