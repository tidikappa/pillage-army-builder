# Configuration Supabase

L'application utilise Supabase pour l'authentification et le stockage des
listes d'armée. Voici les étapes pour configurer le backend.

## 1. Créer un projet Supabase

1. Aller sur https://supabase.com et créer un compte.
2. Créer un nouveau projet (région : Europe / France conseillé). Noter le mot
   de passe DB (on n'en aura pas besoin ici, mais c'est pratique).
3. Une fois le projet prêt, aller dans **Project Settings → API** et récupérer :
   - `Project URL`
   - `anon public` key

## 2. Configurer les variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Redémarrer `npm run dev` après avoir créé ce fichier.

## 3. Créer le schéma de base de données

Dans Supabase, aller dans **SQL Editor → New query**, coller le SQL suivant et
l'exécuter :

```sql
-- Table des listes d'armée sauvegardées
create table public.armies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  author_name text not null,
  army_name text not null,
  faction_id text not null,
  budget integer not null,
  units jsonb not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index armies_user_id_idx on public.armies(user_id);
create index armies_is_public_idx on public.armies(is_public);

-- Row Level Security
alter table public.armies enable row level security;

-- Tout le monde (même non-connecté) peut lire les listes publiques
create policy "Public armies are readable by everyone"
  on public.armies for select
  using (is_public = true);

-- Un utilisateur connecté peut lire ses propres listes (même privées)
create policy "Users can read their own armies"
  on public.armies for select
  to authenticated
  using (auth.uid() = user_id);

-- Un utilisateur connecté peut insérer ses propres listes
create policy "Users can insert their own armies"
  on public.armies for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Un utilisateur connecté peut modifier ses propres listes
create policy "Users can update their own armies"
  on public.armies for update
  to authenticated
  using (auth.uid() = user_id);

-- Un utilisateur connecté peut supprimer ses propres listes
create policy "Users can delete their own armies"
  on public.armies for delete
  to authenticated
  using (auth.uid() = user_id);
```

## 4. (Optionnel) Désactiver la confirmation email

Pour les tests locaux, dans **Authentication → Providers → Email**, désactiver
"Confirm email" pour que les inscriptions soient immédiatement valides.

En production, laisser activé.

## Comment ça marche dans l'app

- Sauvegarder une liste → enregistre dans `armies` avec `is_public = false`.
- Publier une liste → bascule `is_public` à `true`. Elle apparaît alors dans
  `/gallery`.
- Mes listes (`/my-lists`) → toutes les listes de l'utilisateur, publiques ou
  privées.
- Galerie (`/gallery`) → uniquement `is_public = true`, lisible par tous.
