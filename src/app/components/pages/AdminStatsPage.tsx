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
import { Users, Layers, Heart, Flag, Eye, TrendingUp } from "lucide-react";

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
    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-100 mt-8 mb-3 border-b border-white/10 pb-2">
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
  const [error, setError] = React.useState<string | null>(null);
  const [fetching, setFetching] = React.useState(true);

  React.useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured) return;

    const load = async () => {
      setFetching(true);
      const [statsRes, armiesRes, favsRes] = await Promise.all([
        supabase.rpc("get_admin_stats"),
        supabase.from("armies").select("*").eq("is_public", true),
        supabase.rpc("get_admin_top_favorites"),
      ]);

      if (statsRes.error) setError(statsRes.error.message);
      else setStats(statsRes.data as AdminStats);

      if (!armiesRes.error) setPublicArmies((armiesRes.data as SavedArmy[]) ?? []);

      if (!favsRes.error && favsRes.data) {
        const payload = favsRes.data as { top_authors: TopAuthor[]; top_armies: TopArmy[] };
        setTopAuthors(payload.top_authors ?? []);
        setTopArmies(payload.top_armies ?? []);
      }

      setFetching(false);
    };

    void load();
  }, [isAdmin]);

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
        <h2 className="text-4xl font-bold font-['UnifrakturCook'] text-stone-100 drop-shadow-md">
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
    </div>
  );
}
