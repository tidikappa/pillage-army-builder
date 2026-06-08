// Edge Function : notify-report
//
// Déclenchée par un Database Webhook Supabase sur INSERT dans army_reports.
// Récupère la liste d'armée signalée et poste un message dans un salon
// Discord via webhook.
//
// Variables d'environnement à configurer dans Supabase
// (Project Settings > Edge Functions > Secrets) :
//   - DISCORD_WEBHOOK_URL  URL complète du webhook Discord
//                          (https://discord.com/api/webhooks/.../...)
//   - WEBHOOK_SECRET       chaîne aléatoire partagée. Le Database Webhook
//                          doit envoyer un header `x-webhook-secret` avec
//                          cette même valeur, sinon l'appel est rejeté.
//   - APP_BASE_URL         (optionnel) base URL prod, ex:
//                          https://pillage-army-builder.vercel.app
//
// Le webhook DB envoie le record inséré sous la forme :
//   { type: "INSERT", table: "army_reports", record: { ... }, ... }

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://pillage-army-builder.vercel.app";

// Utilise la service role key pour pouvoir lire auth.users et armies sans
// passer par les RLS du caller (le webhook n'a pas de JWT utilisateur).
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!DISCORD_WEBHOOK_URL) {
    return new Response("DISCORD_WEBHOOK_URL missing", { status: 500 });
  }
  if (!WEBHOOK_SECRET) {
    return new Response("WEBHOOK_SECRET missing", { status: 500 });
  }

  // Shared-secret gate. The Database Webhook injects this header, anything
  // else (curl, scanner, replay) is rejected.
  const provided = req.headers.get("x-webhook-secret");
  if (provided !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Webhook DB Supabase : { type, table, record, ... }
  // Permettre aussi un appel direct avec { report_id } pour tester.
  const record = payload?.record ?? null;
  const reportId: string | null = record?.id ?? payload?.report_id ?? null;
  if (!reportId) {
    return new Response("Missing report id", { status: 400 });
  }

  // Lire le signalement
  const { data: report, error: rErr } = await admin
    .from("army_reports")
    .select("id, army_id, reporter_user_id, reason, created_at")
    .eq("id", reportId)
    .single();
  if (rErr || !report) {
    return new Response(`Report not found: ${rErr?.message ?? "?"}`, { status: 404 });
  }

  // Lire la liste d'armée signalée
  const { data: army } = await admin
    .from("armies")
    .select("id, army_name, author_name, faction_id, budget, user_id, is_public, created_at")
    .eq("id", report.army_id)
    .single();

  // Récupérer l'email du reporter (si connecté)
  let reporterLabel = "anonyme";
  if (report.reporter_user_id) {
    const { data: ru } = await admin.auth.admin.getUserById(report.reporter_user_id);
    reporterLabel = ru?.user?.email ?? `user ${report.reporter_user_id}`;
  }

  const armyName = army?.army_name ?? "Sans nom";
  const authorName = army?.author_name ?? "?";
  const reason = report.reason
    ? truncate(report.reason, 1000)
    : "_(non précisé)_";

  // Embed Discord, lisible et structuré
  const embed = {
    title: "Nouveau signalement",
    description: `Une liste publique a été signalée sur Pillage Army Builder.`,
    color: 0xb91c1c, // rouge
    fields: [
      { name: "Liste", value: armyName, inline: true },
      { name: "Auteur", value: authorName, inline: true },
      { name: "Faction", value: army?.faction_id ?? "?", inline: true },
      { name: "Budget", value: `${army?.budget ?? "?"} po`, inline: true },
      { name: "Signalé par", value: reporterLabel, inline: true },
      { name: "Motif", value: reason, inline: false },
    ],
    url: `${APP_BASE_URL}/galerie`,
    timestamp: new Date(report.created_at).toISOString(),
    footer: {
      text: "Connecte-toi en admin pour supprimer la liste depuis la galerie.",
    },
  };

  const resp = await fetch(DISCORD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Pillage Reports",
      embeds: [embed],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return new Response(`Discord error: ${resp.status} ${txt}`, { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
