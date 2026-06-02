import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { useTranslation } from "../pillages/TranslationContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { toast } from "sonner";

export function LoginPage() {
  const { signIn, user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      const redirect = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(redirect, { replace: true });
    }
  }, [user, navigate, location.state]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Connecté");
  };

  return (
    <div className="max-w-md mx-auto pt-16">
      <Card className="bg-black/70 border-white/15 text-stone-100 rounded-none shadow-2xl">
        <CardHeader className="border-b border-white/10">
          <CardTitle className="font-serif uppercase tracking-widest text-2xl text-[#cc6512] drop-shadow-[0_0_10px_rgba(204,101,18,0.4)]">
            Connexion
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-sm font-bold uppercase tracking-widest text-stone-200">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-none bg-black/60 border-white/20 text-stone-100 h-11 px-4 focus:border-[#cc6512] focus:ring-[#cc6512]/30"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="block text-sm font-bold uppercase tracking-widest text-stone-200">
                Mot de passe
              </label>
              <Input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-none bg-black/60 border-white/20 text-stone-100 h-11 px-4 focus:border-[#cc6512] focus:ring-[#cc6512]/30"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[#cc6512] hover:bg-[#b0560f] text-white rounded-none font-bold tracking-widest uppercase text-sm"
            >
              {submitting ? "..." : "Se connecter"}
            </Button>
            <p className="text-center pt-1">
              <Link
                to="/forgot-password"
                className="text-sm text-stone-300 hover:text-[#cc6512] underline-offset-4 hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </p>
          </form>
          <p className="text-base text-stone-200 mt-8 text-center">
            Pas de compte ?{" "}
            <Link to="/signup" className="text-[#cc6512] font-bold underline-offset-4 hover:underline">
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
