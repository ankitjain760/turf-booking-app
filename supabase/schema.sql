create extension if not exists pgcrypto;
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  turf_id text not null,
  turf_name text not null,
  booking_date date not null,
  start_hour int not null check (start_hour >= 0 and start_hour <= 23),
  end_hour int not null check (end_hour >= 1 and end_hour <= 24),
  duration_hours int not null check (duration_hours between 1 and 3),
  booking_price numeric(12,2) not null check (booking_price > 0),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  booked_by_email text not null,
  booking_status text not null default 'confirmed' check (booking_status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);
create table if not exists public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  turf_id text not null,
  booking_date date not null,
  slot_hour int not null check (slot_hour >= 0 and slot_hour <= 23),
  created_at timestamptz not null default now()
);
create unique index if not exists ux_booking_slots_unique on public.booking_slots (turf_id, booking_date, slot_hour);
create table if not exists public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  turf_id text not null,
  day_type text not null check (day_type in ('all','weekday','weekend')),
  start_hour int not null check (start_hour >= 0 and start_hour <= 23),
  end_hour int not null check (end_hour >= 1 and end_hour <= 24),
  price_per_hour numeric(12,2) not null check (price_per_hour > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
alter table public.booking_slots enable row level security;
alter table public.pricing_rules enable row level security;
create policy "auth read bookings" on public.bookings for select to authenticated using (true);
create policy "auth insert bookings" on public.bookings for insert to authenticated with check (true);
create policy "auth update bookings" on public.bookings for update to authenticated using (true);
create policy "auth delete bookings" on public.bookings for delete to authenticated using (true);
create policy "auth read slots" on public.booking_slots for select to authenticated using (true);
create policy "auth insert slots" on public.booking_slots for insert to authenticated with check (true);
create policy "auth delete slots" on public.booking_slots for delete to authenticated using (true);
create policy "auth read pricing" on public.pricing_rules for select to authenticated using (true);
create policy "auth write pricing" on public.pricing_rules for insert to authenticated with check (true);
create policy "auth update pricing" on public.pricing_rules for update to authenticated using (true);
create policy "auth delete pricing" on public.pricing_rules for delete to authenticated using (true);
create or replace function public.create_booking_with_slots(booking_payload jsonb, slot_hours int[]) returns uuid language plpgsql security definer as $$
declare new_booking_id uuid; slot_hour int;
begin
  insert into public.bookings (turf_id,turf_name,booking_date,start_hour,end_hour,duration_hours,booking_price,customer_name,customer_phone,customer_email,notes,booked_by_email,booking_status)
  values (booking_payload->>'turf_id',booking_payload->>'turf_name',(booking_payload->>'booking_date')::date,(booking_payload->>'start_hour')::int,(booking_payload->>'end_hour')::int,(booking_payload->>'duration_hours')::int,(booking_payload->>'booking_price')::numeric,booking_payload->>'customer_name',booking_payload->>'customer_phone',nullif(booking_payload->>'customer_email',''),nullif(booking_payload->>'notes',''),booking_payload->>'booked_by_email',coalesce(booking_payload->>'booking_status','confirmed')) returning id into new_booking_id;
  foreach slot_hour in array slot_hours loop
    begin
      insert into public.booking_slots (booking_id,turf_id,booking_date,slot_hour) values (new_booking_id,booking_payload->>'turf_id',(booking_payload->>'booking_date')::date,slot_hour);
    exception when unique_violation then
      delete from public.bookings where id = new_booking_id;
      raise exception 'slot_conflict';
    end;
  end loop;
  return new_booking_id;
end; $$;
