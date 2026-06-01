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
} from "lucide-react";

const ALL = "__all__";

export function MyListsPage() {
  const { user, loading } = useAuth();
  const { tData } = useTranslation();
  const navigate = useNavigate();
  const [armies, setArmies] = React.useState<SavedArmy[]>([]);
  const [fetching, setFetching] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [factionFilter, setFactionFilter] = React.useState<string>(ALL);

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
  const filtered = factionFilter === ALL ? armies : armies.filter((a) => a.faction_id === factionFilter);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-[#232221]">Mes listes</h2>

      {/* Faction filter */}
      {armies.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-stone-200 mr-1">
            Faction :
          </span>
          <button
            onClick={() => setFactionFilter(ALL)}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-all ${
              factionFilter === ALL
                ? "bg-[#cc6512] border-[#cc6512] text-white shadow-[0_0_10px_rgba(204,101,18,0.4)]"
                : "bg-black/40 border-white/15 text-stone-300 hover:border-[#cc6512]/50 hover:text-stone-100"
            }`}
          >
            Toutes ({armies.length})
          </button>
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
        <p className="text-stone-200 italic">Aucune armée pour cette faction.</p>
      )}

      <ul className="space-y-4">
        {filtered.map((a) => {
          const faction = factions.find((f) => f.id === a.faction_id);
          const isOpen = expanded.has(a.id);
          return (
            <li key={a.id}>
              <Card className="bg-black/70 border-white/15 rounded-none text-stone-100 shadow-xl hover:border-[#cc6512]/40 transition-colors">
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
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
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
                          onClick={() => loadIntoBuilder(a)}
                          className="text-stone-300 hover:text-[#cc6512] hover:bg-white/5 h-8 w-8"
                          title="Charger dans le builder"
                          aria-label="Charger dans le builder"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePublish(a)}
                          className="text-stone-300 hover:text-[#cc6512] hover:bg-white/5 h-8 w-8"
                          title={a.is_public ? "Retirer de la galerie" : "Publier dans la galerie"}
                          aria-label={a.is_public ? "Retirer de la galerie" : "Publier dans la galerie"}
                        >
                          {a.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(a.id)}
                          className="text-stone-400 hover:text-red-400 hover:bg-red-950/30 h-8 w-8"
                          title="Supprimer"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggle(a.id)}
                          className="text-stone-300 hover:text-[#cc6512] hover:bg-white/5 h-8 w-8"
                          aria-label={isOpen ? "Replier" : "Déplier"}
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
