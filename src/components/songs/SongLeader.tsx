"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip, Segmented } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Badge, Card, EmptyState, Note } from "@/components/ui/primitives";
import { addManualSong, endSongService, setSongStatus, updateSongService } from "@/lib/actions";
import type { SongError, SongGroup, SongStatus, SongView } from "@/lib/data/songs";
import { sortQueue, type QueueOrder } from "@/lib/songs";
import { nairobiHm, serviceTimeText } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { hymnText, useHymnIndex } from "./hymns";
import { useSongView } from "./useSongView";

/**
 * The chorister's live list. Requests for the same hymn are one row
 * ("requested by 5"). Next shows "Now singing" to members, Sung gives them a
 * tick, and "Next time" defers gently; nothing is ever rejected. The
 * chorister can always add requests by hand, so the service never depends
 * on members' phones.
 */
export function SongLeader({ churchId, initial }: { churchId: string; initial: SongView }) {
  const t = useTranslations("songs");
  const locale = useLocale() as Locale;
  const { view, refresh } = useSongView(churchId, initial, 4_000);
  const [order, setOrder] = useState<QueueOrder>("received");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState({ number: "", title: "" });
  const [hymnalId, setHymnalId] = useState<string | null>(initial.hymnals[0]?.id ?? null);
  const [pending, start] = useTransition();
  const index = useHymnIndex(view.hymnals.find((h) => h.id === hymnalId));
  const hymnWord = (number: number) => t("hymn", { number });
  const session = view.session;

  const errorText = (e: SongError) =>
    e === "closed" || e === "off" ? t("errClosed") : t("errGeneric");

  function run(action: () => Promise<{ ok: true } | { error: SongError } | void>) {
    setError(null);
    start(async () => {
      try {
        const res = await action();
        if (res && "error" in res) setError(errorText(res.error));
      } catch {
        setError(t("errGeneric"));
      }
      await refresh();
    });
  }

  if (!view.canLead || !session?.live) {
    return (
      <div className="flex flex-col items-center gap-4 pt-6">
        <EmptyState icon="music" title={view.canLead ? t("notLiveTitle") : t("leadOnlyTitle")}>
          <p>{view.canLead ? t("leadNotLiveBody") : t("leadOnlyBody")}</p>
        </EmptyState>
        {view.isAdmin && (
          <ButtonLink href="/admin/songs" icon="music">
            {t("adminStart")}
          </ButtonLink>
        )}
      </div>
    );
  }

  const setStatus = (g: SongGroup, status: SongStatus) =>
    run(() => setSongStatus({ sessionId: session.id, ids: g.ids, status }));

  const now = view.queue.find((g) => g.status === "next");
  const waiting = sortQueue(
    view.queue.filter((g) => g.status === "requested"),
    order,
  );
  const deferred = view.queue.filter((g) => g.status === "deferred");
  const sung = view.queue.filter((g) => g.status === "sung");

  const who = (g: SongGroup) =>
    (g.requesters ?? [])
      .map((r) =>
        r.manual ? t("addedByHand") : r.anonymous ? t("anonymousName") : (r.name ?? t("someone")),
      )
      .join(", ");

  const manualNumber = Number(manual.number) || null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success" icon="music">
          {t("liveBadge")}
        </Badge>
        <span className="t-caption">
          {t("until", { time: serviceTimeText(nairobiHm(session.closesAt), locale) })}
        </span>
        <span className="flex-1" />
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(() => updateSongService({ sessionId: session.id, accepting: !session.accepting }))
          }
        >
          {session.accepting ? t("pause") : t("resume")}
        </Button>
      </div>
      {!session.accepting && <Note>{t("pausedNote")}</Note>}
      {error && (
        <p role="alert" className="t-small font-semibold text-danger-ink">
          {error}
        </p>
      )}

      <Card className={now ? "border-primary bg-primary-tint" : ""} aria-live="polite">
        <p className="t-overline text-primary">{t("nowSinging")}</p>
        {now ? (
          <>
            <p className="text-[28px] leading-8 font-extrabold">
              {hymnText(now, view.hymnals, hymnWord).main}
            </p>
            {hymnText(now, view.hymnals, hymnWord).sub && (
              <p className="t-body">{hymnText(now, view.hymnals, hymnWord).sub}</p>
            )}
            <Button icon="check" disabled={pending} onClick={() => setStatus(now, "sung")}>
              {t("markSung")}
            </Button>
          </>
        ) : (
          <p className="t-small">{t("nothingNow")}</p>
        )}
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h2 className="t-subhead">{t("requests", { count: waiting.length })}</h2>
        <Segmented
          label={t("order")}
          value={order}
          onChange={setOrder}
          options={[
            { value: "received", label: t("orderReceived") },
            { value: "popular", label: t("orderPopular") },
          ]}
        />
      </div>

      {waiting.length === 0 && <p className="t-small">{t("noRequests")}</p>}
      {waiting.map((g) => {
        const text = hymnText(g, view.hymnals, hymnWord);
        return (
          <Card key={g.ids[0]} className="gap-2">
            <div className="flex items-start gap-2">
              <span className="min-w-0 flex-1">
                <span className="block text-lg leading-6 font-extrabold">{text.main}</span>
                {text.sub && <span className="t-small block text-ink">{text.sub}</span>}
                <span className="t-caption block">{who(g)}</span>
              </span>
              {g.count > 1 && <Badge tone="verified">{t("requestedBy", { count: g.count })}</Badge>}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={pending}
                onClick={() => setStatus(g, "next")}
              >
                {t("next")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon="check"
                disabled={pending}
                onClick={() => setStatus(g, "sung")}
              >
                {t("sung")}
              </Button>
              <Button
                size="sm"
                variant="text"
                disabled={pending}
                onClick={() => setStatus(g, "deferred")}
              >
                {t("nextTime")}
              </Button>
            </div>
          </Card>
        );
      })}

      <Card className="gap-3">
        <h2 className="t-subhead">{t("addTitle")}</h2>
        <p className="t-caption">{t("addHint")}</p>
        {view.hymnals.length > 1 && (
          <div role="radiogroup" aria-label={t("hymnal")} className="flex flex-wrap gap-1.5">
            {view.hymnals.map((h) => (
              <Chip key={h.id} radio on={h.id === hymnalId} onClick={() => setHymnalId(h.id)}>
                {h.name}
              </Chip>
            ))}
          </div>
        )}
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!manualNumber && !manual.title.trim()) return;
            run(async () => {
              const res = await addManualSong({
                sessionId: session.id,
                hymnalId: manualNumber ? hymnalId : null,
                number: manualNumber,
                title: manualNumber ? "" : manual.title,
              });
              setManual({ number: "", title: "" });
              return res;
            });
          }}
        >
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={manual.number}
              onChange={(e) => setManual({ ...manual, number: e.target.value.replace(/\D/g, "") })}
              aria-label={t("number")}
              placeholder={t("number")}
              className="min-h-12 w-28 rounded-xl border-[1.5px] border-field bg-surface px-3.5 text-base text-ink outline-none focus:border-2 focus:border-primary"
            />
            <input
              value={manualNumber ? (index.get(manualNumber) ?? "") : manual.title}
              readOnly={Boolean(manualNumber)}
              onChange={(e) => setManual({ ...manual, title: e.target.value })}
              aria-label={t("orTitle")}
              placeholder={t("orTitle")}
              maxLength={120}
              className="min-h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-field bg-surface px-3.5 text-base text-ink outline-none focus:border-2 focus:border-primary read-only:bg-canvas"
            />
          </div>
          <Button type="submit" variant="secondary" icon="plus" disabled={pending}>
            {t("add")}
          </Button>
        </form>
      </Card>

      {deferred.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="t-subhead">{t("deferredTitle")}</h2>
          {deferred.map((g) => (
            <div
              key={g.ids[0]}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface px-3"
            >
              <span className="min-w-0 flex-1 font-semibold">
                {hymnText(g, view.hymnals, hymnWord).main}
              </span>
              <Button
                size="sm"
                variant="text"
                disabled={pending}
                onClick={() => setStatus(g, "requested")}
              >
                {t("backToList")}
              </Button>
            </div>
          ))}
        </section>
      )}

      {sung.length > 0 && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone(!showDone)}
            className="flex min-h-11 cursor-pointer items-center gap-2 text-left text-ink"
          >
            <span className="t-subhead flex-1">{t("sungTitle", { count: sung.length })}</span>
            <Icon name="down" size={18} className={showDone ? "rotate-180" : ""} />
          </button>
          {showDone &&
            sung.map((g) => (
              <div key={g.ids[0]} className="flex min-h-11 items-center gap-2 px-1">
                <Icon name="check" size={18} className="text-success-ink" />
                <span className="min-w-0 flex-1">{hymnText(g, view.hymnals, hymnWord).main}</span>
              </div>
            ))}
        </section>
      )}

      <Card className="gap-2">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[15px] font-semibold">{t("limit")}</p>
          <Button
            size="sm"
            variant="secondary"
            aria-label={t("fewer")}
            disabled={pending || session.limit <= 1}
            onClick={() =>
              run(() => updateSongService({ sessionId: session.id, limit: session.limit - 1 }))
            }
          >
            −
          </Button>
          <b className="w-6 text-center text-lg num">{session.limit}</b>
          <Button
            size="sm"
            variant="secondary"
            aria-label={t("more")}
            disabled={pending || session.limit >= 10}
            onClick={() =>
              run(() => updateSongService({ sessionId: session.id, limit: session.limit + 1 }))
            }
          >
            +
          </Button>
        </div>
      </Card>

      {confirmEnd ? (
        <Card className="gap-2">
          <p className="t-body">{t("endConfirm")}</p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              disabled={pending}
              onClick={() => run(() => endSongService(session.id))}
            >
              {t("end")}
            </Button>
            <Button variant="text" onClick={() => setConfirmEnd(false)}>
              {t("keepGoing")}
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="danger" onClick={() => setConfirmEnd(true)}>
          {t("end")}
        </Button>
      )}
    </div>
  );
}
