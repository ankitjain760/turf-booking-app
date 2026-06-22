# Palm Turf Booking – Live Supabase Version

Configured owners:
- kunal@palm.com
- suyash@palm.com

## Included
- Turf 1 / Turf 2 / Turf 3
- 1–3 hour bookings
- **mandatory booking price**
- customer name + phone mandatory, email optional
- both owners can cancel bookings
- real-time shared bookings
- admin pricing rules + manual price override
- dashboard for bookings / hours / revenue today

## How overlap prevention works
The app writes each booking into a `booking_slots` table.
Example: a 6 PM–9 PM booking creates slot rows for 18, 19, 20.
A unique index on `(turf_id, booking_date, slot_hour)` prevents overlap across both owners.

## Setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL editor.
3. In Supabase Auth create these users:
   - kunal@palm.com
   - suyash@palm.com
4. Copy `.env.example` to `.env.local` and fill:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
5. Install Node.js, then run:
   npm install
   npm run dev

## Deploy online
Use Vercel for the Next.js frontend and connect it to your Supabase project.

## Notes
This is a working starter architecture for the live shared app.
