import React from "react";
import { Navigate } from "react-router-dom";
import { supabase, isSupabaseConfigured, SavedArmy } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import {
  factions,
  ArmyUnit,
  getEffectiveFaction,
  Equipment,
} from "../../data/gameData";
import { useTranslation } from "../pillages/TranslationContext";
import { Card } from "../ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { Users, Layers, Heart, Flag, Eye, TrendingUp, AlertTriangle, Trash2, Check, X, ExternalLink, UserX } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { validateArmy } from "../pillages/validation";

type AdminStats = {
  total_users: number;
  total_armies: number;
  public_armies: number;
  pending_reports: number;
  total_favorites: number;
  visitors_week: number;
  visitors_month: number;
  page_views_week: number;
  page_views_month: number;
  inactive_users_90d: number;
  signups_30d: Array<{ date: string; count: number }>;
  armies_30d: Array<{ date: string; count: number }>;
  visitors_30d: Array<{ date: string; count: number }>;
};

type TopAuthor = { author_name: string; favorites: number };
type TopArmy = { id: string; army_name: string; author_name: string; faction_id: string; favorites: number };

type Report = {
  id: string;
  army_id: string;
  reporter_user_id: string | null;
  reason: string | null;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
};

type ReportWithArmy = Report & { army?: SavedArmy };

type InactiveUser = {
  id: string;
  email: string;
  author_name: string;
  created_at: string;
  last_sign_in_at: string | null;
};

const FACTION_COLORS = [
  "#cc6512", "#0F5F5E", "#b91c1c", "#7c3aed", "#f59e0b",
  "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4",
  "#84cc16", "#f43f5e", "#a855f7", "#14b8a6", "#eab308",
];

function Counter({
  label,
  value,
  icon: Icon,
  hint,
  accent = "text-[#cc6512]",
}: {
  label: string;
  value: number | string;
  icon: any;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card className="bg-black/70 border border-white/15 rounded-none p-4 text-stone-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
            {label}
          </div>
          <div className={`mt-1 font-['UnifrakturCook'] text-3xl ${accent} leading-none`}>
            {value}
          </div>
          {hint && (
            <div className="text-[10px] text-stone-500 mt-1.5">{hint}</div>
          )}
        </div>
        <Icon className={`w-5 h-5 shrink-0 ${accent}`} />
      </div>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-[#232221] mt-8 mb-3 border-b border-[#232221]/30 pb-2">
      {children}
    </h3>
  );
}

export function AdminStatsPage() {
  const { user, isAdmin, loading } = useAuth();
  const { t, tData } = useTranslation();
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [publicArmies, setPublicArmies] = React.useState<SavedArmy[]>([]);
  const [topAuthors, setTopAuthors] = React.useState<TopAuthor[]>([]);
  const [topArmies, setTopArmies] = React.useState<TopArmy[]>([]);
  const [reports, setReports] = React.useState<ReportWithArmy[]>([]);
  const [inactiveUsers, setInactiveUsers] = React.useState<InactiveUser[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [fetching, setFetching] = React.useState(true);

  React.useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured) return;

    const load = async () => {
      setFetching(true);
      const [statsRes, armiesRes, favsRes, reportsRes, inactiveRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.from("armies").select("*").eq("is_public", true),
        supabase.rpc("get_admin_top_favorites"),
        supabase
          .from("army_reports")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase.rpc("get_admin_inactive_users"),
      ]);

      if (statsRes.error) setError(statsRes.error.message);
      else setStats(statsRes.data as AdminStats);

      if (!armiesRes.error) setPublicArmies((armiesRes.data as SavedArmy[]) ?? []);

      if (!favsRes.error && favsRes.data) {
        const payload = favsRes.data as { top_authors: TopAuthor[]; top_armies: TopArmy[] };
        setTopAuthors(payload.top_authors ?? []);
        setTopArmies(payload.top_armies ?? []);
      }

      if (!reportsRes.error && reportsRes.data) {
        const list = reportsRes.data as Report[];
        // Hydrate each report with the targeted army (best-effort, may be 404).
        const hydrated = await Promise.all(
          list.map(async (r) => {
            const { data } = await supabase
              .from("armies")
              .select("*")
              .eq("id", r.army_id)
              .maybeSingle();
            return { ...r, army: (data as SavedArmy | null) ?? undefined };
          })
        );
        setReports(hydrated);
      }

      if (!inactiveRes.error && inactiveRes.data) {
        setInactiveUsers((inactiveRes.data as InactiveUser[]) ?? []);
      }

      setFetching(false);
    };

    void load();
  }, [isAdmin]);

  const markReport = async (id: string, nextStatus: "reviewed" | "dismissed") => {
    const { error: e } = await supabase.from("army_reports").update({ status: nextStatus }).eq("id", id);
    if (e) {
      toast.error(e.message);
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
    toast.success(nextStatus === "reviewed" ? t("reportMarkedReviewed") : t("reportDismissed"));
  };

  const deleteReportedArmy = async (report: ReportWithArmy) => {
    if (!report.army) {
      // Army already gone, just close the report.
      await markReport(report.id, "reviewed");
      return;
    }
    if (!confirm(t("reportDeleteConfirm").replace("$1", report.army.army_name || "Sans nom"))) return;
    const { error: e } = await supabase.from("armies").delete().eq("id", report.army.id);
    if (e) {
      toast.error(e.message);
      return;
    }
    // The army is gone, mark all its pending reports as reviewed (cascade
    // deletes army_reports rows via the FK, so just refresh state).
    setReports((prev) => prev.filter((r) => r.army?.id !== report.army?.id));
    setPublicArmies((prev) => prev.filter((a) => a.id !== report.army?.id));
    toast.success(t("reportArmyDeleted"));
  };

  if (loading) return <p className="text-stone-200">Chargement...</p>;
  if (!user) return <Navigate to="/login" state={{ from: "/admin/stats" }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  // Aggregations from public armies (client-side, no PII).
  const factionDistribution = React.useMemo(() => {
    const counts = new Map<string, number>();
    publicArmies.forEach((a) => {
      counts.set(a.faction_id, (counts.get(a.faction_id) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([id, count]) => {
        const f = factions.find((x) => x.id === id);
        return {
          id,
          name: f ? tData("factions", f.id, f.name) : id,
          value: count,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [publicArmies, tData]);

  const equipAndTalentTops = React.useMemo(() => {
    const equipCounts = new Map<string, { count: number; label: string }>();
    const talentCounts = new Map<string, { count: number; label: string; factionId: string }>();
    publicArmies.forEach((a) => {
      const main = factions.find((f) => f.id === a.faction_id);
      if (!main) return;
      (a.units as ArmyUnit[]).forEach((u) => {
        const effective = getEffectiveFaction(u, main);
        const qty = u.quantity || 1;
        u.equipment.forEach((id) => {
          const eq = effective.availableEquipment.find((e) => e.id === id) as Equipment | undefined;
          if (!eq) return;
          const eqName = tData("equipment", eq.id, eq.name);
          if (eq.type === "talent") {
            const prev = talentCounts.get(`${effective.id}:${eq.id}`);
            talentCounts.set(`${effective.id}:${eq.id}`, {
              count: (prev?.count ?? 0) + 1,
              label: `${eqName} · ${tData("factions", effective.id, effective.name)}`,
              factionId: effective.id,
            });
          } else if (eq.id !== "ran_none" && eq.id !== "prot_none") {
            const prev = equipCounts.get(eq.id);
            equipCounts.set(eq.id, {
              count: (prev?.count ?? 0) + qty,
              label: eqName,
            });
          }
        });
      });
    });
    const topEquip = [...equipCounts.entries()]
      .map(([id, v]) => ({ id, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const topTalents = [...talentCounts.entries()]
      .map(([id, v]) => ({ id, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return { topEquip, topTalents };
  }, [publicArmies, tData]);

  const budgetBuckets = React.useMemo(() => {
    const buckets = [
      { label: "≤ 250 po", min: 0, max: 250, count: 0 },
      { label: "251–500 po", min: 251, max: 500, count: 0 },
      { label: "501–600 po", min: 501, max: 600, count: 0 },
      { label: "601–800 po", min: 601, max: 800, count: 0 },
      { label: "> 800 po", min: 801, max: Infinity, count: 0 },
    ];
    publicArmies.forEach((a) => {
      const b = buckets.find((x) => a.budget >= x.min && a.budget <= x.max);
      if (b) b.count += 1;
    });
    return buckets;
  }, [publicArmies]);

  // Per-faction role mix (warlord / warrior / cavalry / shooter) averaged
  // across all public armies of that faction.
  const factionRoleMix = React.useMemo(() => {
    const acc = new Map<string, { lists: number; warlord: number; warrior: number; cavalry: number; shooter: number; models: number }>();
    publicArmies.forEach((a) => {
      const main = factions.find((f) => f.id === a.faction_id);
      if (!main) return;
      const key = a.faction_id;
      const entry = acc.get(key) ?? { lists: 0, warlord: 0, warrior: 0, cavalry: 0, shooter: 0, models: 0 };
      entry.lists += 1;
      (a.units as ArmyUnit[]).forEach((u) => {
        const effective = getEffectiveFaction(u, main);
        const qty = u.quantity || 1;
        entry.models += qty;
        if (u.unitTypeId === "warlord") entry.warlord += qty;
        else if (u.unitTypeId === "warrior") entry.warrior += qty;
        const hasHorse = u.equipment.includes("spec_horse");
        const hasRanged = u.equipment.some((id) => {
          const eq = effective.availableEquipment.find((e) => e.id === id);
          return (eq?.type === "ranged" && eq.id !== "ran_none") || id === "mel_hasta";
        });
        if (hasHorse) entry.cavalry += qty;
        else if (hasRanged) entry.shooter += qty;
      });
      acc.set(key, entry);
    });
    return [...acc.entries()]
      .map(([id, v]) => {
        const f = factions.find((x) => x.id === id);
        const total = v.models || 1;
        return {
          id,
          name: f ? tData("factions", f.id, f.name) : id,
          lists: v.lists,
          warlordPct: Math.round((v.warlord / total) * 100),
          warriorPct: Math.round((v.warrior / total) * 100),
          cavalryPct: Math.round((v.cavalry / total) * 100),
          shooterPct: Math.round((v.shooter / total) * 100),
        };
      })
      .sort((a, b) => b.lists - a.lists);
  }, [publicArmies, tData]);

  // Lists violating at least one rule, dummy translator so we don't
  // double-i18n inside the dashboard.
  const violatingArmies = React.useMemo(() => {
    const idTrans = (k: string) => k;
    return publicArmies.filter((a) => {
      const f = factions.find((x) => x.id === a.faction_id);
      if (!f) return false;
      return validateArmy(a.units as ArmyUnit[], f, idTrans).length > 0;
    });
  }, [publicArmies]);

  const timeseries = React.useMemo(() => {
    if (!stats) return [];
    // Merge signups, armies, visitors keyed by date so we have one row per
    // day with 3 series, even when some series miss days.
    const dates = new Set<string>();
    stats.signups_30d?.forEach((p) => dates.add(p.date));
    stats.armies_30d?.forEach((p) => dates.add(p.date));
    stats.visitors_30d?.forEach((p) => dates.add(p.date));
    const sorted = [...dates].sort();
    const mapOf = (arr: Array<{ date: string; count: number }> | undefined) => {
      const m = new Map<string, number>();
      arr?.forEach((p) => m.set(p.date, p.count));
      return m;
    };
    const su = mapOf(stats.signups_30d);
    const ar = mapOf(stats.armies_30d);
    const vi = mapOf(stats.visitors_30d);
    return sorted.map((d) => ({
      date: d.slice(5), // MM-DD for compact axis
      signups: su.get(d) ?? 0,
      armies: ar.get(d) ?? 0,
      visitors: vi.get(d) ?? 0,
    }));
  }, [stats]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-[#232221]">
          {t("adminStatsTitle")}
        </h2>
        {fetching && (
          <span className="text-xs uppercase tracking-widest text-stone-400">Chargement...</span>
        )}
      </div>

      {error && (
        <Card className="bg-red-950/40 border border-red-700/50 rounded-none p-4 text-red-100 text-sm">
          {error}
        </Card>
      )}

      {stats && (
        <>
          <SectionTitle>{t("statsHealth")}</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Counter label={t("statsUsers")} value={stats.total_users} icon={Users} hint={`${stats.inactive_users_90d} ${t("statsInactive90d")}`} />
            <Counter label={t("statsPublicArmies")} value={stats.public_armies} icon={Layers} hint={`${stats.total_armies} ${t("statsTotalArmies")}`} />
            <Counter label={t("statsFavorites")} value={stats.total_favorites} icon={Heart} accent="text-amber-400" />
            <Counter label={t("statsPendingReports")} value={stats.pending_reports} icon={Flag} accent={stats.pending_reports > 0 ? "text-red-400" : "text-stone-400"} />
            <Counter label={t("statsVisitorsWeek")} value={stats.visitors_week} icon={Eye} hint={`${stats.page_views_week} pages`} accent="text-teal-300" />
            <Counter label={t("statsVisitorsMonth")} value={stats.visitors_month} icon={TrendingUp} hint={`${stats.page_views_month} pages`} accent="text-teal-300" />
          </div>

          <SectionTitle>{t("statsTrends30d")}</SectionTitle>
          <Card className="bg-black/70 border border-white/15 rounded-none p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="date" tick={{ fill: "#a8a29e", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#a8a29e", fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ background: "#1c1917", border: "1px solid #ffffff20", color: "#f5f5f4" }}
                    labelStyle={{ color: "#f5f5f4" }}
                  />
                  <Line type="monotone" dataKey="visitors" stroke="#5eead4" strokeWidth={2} dot={false} name={t("statsVisitors")} />
                  <Line type="monotone" dataKey="signups" stroke="#cc6512" strokeWidth={2} dot={false} name={t("statsSignups")} />
                  <Line type="monotone" dataKey="armies" stroke="#a78bfa" strokeWidth={2} dot={false} name={t("statsArmies")} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      <SectionTitle>{t("statsFactions")}</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-black/70 border border-white/15 rounded-none p-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={factionDistribution}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  innerRadius={45}
                  paddingAngle={1}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {factionDistribution.map((_, i) => (
                    <Cell key={i} fill={FACTION_COLORS[i % FACTION_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ background: "#1c1917", border: "1px solid #ffffff20", color: "#f5f5f4" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="bg-black/70 border border-white/15 rounded-none p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3">{t("statsBudgetBuckets")}</div>
          <ul className="space-y-2">
            {budgetBuckets.map((b) => {
              const total = publicArmies.length || 1;
              const pct = Math.round((b.count / total) * 100);
              return (
                <li key={b.label} className="text-xs text-stone-200">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{b.label}</span>
                    <span className="text-stone-400">{b.count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-black/50 border border-white/10">
                    <div className="h-full bg-[#cc6512]" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <SectionTitle>{t("statsTopAuthors")}</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-black/70 border border-white/15 rounded-none p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3">{t("statsTopAuthorsByFavorites")}</div>
          {topAuthors.length === 0 ? (
            <p className="text-stone-500 italic text-xs">Aucune donnée.</p>
          ) : (
            <ol className="space-y-1.5">
              {topAuthors.slice(0, 10).map((row, i) => (
                <li key={i} className="flex justify-between text-sm text-stone-200">
                  <span><span className="text-stone-500 mr-2">{i + 1}.</span>{row.author_name}</span>
                  <span className="text-amber-400 font-bold">{row.favorites} ★</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="bg-black/70 border border-white/15 rounded-none p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3">{t("statsTopArmies")}</div>
          {topArmies.length === 0 ? (
            <p className="text-stone-500 italic text-xs">Aucune donnée.</p>
          ) : (
            <ol className="space-y-1.5">
              {topArmies.slice(0, 10).map((row, i) => {
                const faction = factions.find((f) => f.id === row.faction_id);
                return (
                  <li key={row.id} className="flex justify-between text-sm text-stone-200 gap-3">
                    <span className="min-w-0 truncate">
                      <span className="text-stone-500 mr-2">{i + 1}.</span>
                      <span className="font-serif">{row.army_name || "Sans nom"}</span>
                      <span className="text-stone-500 ml-2 text-xs">· {faction ? tData("factions", faction.id, faction.name) : row.faction_id}</span>
                    </span>
                    <span className="text-amber-400 font-bold shrink-0">{row.favorites} ★</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>

      <SectionTitle>{t("statsMeta")}</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-black/70 border border-white/15 rounded-none p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3">{t("statsTopEquipment")}</div>
          {equipAndTalentTops.topEquip.length === 0 ? (
            <p className="text-stone-500 italic text-xs">Aucune donnée.</p>
          ) : (
            <ol className="space-y-1.5">
              {equipAndTalentTops.topEquip.map((row, i) => (
                <li key={row.id} className="flex justify-between text-sm text-stone-200">
                  <span><span className="text-stone-500 mr-2">{i + 1}.</span>{row.label}</span>
                  <span className="text-[#cc6512] font-bold">{row.count}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card className="bg-black/70 border border-white/15 rounded-none p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3">{t("statsTopTalents")}</div>
          {equipAndTalentTops.topTalents.length === 0 ? (
            <p className="text-stone-500 italic text-xs">Aucune donnée.</p>
          ) : (
            <ol className="space-y-1.5">
              {equipAndTalentTops.topTalents.map((row, i) => (
                <li key={row.id} className="flex justify-between text-sm text-stone-200 gap-3">
                  <span className="min-w-0 truncate"><span className="text-stone-500 mr-2">{i + 1}.</span>{row.label}</span>
                  <span className="text-purple-300 font-bold shrink-0">{row.count}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Moderation queue */}
      <SectionTitle>{t("statsModeration")}</SectionTitle>
      <Card className="bg-black/70 border border-white/15 rounded-none p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3 inline-flex items-center gap-2">
          <Flag className="w-3.5 h-3.5 text-red-400" />
          {t("statsReportsQueue")} ({reports.length})
        </div>
        {reports.length === 0 ? (
          <p className="text-stone-500 italic text-xs">{t("statsNoReports")}</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {reports.map((r) => (
              <li key={r.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-100">
                    <span className="font-bold">{r.army?.army_name ?? t("statsArmyGone")}</span>
                    {r.army && (
                      <span className="text-stone-400 ml-2 text-xs">· {r.army.author_name}</span>
                    )}
                  </div>
                  {r.reason && (
                    <p className="mt-1 text-xs text-red-200 italic">« {r.reason} »</p>
                  )}
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-stone-500">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {r.army && (
                    <Link to={`/galerie/${r.army.id}`} target="_blank">
                      <Button
                        variant="ghost"
                        className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-[#cc6512] hover:bg-[#cc6512]/10 border border-transparent"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t("statsReportView")}
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => markReport(r.id, "reviewed")}
                    className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t("statsReportReviewed")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => markReport(r.id, "dismissed")}
                    className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 hover:text-stone-100 hover:bg-stone-500/10 border border-transparent"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("statsReportIgnore")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => deleteReportedArmy(r)}
                    className="h-8 px-2 rounded-none inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("statsReportDeleteArmy")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Faction role mix + violating lists */}
      <SectionTitle>{t("statsQuality")}</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-black/70 border border-white/15 rounded-none p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3">
            {t("statsRoleMix")}
          </div>
          {factionRoleMix.length === 0 ? (
            <p className="text-stone-500 italic text-xs">Aucune donnée.</p>
          ) : (
            <div className="space-y-2">
              {factionRoleMix.map((row) => (
                <div key={row.id} className="text-xs text-stone-200">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold">{row.name}</span>
                    <span className="text-stone-400">{row.lists} {t("statsLists")}</span>
                  </div>
                  <div className="flex h-2 border border-white/10 overflow-hidden">
                    <div style={{ width: `${row.warlordPct}%` }} className="bg-[#cc6512]" title={`Chefs ${row.warlordPct}%`} />
                    <div style={{ width: `${row.warriorPct}%` }} className="bg-stone-400" title={`Guerriers ${row.warriorPct}%`} />
                    <div style={{ width: `${row.cavalryPct}%` }} className="bg-purple-400" title={`Cavalerie ${row.cavalryPct}%`} />
                    <div style={{ width: `${row.shooterPct}%` }} className="bg-teal-400" title={`Tireurs ${row.shooterPct}%`} />
                  </div>
                  <div className="flex justify-between text-[9px] text-stone-500 mt-0.5 uppercase tracking-widest">
                    <span><span className="text-[#cc6512]">■</span> Chefs {row.warlordPct}%</span>
                    <span><span className="text-stone-400">■</span> Guerriers {row.warriorPct}%</span>
                    <span><span className="text-purple-400">■</span> Cav. {row.cavalryPct}%</span>
                    <span><span className="text-teal-400">■</span> Tir. {row.shooterPct}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="bg-black/70 border border-white/15 rounded-none p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3 inline-flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            {t("statsViolatingLists")} ({violatingArmies.length}/{publicArmies.length})
          </div>
          {violatingArmies.length === 0 ? (
            <p className="text-stone-500 italic text-xs">{t("statsAllValid")}</p>
          ) : (
            <ol className="space-y-1.5 max-h-72 overflow-y-auto">
              {violatingArmies.slice(0, 30).map((a, i) => {
                const f = factions.find((x) => x.id === a.faction_id);
                return (
                  <li key={a.id} className="text-sm text-stone-200">
                    <Link
                      to={`/galerie/${a.id}`}
                      target="_blank"
                      className="hover:text-[#cc6512] transition-colors"
                    >
                      <span className="text-stone-500 mr-2">{i + 1}.</span>
                      <span className="font-serif">{a.army_name || "Sans nom"}</span>
                      <span className="text-stone-500 ml-2 text-xs">
                        · {a.author_name} · {f ? tData("factions", f.id, f.name) : a.faction_id}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>

      {/* Inactive users */}
      <SectionTitle>{t("statsInactiveSection")}</SectionTitle>
      <Card className="bg-black/70 border border-white/15 rounded-none p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-stone-300 mb-3 inline-flex items-center gap-2">
          <UserX className="w-3.5 h-3.5 text-stone-400" />
          {t("statsInactiveLabel")} ({inactiveUsers.length})
        </div>
        {inactiveUsers.length === 0 ? (
          <p className="text-stone-500 italic text-xs">{t("statsNoInactive")}</p>
        ) : (
          <ul className="divide-y divide-white/10 max-h-72 overflow-y-auto">
            {inactiveUsers.slice(0, 50).map((u) => (
              <li key={u.id} className="py-2 flex justify-between text-sm text-stone-200">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{u.author_name || u.email}</span>
                  <span className="text-stone-500 text-xs ml-2">· {u.email}</span>
                </span>
                <span className="text-xs text-stone-400 shrink-0">
                  {u.last_sign_in_at
                    ? new Date(u.last_sign_in_at).toLocaleDateString()
                    : t("statsNeverConnected")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
