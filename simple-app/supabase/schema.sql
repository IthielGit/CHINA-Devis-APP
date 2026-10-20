-- Hygo — schéma Supabase (étape 2).
-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller → Run.

-- ============================================================
-- 1. Tables
-- ============================================================

-- Un profil par compte. Créé automatiquement à l'inscription (voir le trigger plus bas).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now()
);

-- Les données de l'app d'un compte : une ligne par utilisateur, même contenu que le localStorage.
create table public.app_data (
  owner_id uuid primary key references public.profiles (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. Création automatique du profil à l'inscription
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. Fonctions d'aide pour les règles d'accès
--    security definer : lisent profiles sans déclencher la RLS de profiles (pas de boucle).
-- ============================================================

create function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and status = 'active'
  );
$$;

-- ============================================================
-- 4. Règles d'accès (Row Level Security)
--    Sans politique, l'accès est refusé. Aucune suppression n'est autorisée.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.app_data enable row level security;

-- profiles : chacun lit le sien (pour l'écran « en attente »), le super admin lit tout.
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_super_admin());

-- profiles : seul le super admin modifie (validation, rôle, suspension).
-- Aucune politique d'insertion ni de suppression pour les utilisateurs.
create policy "profiles_update_super_admin"
  on public.profiles for update
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- app_data : un compte actif lit et écrit ses données ; le super admin peut tout lire et modifier.
create policy "app_data_select"
  on public.app_data for select
  to authenticated
  using (
    (owner_id = auth.uid() and public.is_active())
    or public.is_super_admin()
  );

create policy "app_data_insert"
  on public.app_data for insert
  to authenticated
  with check (
    (owner_id = auth.uid() and public.is_active())
    or public.is_super_admin()
  );

create policy "app_data_update"
  on public.app_data for update
  to authenticated
  using (
    (owner_id = auth.uid() and public.is_active())
    or public.is_super_admin()
  )
  with check (
    (owner_id = auth.uid() and public.is_active())
    or public.is_super_admin()
  );

-- ============================================================
-- 5. Premier super admin (à faire UNE fois, après votre inscription)
--    a) Inscrivez-vous dans l'app (étape 3) ou via Authentication → Users → Add user.
--    b) Remplacez l'adresse ci-dessous par la vôtre, puis exécutez la ligne seule.
-- ============================================================

-- update public.profiles
--   set role = 'super_admin', status = 'active'
--   where email = 'VOTRE_EMAIL@exemple.be';
