import "server-only";
import { isChurchListed, isGivingVisible } from "../permissions";
import { isVisible, nextSabbath } from "../time";
import type { Church, Programme } from "../types";
import { db } from "./store";
import { demoMember as DEMO_MEMBER } from "./seed";

/*
 * Read model for the app. It reads the development store (seed data plus
 * admin edits) until the Supabase project is provisioned; each function maps
 * 1:1 to a query on the tables in supabase/migrations/0001_init.sql, so
 * swapping the source keeps callers unchanged.
 */

export async function listChurches(opts: { query?: string; kiswahili?: boolean } = {}) {
  const q = opts.query?.trim().toLowerCase();
  return db().churches.filter(
    (c) =>
      isChurchListed(c) &&
      (!q || [c.name, c.town, c.district, c.county].some((f) => f.toLowerCase().includes(q))) &&
      (!opts.kiswahili || c.kiswahiliService),
  );
}

export async function getChurch(slug: string) {
  return db().churches.find((c) => c.slug === slug) ?? null;
}

export async function getChurchById(id: string) {
  return db().churches.find((c) => c.id === id) ?? null;
}

/** The published programme for the coming Sabbath, if any. */
export async function getUpcomingProgramme(churchId: string, now = new Date()) {
  const date = nextSabbath(now);
  return (
    db().programmes.find(
      (p) => p.churchId === churchId && p.sabbathDate === date && p.status === "published",
    ) ?? null
  );
}

/** A church's programme for one Sabbath, in any state (admins only). */
export async function getProgramme(churchId: string, sabbathDate: string) {
  return db().programmes.find((p) => p.churchId === churchId && p.sabbathDate === sabbathDate) ?? null;
}

/** The latest programme in any state, for admins. */
export async function getLatestProgramme(churchId: string): Promise<Programme | null> {
  const list = db().programmes
    .filter((p) => p.churchId === churchId)
    .sort((a, b) => b.sabbathDate.localeCompare(a.sabbathDate));
  return list[0] ?? null;
}

export async function listAnnouncements(churchId: string, now = new Date()) {
  return db().announcements
    .filter((a) => a.churchId === churchId && isVisible(a.hideAfter, now))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export async function listEvents(churchId: string, opts: { past?: boolean } = {}, now = new Date()) {
  return db().events
    .filter((e) => e.churchId === churchId && isVisible(e.hideAfter, now) !== Boolean(opts.past))
    .sort((a, b) =>
      opts.past ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt),
    );
}

/**
 * Giving details. Returns nothing for churches that aren't verified, so a
 * pending church's numbers can't leak through any page.
 */
export async function getGiving(church: Church) {
  if (!isGivingVisible(church)) return null;
  return {
    methods: db().paymentMethods
      .filter((m) => m.churchId === church.id)
      .sort((a, b) => a.position - b.position),
    categories: db().givingCategories
      .filter((c) => c.churchId === church.id && c.enabled)
      .sort((a, b) => a.position - b.position),
  };
}

/** Admin view of giving settings, including disabled categories. */
export async function getGivingSettings(churchId: string) {
  return {
    methods: db().paymentMethods
      .filter((m) => m.churchId === churchId)
      .sort((a, b) => a.position - b.position),
    categories: db().givingCategories
      .filter((c) => c.churchId === churchId)
      .sort((a, b) => a.position - b.position),
  };
}

export async function listPendingGivingChanges(churchId: string) {
  return db().pendingGivingChanges.filter((c) => c.churchId === churchId);
}

export async function listAdmins(churchId: string) {
  return db().admins.filter((a) => a.churchId === churchId);
}

export async function listActivity(churchId: string) {
  return db().activity.filter((a) => a.churchId === churchId);
}

export async function recentPeopleFor(roleKey: string) {
  return db().recentPeople[roleKey] ?? [];
}

export async function getMember() {
  return DEMO_MEMBER;
}

/** The admin record for the signed-in user. Demo: the clerk/owner of ORC. */
export async function getCurrentAdmin() {
  return db().admins.find((a) => a.userId === DEMO_MEMBER.id) ?? null;
}
