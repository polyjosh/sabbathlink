import "server-only";
import { isSupabaseConfigured } from "../supabase/server";
import * as memory from "./memory";
import * as remote from "./supabase";

/*
 * The app's data access. With a Supabase project configured every call goes
 * to ./supabase.ts (Row Level Security enforces permissions); otherwise to
 * the in-memory development store in ./memory.ts. Both expose the same
 * functions, which the line below checks at compile time.
 */
const parity: { [K in keyof typeof memory]: (typeof memory)[K] } = remote;
void parity;

type Source = typeof memory;

function pick<K extends keyof Source>(name: K): Source[K] {
  return ((...args: unknown[]) =>
    (((isSupabaseConfigured() ? remote : memory) as Source)[name] as (...a: unknown[]) => unknown)(
      ...args,
    )) as Source[K];
}

export const listChurches = pick("listChurches");
export const getChurch = pick("getChurch");
export const getChurchById = pick("getChurchById");
export const listConferences = pick("listConferences");
export const getUpcomingProgramme = pick("getUpcomingProgramme");
export const getProgramme = pick("getProgramme");
export const listProgrammes = pick("listProgrammes");
export const extraRecentPeople = pick("extraRecentPeople");
export const listAnnouncements = pick("listAnnouncements");
export const listEvents = pick("listEvents");
export const getGiving = pick("getGiving");
export const getGivingSettings = pick("getGivingSettings");
export const listPendingGivingChanges = pick("listPendingGivingChanges");
export const listAdmins = pick("listAdmins");
export const listActivity = pick("listActivity");
export const getMember = pick("getMember");
export const getCurrentAdmin = pick("getCurrentAdmin");
export const getLatestApplication = pick("getLatestApplication");

export const saveProgramme = pick("saveProgramme");
export const postAnnouncement = pick("postAnnouncement");
export const addEvent = pick("addEvent");
export const setCategoryEnabled = pick("setCategoryEnabled");
export const addCategory = pick("addCategory");
export const moveMethod = pick("moveMethod");
export const requestMethodChange = pick("requestMethodChange");
export const inviteAdmin = pick("inviteAdmin");
export const handOver = pick("handOver");
export const submitApplication = pick("submitApplication");
