// Vercel serverless function that returns a minimal HTML with Open Graph meta
// tags for a public army list. Triggered by a conditional rewrite in
// vercel.json when the User-Agent matches a known social/crawler bot
// (Discord, Twitter, Facebook, Slack, LinkedIn, etc.). Human visitors hit
// the SPA on /galerie/:id directly.

import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const APP_BASE_URL =
  process.env.APP_BASE_URL ?? "https://pillage-army-builder.vercel.app";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FACTION_NAMES: Record<string, string> = {
  vikings: "Vikings",
  irish: "Irlandais / Scots / Pictes",
  bretons: "Bretons",
  welsh: "Gallois",
  anglo_saxons: "Anglo-Saxons",
  magyars: "Magyars",
  rus: "Rus",
  byzantines: "Byzantins",
  merovingians: "Francs Mérovingiens",
  romans: "Romains d'Orient et d'Occident",
  saxons: "Saxons",
  visigoths: "Wisigoths",
  britto_romans: "Britto-Romains",
  picts: "Pictes",
  huns: "Huns",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id;
  if (typeof id !== "string" || !id) {
    res.status(400).send("Bad request");
    return;
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).send("Supabase config missing");
    return;
  }

  const canonicalUrl = `${APP_BASE_URL}/galerie/${id}`;
  const ogImage = `${APP_BASE_URL}/icon-512.png`;

  // Lookup the public army via Supabase REST.
  const url = `${SUPABASE_URL}/rest/v1/armies?id=eq.${encodeURIComponent(id)}&is_public=eq.true&select=army_name,author_name,faction_id,budget`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  let title = "Pillage Army Builder";
  let description = "Une liste publiée sur Pillage Army Builder.";

  if (resp.ok) {
    const list = (await resp.json()) as Array<{
      army_name: string;
      author_name: string;
      faction_id: string;
      budget: number;
    }>;
    if (list.length > 0) {
      const army = list[0];
      const factionName = FACTION_NAMES[army.faction_id] ?? army.faction_id;
      title = `${army.army_name || "Sans nom"} — ${army.author_name}`;
      description = `${factionName} · ${army.budget} po · Liste publiée sur Pillage Army Builder`;
    }
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)} — Pillage Army Builder</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta property="og:site_name" content="Pillage Army Builder">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="canonical" href="${canonicalUrl}">
<meta http-equiv="refresh" content="0;url=${canonicalUrl}">
</head>
<body>
<p>Redirection vers <a href="${canonicalUrl}">${canonicalUrl}</a>...</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
  res.status(200).send(html);
}
