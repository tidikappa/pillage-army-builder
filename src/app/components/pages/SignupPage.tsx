import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { toast } from "sonner";

export function SignupPage() {
  const { signUp, user } = useAuth();
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
      toast.error("Mot de passe : 6 caractères minimum");
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email, password, authorName.trim());
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Compte créé. Vous pouvez maintenant vous connecter.");
    navigate("/login", { replace: true });
  };

  return (
    <div className="max-w-md mx-auto pt-16">
      <Card className="bg-black/50 border-white/10 text-stone-200 rounded-none">
        <CardHeader>
          <CardTitle className="font-serif uppercase tracking-widest text-xl">Inscription</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-stone-400">Pseudo</label>
              <Input
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="rounded-none bg-black/40 border-white/10 mt-1"
                placeholder="Nom affiché dans la galerie"
              />
            </div>
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
                minLength={6}
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
              {submitting ? "..." : "Créer mon compte"}
            </Button>
          </form>
          <p className="text-sm text-stone-400 mt-6 text-center">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-[#cc6512] hover:underline">
              Connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
