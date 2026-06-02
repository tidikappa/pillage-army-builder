import React from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useTranslation } from "../pillages/TranslationContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { toast } from "sonner";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success(t("resetEmailSent"));
  };

  return (
    <div className="max-w-md mx-auto pt-16">
      <Card className="bg-black/70 border-white/15 text-stone-100 rounded-none shadow-2xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-serif uppercase tracking-widest text-2xl text-[#cc6512] drop-shadow-[0_0_10px_rgba(204,101,18,0.4)]">
            {t("forgotPasswordTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {sent ? (
            <div className="space-y-4">
              <p className="text-stone-100 leading-relaxed">{t("resetEmailSentDetails")}</p>
              <p className="text-sm text-stone-400">{t("resetEmailSentTip")}</p>
              <Link
                to="/login"
                className="block text-center text-[#cc6512] font-bold underline-offset-4 hover:underline pt-4"
              >
                {t("backToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-300 mb-5 leading-relaxed">
                {t("forgotPasswordHelp")}
              </p>
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="forgot-email"
                    className="block text-sm font-bold uppercase tracking-widest text-stone-200"
                  >
                    Email
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-none bg-black/60 border-white/20 text-stone-100 h-11 px-4 focus:border-[#cc6512] focus:ring-[#cc6512]/30"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 bg-[#cc6512] hover:bg-[#b0560f] text-white rounded-none font-bold tracking-widest uppercase text-sm"
                >
                  {submitting ? "..." : t("sendResetLink")}
                </Button>
              </form>
              <p className="text-base text-stone-200 mt-8 text-center">
                <Link to="/login" className="text-[#cc6512] font-bold underline-offset-4 hover:underline">
                  {t("backToLogin")}
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
