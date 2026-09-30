-- PlanningWatch UK background renewable alerts.
-- Coordinates and push endpoints are personal data. Keep table access server-only.
create table if not exists public.alert_watchers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  centre_lat double precision not null check (centre_lat between -90 and 90),
  centre_lng double precision not null check (centre_lng between -180 and 180),
  radius_miles integer not null check (radius_miles between 1 and 100),
  kinds text[] not null default '{}',
  notification_frequency text not null default 'immediate' check (notification_frequency in ('immediate','daily','weekly')) ,
  last_notified_at timestamptz,
  push_subscription jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.renewable_state (
  id text primary key,
  fingerprint text not null,
  kind text not null check (kind in ('solar','wind')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  name text not null,
  status text,
  capacity text,
  place text,
  country text,
  source_url text,
  updated_at timestamptz not null default now()
);

alter table public.alert_watchers enable row level security;
alter table public.renewable_state enable row level security;
revoke all on public.alert_watchers from anon, authenticated;
revoke all on public.renewable_state from anon, authenticated;
-- Edge Functions use the server secret and are the only readers/writers.
