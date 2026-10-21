import { getTranslations } from "next-intl/server";
import { MessageForm } from "@/components/platform/MessageForm";
import { PlatformPage } from "@/components/platform/Page";
import { getPerson, listChurchNames } from "@/lib/data/platform";
import { formatKenyanPhone } from "@/lib/phone";
import { sendMessage } from "../../actions";
import { requireStaff } from "../../guard";
import { noticeFrom } from "../../notice";

export async function generateMetadata() {
  return { title: (await getTranslations("platform.compose"))("heading") };
}

export default async function NewMessage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; error?: string }>;
}) {
  await requireStaff();
  const t = await getTranslations("platform.compose");
  const sp = await searchParams;
  const [churches, person] = await Promise.all([
    listChurchNames(),
    sp.person ? getPerson(sp.person) : Promise.resolve(null),
  ]);

  return (
    <PlatformPage title={t("heading")} notice={await noticeFrom({ error: sp.error })}>
      <div className="w-full max-w-[640px]">
        <MessageForm
          action={sendMessage}
          churches={churches}
          person={
            person
              ? {
                  id: person.id,
                  label: person.name || (person.phone ? formatKenyanPhone(person.phone) : "—"),
                }
              : null
          }
          // No SMS provider is connected yet (CLAUDE.md: Africa's Talking, to be chosen).
          smsReady={false}
        />
      </div>
    </PlatformPage>
  );
}
