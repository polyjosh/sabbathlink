import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RegisterWizard } from "@/components/register/RegisterWizard";
import { listConferences } from "@/lib/data";
import { getSignedInMember } from "@/lib/session";

export async function generateMetadata() {
  return { title: (await getTranslations("register"))("title") };
}

/** Officers register their church after signing in, so the account becomes its first admin. */
export default async function RegisterPage() {
  if (!(await getSignedInMember())) redirect("/sign-in?next=/register");
  const conferences = await listConferences();
  return <RegisterWizard conferences={conferences} />;
}
