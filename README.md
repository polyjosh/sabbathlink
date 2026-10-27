# SabbathLink

*Nearer to Thee.*

SabbathLink connects churches and their members. Each church gets a simple page with its weekly Sabbath programme, events, announcements, contacts and giving details. Members can find a church, follow it, and see its updates first.

The first market is Kenya (Nairobi and surrounding areas), starting with a pilot of 3 to 5 churches.

## Who uses it

| Role | What they do |
| --- | --- |
| **Visitor** | Browses the church directory and church pages without an account. |
| **Member** | Signs in with their phone number, follows a church, sees its programme and giving details. |
| **Church admin** | Clerk, treasurer, communication leader and other officers. They update the programme, events, announcements and giving details. A church can have several admins. |
| **Chorister of the day** | A member assigned in the weekly programme who leads that Sabbath's live Song Service. |
| **Platform admin** | SabbathLink staff who verify each church before it goes public. |

## What it does

**Church directory**
- Search by name or town, or find churches near you
- Church page with location, service times, programme, events, contacts and giving details
- Follow a church to see its updates first

**For church admins**
- Weekly Sabbath programme from a template (Sabbath School, Divine Service, AY and so on), with roles such as preacher, deacons and song leader
- Events and announcements, with an optional expiry date so old items disappear on their own
- Team management, so officers can be added and handed over when they change
- Designed so a clerk can update the programme from a phone in under five minutes

**Giving (display only)**
- Each church lists its M-Pesa Paybill or Till number, account name and bank details, with copy buttons
- Giving categories: tithe, offering, building fund, welfare, Local Church Budget, plus any custom categories the church adds
- **SabbathLink never holds church money.** Members pay the church directly.

**Live Song Service**
- The chorister starts Song Service and members see a "Song Service is live" banner
- Members request a song by entering the hymn number, in two or three taps
- The chorister sees a live list with request counts, and marks songs as next, sung or deferred
- Members see "Now singing" and a tick on their own request when it is sung
- Each church can switch the feature off

**Church verification**
- New churches register and wait for a platform admin to verify them
- A church is not public, and its payment details are not shown, until it is verified. This protects members from fake churches posting their own numbers.

**Built for the people using it**
- Installable web app (PWA), light on data and usable on a slow connection
- English and Kiswahili throughout
- Phone number sign-in with a one-time SMS code

## Privacy

Church affiliation is sensitive personal data under Kenya's Data Protection Act. SabbathLink collects only what it needs, asks for consent at sign-in, limits what each role can see, and lets members delete their account.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript) as a PWA
- [Tailwind CSS](https://tailwindcss.com)
- [next-intl](https://next-intl.dev) for English and Kiswahili (`messages/en.json`, `messages/sw.json`)
- [Supabase](https://supabase.com) for Postgres, phone sign-in, storage and real-time updates
- [Africa's Talking](https://africastalking.com) for SMS
- [Vitest](https://vitest.dev) for unit tests, pgTAP for database tests

## Getting started

You need Node.js 20 or later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

If you leave the Supabase values in `.env.local` empty, the app runs on built-in sample data. That's enough to explore the UI without a database.

### Connecting Supabase

1. Create a Supabase project and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Use the publishable key, never the secret key.
2. Apply the migrations in `supabase/migrations`.
3. Optionally load demo churches with `supabase/seed.sql`. Its header explains how to load and remove them. **Never load the seed into a database real members use.**

### SMS

To send real SMS codes, set the `AFRICASTALKING_*` values and `SEND_SMS_HOOK_SECRET`, then point Supabase's **Send SMS** auth hook at `https://<your site>/api/auth/send-sms`. Use the username `sandbox` while testing. See `.env.example` for details.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Run the production build |
| `npm run lint` | Lint with ESLint |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | Type-check with TypeScript |
| `npm test` | Run unit tests |

Database tests live in `supabase/tests` and run with `npx supabase test db`.

## Project layout

```
src/
  app/
    (auth)/      sign-in, welcome and consent
    (member)/    home, directory, church pages, profile, privacy
    admin/       church admin: programme, posts, giving, team, songs
    platform/    platform admin: church verification, people, audit log
    register/    church registration
    api/         SMS hook, hymn and song endpoints
  components/    UI, grouped by area
  lib/           data access, permissions, phone and time helpers, SMS
messages/        English and Kiswahili strings
supabase/        migrations, seed data and database tests
```

## Conventions

- All user-facing text goes through `messages/`. Don't hard-code strings.
- Times are stored in UTC and shown in `Africa/Nairobi` time. Currency is KES.
- Phone numbers are normalised to `+254`.
- Design and test layouts at 360px width first.

## Roadmap

- **Phase 1 (now):** church profiles and verification, programme, events and announcements, directory, follow, display-only giving
- **Phase 1.5:** live song requests during Song Service
- **Phase 2:** membership roll and clerk tools, church transfer requests
- **Phase 3:** reminders by SMS or WhatsApp, M-Pesa giving, giving history and treasurer reports
- **Phase 4:** district and conference dashboards, live stream and lesson links, shared calendars
