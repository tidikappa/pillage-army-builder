import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { useTranslation } from "../pillages/TranslationContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { toast } from "sonner";

export function SignupPage() {
  const { signUp, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [authorName, setAuthorName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email, password, authorName.trim());
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t("signupSuccess"));
    navigate("/login", { replace: true });
  };

  return (
    <div className="max-w-md mx-auto pt-16">
      <Card className="bg-black/70 border-white/15 text-stone-100 rounded-none shadow-2xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-serif uppercase tracking-widest text-2xl text-[#cc6512] drop-shadow-[0_0_10px_rgba(204,101,18,0.4)]">
            {t("signupTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="signup-pseudo" className="block text-sm font-bold uppercase tracking-widest text-stone-200">
                {t("signupPseudoLabel")}
              </label>
              <Input
                id="signup-pseudo"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="rounded-none bg-black/60 border-white/20 text-stone-100 h-11 px-4 focus:border-[#cc6512] focus:ring-[#cc6512]/30"
                placeholder={t("signupPseudoPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-email" className="block text-sm font-bold uppercase tracking-widest text-stone-200">
                {t("emailLabel")}
              </label>
              <Input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-none bg-black/60 border-white/20 text-stone-100 h-11 px-4 focus:border-[#cc6512] focus:ring-[#cc6512]/30"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="signup-password" className="block text-sm font-bold uppercase tracking-widest text-stone-200">
                {t("passwordLabel")}
              </label>
              <Input
                id="signup-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-none bg-black/60 border-white/20 text-stone-100 h-11 px-4 focus:border-[#cc6512] focus:ring-[#cc6512]/30"
              />
              <p className="text-xs text-stone-400">{t("passwordMinLength")}</p>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[#cc6512] hover:bg-[#b0560f] text-white rounded-none font-bold tracking-widest uppercase text-sm"
            >
              {submitting ? "..." : t("signupSubmit")}
            </Button>
          </form>
          <p className="text-base text-stone-200 mt-8 text-center">
            {t("signupHaveAccount")}{" "}
            <Link to="/login" className="text-[#cc6512] font-bold underline-offset-4 hover:underline">
              {t("signupToLogin")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
