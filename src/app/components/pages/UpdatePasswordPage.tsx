import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "../pillages/TranslationContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { toast } from "sonner";

export function UpdatePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  // True once Supabase has detected the password-recovery session, false on
  // direct page hits without a recovery link.
  const [recoveryReady, setRecoveryReady] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // The supabase-js client picks up the recovery token from the URL hash
    // automatically and emits a PASSWORD_RECOVERY event. We also check the
    // current session in case the event already fired before this listener
    // attached (refresh / direct navigation after Supabase processed the link).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });

    // After a short delay, if no session, give up and tell the user the link
    // is invalid / expired.
    const timeout = window.setTimeout(() => {
      setRecoveryReady((prev) => (prev === null ? false : prev));
    }, 1500);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("passwordsDoNotMatch"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("passwordUpdated"));
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="max-w-md mx-auto pt-16">
      <Card className="bg-black/70 border-white/15 text-stone-100 rounded-none shadow-2xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-serif uppercase tracking-widest text-2xl text-[#cc6512] drop-shadow-[0_0_10px_rgba(204,101,18,0.4)]">
            {t("updatePasswordTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {recoveryReady === null && <p className="text-stone-200">{t("verifyingLink")}</p>}

          {recoveryReady === false && (
            <div className="space-y-4">
              <p className="text-red-400 font-medium leading-relaxed">{t("invalidResetLink")}</p>
              <Button
                onClick={() => navigate("/forgot-password")}
                className="w-full h-11 bg-[#cc6512] hover:bg-[#b0560f] text-white rounded-none font-bold tracking-widest uppercase text-sm"
              >
                {t("requestNewLink")}
              </Button>
            </div>
          )}

          {recoveryReady === true && (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="new-password"
                  className="block text-sm font-bold uppercase tracking-widest text-stone-200"
                >
                  {t("newPassword")}
                </label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-none bg-black/60 border-white/20 text-stone-100 h-11 px-4 focus:border-[#cc6512] focus:ring-[#cc6512]/30"
                />
                <p className="text-xs text-stone-400">{t("passwordHint")}</p>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-bold uppercase tracking-widest text-stone-200"
                >
                  {t("confirmPassword")}
                </label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-none bg-black/60 border-white/20 text-stone-100 h-11 px-4 focus:border-[#cc6512] focus:ring-[#cc6512]/30"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-[#cc6512] hover:bg-[#b0560f] text-white rounded-none font-bold tracking-widest uppercase text-sm"
              >
                {submitting ? "..." : t("updatePasswordCta")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
