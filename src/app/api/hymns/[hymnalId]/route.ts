import { listHymns } from "@/lib/data/songs";
import { isSupabaseConfigured } from "@/lib/supabase/server";

/** A hymnal's numbers and titles ([[245, "Title"], …]), cached on the phone for title search. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ hymnalId: string }> }) {
  const { hymnalId } = await params;
  if (!isSupabaseConfigured() || !UUID.test(hymnalId)) return Response.json([], { status: 404 });
  return Response.json(await listHymns(hymnalId), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
