import React from "react";
import { useParams, Link } from "react-router-dom";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { factions, ArmyUnit } from "../../data/gameData";
import { ArmyView } from "../pillages/ArmyView";
import { useTranslation } from "../pillages/TranslationContext";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { ArrowLeft, Coins, User } from "lucide-react";

async function fetchArmy(id: string): Promise<SavedArmy | null> {
  const { data } = await supabase
    .from("armies")
    .select("*")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();
  return (data as SavedArmy | null) ?? null;
}

function ArmyColumn({ army }: { army: SavedArmy | null }) {
  const { tData, t } = useTranslation();
  if (!army) {
    return (
      <Card className="bg-black/70 border border-white/15 rounded-none text-stone-200 p-6">
        <p className="italic text-stone-400">{t("compareMissing")}</p>
      </Card>
    );
  }
  const faction = factions.find((f) => f.id === army.faction_id);
  return (
    <Card className="bg-black/70 border border-white/15 rounded-none text-stone-100">
      <CardHeader className="p-5">
        <h3 className="font-serif text-3xl text-stone-100 leading-tight">
          {army.army_name || "Sans nom"}
        </h3>
        <div className="text-sm font-bold uppercase tracking-widest text-[#cc6512] mt-1">
          {faction ? tData("factions", faction.id, faction.name) : army.faction_id}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-stone-300">
          <span className="inline-flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-medium">{army.author_name}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-[#cc6512]" />
            <span className="font-bold text-[#cc6512]">{army.budget}</span>
            <span className="text-stone-400">po</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="border-t border-white/10 pt-4">
        <ArmyView
          factionId={army.faction_id}
          budget={army.budget}
          units={army.units as ArmyUnit[]}
        />
      </CardContent>
    </Card>
  );
}

export function ComparePage() {
  const { a, b } = useParams<{ a: string; b: string }>();
  const { t } = useTranslation();
  const [armies, setArmies] = React.useState<{ a: SavedArmy | null; b: SavedArmy | null } | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured || !a || !b) return;
    Promise.all([fetchArmy(a), fetchArmy(b)]).then(([rA, rB]) => {
      setArmies({ a: rA, b: rB });
    });
  }, [a, b]);

  if (!armies) {
    return (
      <p className="text-stone-300 text-sm font-serif tracking-widest uppercase opacity-70 py-12 text-center">
        Chargement...
      </p>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/galerie">
          <Button
            className="bg-black/60 hover:bg-black/80 text-stone-100 border border-white/20 hover:border-[#cc6512]/60 rounded-none font-bold uppercase tracking-widest text-xs px-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToGallery")}
          </Button>
        </Link>
        <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-stone-100 drop-shadow-md">
          {t("compareTitle")}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArmyColumn army={armies.a} />
        <ArmyColumn army={armies.b} />
      </div>
    </div>
  );
}
