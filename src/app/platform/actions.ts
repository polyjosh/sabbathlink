"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as platform from "@/lib/data/platform";
import { UUID, type Audience } from "@/lib/data/platform";
import type { ChurchStatus } from "@/lib/types";
import { requireStaff } from "./guard";

/*
 * Staff actions. The database functions check that the caller is a platform
 * admin and write the audit log; these only validate input and report back.
 * Each one returns to the page it came from with ?done=… or ?error=….
 */

const text = (v: FormDataEntryValue | null, max = 200) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const id = (v: FormDataEntryValue | null) => {
  const s = text(v, 40);
  return UUID.test(s) ? s : null;
};

/** Runs a change, then returns to `back` with an outcome the page can show. */
async function run(back: string, done: string, change: () => Promise<unknown>) {
  await requireStaff();
  let outcome = `done=${done}`;
  try {
    await change();
  } catch (e) {
    console.error("platform action failed:", done, e instanceof Error ? e.message : e);
    outcome = `error=${done}`;
  }
  revalidatePath("/", "layout");
  redirect(`${back}${back.includes("?") ? "&" : "?"}${outcome}`);
}

const STATUSES: ChurchStatus[] = ["verified", "rejected", "suspended", "pending"];

export async function setChurchStatus(form: FormData) {
  const church = id(form.get("church"));
  const status = text(form.get("status"), 12) as ChurchStatus;
  if (!church || !STATUSES.includes(status)) throw new Error("Invalid request");
  const reason = text(form.get("reason"), 300) || null;
  await run(`/platform/churches/${church}`, status, () =>
    platform.setChurchStatus(church, status, reason),
  );
}

export async function setGivingHidden(form: FormData) {
  const church = id(form.get("church"));
  if (!church) throw new Error("Invalid request");
  const hidden = form.get("hidden") === "true";
  const reason = text(form.get("reason"), 300) || null;
  await run(`/platform/churches/${church}`, hidden ? "givingHidden" : "givingShown", () =>
    platform.setGivingHidden(church, hidden, reason),
  );
}

export async function updateChurch(form: FormData) {
  const church = id(form.get("church"));
  if (!church) throw new Error("Invalid request");
  const fields: Record<string, string | boolean> = {};
  for (const key of [
    "name",
    "short_name",
    "district",
    "conference",
    "town",
    "county",
    "landmark",
  ]) {
    fields[key] = text(form.get(key), 120);
  }
  fields.kiswahili_service = form.get("kiswahili_service") === "on";
  await run(`/platform/churches/${church}`, "edited", () => platform.updateChurch(church, fields));
}

export async function removePost(form: FormData) {
  const church = id(form.get("church"));
  const post = id(form.get("post"));
  const kind = text(form.get("kind"), 20);
  if (!church || !post || (kind !== "announcement" && kind !== "event"))
    throw new Error("Invalid request");
  await run(`/platform/churches/${church}`, "postRemoved", () =>
    platform.removePost(kind, post, text(form.get("reason"), 300)),
  );
}

export async function removeAdmin(form: FormData) {
  const admin = id(form.get("admin"));
  const back = text(form.get("back"), 120);
  if (!admin || !back.startsWith("/platform/")) throw new Error("Invalid request");
  await run(back, "adminRemoved", () => platform.removeAdmin(admin, text(form.get("reason"), 300)));
}

export async function makeOwner(form: FormData) {
  const admin = id(form.get("admin"));
  const church = id(form.get("church"));
  if (!admin || !church) throw new Error("Invalid request");
  await run(`/platform/churches/${church}`, "ownerChanged", () => platform.makeOwner(admin));
}

export async function setPlatformAdmin(form: FormData) {
  const user = id(form.get("user"));
  if (!user) throw new Error("Invalid request");
  const on = form.get("on") === "true";
  await run(`/platform/people/${user}`, on ? "staffAdded" : "staffRemoved", () =>
    platform.setPlatformAdmin(user, on),
  );
}

const AUDIENCES: Audience[] = [
  "person",
  "church_admins",
  "all_admins",
  "church_followers",
  "everyone",
];

export async function sendMessage(form: FormData) {
  const audience = text(form.get("audience"), 20) as Audience;
  const title = text(form.get("title"), 80);
  const body = text(form.get("body"), 600);
  if (!AUDIENCES.includes(audience) || !title || !body) throw new Error("Invalid request");
  // "Everyone" must be typed out, so a broadcast to every account is never a slip.
  if (audience === "everyone" && text(form.get("confirm"), 20).toUpperCase() !== "EVERYONE") {
    redirect("/platform/messages/new?error=confirm");
  }
  const churchId = audience.startsWith("church_") ? id(form.get("church")) : null;
  const userId = audience === "person" ? id(form.get("user")) : null;
  await run("/platform/messages", "sent", () =>
    platform.sendMessage({
      audience,
      churchId,
      userId,
      title,
      body,
      sms: form.get("sms") === "on",
    }),
  );
}
