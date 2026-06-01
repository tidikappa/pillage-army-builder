import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { toast } from "sonner";

export function LoginPage() {
  const { signIn, user } = useAuth();
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
      <Card className="bg-black/50 border-white/10 text-stone-200 rounded-none">
        <CardHeader>
          <CardTitle className="font-serif uppercase tracking-widest text-xl">Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-stone-400">Email</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-none bg-black/40 border-white/10 mt-1"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-stone-400">Mot de passe</label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-none bg-black/40 border-white/10 mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#cc6512] hover:bg-[#b0560f] text-white rounded-none font-bold tracking-wider"
            >
              {submitting ? "..." : "Se connecter"}
            </Button>
          </form>
          <p className="text-sm text-stone-400 mt-6 text-center">
            Pas de compte ?{" "}
            <Link to="/signup" className="text-[#cc6512] hover:underline">
              Inscription
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
