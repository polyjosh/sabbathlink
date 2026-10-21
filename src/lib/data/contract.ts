import type { ActivityItem, AdminRole, PaymentMethod, ServiceTime } from "../types";

// Inputs shared by both data sources (./memory.ts and ./supabase.ts).

export interface NewAnnouncement {
  title: string;
  body: string;
  hideAfter: string | null;
}

export interface EventInput {
  title: string;
  startsAt: string;
  endsAt: string | null;
  place: string;
  hideAfter: string | null;
}

export interface MethodChangeInput {
  methodId: string | null;
  remove: boolean;
  change: Partial<PaymentMethod>;
}

export interface ApplicationInput {
  name: string;
  role: AdminRole;
  district: string;
  conference: string;
  town: string;
  landmark: string;
  lat: number;
  lng: number;
  times: ServiceTime[];
  /** The verification letter (PDF, JPG or PNG, already checked for size and type). */
  letter: File | null;
}

export interface ActivityInput {
  action: ActivityItem["action"];
  subject: string;
  tone?: ActivityItem["tone"];
}
