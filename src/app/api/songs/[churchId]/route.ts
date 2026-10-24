import { getSongView } from "@/lib/data/songs";

/*
 * The live Song Service list, polled by the request and chorister screens
 * (a few hundred bytes every few seconds). Answers as the signed-in person,
 * so requester names only reach those who may lead.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: Promise<{ churchId: string }> }) {
  const { churchId } = await params;
  if (!UUID.test(churchId)) return Response.json(null, { status: 404 });
  const view = await getSongView(churchId);
  return Response.json(view, {
    status: view ? 200 : 404,
    headers: { "Cache-Control": "private, no-store" },
  });
}
