import { redirect } from "next/navigation";
import { normalizeKenyanPhone } from "@/lib/phone";
import { VerifyForm } from "./VerifyForm";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; next?: string }>;
}) {
  const params = await searchParams;
  const phone = normalizeKenyanPhone(params.phone ?? "");
  if (!phone) redirect("/sign-in");
  return <VerifyForm phone={phone} next={params.next ?? "/"} />;
}
