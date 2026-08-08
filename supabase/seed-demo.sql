-- Demo data for the hosted project.
--
-- Run against a project you are happy to have fictional data in:
--   supabase db execute --file supabase/seed-demo.sql       (or paste in the SQL editor)
--
-- Idempotent: re-running replaces the demo rows rather than duplicating them.
-- Everything it creates is namespaced under slugs beginning `demo-`, and every
-- demo account uses the reserved `@example.com` domain, so `clean_demo_data()`
-- at the bottom can remove all of it without touching real signups.
--
-- People, venues and messages here are invented. No real person's details.

begin;

-- ---------------------------------------------------------------- reset

-- Clones first: they reference their source with on delete cascade, but being
-- explicit keeps the intent obvious.
delete from events where showcase_source_id in (select id from events where slug like 'demo-%');
delete from events where slug like 'demo-%';
-- Cascades to profiles, which are keyed on auth.users(id).
delete from auth.users where email like '%@example.com';

-- ---------------------------------------------------------------- accounts

/**
 * Demo accounts are created in `auth.users` so the `handle_new_user` trigger
 * builds their `profiles` (and `agents`) rows exactly as a real signup would —
 * seeding `profiles` directly would fail its foreign key and would also skip
 * the trigger we actually want to exercise.
 *
 * `encrypted_password` is a fixed non-hash: bcrypt can never produce this
 * string, so no password will ever verify and these accounts cannot be signed
 * into. They exist to own demo rows and to populate the admin and agent views.
 */
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000',
  id, 'authenticated', 'authenticated', email,
  'DEMO-ACCOUNT-NO-PASSWORD',
  now(), now() - interval '60 days', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  meta
from (values
  ('d0000000-0000-4000-a000-000000000001'::uuid, 'priya.host@example.com',  '{"full_name":"Priya Sharma","role":"host","phone":"+91 90000 00001"}'::jsonb),
  ('d0000000-0000-4000-a000-000000000002'::uuid, 'arjun.host@example.com',  '{"full_name":"Arjun Mehta","role":"host","phone":"+91 90000 00002"}'::jsonb),
  ('d0000000-0000-4000-a000-000000000003'::uuid, 'fatima.host@example.com', '{"full_name":"Fatima Qureshi","role":"host","phone":"+91 90000 00003"}'::jsonb),
  ('d0000000-0000-4000-a000-000000000004'::uuid, 'nikhil.host@example.com', '{"full_name":"Nikhil Rao","role":"host","phone":"+91 90000 00004"}'::jsonb),
  ('d0000000-0000-4000-a000-000000000010'::uuid, 'studio@example.com',      '{"full_name":"Meera Kapoor","role":"agent","agency_name":"Kapoor Wedding Studio","phone":"+91 90000 00010"}'::jsonb)
) as t(id, email, meta);

-- The trigger already created this agent row with a random referral code; pin it
-- to something legible for demos.
update agents
   set referral_code = 'MEERA10', commission_rate = 0.1800, payout_upi = 'demo@upi'
 where id = 'd0000000-0000-4000-a000-000000000010';

-- The agent referred two of the hosts, so the partner dashboard has clients.
update profiles set referred_by = 'd0000000-0000-4000-a000-000000000010'
where id in ('d0000000-0000-4000-a000-000000000002', 'd0000000-0000-4000-a000-000000000004');

-- ---------------------------------------------------------------- invitations

insert into events (
  id, slug, owner_id, agent_id, event_type, status, theme_id, title, hosts,
  hashtag, main_datetime, city, story, story_moments, hotels, settings,
  permissions, published_at
) values
  (
    'e0000000-0000-4000-a000-000000000001', 'demo-aarav-weds-priya',
    'd0000000-0000-4000-a000-000000000001', null, 'wedding', 'published', 'royal-maroon',
    'Aarav & Priya',
    '[{"name":"Aarav Sharma","family":"The Sharma Family","role":"partner"},
      {"name":"Priya Iyer","family":"The Iyer Family","role":"partner"}]'::jsonb,
    '#AaravWedsPriya', '2027-02-14T19:00:00+05:30', 'Udaipur',
    'They met in a queue for filter coffee that neither of them particularly wanted, argued about whether Ilaiyaraaja or A. R. Rahman scored the better monsoon song, and have been continuing that argument happily ever since.',
    '[{"title":"First met","text":"A Bengaluru coffee queue, one disputed order, two strong opinions about film music."},
      {"title":"The yes","text":"On the terrace during a power cut, by candlelight that was not at all planned."},
      {"title":"The families met","text":"Two sets of parents, one long lunch, and complete agreement on the menu if nothing else."}]'::jsonb,
    '[{"name":"Lake Palace View","distance":"1.1 km from venue","phone":"+91 90000 11111"},
      {"name":"Hotel Rajputana","distance":"2.4 km from venue","phone":"+91 90000 22222"}]'::jsonb,
    '{"rsvpEnabled":true,"blessingsEnabled":true,"showCountdown":true}'::jsonb,
    -- Consented and curated: this one appears in /showcase.
    '{"showcase_consent":true,"showcase_anonymise":true}'::jsonb,
    now() - interval '38 days'
  ),
  (
    'e0000000-0000-4000-a000-000000000002', 'demo-imran-weds-zoya',
    'd0000000-0000-4000-a000-000000000003', null, 'wedding', 'published', 'nikah-emerald',
    'Imran & Zoya',
    '[{"name":"Imran Qureshi","family":"The Qureshi Family","role":"partner"},
      {"name":"Zoya Siddiqui","family":"The Siddiqui Family","role":"partner"}]'::jsonb,
    '#ImranAndZoya', '2027-03-08T18:30:00+05:30', 'Hyderabad',
    'Introduced by a cousin who has since claimed full credit at every family gathering, and will continue to for the rest of their lives.',
    '[{"title":"First met","text":"A cousin''s valima in Hyderabad, seated at the same table by an aunt with a plan."},
      {"title":"The proposal","text":"Over haleem, in a restaurant far too loud for the question to be heard the first time."}]'::jsonb,
    '[{"name":"Taj Falaknuma","distance":"At venue","phone":"+91 90000 33333"}]'::jsonb,
    '{"rsvpEnabled":true,"blessingsEnabled":true,"showCountdown":true,"moderateBlessings":true}'::jsonb,
    '{"showcase_consent":true,"showcase_anonymise":false}'::jsonb,
    now() - interval '21 days'
  ),
  (
    'e0000000-0000-4000-a000-000000000003', 'demo-rohan-turns-one',
    'd0000000-0000-4000-a000-000000000002', 'd0000000-0000-4000-a000-000000000010',
    'birthday', 'published', 'haldi-sunshine',
    'Rohan turns one',
    '[{"name":"Rohan Mehta","role":"celebrant"}]'::jsonb,
    '#RohanIsOne', '2026-11-30T11:00:00+05:30', 'Pune',
    'One whole year of very little sleep and a truly unreasonable amount of joy.',
    '[]'::jsonb, '[]'::jsonb,
    '{"rsvpEnabled":true,"blessingsEnabled":true,"showCountdown":true}'::jsonb,
    '{"showcase_consent":false}'::jsonb,
    now() - interval '9 days'
  ),
  (
    'e0000000-0000-4000-a000-000000000004', 'demo-sharma-griha-pravesh',
    'd0000000-0000-4000-a000-000000000004', 'd0000000-0000-4000-a000-000000000010',
    'housewarming', 'published', 'temple-south',
    'Our new home',
    '[{"name":"Nikhil Rao","family":"The Rao Family","role":"host"},
      {"name":"Ananya Rao","family":"The Rao Family","role":"host"}]'::jsonb,
    null, '2026-12-06T10:00:00+05:30', 'Chennai',
    'Eleven years of renting, one very long paperwork trail, and finally a doorway of our own to hang a toran on.',
    '[]'::jsonb, '[]'::jsonb,
    '{"rsvpEnabled":true,"blessingsEnabled":false,"showCountdown":true}'::jsonb,
    '{"showcase_consent":true,"showcase_anonymise":true}'::jsonb,
    now() - interval '4 days'
  ),
  -- A draft, so the dashboard shows both states.
  (
    'e0000000-0000-4000-a000-000000000005', 'demo-kabir-weds-sana',
    'd0000000-0000-4000-a000-000000000002', 'd0000000-0000-4000-a000-000000000010',
    'engagement', 'draft', 'mehndi-nights',
    'Kabir & Sana',
    '[{"name":"Kabir Malhotra","role":"partner"},{"name":"Sana Kaur","role":"partner"}]'::jsonb,
    null, '2027-05-22T18:00:00+05:30', 'Amritsar',
    null, '[]'::jsonb, '[]'::jsonb,
    '{"rsvpEnabled":true,"blessingsEnabled":true,"showCountdown":true}'::jsonb,
    '{}'::jsonb,
    null
  );

-- ---------------------------------------------------------------- ceremonies

insert into sub_events (event_id, key, name, starts_at, time_label, venue, address, dress_code, sort_order)
values
  ('e0000000-0000-4000-a000-000000000001','haldi','Haldi','2027-02-12T10:00:00+05:30','10:00 AM','Sharma Residence','12 Lake Road, Udaipur','Yellow, and clothes you do not love',0),
  ('e0000000-0000-4000-a000-000000000001','mehndi','Mehndi','2027-02-12T16:00:00+05:30','4:00 PM','Garden Courtyard','Fateh Sagar Road, Udaipur','Green and gold',1),
  ('e0000000-0000-4000-a000-000000000001','sangeet','Sangeet','2027-02-13T19:00:00+05:30','7:00 PM','The Durbar Hall','City Palace Road, Udaipur','Festive Indian',2),
  ('e0000000-0000-4000-a000-000000000001','pheras','Pheras','2027-02-14T19:00:00+05:30','7:00 PM','Lakeside Lawns','Pichola East, Udaipur','Traditional',3),
  ('e0000000-0000-4000-a000-000000000001','reception','Reception','2027-02-15T19:30:00+05:30','7:30 PM','The Durbar Hall','City Palace Road, Udaipur','Formal',4),
  ('e0000000-0000-4000-a000-000000000002','mehndi','Mehndi','2027-03-06T17:00:00+05:30','5:00 PM','Qureshi Residence','Banjara Hills, Hyderabad','Mehndi green',0),
  ('e0000000-0000-4000-a000-000000000002','nikah','Nikah','2027-03-08T18:30:00+05:30','6:30 PM','Falaknuma Courtyard','Engine Bowli, Hyderabad','Traditional',1),
  ('e0000000-0000-4000-a000-000000000002','valima','Valima','2027-03-09T19:30:00+05:30','7:30 PM','Taj Banquet','Road No. 1, Hyderabad','Elegant formal',2),
  ('e0000000-0000-4000-a000-000000000003','cake','Cake cutting','2026-11-30T11:00:00+05:30','11:00 AM','Sunshine Play Cafe','Koregaon Park, Pune','Anything washable',0),
  ('e0000000-0000-4000-a000-000000000004','puja','Griha Pravesh Puja','2026-12-06T10:00:00+05:30','10:00 AM','No. 4, Anna Nagar','Anna Nagar, Chennai','Traditional',0),
  ('e0000000-0000-4000-a000-000000000004','lunch','Lunch','2026-12-06T12:30:00+05:30','12:30 PM','No. 4, Anna Nagar','Anna Nagar, Chennai',null,1);

-- ---------------------------------------------------------------- guests

insert into guests (event_id, name, phone, side, guest_group, headcount, meal, invited_keys, status)
select
  'e0000000-0000-4000-a000-000000000001',
  name, phone, side, guest_group, headcount, meal,
  array['haldi','mehndi','sangeet','pheras','reception'],
  status::rsvp_status
from (values
  ('Rahul & Family',  '+91 90000 40001', 'groom', 'family',     4, 'Veg',      'yes'),
  ('Ananya',          '+91 90000 40002', 'bride', 'friends',    1, 'Veg',      'yes'),
  ('Vikram & Family', '+91 90000 40003', 'groom', 'family',     3, 'Non-veg',  'maybe'),
  ('Meera',           '+91 90000 40004', 'bride', 'colleagues', 2, 'Jain',     'yes'),
  ('Karan',           '+91 90000 40005', 'groom', 'friends',    1, 'Veg',      'no'),
  ('Divya & Family',  '+91 90000 40006', 'bride', 'family',     5, 'Veg',      'yes'),
  ('Sameer',          '+91 90000 40007', 'groom', 'colleagues', 2, 'Non-veg',  'pending'),
  ('Ritu & Family',   '+91 90000 40008', 'bride', 'family',     3, 'Veg',      'pending'),
  ('Aditya',          '+91 90000 40009', 'groom', 'friends',    1, 'Veg',      'yes'),
  ('Shreya',          '+91 90000 40010', 'bride', 'friends',    2, 'Jain',     'yes')
) as t(name, phone, side, guest_group, headcount, meal, status);

insert into guests (event_id, name, phone, side, guest_group, headcount, meal, invited_keys, status)
values
  ('e0000000-0000-4000-a000-000000000002','Bilal & Family','+91 90000 50001','groom','family',4,'Non-veg',array['mehndi','nikah','valima'],'yes'),
  ('e0000000-0000-4000-a000-000000000002','Ayesha','+91 90000 50002','bride','friends',2,'Veg',array['mehndi','valima'],'yes'),
  ('e0000000-0000-4000-a000-000000000002','Farhan','+91 90000 50003','groom','colleagues',1,'Non-veg',array['nikah','valima'],'maybe'),
  ('e0000000-0000-4000-a000-000000000003','The Deshpandes','+91 90000 60001',null,'family',4,'Veg',array['cake'],'yes'),
  ('e0000000-0000-4000-a000-000000000003','Sneha','+91 90000 60002',null,'friends',2,'Veg',array['cake'],'yes');

-- ---------------------------------------------------------------- responses

insert into rsvps (event_id, guest_name, attending, headcount, sub_event_keys, meal, message, created_at)
values
  ('e0000000-0000-4000-a000-000000000001','Rahul & Family','yes',4,array['sangeet','pheras','reception'],'Veg','Wouldn''t miss it for anything. Booking flights tonight!',now() - interval '6 days'),
  ('e0000000-0000-4000-a000-000000000001','Ananya','yes',1,array['mehndi','sangeet','pheras'],'Veg','So happy for you both.',now() - interval '5 days'),
  ('e0000000-0000-4000-a000-000000000001','Meera','yes',2,array['pheras','reception'],'Jain',null,now() - interval '4 days'),
  ('e0000000-0000-4000-a000-000000000001','Karan','no',0,array[]::text[],'Veg','Away that fortnight — sending all my love.',now() - interval '3 days'),
  ('e0000000-0000-4000-a000-000000000001','Divya & Family','yes',5,array['haldi','mehndi','sangeet','pheras','reception'],'Veg','All five of us, all five days.',now() - interval '2 days'),
  ('e0000000-0000-4000-a000-000000000001','Vikram & Family','maybe',3,array['pheras'],'Non-veg','Depends on the school calendar — will confirm.',now() - interval '1 day'),
  ('e0000000-0000-4000-a000-000000000002','Bilal & Family','yes',4,array['nikah','valima'],'Non-veg','Mubarak ho!',now() - interval '8 days'),
  ('e0000000-0000-4000-a000-000000000002','Ayesha','yes',2,array['mehndi','valima'],'Veg',null,now() - interval '6 days'),
  ('e0000000-0000-4000-a000-000000000003','The Deshpandes','yes',4,array['cake'],'Veg','Rohan is getting the loudest toy we can find.',now() - interval '2 days');

insert into blessings (event_id, name, message, is_approved, created_at)
values
  ('e0000000-0000-4000-a000-000000000001','Dadi','May your home always smell of fresh marigolds and your evenings of good chai. Jug jug jiyo.',true,now() - interval '7 days'),
  ('e0000000-0000-4000-a000-000000000001','Rahul & Nisha','Two of our favourite people becoming one household. The sangeet had better be legendary.',true,now() - interval '6 days'),
  ('e0000000-0000-4000-a000-000000000001','Aunt Meera','Wishing you a lifetime of laughter, patience in traffic, and someone who always saves you the last gulab jamun.',true,now() - interval '5 days'),
  ('e0000000-0000-4000-a000-000000000001','The Coffee Queue','We were there when it started. We expect royalties.',true,now() - interval '3 days'),
  ('e0000000-0000-4000-a000-000000000002','Nani','Allah aap dono ko hamesha khush rakhe.',true,now() - interval '5 days'),
  -- Pending, so the moderation queue in the dashboard has something in it.
  ('e0000000-0000-4000-a000-000000000002','A well-wisher','Congratulations to you both from all of us in Dubai!',false,now() - interval '1 day'),
  ('e0000000-0000-4000-a000-000000000003','Ajji','A whole year already. Many happy returns, little one.',true,now() - interval '2 days');

-- ---------------------------------------------------------------- billing

insert into orders (event_id, buyer_id, agent_id, plan_code, amount_inr, status, provider, provider_ref, created_at, paid_at)
values
  ('e0000000-0000-4000-a000-000000000001','d0000000-0000-4000-a000-000000000001',null,'premium',5999,'paid','dummy','dummy_demo0001',now() - interval '38 days',now() - interval '38 days'),
  ('e0000000-0000-4000-a000-000000000002','d0000000-0000-4000-a000-000000000003',null,'classic',2999,'paid','dummy','dummy_demo0002',now() - interval '21 days',now() - interval '21 days'),
  ('e0000000-0000-4000-a000-000000000003','d0000000-0000-4000-a000-000000000002','d0000000-0000-4000-a000-000000000010','classic',2999,'paid','dummy','dummy_demo0003',now() - interval '9 days',now() - interval '9 days'),
  ('e0000000-0000-4000-a000-000000000004','d0000000-0000-4000-a000-000000000004','d0000000-0000-4000-a000-000000000010','premium',5999,'paid','dummy','dummy_demo0004',now() - interval '4 days',now() - interval '4 days');
-- Commissions are not inserted: the accrue_commission trigger creates them from
-- the two agent-attributed orders above.

-- ---------------------------------------------------------------- analytics

/**
 * Six weeks of invite views, weighted so weekends are busier and the days just
 * after publication spike — otherwise the dashboard sparkline is a flat line
 * and tells you nothing about whether it works.
 */
insert into page_views (event_id, visitor_hash, occurred_at, country, city)
select
  e.id,
  md5(e.id::text || d || g::text),
  now() - (d || ' days')::interval + (g * interval '17 minutes'),
  'IN',
  e.city
from events e
cross join generate_series(0, 41) as d
cross join lateral generate_series(
  1,
  greatest(
    1,
    (case when extract(dow from now() - (d || ' days')::interval) in (0, 6) then 14 else 6 end)
    + greatest(0, 24 - d)
  )
) as g
where e.slug like 'demo-%' and e.status = 'published';

-- ---------------------------------------------------------------- showcase

/**
 * Curate the two consenting invitations. `generate_showcase_clone` is
 * admin-only by design, so it is inlined here rather than called — a seed script
 * runs as the postgres role, which `is_admin()` does not recognise.
 */
do $$
declare
  src        events%rowtype;
  clone_id   uuid;
  anonymise  boolean;
  clean_hosts jsonb;
begin
  for src in
    select * from events
    where slug like 'demo-%'
      and (permissions ->> 'showcase_consent') = 'true'
      and showcase_source_id is null
  loop
    anonymise := coalesce((src.permissions ->> 'showcase_anonymise')::boolean, true);

    select jsonb_agg(
             case when anonymise
               then jsonb_build_object('name', split_part(h ->> 'name', ' ', 1))
               else jsonb_build_object('name', h ->> 'name')
             end)
      into clean_hosts
      from jsonb_array_elements(src.hosts) as h;

    insert into events (
      slug, owner_id, event_type, status, theme_id, title, hosts, main_datetime,
      city, story, story_moments, settings, is_showcased, showcase_tags,
      showcase_source_id, showcased_at
    ) values (
      'showcase-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
      src.owner_id, src.event_type, 'archived', src.theme_id,
      case when anonymise then 'A ' || src.event_type::text || ' invitation' else src.title end,
      coalesce(clean_hosts, '[]'::jsonb),
      src.main_datetime, src.city, src.story, src.story_moments,
      '{"rsvpEnabled":false,"blessingsEnabled":false,"showCountdown":false}'::jsonb,
      true,
      case src.event_type
        when 'wedding' then array['wedding', src.theme_id]
        else array[src.event_type::text, src.theme_id]
      end,
      src.id, now()
    ) returning id into clone_id;

    insert into sub_events (event_id, key, name, starts_at, time_label, venue, address, dress_code, sort_order)
    select clone_id, key, name, starts_at, time_label, venue, src.city, dress_code, sort_order
    from sub_events where event_id = src.id;

    update events set is_showcased = true where id = src.id;

    insert into showcase_consents (event_id, profile_id, granted, anonymise, consent_text)
    values (src.id, src.owner_id, true, anonymise,
            'Can we feature your invitation in our public gallery? We''ll create a copy with your address, phone numbers, and payment details removed. You can withdraw this at any time.');
  end loop;
end $$;

commit;

-- ---------------------------------------------------------------- teardown

/**
 * Removes every demo row and nothing else. Run before going properly live:
 *   select clean_demo_data();
 */
create or replace function clean_demo_data()
returns void
language plpgsql
as $$
begin
  delete from events where showcase_source_id in (select id from events where slug like 'demo-%');
  delete from events where slug like 'demo-%';
  -- Cascades to profiles and agents.
  delete from auth.users where email like '%@example.com';
end;
$$;
