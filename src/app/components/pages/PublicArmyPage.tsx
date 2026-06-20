import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { factions, ArmyUnit } from "../../data/gameData";
import { ArmyView } from "../pillages/ArmyView";
import { useTranslation } from "../pillages/TranslationContext";
import { useAuth } from "../../lib/AuthContext";
import { Card, CardHeader, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  ArrowLeft,
  Coins,
  User,
  Calendar,
  Star,
  GitFork,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";

export function PublicArmyPage() {
  const { id } = useParams<{ id: string }>();
  const { t, tData } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [army, setArmy] = React.useState<SavedArmy | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFav, setIsFav] = React.useState(false);

  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase n'est pas configuré.");
      setLoading(false);
      return;
    }
    if (!id) {
      setError("Identifiant manquant.");
      setLoading(false);
      return;
    }
    supabase
      .from("armies")
      .select("*")
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
        } else if (!data) {
          setError("Cette liste n'existe pas ou n'est plus publique.");
        } else {
          setArmy(data as SavedArmy);
        }
        setLoading(false);
      });
  }, [id]);

  React.useEffect(() => {
    if (!user || !army) return;
    supabase
      .from("army_favorites")
      .select("army_id")
      .eq("user_id", user.id)
      .eq("army_id", army.id)
      .maybeSingle()
      .then(({ data }) => setIsFav(Boolean(data)));
  }, [user, army]);

  const toggleFavorite = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/galerie/${id}` } });
      return;
    }
    if (!army) return;
    if (isFav) {
      setIsFav(false);
      const { error } = await supabase
        .from("army_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("army_id", army.id);
      if (error) {
        toast.error(error.message);
        setIsFav(true);
      }
    } else {
      setIsFav(true);
      const { error } = await supabase
        .from("army_favorites")
        .insert({ user_id: user.id, army_id: army.id });
      if (error) {
        toast.error(error.message);
        setIsFav(false);
      }
    }
  };

  const forkIntoBuilder = () => {
    if (!army) return;
    navigate("/", {
      state: {
        loadArmy: {
          armyName: `${t("forkPrefix")} ${army.army_name || ""}`.trim(),
          factionId: army.faction_id,
          budget: army.budget,
          units: army.units as ArmyUnit[],
        },
      },
    });
    toast.success(t("forkLoaded"));
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("linkCopyFailed"));
    }
  };

  if (loading) {
    return (
      <p className="text-stone-300 text-sm font-serif tracking-widest uppercase opacity-70 py-12 text-center">
        Chargement...
      </p>
    );
  }

  if (error || !army) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-3xl font-bold font-['UnifrakturCook'] text-stone-100 drop-shadow-md">
          {t("publicArmyNotFoundTitle")}
        </h2>
        <p className="text-stone-200">{error}</p>
        <Link to="/galerie">
          <Button className="bg-[#cc6512] hover:bg-[#b0560f] text-white rounded-none font-bold uppercase tracking-widest mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToGallery")}
          </Button>
        </Link>
      </div>
    );
  }

  const faction = factions.find((f) => f.id === army.faction_id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/galerie">
          <Button
            className="bg-black/60 hover:bg-black/80 text-stone-100 border border-white/20 hover:border-[#cc6512]/60 rounded-none font-bold uppercase tracking-widest text-xs px-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToGallery")}
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button
            onClick={copyLink}
            variant="ghost"
            className="text-stone-200 hover:text-[#cc6512] rounded-none font-bold uppercase tracking-widest text-xs border border-white/15"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            {t("copyLink")}
          </Button>
          <Button
            onClick={toggleFavorite}
            variant="ghost"
            className={`rounded-none font-bold uppercase tracking-widest text-xs border ${
              isFav
                ? "text-amber-300 border-amber-400/60 bg-amber-500/20 hover:bg-amber-500/30"
                : "text-stone-200 border-white/15 hover:text-amber-400"
            }`}
          >
            <Star className={`w-4 h-4 mr-2 ${isFav ? "fill-current" : ""}`} />
            {isFav ? t("favoriteRemove") : t("favoriteAdd")}
          </Button>
          <Button
            onClick={forkIntoBuilder}
            className="bg-[#cc6512] hover:bg-[#b0560f] text-white rounded-none font-bold uppercase tracking-widest text-xs"
          >
            <GitFork className="w-4 h-4 mr-2" />
            {t("forkInBuilder")}
          </Button>
        </div>
      </div>

      <Card className="bg-black/70 rounded-none text-stone-100 shadow-xl border border-white/15">
        <CardHeader className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="font-['UnifrakturCook'] text-4xl text-stone-100 leading-tight drop-shadow-sm">
                {army.army_name || "Sans nom"}
              </h2>
              <div className="text-sm font-bold uppercase tracking-widest text-[#cc6512] mt-1">
                {faction ? tData("factions", faction.id, faction.name) : army.faction_id}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-stone-300">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-medium">{army.author_name}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  {new Date(army.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-[#cc6512]/15 border border-[#cc6512]/40 px-3 py-1.5">
              <Coins className="w-4 h-4 text-[#cc6512]" />
              <span className="text-lg font-['UnifrakturCook'] font-bold text-[#cc6512] leading-none">
                {army.budget}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#cc6512]/80 ml-0.5">
                po
              </span>
            </div>
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
    </div>
  );
}
