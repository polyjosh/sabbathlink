// Domain types. They mirror supabase/migrations/0001_init.sql.

export type Locale = "en" | "sw";

export type ChurchStatus = "pending" | "verified" | "rejected";

/** Known programme items are translated; "custom" items show their own title. */
export type ItemKind =
  | "sabbath_school"
  | "divine_service"
  | "ay"
  | "vespers"
  | "prayer_meeting"
  | "custom";

/** Known roles are translated; "custom" roles show their own label. */
export type RoleKey =
  | "superintendent"
  | "mission_story"
  | "lesson"
  | "preacher"
  | "sermon_title"
  | "platform_elder"
  | "song_leader"
  | "deacons"
  | "special_music"
  | "leader"
  | "theme"
  | "custom";

export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface ServiceTime {
  kind: ItemKind;
  title?: string;
  day: Weekday;
  /** Wall-clock time in Africa/Nairobi, "HH:mm". */
  time: string;
}

export interface Church {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  initials: string;
  district: string;
  conference: string;
  town: string;
  county: string;
  landmark: string;
  lat: number;
  lng: number;
  status: ChurchStatus;
  /** Reserved for the district/conference hierarchy (Phase 4). */
  parentOrgId: string | null;
  kiswahiliService: boolean;
  serviceTimes: ServiceTime[];
}

export interface ProgrammeRole {
  id: string;
  roleKey: RoleKey;
  label?: string;
  value: string | null;
  /** Optional roles (e.g. sermon title) don't count towards "filled". */
  optional?: boolean;
}

export interface ProgrammeItem {
  id: string;
  kind: ItemKind;
  title?: string;
  /** Wall-clock time in Africa/Nairobi, "HH:mm". */
  startTime: string;
  note?: string;
  roles: ProgrammeRole[];
}

export interface Programme {
  id: string;
  churchId: string;
  /** "YYYY-MM-DD" in Africa/Nairobi. */
  sabbathDate: string;
  status: "draft" | "published";
  /** ISO timestamp, UTC. */
  updatedAt: string;
  updatedByRole: AdminRole;
  sunset?: string;
  items: ProgrammeItem[];
}

export interface Announcement {
  id: string;
  churchId: string;
  title: string;
  body: string;
  postedAt: string;
  /** Item disappears after this instant. Null keeps it until removed. */
  hideAfter: string | null;
}

export interface ChurchEvent {
  id: string;
  churchId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  place: string;
  hideAfter: string | null;
}

export type PaymentMethodType = "paybill" | "till" | "bank";

export interface PaymentMethod {
  id: string;
  churchId: string;
  type: PaymentMethodType;
  position: number;
  /** Paybill business number or Till number. */
  number?: string;
  /** Name members see on the M-Pesa confirmation, or the bank account name. */
  accountName: string;
  bankName?: string;
  branch?: string;
  bankAccountNumber?: string;
  /** Paybill only: account word per giving category id. */
  accountsByCategory?: Record<string, string>;
  note?: string;
}

export type GivingCategoryKey =
  | "tithe"
  | "offering"
  | "building_fund"
  | "welfare"
  | "local_church_budget";

export interface GivingCategory {
  id: string;
  churchId: string;
  key: GivingCategoryKey | null;
  /** Custom categories carry their own label. */
  label?: string;
  enabled: boolean;
  position: number;
}

export type AdminRole = "clerk" | "treasurer" | "communication" | "elder";

export interface ChurchAdmin {
  id: string;
  churchId: string;
  userId: string | null;
  name: string | null;
  phone: string;
  role: AdminRole;
  isOwner: boolean;
  status: "active" | "invited";
  invitedAt?: string;
}

export interface ActivityItem {
  id: string;
  churchId: string;
  at: string;
  /** "accent" marks safety-relevant changes such as payment numbers. */
  tone: "default" | "accent";
  actor: string;
  action: "updated_roles" | "posted" | "changed_number" | "published";
  subject: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  initials: string;
  myChurchId: string | null;
  followingIds: string[];
}
