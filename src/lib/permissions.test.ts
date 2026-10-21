import { describe, expect, it } from "vitest";
import {
  can,
  canApproveGivingChange,
  capabilitiesOf,
  isChurchListed,
  isGivingVisible,
} from "./permissions";
import type { AdminRole, ChurchAdmin } from "./types";

const CHURCH = "ch-orc";

function admin(role: AdminRole, extra: Partial<ChurchAdmin> = {}): ChurchAdmin {
  return {
    id: `a-${role}`,
    churchId: CHURCH,
    userId: `u-${role}`,
    name: role,
    phone: "+254712345678",
    role,
    isOwner: false,
    status: "active",
    ...extra,
  };
}

describe("can", () => {
  it("lets programme roles edit the programme and posts", () => {
    for (const role of ["clerk", "communication", "elder"] as const) {
      expect(can(admin(role), "programme.edit", CHURCH)).toBe(true);
      expect(can(admin(role), "posts.edit", CHURCH)).toBe(true);
    }
  });

  it("keeps the treasurer to giving only", () => {
    const t = admin("treasurer");
    expect(can(t, "giving.edit", CHURCH)).toBe(true);
    expect(can(t, "programme.edit", CHURCH)).toBe(false);
    expect(can(t, "posts.edit", CHURCH)).toBe(false);
    expect(can(t, "team.manage", CHURCH)).toBe(false);
  });

  it("does not let communication or elder see or edit giving settings", () => {
    for (const role of ["communication", "elder"] as const) {
      expect(can(admin(role), "giving.view", CHURCH)).toBe(false);
      expect(can(admin(role), "giving.edit", CHURCH)).toBe(false);
    }
  });

  it("reserves team management and handover for the owner", () => {
    expect(can(admin("clerk"), "team.manage", CHURCH)).toBe(false);
    expect(can(admin("clerk"), "ownership.handover", CHURCH)).toBe(false);
    const owner = admin("clerk", { isOwner: true });
    expect(can(owner, "team.manage", CHURCH)).toBe(true);
    expect(can(owner, "ownership.handover", CHURCH)).toBe(true);
    expect(can(owner, "giving.edit", CHURCH)).toBe(true);
  });

  it("denies everything for another church", () => {
    expect(can(admin("clerk", { isOwner: true }), "programme.edit", "ch-other")).toBe(false);
  });

  it("denies everything to an invite that hasn't been accepted", () => {
    expect(can(admin("communication", { status: "invited" }), "posts.edit", CHURCH)).toBe(false);
  });

  it("denies a missing admin", () => {
    expect(can(null, "programme.edit", CHURCH)).toBe(false);
  });

  it("lists capabilities without duplicates", () => {
    const caps = capabilitiesOf(admin("clerk", { isOwner: true }));
    expect(new Set(caps).size).toBe(caps.length);
  });
});

describe("canApproveGivingChange", () => {
  const change = { churchId: CHURCH, requestedBy: "a-treasurer" };

  it("needs a second admin", () => {
    expect(canApproveGivingChange(admin("treasurer"), change)).toBe(false);
    expect(canApproveGivingChange(admin("clerk"), change)).toBe(true);
  });

  it("can't be approved by someone without giving rights", () => {
    expect(canApproveGivingChange(admin("communication"), change)).toBe(false);
  });

  it("can't be approved from another church", () => {
    expect(canApproveGivingChange(admin("clerk", { churchId: "ch-other" }), change)).toBe(false);
  });
});

describe("church visibility", () => {
  it("shows giving only for verified churches", () => {
    expect(isGivingVisible({ status: "verified" })).toBe(true);
    expect(isGivingVisible({ status: "pending" })).toBe(false);
    expect(isGivingVisible({ status: "suspended" })).toBe(false);
    expect(isGivingVisible({ status: "verified", givingHidden: true })).toBe(false);
    expect(isGivingVisible({ status: "rejected" })).toBe(false);
  });

  it("lists only verified churches", () => {
    expect(isChurchListed({ status: "verified" })).toBe(true);
    expect(isChurchListed({ status: "pending" })).toBe(false);
  });
});
