import type {
  ActivityItem,
  Announcement,
  Church,
  ChurchAdmin,
  ChurchEvent,
  GivingCategory,
  Member,
  PaymentMethod,
  Programme,
} from "../types";

// Sample content taken from the design, used until a Supabase project is
// connected. People and numbers here are placeholders, not real records.

const sabbathTimes = (ss: string, ds: string) => [
  { kind: "sabbath_school" as const, day: "sat" as const, time: ss },
  { kind: "divine_service" as const, day: "sat" as const, time: ds },
];

export const churches: Church[] = [
  {
    id: "ch-orc",
    slug: "ongata-rongai-central",
    name: "Ongata Rongai Central Church",
    shortName: "Ongata Rongai Central",
    initials: "OR",
    district: "Rongai District",
    conference: "Central Region Conference",
    town: "Ongata Rongai",
    county: "Kajiado County",
    landmark: "Magadi Road, opposite the market",
    lat: -1.3962,
    lng: 36.7553,
    status: "verified",
    parentOrgId: null,
    kiswahiliService: true,
    serviceTimes: [
      ...sabbathTimes("08:30", "11:00"),
      { kind: "ay", day: "sat", time: "15:00" },
      { kind: "prayer_meeting", day: "wed", time: "18:00" },
    ],
  },
  {
    id: "ch-rtc",
    slug: "rongai-tuala",
    name: "Rongai Tuala Church",
    shortName: "Rongai Tuala Church",
    initials: "RT",
    district: "Rongai District",
    conference: "Central Region Conference",
    town: "Ongata Rongai",
    county: "Kajiado County",
    landmark: "Tuala Road, near the shopping centre",
    lat: -1.4103,
    lng: 36.7712,
    status: "verified",
    parentOrgId: null,
    kiswahiliService: false,
    serviceTimes: sabbathTimes("09:00", "11:15"),
  },
  {
    id: "ch-kh",
    slug: "kiserian-hillside",
    name: "Kiserian Hillside Church",
    shortName: "Kiserian Hillside",
    initials: "KH",
    district: "Ngong District",
    conference: "Central Region Conference",
    town: "Kiserian",
    county: "Kajiado County",
    landmark: "Hillside, above the bus stage",
    lat: -1.4291,
    lng: 36.6869,
    status: "pending",
    parentOrgId: null,
    kiswahiliService: true,
    serviceTimes: sabbathTimes("08:30", "10:45"),
  },
  {
    id: "ch-kl",
    slug: "karen-lane",
    name: "Karen Lane Church",
    shortName: "Karen Lane Church",
    initials: "KL",
    district: "Karen District",
    conference: "Central Region Conference",
    town: "Karen",
    county: "Nairobi County",
    landmark: "Karen Lane, off Langata Road",
    lat: -1.3371,
    lng: 36.7317,
    status: "verified",
    parentOrgId: null,
    kiswahiliService: false,
    serviceTimes: sabbathTimes("08:45", "11:00"),
  },
  {
    id: "ch-km",
    slug: "kisumu-milimani",
    name: "Kisumu Milimani Church",
    shortName: "Kisumu Milimani",
    initials: "KM",
    district: "Kisumu District",
    conference: "Nyanza Conference",
    town: "Kisumu",
    county: "Kisumu County",
    landmark: "Milimani, near the stadium",
    lat: -0.1022,
    lng: 34.7617,
    status: "verified",
    parentOrgId: null,
    kiswahiliService: true,
    serviceTimes: sabbathTimes("09:00", "11:00"),
  },
];

const role = (
  id: string,
  roleKey: Programme["items"][number]["roles"][number]["roleKey"],
  value: string | null,
  optional = false,
) => ({ id, roleKey, value, optional });

export const programmes: Programme[] = [
  {
    id: "pg-orc-1024",
    churchId: "ch-orc",
    sabbathDate: "2026-10-24",
    status: "published",
    updatedAt: "2026-10-22T14:10:00Z",
    updatedByRole: "clerk",
    sunset: "18:39",
    items: [
      {
        id: "it-ss",
        kind: "sabbath_school",
        startTime: "08:30",
        roles: [
          role("r1", "superintendent", "Grace Wanjiru"),
          role("r2", "mission_story", "Brian Otieno"),
          role("r3", "lesson", "In classes · teachers listed"),
        ],
      },
      {
        id: "it-ds",
        kind: "divine_service",
        startTime: "11:00",
        roles: [
          role("r4", "preacher", "Pr. Samuel Kiprono"),
          role("r5", "sermon_title", "Walking in the light", true),
          role("r6", "platform_elder", "Elder Joseph Mwangi"),
          role("r7", "song_leader", "Faith Achieng"),
          role("r8", "deacons", "Peter Kamau, Mary Njeri"),
          role("r9", "special_music", "Youth choir"),
        ],
      },
      {
        id: "it-ay",
        kind: "ay",
        startTime: "15:00",
        roles: [role("r10", "leader", "Dennis Ochieng"), role("r11", "theme", "Faith at work")],
      },
      { id: "it-v", kind: "vespers", startTime: "18:15", roles: [] },
    ],
  },
  {
    id: "pg-km-1024",
    churchId: "ch-km",
    sabbathDate: "2026-10-24",
    status: "published",
    updatedAt: "2026-10-21T09:00:00Z",
    updatedByRole: "communication",
    items: [
      {
        id: "km-ss",
        kind: "sabbath_school",
        startTime: "09:00",
        roles: [role("k1", "superintendent", "Mary Atieno")],
      },
      {
        id: "km-ds",
        kind: "divine_service",
        startTime: "11:00",
        roles: [role("k2", "preacher", "Pr. Tom Odhiambo")],
      },
    ],
  },
];

export const announcements: Announcement[] = [
  {
    id: "an-1",
    churchId: "ch-orc",
    title: "Church business meeting",
    body: "Right after Divine Service this Sabbath, in the main hall. All members are welcome.",
    postedAt: "2026-10-19T16:20:00Z",
    hideAfter: "2026-10-24T20:59:00Z",
  },
  {
    id: "an-2",
    churchId: "ch-orc",
    title: "Harvest thanksgiving pledges",
    body: 'Please bring pledges by Sat 15 Nov. Give under "Harvest" on the Give tab.',
    postedAt: "2026-10-12T08:00:00Z",
    hideAfter: null,
  },
];

export const events: ChurchEvent[] = [
  {
    id: "ev-1",
    churchId: "ch-orc",
    title: "Youth Rally & Music Day",
    startsAt: "2026-10-31T11:30:00Z",
    endsAt: "2026-10-31T14:30:00Z",
    place: "Church grounds",
    hideAfter: "2026-10-31T14:30:00Z",
  },
  {
    id: "ev-2",
    churchId: "ch-orc",
    title: "Health expo & free screening",
    startsAt: "2026-11-08T06:00:00Z",
    endsAt: "2026-11-08T12:00:00Z",
    place: "Open to the community",
    hideAfter: "2026-11-08T12:00:00Z",
  },
  {
    id: "ev-3",
    churchId: "ch-orc",
    title: "Community clean-up",
    startsAt: "2026-11-29T05:00:00Z",
    endsAt: null,
    place: "Meet at the gate",
    hideAfter: "2026-11-29T09:00:00Z",
  },
  {
    id: "ev-0",
    churchId: "ch-orc",
    title: "Family life seminar",
    startsAt: "2026-10-10T06:00:00Z",
    endsAt: "2026-10-10T12:00:00Z",
    place: "Main hall",
    hideAfter: "2026-10-10T12:00:00Z",
  },
];

export const givingCategories: GivingCategory[] = [
  { id: "gc-tithe", churchId: "ch-orc", key: "tithe", enabled: true, position: 0 },
  { id: "gc-off", churchId: "ch-orc", key: "offering", enabled: true, position: 1 },
  { id: "gc-bld", churchId: "ch-orc", key: "building_fund", enabled: true, position: 2 },
  { id: "gc-wel", churchId: "ch-orc", key: "welfare", enabled: true, position: 3 },
  { id: "gc-lcb", churchId: "ch-orc", key: "local_church_budget", enabled: true, position: 4 },
  { id: "gc-hv", churchId: "ch-orc", key: null, label: "Harvest", enabled: true, position: 5 },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: "pm-paybill",
    churchId: "ch-orc",
    type: "paybill",
    position: 0,
    number: "908712",
    accountName: "ONGATA RONGAI CENTRAL CHURCH",
    accountsByCategory: {
      "gc-tithe": "TITHE",
      "gc-off": "OFFERING",
      "gc-bld": "BUILDING",
      "gc-wel": "WELFARE",
      "gc-lcb": "LCB",
      "gc-hv": "HARVEST",
    },
  },
  {
    id: "pm-till",
    churchId: "ch-orc",
    type: "till",
    position: 1,
    number: "5342118",
    accountName: "ONGATA RONGAI CENTRAL CHURCH",
    note: "offering_on_the_day",
  },
  {
    id: "pm-bank",
    churchId: "ch-orc",
    type: "bank",
    position: 2,
    accountName: "Ongata Rongai Central Church",
    bankName: "Co-operative Bank",
    branch: "Rongai Branch",
    bankAccountNumber: "01129 4471 8800",
  },
  // A pending church's details exist but must never be shown.
  {
    id: "pm-kh",
    churchId: "ch-kh",
    type: "paybill",
    position: 0,
    number: "000000",
    accountName: "KISERIAN HILLSIDE CHURCH",
  },
];

export const admins: ChurchAdmin[] = [
  {
    id: "ad-wn",
    churchId: "ch-orc",
    userId: "u-wn",
    name: "Wanjiru Njoroge",
    phone: "+254712345678",
    role: "clerk",
    isOwner: true,
    status: "active",
  },
  {
    id: "ad-fa",
    churchId: "ch-orc",
    userId: "u-fa",
    name: "Faith Achieng",
    phone: "+254722000111",
    role: "communication",
    isOwner: false,
    status: "active",
  },
  {
    id: "ad-jo",
    churchId: "ch-orc",
    userId: "u-jo",
    name: "James Otieno",
    phone: "+254711000222",
    role: "treasurer",
    isOwner: false,
    status: "active",
  },
  {
    id: "ad-inv",
    churchId: "ch-orc",
    userId: null,
    name: null,
    phone: "+254733000412",
    role: "elder",
    isOwner: false,
    status: "invited",
    invitedAt: "2026-10-19T07:00:00Z",
  },
];

export const activity: ActivityItem[] = [
  {
    id: "ac-1",
    churchId: "ch-orc",
    at: "2026-10-21T10:50:00Z",
    tone: "default",
    actor: "you",
    action: "updated_roles",
    subject: "Divine Service",
  },
  {
    id: "ac-2",
    churchId: "ch-orc",
    at: "2026-10-19T16:20:00Z",
    tone: "default",
    actor: "Faith A.",
    action: "posted",
    subject: "Church business meeting",
  },
  {
    id: "ac-3",
    churchId: "ch-orc",
    at: "2026-10-17T11:05:00Z",
    tone: "accent",
    actor: "James O.",
    action: "changed_number",
    subject: "Till number",
  },
];

/** Recent people per role, for the programme role picker. */
export const recentPeople: Record<string, { name: string; lastOn: string }[]> = {
  platform_elder: [
    { name: "Elder Joseph Mwangi", lastOn: "2026-10-17" },
    { name: "Elder David Oduor", lastOn: "2026-10-10" },
    { name: "Josephine Kerubo", lastOn: "2026-09-26" },
  ],
  preacher: [
    { name: "Pr. Samuel Kiprono", lastOn: "2026-10-24" },
    { name: "Elder Ruth Chebet", lastOn: "2026-10-03" },
  ],
  special_music: [
    { name: "Youth choir", lastOn: "2026-10-24" },
    { name: "Dorcas ensemble", lastOn: "2026-10-10" },
  ],
};

export const demoMember: Member = {
  id: "u-wn",
  name: "Wanjiru Njoroge",
  phone: "+254712345678",
  initials: "WN",
  myChurchId: "ch-orc",
  followingIds: ["ch-orc", "ch-km"],
};
