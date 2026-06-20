import React from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { useTranslation } from "./TranslationContext";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

// Local-storage key used to prevent the same anonymous visitor from spamming
// reports on the same army from the same browser. The DB also enforces a
// uniqueness constraint per (army_id, reporter_user_id) for connected users.
const REPORTED_KEY = "pillage_reported_armies_v1";

function getLocallyReported(): Set<string> {
  try {
    const raw = localStorage.getItem(REPORTED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function markLocallyReported(armyId: string) {
  const set = getLocallyReported();
  set.add(armyId);
  try {
    localStorage.setItem(REPORTED_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage may be disabled (private mode), we silently ignore.
  }
}

export function ReportArmyButton({ army }: { army: SavedArmy }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [alreadyReported, setAlreadyReported] = React.useState(() =>
    getLocallyReported().has(army.id)
  );

  const submit = async () => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase non configuré.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("army_reports").insert({
      army_id: army.id,
      reporter_user_id: user?.id ?? null,
      reason: reason.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      // 23505 = unique_violation : un user connecté qui re-signale la même liste.
      if (error.code === "23505") {
        markLocallyReported(army.id);
        setAlreadyReported(true);
        toast.info(t("reportAlready"));
        setOpen(false);
        return;
      }
      toast.error(error.message);
      return;
    }
    markLocallyReported(army.id);
    setAlreadyReported(true);
    setOpen(false);
    setReason("");
    toast.success(t("reportSent"));
  };

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          if (alreadyReported) {
            toast.info(t("reportAlready"));
            return;
          }
          if (!user) {
            // Reporting now requires authentication (RLS restricted to
            // authenticated users to prevent anonymous spam).
            navigate("/login", { state: { from: "/galerie" } });
            return;
          }
          setOpen(true);
        }}
        className={`h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border border-transparent ${
          alreadyReported
            ? "text-stone-600 cursor-not-allowed"
            : "text-stone-300 hover:text-red-400 hover:bg-red-500/10"
        }`}
        title={alreadyReported ? t("reportAlready") : t("reportTitle")}
        aria-label={t("reportTitle")}
      >
        <Flag className="w-3.5 h-3.5" />
        <span>{t("ctaReport")}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#1c1917] border-2 border-red-700/40 text-stone-100 rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['UnifrakturCook'] text-2xl text-red-300 flex items-center gap-2">
              <Flag className="w-5 h-5" />
              {t("reportTitle")}
            </DialogTitle>
            <DialogDescription className="text-stone-300">
              {t("reportDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs text-stone-400">
              <span className="uppercase tracking-widest">{t("reportArmyLabel")} : </span>
              <span className="text-stone-200">{army.army_name || "Sans nom"}</span>
              <span className="text-stone-500"> — {army.author_name}</span>
            </div>
            <div>
              <Label htmlFor="report-reason" className="text-stone-200 text-xs uppercase tracking-widest">
                {t("reportReasonLabel")}
              </Label>
              <Textarea
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reportReasonPlaceholder")}
                maxLength={500}
                rows={4}
                className="mt-1 bg-black/60 border-stone-700 text-stone-100 rounded-none"
              />
              <p className="text-[10px] text-stone-500 mt-1">{reason.length} / 500</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-stone-300 hover:text-stone-100 rounded-none"
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-red-700 hover:bg-red-600 text-white rounded-none font-bold uppercase tracking-widest"
            >
              {submitting ? "..." : t("reportSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
