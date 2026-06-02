import React from "react";
import { Navigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ShieldAlert, Trash2, Search, Crown, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface AdminUserRow {
  id: string;
  email: string;
  author_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  armies_count: number;
  is_admin: boolean;
}

export function AdminUsersPage() {
  const { user, isAdmin, loading } = useAuth();
  const [rows, setRows] = React.useState<AdminUserRow[]>([]);
  const [fetching, setFetching] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [nameDraft, setNameDraft] = React.useState("");
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const fetchUsers = React.useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError("Supabase n'est pas configuré.");
      setFetching(false);
      return;
    }
    setFetching(true);
    const { data, error } = await supabase.rpc("get_users_admin");
    if (error) {
      setError(error.message);
    } else {
      setRows((data as AdminUserRow[]) ?? []);
      setError(null);
    }
    setFetching(false);
  }, []);

  React.useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  if (loading) return <p className="text-stone-200">Chargement...</p>;
  if (!user) return <Navigate to="/login" state={{ from: "/admin/users" }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const startRename = (row: AdminUserRow) => {
    setEditingId(row.id);
    setNameDraft(row.author_name);
  };
  const cancelRename = () => {
    setEditingId(null);
    setNameDraft("");
  };
  const commitRename = async (row: AdminUserRow) => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      toast.error("Le pseudo ne peut pas être vide.");
      return;
    }
    if (trimmed === row.author_name) {
      cancelRename();
      return;
    }
    setSavingId(row.id);
    const { error } = await supabase.rpc("update_user_author_name_admin", {
      target_id: row.id,
      new_name: trimmed,
    });
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Renommé en "${trimmed}".`);
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, author_name: trimmed } : r)));
    cancelRename();
  };

  const deleteUser = async (row: AdminUserRow) => {
    if (row.id === user.id) {
      toast.error("Tu ne peux pas supprimer ton propre compte ici.");
      return;
    }
    const label = row.author_name || row.email;
    if (
      !confirm(
        `Supprimer définitivement ${label} ?\n\nSes ${row.armies_count} liste(s) d'armée seront aussi supprimées.`
      )
    )
      return;
    const { error } = await supabase.rpc("delete_user_admin", { target_id: row.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${label} supprimé.`);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const filtered = rows.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.email.toLowerCase().includes(q) ||
      r.author_name.toLowerCase().includes(q)
    );
  });

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-[#232221]">
          Administration — Utilisateurs
        </h2>
        <span className="text-sm text-stone-200 bg-black/40 px-3 py-1 border border-white/10">
          {rows.length} compte{rows.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-red-950/60 border border-red-700/50 px-4 py-3 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <p className="text-sm text-red-100 leading-relaxed">
          <span className="font-bold uppercase tracking-widest">Zone modérateur.</span>{" "}
          La suppression d'un compte est définitive : toutes ses listes d'armée disparaissent
          aussi.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par email ou pseudo..."
          className="pl-10 rounded-none bg-black/60 border-white/15 text-stone-100 h-11"
        />
      </div>

      {fetching && <p className="text-stone-200">Chargement de la liste...</p>}
      {error && (
        <div className="bg-red-950/40 border border-red-700/40 p-4 text-sm text-red-200 space-y-2">
          <p className="font-bold">Erreur : {error}</p>
          <p>
            Cette page nécessite que les fonctions <code>get_users_admin</code> et{" "}
            <code>delete_user_admin</code> soient créées dans Supabase. Voir{" "}
            <code>SUPABASE_SETUP.md</code>, section 6.b.
          </p>
        </div>
      )}

      {!fetching && !error && (
        <div className="overflow-x-auto bg-black/60 border border-white/15">
          <table className="w-full text-sm text-stone-100">
            <thead className="bg-black/60 border-b border-white/15 text-stone-300 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="text-left px-3 py-3 font-bold">Pseudo / Email</th>
                <th className="text-left px-3 py-3 font-bold">Inscrit le</th>
                <th className="text-left px-3 py-3 font-bold">Dernière co.</th>
                <th className="text-right px-3 py-3 font-bold">Listes</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center italic text-stone-400">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-3 py-3">
                    {editingId === row.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(row);
                            if (e.key === "Escape") cancelRename();
                          }}
                          className="rounded-none bg-black/60 border-white/20 text-stone-100 h-8 px-2 max-w-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={savingId === row.id}
                          onClick={() => commitRename(row)}
                          className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                          aria-label="Valider"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelRename}
                          className="h-7 w-7 text-stone-400 hover:text-stone-200"
                          aria-label="Annuler"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{row.author_name || "—"}</span>
                          <button
                            type="button"
                            onClick={() => startRename(row)}
                            className="text-stone-400 hover:text-[#cc6512] transition-colors p-0.5"
                            aria-label="Renommer ce compte"
                            title="Renommer ce compte"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {row.is_admin && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-0.5 bg-[#cc6512]/20 border border-[#cc6512]/50 text-[#cc6512] font-bold">
                              <Crown className="w-3 h-3" /> Admin
                            </span>
                          )}
                          {row.id === user.id && (
                            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
                              Toi
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5">{row.email}</div>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-stone-300 whitespace-nowrap">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-3 py-3 text-xs text-stone-300 whitespace-nowrap">
                    {formatDate(row.last_sign_in_at)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold">
                    {row.armies_count}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={row.id === user.id}
                      onClick={() => deleteUser(row)}
                      className="text-stone-300 hover:text-red-400 hover:bg-red-950/30 h-8 w-8 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={row.id === user.id ? "Tu ne peux pas te supprimer toi-même" : "Supprimer"}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
