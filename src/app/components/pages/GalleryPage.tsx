import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { factions, ArmyUnit } from "../../data/gameData";
import { ArmyView } from "../pillages/ArmyView";
import { useTranslation } from "../pillages/TranslationContext";
import { useAuth } from "../../lib/AuthContext";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp, Coins, User, Calendar, ShieldAlert, Trash2, AlertTriangle, Star, GitFork } from "lucide-react";
import { toast } from "sonner";
import { validateArmy } from "../pillages/validation";

const ALL = "__all__";
const FAVORITES = "__favorites__";

export function GalleryPage() {
  const { t, tData } = useTranslation();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [armies, setArmies] = React.useState<SavedArmy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [factionFilter, setFactionFilter] = React.useState<string>(ALL);
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

  const factionFiltered =
    factionFilter === ALL ? armies : armies.filter((a) => a.faction_id === factionFilter);
  const filtered = showFavoritesOnly
    ? factionFiltered.filter((a) => favorites.has(a.id))
    : factionFiltered;

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

      {/* Faction filter */}
      {armies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-stone-200 mr-1">
            {t("factionFilterLabel")}
          </span>
          <button
            onClick={() => setFactionFilter(ALL)}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-all ${
              factionFilter === ALL
                ? "bg-[#cc6512] border-[#cc6512] text-white shadow-[0_0_10px_rgba(204,101,18,0.4)]"
                : "bg-black/40 border-white/15 text-stone-300 hover:border-[#cc6512]/50 hover:text-stone-100"
            }`}
          >
            {t("allFactionsLabel")} ({armies.length})
          </button>
          {user && (
            <button
              onClick={() => setShowFavoritesOnly((v) => !v)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-all inline-flex items-center gap-1 ${
                showFavoritesOnly
                  ? "bg-amber-500 border-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                  : "bg-black/40 border-white/15 text-stone-300 hover:border-amber-500/60 hover:text-stone-100"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
              {t("favoritesFilter")} ({favorites.size})
            </button>
          )}
          {availableFactions.map((f) => {
            const count = armies.filter((a) => a.faction_id === f.id).length;
            const active = factionFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFactionFilter(f.id)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-all ${
                  active
                    ? "bg-[#cc6512] border-[#cc6512] text-white shadow-[0_0_10px_rgba(204,101,18,0.4)]"
                    : "bg-black/40 border-white/15 text-stone-300 hover:border-[#cc6512]/50 hover:text-stone-100"
                }`}
              >
                {tData("factions", f.id, f.name)} ({count})
              </button>
            );
          })}
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
                      <h3 className="font-['UnifrakturCook'] text-3xl text-stone-100 leading-tight drop-shadow-sm">
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
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="inline-flex items-center gap-1.5 bg-[#cc6512]/15 border border-[#cc6512]/40 px-3 py-1.5">
                        <Coins className="w-4 h-4 text-[#cc6512]" />
                        <span className="text-lg font-['UnifrakturCook'] font-bold text-[#cc6512] leading-none">
                          {a.budget}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-[#cc6512]/80 ml-0.5">
                          po
                        </span>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(a.id)}
                          className={`h-8 w-8 rounded-none transition-all ${
                            isFav
                              ? "bg-amber-500/25 border border-amber-400/70 text-amber-300 hover:bg-amber-500/35 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                              : "text-stone-400 hover:text-amber-400"
                          }`}
                          title={isFav ? t("favoriteRemove") : t("favoriteAdd")}
                          aria-label={isFav ? t("favoriteRemove") : t("favoriteAdd")}
                        >
                          <Star className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => forkIntoBuilder(a)}
                          className="text-stone-300 hover:text-[#cc6512] h-8 w-8"
                          title={t("forkInBuilder")}
                          aria-label={t("forkInBuilder")}
                        >
                          <GitFork className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => adminDelete(a)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-950/40 h-8 w-8"
                            title="Supprimer (modération)"
                            aria-label="Supprimer en tant que modérateur"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggle(a.id)}
                          className="text-stone-300 hover:text-[#cc6512] h-8 w-8"
                          aria-label={isOpen ? "Replier" : "Déplier"}
                        >
                          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </Button>
                      </div>
                    </div>
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
