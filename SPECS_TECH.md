# Spécifications techniques, Pillage Army Builder

Version cible, 1.12.0. Document de référence pour l'architecture, la stack et les conventions du projet.

## Stack

Front
- Vite 6 (bundler, dev server), build statique servi par Vercel.
- React 18.3 + TypeScript 5.6, strict mode.
- React Router DOM 7 (BrowserRouter, routes côté client).
- Tailwind CSS 4, configuration CSS-first via `@tailwindcss/vite` (pas de `tailwind.config.js`). Tokens et thèmes définis dans `src/styles/globals.css`.
- shadcn/ui inlinés dans `src/app/components/ui/`, construits sur Radix Primitives.
- Lucide React pour les icônes vectorielles.
- Sonner pour les toasts.
- react-hook-form pour les formulaires d'auth.

Back / données
- Supabase (Auth + Postgres + RLS). Client web `@supabase/supabase-js` v2.
- Auth email + mot de passe, magic-link désactivé. Mot de passe oublié via lien email Supabase.
- Données stockées dans Postgres, accès via RLS et RPC `SECURITY DEFINER` pour les actions admin.

Génération de fichiers
- jsPDF + jspdf-autotable pour l'export PDF des listes d'armée.
- Pipeline SVG vers PNG via canvas pour intégrer les icônes Lucide et les icônes custom dans les cellules du tableau PDF (`renderToStaticMarkup` de `react-dom/server`).

PWA
- `vite-plugin-pwa` (Workbox). Manifest standalone, portrait, theme `#cc6512`, background `#141210`.
- Icônes 192, 512 et `apple-touch-icon` (180) générées via `sips` à partir d'un master.
- Service worker en mode `autoUpdate`, précache des assets buildés.

i18n
- Contexte React custom `TranslationContext`, dictionnaire FR + EN dans `src/app/components/pillages/translations.ts`. Pas de lib externe.

Versioning
- `__APP_VERSION__` injecté par `vite.config.ts` via `define` depuis `package.json`, affiché en footer.

## Arborescence

```
army-builder-pillage/
├── public/
│   ├── icon-192.png, icon-512.png, apple-touch-icon.png
│   └── manifest.webmanifest (généré par vite-plugin-pwa)
├── src/
│   ├── app/
│   │   ├── App.tsx                    // routeur + layout (header, footer)
│   │   ├── components/
│   │   │   ├── ui/                    // shadcn inlinés (button, select, dialog, popover…)
│   │   │   ├── pages/
│   │   │   │   ├── GalleryPage.tsx
│   │   │   │   ├── MyListsPage.tsx
│   │   │   │   ├── AdminUsersPage.tsx
│   │   │   │   ├── LoginPage.tsx / SignupPage.tsx / ResetPasswordPage.tsx
│   │   │   │   └── …
│   │   │   └── pillages/
│   │   │       ├── ArmyBuilder.tsx    // builder principal
│   │   │       ├── ArmyView.tsx       // lecture seule (galerie / mes listes)
│   │   │       ├── UnitForm.tsx       // dialog de recrutement
│   │   │       ├── UnitCard.tsx       // carte unité (rename, icon picker, reorder)
│   │   │       ├── validation.ts      // règles d'armée pures
│   │   │       ├── unitNaming.ts      // détection de spé, ICON_REGISTRY
│   │   │       ├── translations.ts    // dictionnaire FR/EN
│   │   │       └── gameData.ts        // factions, équipements, talents
│   │   └── lib/
│   │       └── supabaseClient.ts
│   ├── assets/
│   │   ├── banner_top.png, banner_bottom.png   // parchemin déchiré
│   │   └── logos…
│   ├── styles/globals.css
│   └── vite-env.d.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── SUPABASE_SETUP.md
└── README.md
```

## Routing

| Route | Composant | Accès |
| --- | --- | --- |
| `/` | `ArmyBuilder` | Public |
| `/galerie` | `GalleryPage` | Public (listes publiées uniquement) |
| `/mes-listes` | `MyListsPage` | Auth requise |
| `/login`, `/signup`, `/reset-password` | Pages auth | Public |
| `/admin/users` | `AdminUsersPage` | Auth + flag admin |

Le flag admin est porté dans `auth.users.raw_app_meta_data.role = 'admin'`. Côté front, la lecture du JWT donne la session, et les RPC vérifient le rôle côté serveur.

## Modèle de données Supabase

Table `armies`
- `id uuid pk default gen_random_uuid()`
- `user_id uuid references auth.users on delete cascade`
- `name text`
- `faction_id text`
- `budget int`
- `units jsonb`         // tableau sérialisé d'`ArmyUnit`
- `talents jsonb`
- `notes text`
- `is_public bool default false`
- `author_name text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

RLS
- `select` autorisé si `is_public = true` ou `auth.uid() = user_id`.
- `insert`, `update`, `delete` autorisés uniquement si `auth.uid() = user_id`.
- Politique admin séparée pour `delete` (rôle admin via JWT) afin de modérer.

Table `army_favorites`
- `user_id uuid references auth.users`
- `army_id uuid references armies on delete cascade`
- `created_at timestamptz default now()`
- Clé primaire composite `(user_id, army_id)`.
- RLS, l'utilisateur ne voit et n'écrit que ses propres favoris.

RPC `SECURITY DEFINER`
- `get_users_admin()` retourne la liste des utilisateurs (id, email, author_name, role, created_at). Vérifie en interne que le caller est admin.
- `delete_user_admin(target uuid)` supprime un utilisateur et cascade ses armées.
- `update_user_author_name_admin(target uuid, new_name text)` renomme l'auteur affiché d'un user.

## Builder, principes clés

`ArmyBuilder.tsx`
- État local pour la liste en cours, faction, budget, talents, notes, unités. Persistance Supabase uniquement à la sauvegarde explicite.
- Faction Select groupé par supplément (`base`, `orient`, `finis_imperii`) via `SUPPLEMENT_LABELS` et `getEffectiveFaction`.
- Export PDF asynchrone, préprocessing de toutes les icônes Lucide et custom en data URLs PNG avant `autoTable`, injection via `didDrawCell`. Nom de fichier `{nameSlug}_{factionSlug}_{currentPoints}po.pdf`.
- Bloc récapitulatif points (fond blanc, contraste accessible). Calcul du `totalArmyModels` et du `moralThreshold = Math.ceil(totalArmyModels / 2)`.

`UnitForm.tsx`
- `effectiveFaction` distingue la faction d'origine de la faction mercenaire (`sourceFactionId`).
- `resolveEquipmentConflicts` applique les exclusions mutuelles (par exemple sans-protection + armure).
- Section mercenaire byzantine (quota 50%).
- Slots d'armure dynamiques pour les Pictes (déverrouillage conditionné aux chefs présents).
- `KATAPHRAKTOI_LOADOUT` impose la dotation obligatoire pour les unités kataphraktoi byzantines, romaines et hunniques.

`UnitCard.tsx`
- Rename inline, icon picker via Popover sur `ICON_REGISTRY` (19 icônes).
- Flèches de réordonnancement à gauche de l'icône (`onMoveUp`, `onMoveDown`).
- `getUnitDisplayName` et `getUnitDisplayIcon` dérivent le nom et l'icône selon la spécialisation détectée.

`validation.ts`
- Module pur, partagé entre builder et `ArmyView`. Reçoit l'armée et retourne `{ errors: string[], warnings: string[] }`.
- Règles ouvertes au paramétrage, par exemple `shooterRatio` à 50% pour les Gallois, exemption cavalerie pour Huns et Magyars, pas d'obligation de chef pour les Saxons.

## Conventions

TypeScript
- `strict: true`. Pas de `any` toléré sans commentaire.
- Types métiers centralisés dans `gameData.ts` (`ArmyUnit`, `Faction`, `Equipment`, `Talent`).
- Helpers comme `c('25 po')` pour normaliser les coûts (`'Gratuit'`, `'-'`, `'25 po'` vers `number | null`).

Composants
- Pas de logique de validation ou de coût dans les composants UI, tout est dérivé via les modules `validation.ts` et `gameData.ts`.
- shadcn inliné, ne pas importer depuis un package npm.
- Tailwind classes utilitaires uniquement, pas de CSS modules.

Style
- Prose française par défaut (UI et docs), EN traduit via le dictionnaire.
- Pas d'emoji dans le code livré.
- Pas de tiret cadratin dans les chaînes UI ni dans la doc.

## Build et déploiement

Local
- `npm install`
- `npm run dev` (Vite, port par défaut)
- `npm run typecheck` avant chaque push significatif

Production
- Hébergement Vercel, projet `pillage-army-builder`, branche `main` = prod.
- Auto-deploy à chaque push sur `main`. Pas de preview branches activées.
- Variables d'environnement Vercel, `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

PWA
- Le manifest expose le nom long et court, la couleur de thème, l'orientation. Installation directe depuis Safari iOS et Chrome Android.
- Service worker auto-update, l'utilisateur reçoit la nouvelle version après rechargement.

## Sécurité

- Toutes les requêtes data passent par Supabase avec clé anonyme, jamais de service-role côté client.
- RLS systématique sur les tables exposées. Aucun `select *` global possible sans match `auth.uid()` ou `is_public = true`.
- Les actions admin passent exclusivement par des RPC `SECURITY DEFINER` qui vérifient le rôle JWT avant d'agir.
- Le mot de passe utilisateur n'est jamais manipulé par le front, Supabase Auth gère hash et reset.

## Roadmap technique, candidats

- Tests unitaires Vitest sur `validation.ts` et `gameData.ts` (helpers de coût, règles).
- Migration progressive du dictionnaire i18n vers un format JSON séparé par locale si la taille grossit.
- Ajout d'un sitemap statique et des metas Open Graph par liste publiée.
- Optimisation du bundle, lazy-load des routes Galerie et Admin.
