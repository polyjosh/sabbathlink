"use server";

import { redirect } from "next/navigation";
import { db, newId } from "@/lib/data/store";
import { getSignedInMember } from "@/lib/session";
import type { AdminRole, ItemKind, ServiceTime, Weekday } from "@/lib/types";

const ROLES: AdminRole[] = ["clerk", "communication", "treasurer", "elder"];
const KINDS: ItemKind[] = ["sabbath_school", "divine_service", "ay", "vespers", "prayer_meeting"];
const DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MAX_LETTER = 5 * 1024 * 1024;

const text = (v: FormDataEntryValue | null, max = 120) => String(v ?? "").trim().slice(0, max);

/**
 * Stores a church application as "pending". It stays out of the directory and
 * its giving details stay hidden until a platform admin verifies the letter.
 */
export async function submitApplication(form: FormData) {
  const member = await getSignedInMember();
  if (!member) redirect("/sign-in?next=/register");

  const name = text(form.get("name"));
  const role = text(form.get("role"), 20) as AdminRole;
  const lat = Number(form.get("lat"));
  const lng = Number(form.get("lng"));
  if (!name || !ROLES.includes(role) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Incomplete application");
  }

  let times: ServiceTime[] = [];
  try {
    times = (JSON.parse(text(form.get("times"), 4000)) as ServiceTime[])
      .filter((s) => KINDS.includes(s.kind) && DAYS.includes(s.day) && /^\d{2}:\d{2}$/.test(s.time))
      .slice(0, 10);
  } catch {
    times = [];
  }

  const letter = form.get("letter");
  const file = letter instanceof File && letter.size > 0 ? letter : null;
  if (file && file.size > MAX_LETTER) throw new Error("Letter too large");
  // With Supabase, the letter goes to a private storage bucket only platform admins can read.

  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const words = name.split(/\s+/).filter(Boolean);
  db().applications.push({
    applicantId: member.id,
    church: {
      id: newId("ch"),
      slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      shortName: name.replace(/\s+Church$/i, ""),
      initials: ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase(),
      district: text(form.get("district")),
      conference: text(form.get("conference")),
      town: text(form.get("town")),
      county: "",
      landmark: text(form.get("landmark")),
      lat,
      lng,
      status: "pending",
      parentOrgId: null,
      kiswahiliService: false,
      serviceTimes: times,
    },
    applicantRole: role,
    submittedAt: new Date().toISOString(),
    letter: file ? { name: file.name, size: file.size } : null,
  });
  redirect("/register/pending");
}
