# CLAUDE.md: SabbathLink

## Project overview

SabbathLink is a platform that connects churches and their members: weekly programmes, events, announcements, a church directory, giving details, a members roll, and church transfer requests. The first market is Kenya (Nairobi and surrounding areas), with a pilot of 3 to 5 churches.

Tagline: *Nearer to Thee.*

**Do not use "Adventist" or "SDA" in the product name, logo, domain, or UI branding.** The denomination holds trademarks on these. Using them in neutral descriptive copy (for example, "Sabbath programme") is fine.

## Users and roles

- **Visitor**: browses the directory and church pages without an account.
- **Member**: has an account, follows a church, gives, requests transfers. Becomes a *verified member* only after the clerk confirms them.
- **Church admin**: clerk, treasurer, communication leader, and other officers. Multiple admins per church, with role-based permissions.
- **Chorister of the day**: a member assigned in the weekly programme who gets temporary control of the live Song Service for that Sabbath only. Access ends when the session closes.
- **Platform admin**: SabbathLink staff who verify churches before they go live, and manage the platform and contact people through the platform admin panel (see below).

## Product principles

1. **Mobile-first, low-data.** Most users are on phones with limited data and patchy connectivity. Build a PWA, keep pages light, and make key pages work offline or on a slow connection.
2. **Admin side must be dead simple.** A clerk should be able to update the weekly programme from a phone in under five minutes. If churches stop updating, the platform fails.
3. **English and Swahili** from day one. All user-facing strings go through an i18n layer, with no hard-coded text.
4. **The clerk's records are the source of truth** for membership. The platform mirrors the church's official roll.
5. **Never hold church money.** SabbathLink does not collect funds into its own account and pay churches out.

## Phase 1 (MVP) scope

Build this first, and nothing from later phases until Phase 1 is in use by pilot churches.

- Church accounts and profiles: name, district/conference, location with map pin, service times, contacts, photos
- Church verification by the platform admin before the church is public and before its payment details are visible
- Multiple admins per church, with easy handover when officers change
- Weekly Sabbath programme: a template (Sabbath School, Divine Service, AY, etc.) with roles such as preacher, deacons, song leader, Sabbath School teacher
- Events and announcements, with an optional expiry date so old items disappear automatically
- Church directory: search by name or town, "near me" by location, church detail page (location, programme, events, contacts, giving details)
- Follow a church to see its updates first
- **Display-only giving**: each church adds Paybill/Till number, account name, and bank details, shown with copy buttons
- Giving categories: tithe, offering, building fund, welfare, Local Church Budget, and **admins can add custom categories**
- PWA, English and Swahili

## Platform admin panel (super admin)

A staff-only console at `/platform` for SabbathLink's own team (the **Platform admin** role). It is part of Phase 1, because churches can't go live until staff verify them.

**Access and safeguards**
- Only accounts listed in `platform_admins` can open it. The first platform admin is added by hand in the Supabase dashboard; after that, platform admins can add or remove others.
- It works through the same database rules as the rest of the app: RLS policies grant platform admins read access across the platform, and every change goes through a database function that checks `is_platform_admin()` and writes the audit log. No service-role or secret key in the app.
- Every view of a person's details and every change is written to `audit_log` with the staff member, the subject and the time. Platform admins can read the audit log; nobody can edit or delete it.
- Religious affiliation is sensitive personal data: show phone numbers and follows only on a person's detail page (which is logged), never in bulk exports.
- Platform admins never see or handle church money, and they can't add or change a church's payment numbers. They can only hide a church's giving details while a fraud report is investigated.

**Screens**
1. **Overview:** counts of churches by status, accounts, church admins, applications waiting, payment-number changes waiting; a list of applications to review, oldest first.
2. **Churches:** search and filter by status; church detail with profile, service times, admin team, recent programmes, posts, giving details, application and its history.
   Actions: verify, reject (with a reason), suspend and reinstate (hidden from the directory and giving hidden, with a reason), edit profile fields, remove an announcement or event, hide giving details, remove an admin or pass ownership when a church loses access.
3. **People:** search accounts by phone or name; person detail with profile, churches followed, admin roles and messages sent to them.
   Actions: remove an admin role, grant or remove platform admin.
4. **Messages:** contact people.
   - Audiences: one person, all admins of one church, all church admins, everyone who follows a church, or all accounts.
   - Messages land in the person's in-app inbox (Me → Messages) with an unread count.
   - SMS is queued alongside when chosen, and sent once an SMS provider (Africa's Talking) is connected; until then the panel says SMS is not set up. One-to-one, staff can also call, SMS or WhatsApp from their own phone using links on the person's page.
   - Only service messages (verification, safety, account and product notices). Marketing messages need the person's opt-in first, and every SMS must say how to stop them.
5. **Audit log:** filterable by staff member, church and action.

**Data model additions:** `platform_admins` (name, added by, added at); church `suspended` status plus status reason and `giving_hidden` flag; `messages` (sender, audience, title, body, channels, sent at) and `message_recipients` (message, person, read at, SMS status), filled in one step when a message is sent. Verification letters go to the private `church-letters` storage bucket (in a folder per applicant); only platform admins and the uploader can read them, and staff open them through short-lived links on the church page.

**Build order:** schema and permissions with tests against the database → overview and church verification → churches and people screens → messages and the member inbox → audit log screen.

## Phase 1.5: Live song requests

Build after the MVP is in use. Members request songs **during Song Service**, which is led by the **Chorister of the day**. This is a live, in-service feature, not an advance queue.

**Flow**
1. The clerk or music leader assigns the Chorister of the day in the weekly programme. That person gets temporary Song Service permissions for that Sabbath.
2. The chorister taps **Start Song Service**. Requests open and members of that church see a "Song Service is live" banner.
3. Members tap **Request a song**, enter the **hymn number** on a number keypad (or search by title), and send. Two or three taps, with no typing beyond the number.
4. The chorister sees a live list: hymn number and title, request count, and the requester's name unless anonymous.
5. The chorister taps **Next** (members see "Now singing: Hymn 245") and **Sung** (members see a tick on their request).
6. The chorister taps **End Song Service**. The session also closes automatically after a set time.

**Chorister controls:** reorder or sort (order received or most requested); auto-merge duplicates ("requested by 5"); defer a request with a gentle "We'll sing it next time", never a rejection; add a request manually for members without smartphones; pause or close requests; per-person limit per session (default 2).

**Presence check (pick one or combine):** session-open only (simplest, use for the pilot); church code or QR shown by the chorister; optional location check. Requests are limited to followers or verified members of that church.

**Connectivity:** weak signal inside church buildings is likely. Keep the request screen very light, cache the hymn index on the phone, queue requests when offline and send on reconnect, and make sure the chorister can always work manually so the service never depends on the app.

**Rules**
- Store only hymn numbers, titles, and hymnal names. Do not host lyrics or sheet music unless public domain or licensed.
- No free-text notes or dedications by default, since they cannot be moderated mid-service. If added later, show them only to the chorister.
- Anonymous requests are hidden from other members; the chorister can see them if the church wants accountability.
- The chorister has the final say, and a church can switch the feature off.

**Data model additions:** song service sessions (church, date, chorister, status: not started/live/closed, start and end times); song requests (session, member or manual entry, hymn reference or title, anonymous flag, status: requested/next/sung/deferred, time received); hymnals and hymns (hymnal, number, title, language); hymn usage history.

**Real-time:** use a lightweight real-time channel (for example Supabase Realtime, WebSockets, or server-sent events) for the live list and "Now singing" banner, with polling as a fallback.

**Later additions:** QR or location join, "Most requested" insights, upvotes, a congregation display screen, special music requests.

**Open questions:** Is Song Service always led by one chorister? How are requests made today? Which hymnals and languages are used? Would a congregation display screen help?

## Later phases (do not build yet)

- **Phase 2, Membership:** member roster and clerk tools, member accounts verified to a church, roles and departments, transfer request workflow
- **Phase 3, Engagement and giving:** SMS, push, or WhatsApp reminders; M-Pesa STK Push (Safaricom Daraja) or an aggregator (IntaSend, Pesapal, Flutterwave); giving history and receipts; treasurer dashboard and reports
- **Phase 4, Scale:** hierarchy church → district → conference → union; conference dashboards and approvals; live stream and Sabbath School lesson links; church-wide calendars; cross-district transfer tracking

## Membership rules (Phase 2, design for them now)

- Keep two concepts separate: the **membership roll** (maintained by the clerk) and **platform users** (accounts). A user is a verified member only when a clerk confirms it.
- Member statuses: active, transferred out, deceased, and others as needed. Include date joined.
- Clerk tools: add manually, import from Excel/CSV, approve join requests, assign roles/departments, search, filter, export.
- The roster is **never public**. Only authorised officers of that church can see it, with role-based access (the treasurer does not need everything the clerk sees).
- Keep an **audit log** of who viewed or exported the roster.

## Transfer workflow (Phase 2)

A member stays on their current church's roll until the receiving church accepts them. The platform must mirror this, not move someone in one click.

1. Member picks the church to join and gives a reason.
2. Current church's clerk reviews, checks for pending matters, records the board's action.
3. Current church releases the member; a digital transfer letter is generated.
4. Receiving church's clerk receives it and presents it to their board or church.
5. Receiving church accepts or declines and records the vote date.
6. On acceptance, membership moves: old church = "transferred out", new church = "active".

Status tracker for the member: Requested → Under review → Released → Accepted. Support cancelling a pending request, notifications at each step, full history, and clerk-submitted transfers on behalf of members without smartphones. Only a clerk's confirmation changes roster status, never the user alone. Procedures vary by conference, so keep the workflow configurable and confirm details with a clerk or district pastor before building.

## High-level data model

- Churches, Users, Admin roles
- Memberships (user ↔ church, status, dates, roles)
- Transfer requests (member, from church, to church, status, board action dates, reason)
- Programmes, Events, Announcements
- Payment methods, Giving categories, Giving records
- Audit log
- Song service sessions, Song requests, Hymnals, Hymns, Hymn usage history (Phase 1.5)

Design the schema with the later phases in mind (for example, a nullable parent organisation on churches for the district/conference hierarchy) without implementing them yet.

## Security, privacy, and compliance

- Religious affiliation is **sensitive personal data** under Kenya's Data Protection Act. Collect the minimum necessary, get explicit consent, and restrict access by role. A privacy policy and ODPC registration are required before launch.
- Fraud risk: a fake church could post its own number to collect offerings. Payment details must not be public until a platform admin has verified the church (for example, via a letter or confirmation from the district pastor or conference).
- Phone-number-based sign-in with OTP is likely the most natural login for this audience. Validate and normalise Kenyan phone numbers (+254).
- Never log or expose payment credentials or full member rosters. Use environment variables for secrets.
- Payments: do not build any flow that routes church funds through a SabbathLink-owned account.

## Suggested tech stack (to be confirmed with the owner)

No stack has been chosen yet. Unless told otherwise, default to:

- **Frontend:** Next.js (React, TypeScript) as an installable PWA, Tailwind CSS, i18n via `next-intl` or similar
- **Backend/DB:** PostgreSQL with Prisma or Drizzle (or Supabase for auth, DB, and storage to move quickly)
- **Maps:** Google Maps or OpenStreetMap/Leaflet for location pins and "near me"
- **Auth:** phone number + OTP (SMS provider such as Africa's Talking), plus email as a fallback
- **Hosting:** Vercel or similar, with a database region close to East Africa where possible

Ask before introducing heavy dependencies or switching stack choices.

## Conventions

- TypeScript with strict mode; lint and format with ESLint and Prettier.
- Keep components small and mobile-first; test layouts at 360px width first.
- All dates and times in `Africa/Nairobi` for display, stored as UTC.
- Currency is KES.
- Write tests for permission checks (who can see or edit what) for the transfer state machine once it exists, and for the Song Service session rules (who can start/end it, request limits, offline queueing) once built.
- Prefer small, reviewable commits and explain non-obvious decisions in comments or in `/docs`.

## Open questions to resolve with pilot churches

- Exact tithe handling, since it usually goes through the conference
- Local transfer procedures and wording of transfer letters
- Which church officers need which permissions
- How churches want to be verified (documents required)
- Final decision on domain and social handles for SabbathLink
- Song Service: which hymnals and languages are used, whether one chorister leads each week, and how requests are made today

## First tasks for Claude Code

1. Confirm the tech stack with the owner, then scaffold the project (PWA, i18n, auth, database).
2. Create the database schema for churches, users, admin roles, programmes, events, announcements, payment methods, and giving categories.
3. Build the church signup, profile, and verification flow.
4. Build the programme editor, events, and announcements (mobile-first).
5. Build the directory, search, "near me", church detail page, and follow.
6. Build the display-only giving section with copy buttons and custom categories.
7. Add English and Swahili translations, then a deployment and pilot setup.
8. After the pilot has started, build Phase 1.5 live song requests: Chorister of the day role, session start/end, member hymn-number request, chorister live list, and the real-time "Now singing" banner.
