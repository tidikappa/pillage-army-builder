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

## 4. Mode modérateur (admin)

Pour pouvoir supprimer n'importe quelle liste publique (modération), il faut
deux choses : ajouter une policy RLS qui autorise les admins, et marquer ton
compte comme admin dans Supabase.

### a. Ajouter la policy admin

Dans **SQL Editor → New query**, exécuter :

```sql
create policy "Admins can delete any army"
  on public.armies for delete
  using (
    coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
  );
```

### b. Te promouvoir admin

Toujours dans SQL Editor (remplace l'email par le tien) :

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'ton-email@example.com';
```

`raw_app_meta_data` est contrôlé uniquement par Supabase — un utilisateur ne
peut pas se l'octroyer lui-même depuis le frontend.

### c. Te déconnecter / reconnecter

Le JWT déjà en cache dans ton navigateur ne contient pas encore ce rôle. Va sur
l'app, clique **Déconnexion** puis reconnecte-toi : un nouveau JWT est émis
avec le rôle admin, et tu verras un bandeau rouge "Mode modérateur actif" dans
la galerie + une icône poubelle rouge sur chaque liste publiée.

### Retirer un admin

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data - 'role'
where email = 'ancien-admin@example.com';
```

## 5. Activer le flux "Mot de passe oublié"

Depuis la v1.5.0, l'app propose `/forgot-password` et `/update-password`.

### a. Autoriser les redirections

Dans Supabase → **Authentication → URL Configuration → Redirect URLs**,
ajoute ces deux entrées si pas déjà présentes :

```
https://pillage-army-builder.vercel.app/**
http://localhost:5173/**
```

Le pattern `/**` couvre déjà `/update-password`, donc rien de plus à
configurer ici.

### b. Vérifier le template d'email

Dans **Authentication → Email Templates → Reset Password**, vérifie que le
sujet et le corps du mail conviennent (en français si tu veux). Par défaut
Supabase fournit un template anglais qui marche très bien.

Aucune autre action SQL nécessaire — `supabase.auth.resetPasswordForEmail()`
et `supabase.auth.updateUser({ password })` gèrent tout côté serveur.

## 6. Gérer les utilisateurs

Deux options qui coexistent :

### a. Dashboard Supabase (toujours dispo)

**Supabase Dashboard → Authentication → Users** : liste complète avec dates
d'inscription, derniers logins, métadonnées. Permet de bannir, envoyer un
magic link, voir les détails techniques.

### b. Page admin intégrée à l'app (depuis v1.5.0)

L'app expose `/admin/users` (visible uniquement pour les admins). Pour qu'elle
fonctionne, exécute le SQL suivant dans **SQL Editor** une fois :

```sql
-- Lecture : retourne la liste des utilisateurs avec leur nombre de listes
create or replace function public.get_users_admin()
returns table (
  id uuid,
  email text,
  author_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  armies_count bigint,
  is_admin boolean
)
language sql
security definer
set search_path = public
as $$
  select
    u.id,
    u.email::text,
    coalesce((u.raw_user_meta_data->>'author_name')::text, '') as author_name,
    u.created_at,
    u.last_sign_in_at,
    coalesce((select count(*) from public.armies a where a.user_id = u.id), 0) as armies_count,
    coalesce((u.raw_app_meta_data->>'role')::text, '') = 'admin' as is_admin
  from auth.users u
  where coalesce((auth.jwt() -> 'app_metadata' ->> 'role')::text, '') = 'admin'
  order by u.created_at desc;
$$;

grant execute on function public.get_users_admin() to authenticated;

-- Suppression d'un utilisateur (et de toutes ses armées par cascade)
create or replace function public.delete_user_admin(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((auth.jwt() -> 'app_metadata' ->> 'role')::text, '') <> 'admin' then
    raise exception 'Not authorized';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot delete your own account here';
  end if;
  delete from auth.users where id = target_id;
end;
$$;

grant execute on function public.delete_user_admin(uuid) to authenticated;

-- Renommer un utilisateur (pseudo affiché dans la galerie + sur ses listes existantes)
create or replace function public.update_user_author_name_admin(target_id uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce((auth.jwt() -> 'app_metadata' ->> 'role')::text, '') <> 'admin' then
    raise exception 'Not authorized';
  end if;
  if length(trim(coalesce(new_name, ''))) = 0 then
    raise exception 'Name cannot be empty';
  end if;

  -- Mettre à jour les métadonnées du compte (pseudo affiché)
  update auth.users
  set raw_user_meta_data =
    coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('author_name', trim(new_name))
  where id = target_id;

  -- Synchroniser le pseudo sur toutes ses listes d'armée existantes
  update public.armies
  set author_name = trim(new_name)
  where user_id = target_id;
end;
$$;

grant execute on function public.update_user_author_name_admin(uuid, text) to authenticated;
```

Les deux fonctions sont en `SECURITY DEFINER` (elles s'exécutent avec les
droits du créateur — superuser Supabase — donc elles peuvent toucher
`auth.users`) **mais** leur première instruction vérifie que l'appelant est
admin. Si quelqu'un sans rôle admin appelle ces fonctions, elles renvoient
zéro résultat (lecture) ou une erreur (suppression).

La suppression d'un utilisateur supprime aussi toutes ses listes d'armée via
le `on delete cascade` de la table `armies`.

## 7. Favoris (depuis v1.9.0)

Pour que les utilisateurs puissent mettre des listes en favoris, exécute dans
**SQL Editor** :

```sql
create table public.army_favorites (
  user_id uuid references auth.users(id) on delete cascade not null,
  army_id uuid references public.armies(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (user_id, army_id)
);

create index army_favorites_user_idx on public.army_favorites(user_id);

alter table public.army_favorites enable row level security;

create policy "Users can read their own favorites"
  on public.army_favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can add to their own favorites"
  on public.army_favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their own favorites"
  on public.army_favorites for delete
  to authenticated
  using (auth.uid() = user_id);
```

Les favoris sont strictement personnels : un utilisateur ne voit que ses
propres favoris, et seule la suppression d'une liste publiée par son auteur
(ou par un admin) supprime aussi les favoris associés via `on delete cascade`.

## 8. Signalement de listes (depuis v1.13.0)

Tout visiteur (connecté ou non) peut signaler une liste publique depuis la
galerie. Une notification est postée dans un salon Discord via webhook pour
permettre une modération rapide.

### a. Table + RLS

Dans **SQL Editor**, exécute :

```sql
create table public.army_reports (
  id uuid primary key default gen_random_uuid(),
  army_id uuid references public.armies(id) on delete cascade not null,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index army_reports_army_idx on public.army_reports(army_id);
create index army_reports_status_idx on public.army_reports(status);

-- Empêche un même utilisateur connecté de signaler 2x la même liste.
-- Les anonymes (reporter_user_id NULL) ne sont pas concernés par cet index
-- partiel, on s'appuie sur localStorage côté front pour limiter le spam.
create unique index army_reports_unique_per_user
  on public.army_reports(army_id, reporter_user_id)
  where reporter_user_id is not null;

alter table public.army_reports enable row level security;

-- Insert limité aux comptes connectés (anti-spam anonyme). Le reporter_user_id
-- doit obligatoirement correspondre à l'ID du caller (pas d'usurpation).
create policy "Authenticated users can report"
  on public.army_reports for insert
  to authenticated
  with check (reporter_user_id = auth.uid());

-- Lecture / update / delete réservés aux admins.
create policy "Admins can read reports"
  on public.army_reports for select
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

create policy "Admins can update reports"
  on public.army_reports for update
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');

create policy "Admins can delete reports"
  on public.army_reports for delete
  using (coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin');
```

### b. Créer un webhook Discord

1. Ouvre Discord, va sur un serveur perso (ou crée-en un, **+** dans la
   sidebar de gauche, **Créer le mien**).
2. Crée un salon textuel, par exemple `#pillage-signalements`.
3. Clic droit sur le salon, **Modifier le salon**, onglet **Intégrations**,
   **Webhooks**, **Nouveau webhook**.
4. Renomme-le `Pillage Reports`, clique **Copier l'URL du webhook**.
   L'URL ressemble à `https://discord.com/api/webhooks/123456789/abcDEF...`.

Cette URL agit comme un secret, ne la commit pas dans le repo.

### c. Déployer l'Edge Function

La fonction est versionnée dans `supabase/functions/notify-report/`.

Installe la CLI Supabase si pas déjà fait :

```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref <ton-project-ref>
```

Génère un secret partagé qui protège l'Edge Function contre tout appel
direct non autorisé, et ajoute les secrets :

```bash
WEBHOOK_SECRET=$(openssl rand -hex 32)
supabase secrets set DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
supabase secrets set APP_BASE_URL=https://pillage-army-builder.vercel.app
supabase secrets set WEBHOOK_SECRET="$WEBHOOK_SECRET"
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET  ← à coller dans le Database Webhook"
```

Puis déploie :

```bash
supabase functions deploy notify-report --no-verify-jwt
```

Le flag `--no-verify-jwt` est important, le webhook DB n'envoie pas de JWT
utilisateur.

### d. Créer le Database Webhook

Dans Supabase Dashboard → **Database → Webhooks → Create a new hook** :

- Name : `notify-report-on-insert`
- Table : `army_reports`
- Events : cocher **Insert** uniquement
- Type : **Supabase Edge Functions**
- Edge Function : `notify-report`
- HTTP Headers : ajouter `x-webhook-secret` avec la valeur de `WEBHOOK_SECRET`
  générée à l'étape précédente

Sauvegarde. Désormais, chaque insertion dans `army_reports` déclenche
l'envoi de la notification Discord. Tout appel direct sans le header
(scanner, replay, curl) est rejeté en 401.

### e. Test rapide

Depuis l'app, signale une liste de test depuis la galerie. Tu devrais voir
un message dans ton salon Discord en quelques secondes (avec notification
push si tu as l'app mobile Discord). Si rien n'arrive :

- Vérifie les logs dans **Edge Functions → notify-report → Logs**.
- Vérifie que le webhook a bien été déclenché dans **Database → Webhooks**.
- Re-vérifie que la variable `DISCORD_WEBHOOK_URL` est bien renseignée
  dans **Project Settings → Edge Functions → Secrets**.

## 9. (Optionnel) Désactiver la confirmation email

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
