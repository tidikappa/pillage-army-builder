import React from "react";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { factions, ArmyUnit } from "../../data/gameData";
import { ArmyView } from "../pillages/ArmyView";
import { useTranslation } from "../pillages/TranslationContext";
import { useAuth } from "../../lib/AuthContext";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp, Coins, User, Calendar, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ALL = "__all__";

export function GalleryPage() {
  const { tData } = useTranslation();
  const { isAdmin } = useAuth();
  const [armies, setArmies] = React.useState<SavedArmy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [factionFilter, setFactionFilter] = React.useState<string>(ALL);

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

  const filtered = factionFilter === ALL ? armies : armies.filter((a) => a.faction_id === factionFilter);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-[#232221]">
        Galerie des armées
      </h2>

      {isAdmin && (
        <div className="bg-red-950/60 border border-red-700/50 px-4 py-3 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-100">
            <span className="font-bold uppercase tracking-widest">Mode modérateur actif.</span>{" "}
            Vous pouvez supprimer n'importe quelle liste publiée.
          </p>
        </div>
      )}

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

      {loading && <p className="text-stone-200">Chargement...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && armies.length === 0 && (
        <p className="text-stone-200 italic">Aucune liste publiée pour l'instant.</p>
      )}
      {!loading && !error && armies.length > 0 && filtered.length === 0 && (
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
                      </div>
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
