# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Builder d'armée bilingue (FR/EN) pour le wargame Pillage. Exporté à l'origine de
Figma Make, devenu une app complète : Vite + React 18 + TS + Tailwind v4, backend
Supabase (auth, Postgres/RLS, RPC, Edge Function), déployée sur Vercel
(pillage-army-builder.vercel.app).

## Commandes
```bash
npm run dev        # dev server + HMR sur http://localhost:5173 (ouvre le navigateur)
npm run build      # build de prod dans dist/
npm run typecheck  # tsc --noEmit (à lancer avant chaque commit)
npm run test       # vitest run (une passe)
npm run test:watch # vitest en watch
npx vitest run src/app/components/pillages/validation.test.ts   # un seul fichier
npx vitest run -t "shooter cap"                                 # un seul test par nom
```
Les seuls tests existants couvrent `gameData.ts` et `validation.ts`.

## Workflow de release (rituel établi, à respecter)
1. Modifier, puis vérifier : `npm run typecheck` + test manuel sur le dev server.
2. Ne pousser en prod qu'après un "push" / "pousse en prod" explicite de l'utilisateur.
3. Bump `version` dans `package.json` (elle s'affiche en footer via `__APP_VERSION__`).
4. Commit avec un message `vX.Y.Z: …` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
5. `git push origin main` → Vercel déploie automatiquement.

## Architecture

### Routing et providers (`src/app/App.tsx`)
Ordre d'imbrication : `BrowserRouter > TranslationProvider > AuthProvider > Layout > Suspense > Routes`.
Le builder (`/`) est chargé en dur ; **toutes les autres routes sont `React.lazy`**
(gallery, my-lists, login/signup, forgot/update-password, admin/*, galerie/:id, comparer).
Certaines routes ont un alias FR + EN (`/gallery` & `/galerie`).

### Modèle de données du jeu (`src/app/data/gameData.ts`) — source de vérité
Tout le contenu du jeu vit ici : `factions: Faction[]`, `UnitType`, `Equipment`
(coûts indexés par `UnitRole`), `ArmyUnit` (l'unité telle que stockée dans une liste),
`Supplement` (base / orient / finis_imperii). **Ajouter une faction, une unité, une
arme ou une règle = éditer ce fichier.** Les talents à logique spéciale sont encodés
en constantes + helpers ici même :
- Éducateur canin (`DOG_HANDLER_TALENT_ID`) : +`DOG_HANDLER_BONUS_PER_MODEL` po par modèle avec Chiens de guerre ; gratuit sur le chef.
- Foederati romain (`FOEDERATI_TALENT_ID`) : `getFoederatiAllyCandidates()` / `getFoederatiAllyId()` débloquent les troupes non-chef d'une faction alliée ; les chefs restent romains.
- `getEffectiveFaction()` résout la faction effective d'une unité (mercenaires, alliés).

Le **calcul de coût** est dans `ArmyBuilder.tsx` (`computeUnitCost`, `baseCost` + coûts
d'équipement par rôle + bonus de talents), pas dans gameData.

### Validation (`src/app/components/pillages/validation.ts`)
`validateArmy(army, faction, t)` renvoie un tableau de messages de violation (plafond
25% de tireurs, quotas de rôles, etc.). Piège métier : la **hasta** est une arme de
corps-à-corps mais compte comme arme de tir dans le plafond → voir `countsAsRanged`.

### i18n (deux systèmes distincts)
`TranslationContext` expose `t(key)` et `tData(type, id, defaultVal)`. Le FR est la
langue **source** (texte en dur dans le code / gameData) ; l'EN est une surcouche de
dictionnaire. Deux fichiers `translations.ts` : un pour l'UI
(`components/pillages/translations.ts`) et un pour les données de jeu (`data/translations.ts`).
Langue persistée dans `localStorage` (`pillage_lang_v1`), initialisée depuis `navigator.language`.
La **traduction automatique du navigateur est désactivée volontairement**
(`<meta name="google" content="notranslate">` + `lib/domTranslatePatch.ts` + `ErrorBoundary`) :
Chrome réécrivait les nœuds texte et désynchronisait les coûts. Ne pas réactiver.

### Backend Supabase (`src/app/lib/`)
- `supabase.ts` : client unique, activé par `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (dégrade proprement sur des placeholders si absents ; `isSupabaseConfigured`).
- `AuthContext.tsx` : session + `isAdmin` (dérivé de `app_metadata.role === "admin"`).
- Tables : `armies`, `army_favorites`, `army_reports`, `page_views` (toutes en RLS).
- RPC `SECURITY DEFINER` réservées admin : `get_admin_stats`, `get_admin_top_favorites`, `get_admin_inactive_users`, `get_users_admin`, `delete_user_admin`, `update_user_author_name_admin`.
- **Le schéma SQL, les policies RLS et les webhooks ne sont pas versionnés en code.** `SUPABASE_SETUP.md` est la source de référence des migrations : toute évolution DB s'applique à la main dans le dashboard Supabase et se documente dans ce fichier.
- Edge Function `supabase/functions/notify-report/` : notifie Discord (webhook) sur signalement, gated par un header secret.

### Vercel (`vercel.json`, `api/`)
- `api/og-list/` : fonction serverless (`@vercel/node`) qui renvoie des meta Open Graph pour `/galerie/:id`, via un rewrite conditionnel déclenché uniquement pour les bots (Discord, Twitter…). Les humains tapent dans la SPA.
- Rewrite SPA fallback + en-têtes de sécurité (HSTS, X-Frame-Options DENY, CSP). La CSP autorise Supabase (`*.supabase.co`, `wss:`) et Google Fonts ; l'élargir si on ajoute un domaine externe.
- PWA via `vite-plugin-pwa` (service worker autoUpdate + manifest, configuré dans `vite.config.ts`).

## Conventions et pièges
- Alias `@/…` → `src/app/…` (dans `vite.config.ts` **et** `tsconfig.json`, garder les deux synchro).
- `figma:asset/<hash>.png` → `src/assets/<hash>.png` via un plugin Vite custom (`figmaAssetResolver` dans `vite.config.ts`). Conserver tant que les imports ne sont pas renommés.
- **Tailwind v4 sans `tailwind.config.js`** : couleurs/tokens via `@theme` / `@layer` dans `src/styles/` (entrée `index.css`).
- `src/app/components/ui/` = shadcn inline : éditer avec prudence, ce sont des primitives partagées.
- `strict: false` dans tsconfig ; le code généré est verbeux, factoriser sans casser la structure visible (utilisateur peu technique).
- Repo npm simple : ne pas réintroduire pnpm/workspaces.
