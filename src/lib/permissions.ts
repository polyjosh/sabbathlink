import type { AdminRole, Church, ChurchAdmin } from "./types";

/**
 * Who can do what, per church. Roles are named after real church offices.
 * This is the single place the UI and server actions ask; the database
 * enforces the same rules with RLS (supabase/migrations/0001_init.sql).
 *
 * Open question for the pilot: exactly which officers need which rights.
 * Change the matrix here and in the SQL helper together.
 */
export type Capability =
  | "programme.edit"
  | "posts.edit"
  | "giving.view"
  | "giving.edit"
  | "giving.approve"
  | "team.invite"
  | "team.manage"
  | "church.edit"
  | "ownership.handover";

const ROLE_CAPABILITIES: Record<AdminRole, readonly Capability[]> = {
  clerk: [
    "programme.edit",
    "posts.edit",
    "giving.view",
    "giving.approve",
    "team.invite",
    "church.edit",
  ],
  communication: ["programme.edit", "posts.edit"],
  elder: ["programme.edit", "posts.edit"],
  // The treasurer manages giving only.
  treasurer: ["giving.view", "giving.edit", "giving.approve"],
};

/** The owner can also manage the team, edit giving and hand over. */
const OWNER_CAPABILITIES: readonly Capability[] = [
  "giving.view",
  "giving.edit",
  "giving.approve",
  "team.invite",
  "team.manage",
  "church.edit",
  "ownership.handover",
];

type Actor = Pick<ChurchAdmin, "churchId" | "role" | "isOwner" | "status">;

export function can(admin: Actor | null | undefined, capability: Capability, churchId: string) {
  if (!admin || admin.status !== "active" || admin.churchId !== churchId) return false;
  if (admin.isOwner && OWNER_CAPABILITIES.includes(capability)) return true;
  return ROLE_CAPABILITIES[admin.role].includes(capability);
}

export function capabilitiesOf(admin: Actor): Capability[] {
  const caps = new Set<Capability>(ROLE_CAPABILITIES[admin.role]);
  if (admin.isOwner) OWNER_CAPABILITIES.forEach((c) => caps.add(c));
  return [...caps];
}

/**
 * A change to a payment number needs a second admin's approval. The person
 * who requested the change can never approve it.
 */
export function canApproveGivingChange(
  approver: (Actor & Pick<ChurchAdmin, "id">) | null | undefined,
  change: { churchId: string; requestedBy: string },
) {
  if (!approver || approver.id === change.requestedBy) return false;
  return can(approver, "giving.approve", change.churchId);
}

/**
 * Payment details are public only once a platform admin has verified the
 * church, and not while staff have hidden them.
 */
export function isGivingVisible(church: Pick<Church, "status" | "givingHidden">) {
  return church.status === "verified" && !church.givingHidden;
}

/**
 * Only verified churches are listed in the directory (CLAUDE.md). A pending
 * church's page still opens from a link its admins share, marked as pending
 * and with giving hidden.
 */
export function isChurchListed(church: Pick<Church, "status">) {
  return church.status === "verified";
}
