import React from "react";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { factions, ArmyUnit } from "../../data/gameData";
import { ArmyView } from "../pillages/ArmyView";
import { useTranslation } from "../pillages/TranslationContext";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export function GalleryPage() {
  const { tData } = useTranslation();
  const [armies, setArmies] = React.useState<SavedArmy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-[#232221]">
        Galerie des armées
      </h2>

      {loading && <p className="text-stone-300">Chargement...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && armies.length === 0 && (
        <p className="text-stone-400 italic">Aucune liste publiée pour l'instant.</p>
      )}

      <ul className="space-y-4">
        {armies.map((a) => {
          const faction = factions.find((f) => f.id === a.faction_id);
          const isOpen = expanded.has(a.id);
          return (
            <li key={a.id}>
              <Card className="bg-black/50 border-white/10 rounded-none text-stone-200">
                <CardHeader className="cursor-pointer" onClick={() => toggle(a.id)}>
                  <CardTitle className="flex justify-between items-center font-serif tracking-wide">
                    <div>
                      <div className="text-xl">{a.army_name || "Sans nom"}</div>
                      <div className="text-xs text-stone-400 uppercase tracking-widest mt-1">
                        {faction ? tData("factions", faction.id, faction.name) : a.faction_id} ·{" "}
                        {a.author_name} · {a.budget} po ·{" "}
                        {new Date(a.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-stone-400">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>
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
