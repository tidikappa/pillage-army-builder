import React from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { factions, ArmyUnit } from "../../data/gameData";
import { useAuth } from "../../lib/AuthContext";
import { useTranslation } from "../pillages/TranslationContext";
import { ArmyView } from "../pillages/ArmyView";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2, Edit, Globe, Lock } from "lucide-react";

export function MyListsPage() {
  const { user, loading } = useAuth();
  const { tData } = useTranslation();
  const navigate = useNavigate();
  const [armies, setArmies] = React.useState<SavedArmy[]>([]);
  const [fetching, setFetching] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);

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

  if (loading) return <p className="text-stone-300">Chargement...</p>;
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-[#232221]">Mes listes</h2>

      {fetching && <p className="text-stone-300">Chargement...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!fetching && !error && armies.length === 0 && (
        <p className="text-stone-400 italic">
          Aucune liste sauvegardée. <Link to="/" className="text-[#cc6512] hover:underline">Construire une armée</Link>.
        </p>
      )}

      <ul className="space-y-4">
        {armies.map((a) => {
          const faction = factions.find((f) => f.id === a.faction_id);
          const isOpen = expanded.has(a.id);
          return (
            <li key={a.id}>
              <Card className="bg-black/50 border-white/10 rounded-none text-stone-200">
                <CardHeader className="cursor-pointer" onClick={() => toggle(a.id)}>
                  <CardTitle className="flex justify-between items-center font-serif tracking-wide gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xl flex items-center gap-2">
                        {a.army_name || "Sans nom"}
                        {a.is_public ? (
                          <Globe className="w-4 h-4 text-[#cc6512]" aria-label="Publique" />
                        ) : (
                          <Lock className="w-4 h-4 text-stone-500" aria-label="Privée" />
                        )}
                      </div>
                      <div className="text-xs text-stone-400 uppercase tracking-widest mt-1">
                        {faction ? tData("factions", faction.id, faction.name) : a.faction_id} ·{" "}
                        {a.budget} po · {new Date(a.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadIntoBuilder(a)}
                        className="text-stone-300 hover:text-[#cc6512]"
                        title="Charger dans le builder"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublish(a)}
                        className="text-stone-300 hover:text-[#cc6512]"
                        title={a.is_public ? "Retirer de la galerie" : "Publier dans la galerie"}
                      >
                        {a.is_public ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(a.id)}
                        className="text-stone-400 hover:text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                {isOpen && (
                  <CardContent>
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
