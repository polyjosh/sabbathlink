"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { FOLLOW_COOKIE, getFollowing } from "./session";

const YEAR = 60 * 60 * 24 * 365;

/** Follow or unfollow a church. The first church followed becomes "My church". */
export async function toggleFollow(churchId: string) {
  const following = await getFollowing();
  const next = following.includes(churchId)
    ? following.filter((id) => id !== churchId)
    : [...following, churchId];
  (await cookies()).set(FOLLOW_COOKIE, next.join(","), {
    path: "/",
    maxAge: YEAR,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
