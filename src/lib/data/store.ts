import "server-only";
import type { AdminRole, Church, ChurchAdmin, PaymentMethod } from "../types";
import * as seed from "./seed";

/**
 * Development stand-in for the database: a per-process copy of the seed data
 * that admin actions write to, so publishing a programme or posting an
 * announcement shows up on the member pages. It resets when the server
 * restarts. Replace with Supabase queries once the project is provisioned.
 */
export interface PendingGivingChange {
  id: string;
  churchId: string;
  methodId: string | null;
  requestedBy: string;
  requestedAt: string;
  /** Removal of the method, rather than an edit. */
  remove: boolean;
  change: Partial<PaymentMethod>;
}

export interface ChurchApplication {
  applicantId: string;
  church: Church;
  applicantRole: AdminRole;
  submittedAt: string;
  letter: { name: string; size: number } | null;
}

function createStore() {
  return {
    churches: structuredClone(seed.churches),
    programmes: structuredClone(seed.programmes),
    announcements: structuredClone(seed.announcements),
    events: structuredClone(seed.events),
    paymentMethods: structuredClone(seed.paymentMethods),
    givingCategories: structuredClone(seed.givingCategories),
    admins: structuredClone(seed.admins) as ChurchAdmin[],
    activity: structuredClone(seed.activity),
    recentPeople: structuredClone(seed.recentPeople),
    pendingGivingChanges: [] as PendingGivingChange[],
    applications: [] as ChurchApplication[],
  };
}

type Store = ReturnType<typeof createStore>;

const g = globalThis as unknown as { __sabbathlinkStore?: Store };

export function db(): Store {
  g.__sabbathlinkStore ??= createStore();
  return g.__sabbathlinkStore;
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
