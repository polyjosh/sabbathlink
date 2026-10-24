"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FollowButton } from "@/components/church/FollowButton";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Badge, Card, EmptyState, Note } from "@/components/ui/primitives";
import { cancelSongRequest, requestSong } from "@/lib/actions";
import type { SongError, SongStatus, SongView } from "@/lib/data/songs";
import { SONG_QUEUE_KEY, type QueuedSongRequest } from "@/lib/songs";
import { nairobiHm, serviceTimeText } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { hymnText, useHymnIndex } from "./hymns";
import { useSongView } from "./useSongView";

const STATUS_TONE: Record<SongStatus, "neutral" | "verified" | "success" | "warn"> = {
  requested: "neutral",
  next: "verified",
  sung: "success",
  deferred: "warn",
};

function readQueue(): QueuedSongRequest[] {
  try {
    return JSON.parse(localStorage.getItem(SONG_QUEUE_KEY) ?? "[]") as QueuedSongRequest[];
  } catch {
    return [];
  }
}

function writeQueue(list: QueuedSongRequest[]) {
  try {
    localStorage.setItem(SONG_QUEUE_KEY, JSON.stringify(list));
  } catch {
    // Without storage a queued request lives only while the page is open.
  }
}

/**
 * A member's Song Service screen: Now singing, a number keypad to request a
 * hymn in two or three taps, and their own requests with a tick once sung.
 * With no signal the request waits on the phone and is sent on reconnect.
 */
export function SongRequest({
  churchId,
  initial,
  signedIn,
  following,
  signInHref,
  leadHref,
}: {
  churchId: string;
  initial: SongView;
  signedIn: boolean;
  following: boolean;
  signInHref: string;
  leadHref: string;
}) {
  const t = useTranslations("songs");
  const locale = useLocale() as Locale;
  const { view, refresh } = useSongView(churchId, initial, 8_000);
  const [digits, setDigits] = useState("");
  const [hymnalId, setHymnalId] = useState<string | null>(initial.hymnals[0]?.id ?? null);
  const [anonymous, setAnonymous] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [waiting, setWaiting] = useState<QueuedSongRequest[]>([]);
  const [pending, start] = useTransition();

  const hymnal = view.hymnals.find((h) => h.id === hymnalId);
  const index = useHymnIndex(hymnal);
  const hymnWord = (number: number) => t("hymn", { number });
  const number = Number(digits) || 0;
  const session = view.session;
  const live = Boolean(session?.live);
  const left = session ? Math.max(0, session.limit - view.mine.length) : 0;

  const errorText = useCallback(
    (e: SongError) =>
      ({
        signin: t("errSignin"),
        closed: t("errClosed"),
        paused: t("errPaused"),
        follow: t("errFollow"),
        limit: t("errLimit"),
        off: t("errClosed"),
      })[e],
    [t],
  );

  /** Sends one request. A network failure keeps it on the phone for later. */
  const send = useCallback(
    async (req: QueuedSongRequest): Promise<"sent" | "refused" | "offline"> => {
      if (!navigator.onLine) return "offline";
      try {
        const res = await requestSong(req);
        if ("error" in res) {
          setNotice({ tone: "error", text: errorText(res.error) });
          return "refused";
        }
        return "sent";
      } catch {
        return navigator.onLine ? "refused" : "offline";
      }
    },
    [errorText],
  );

  // Requests made offline go out once the phone reconnects.
  const flush = useCallback(async () => {
    const queue = readQueue();
    const mine = queue.filter((q) => q.churchId === churchId);
    if (!mine.length || !navigator.onLine) {
      setWaiting(mine);
      return;
    }
    const keep: QueuedSongRequest[] = queue.filter((q) => q.churchId !== churchId);
    let sent = 0;
    for (const req of mine) {
      const result = await send(req);
      if (result === "offline") keep.push(req);
      if (result === "sent") sent++;
    }
    writeQueue(keep);
    setWaiting(keep.filter((q) => q.churchId === churchId));
    if (sent) {
      setNotice({ tone: "ok", text: t("sentQueued", { count: sent }) });
      void refresh();
    }
  }, [churchId, refresh, send, t]);

  useEffect(() => {
    // After the first paint: the queue lives in this phone's storage.
    const first = setTimeout(flush, 0);
    window.addEventListener("online", flush);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", flush);
    };
  }, [flush]);

  function submit() {
    if (!number) return;
    const req = { churchId, hymnalId, number, anonymous };
    setNotice(null);
    start(async () => {
      const result = await send(req);
      if (result === "offline") {
        const queue = [...readQueue(), req];
        writeQueue(queue);
        setWaiting(queue.filter((q) => q.churchId === churchId));
        setNotice({ tone: "ok", text: t("queuedOffline") });
      } else if (result === "sent") {
        setNotice({ tone: "ok", text: t("sent", { hymn: hymnWord(number) }) });
        await refresh();
      }
      setDigits("");
    });
  }

  function press(key: string) {
    setNotice(null);
    if (key === "del") setDigits((d) => d.slice(0, -1));
    else setDigits((d) => (d.length >= 4 || (!d && key === "0") ? d : d + key));
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return [...index]
      .filter(([n, title]) => title.toLowerCase().includes(q) || String(n) === q)
      .slice(0, 20);
  }, [index, query]);

  const nowSinging = view.queue.find((g) => g.status === "next");
  const comingUp = view.queue.filter((g) => g.status === "requested");
  const statusText = (s: SongStatus) =>
    ({
      requested: t("statusWaiting"),
      next: t("statusNow"),
      sung: t("statusSung"),
      deferred: t("statusDeferred"),
    })[s];

  if (!view.enabled || !session || (!live && view.mine.length === 0)) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <EmptyState
          icon="music"
          title={session?.endedAt || (session && !live) ? t("endedTitle") : t("notLiveTitle")}
        >
          <p>{view.enabled ? t("notLiveBody") : t("offBody")}</p>
          {view.chorister && <p>{t("ledBy", { name: view.chorister })}</p>}
        </EmptyState>
        {view.isAdmin && view.enabled && (
          <ButtonLink href="/admin/songs" variant="secondary" icon="music" className="self-center">
            {t("adminStart")}
          </ButtonLink>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {live ? (
          <Badge tone="success" icon="music">
            {t("liveBadge")}
          </Badge>
        ) : (
          <Badge>{t("endedTitle")}</Badge>
        )}
        {live && (
          <span className="t-caption">
            {t("until", { time: serviceTimeText(nairobiHm(session.closesAt), locale) })}
          </span>
        )}
        {view.chorister && (
          <span className="t-caption">· {t("ledBy", { name: view.chorister })}</span>
        )}
      </div>

      {view.canLead && (
        <ButtonLink href={leadHref} icon="list" variant="soft">
          {t("openLead")}
        </ButtonLink>
      )}

      {nowSinging && (
        <Card className="border-primary bg-primary-tint" aria-live="polite">
          <p className="t-overline text-primary">{t("nowSinging")}</p>
          <p className="text-[28px] leading-8 font-extrabold">
            {hymnText(nowSinging, view.hymnals, hymnWord).main}
          </p>
          {hymnText(nowSinging, view.hymnals, hymnWord).sub && (
            <p className="t-body">{hymnText(nowSinging, view.hymnals, hymnWord).sub}</p>
          )}
        </Card>
      )}

      {live && !signedIn && (
        <Card>
          <p className="t-body">{t("signInToRequest")}</p>
          <ButtonLink href={signInHref}>{t("signIn")}</ButtonLink>
        </Card>
      )}
      {live && signedIn && !view.canRequest && (
        <Card>
          <p className="t-body">{t("errFollow")}</p>
          {!following && <FollowButton churchId={churchId} following={false} size="md" />}
        </Card>
      )}
      {live && view.canRequest && !session.accepting && <Note>{t("errPaused")}</Note>}

      {live && view.canRequest && session.accepting && (
        <Card className="gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="t-subhead">{t("requestTitle")}</h2>
            <span className="t-caption">{t("left", { count: left })}</span>
          </div>

          {view.hymnals.length > 1 && (
            <div role="radiogroup" aria-label={t("hymnal")} className="flex flex-wrap gap-1.5">
              {view.hymnals.map((h) => (
                <Chip key={h.id} radio on={h.id === hymnalId} onClick={() => setHymnalId(h.id)}>
                  {h.name}
                </Chip>
              ))}
            </div>
          )}

          {searching ? (
            <div className="flex flex-col gap-2">
              <label className="flex min-h-12 items-center gap-2.5 rounded-xl border-2 border-primary bg-surface px-3.5">
                <Icon name="search" className="text-ink-2" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={t("searchTitle")}
                  placeholder={t("searchTitle")}
                  className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
                />
              </label>
              <div className="flex flex-col [&>*+*]:border-t [&>*+*]:border-line-soft">
                {matches.map(([n, title]) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setDigits(String(n));
                      setSearching(false);
                      setQuery("");
                    }}
                    className="flex min-h-12 cursor-pointer items-center gap-3 px-1 text-left text-ink"
                  >
                    <b className="w-12 shrink-0 num">{n}</b>
                    <span className="min-w-0 flex-1">{title}</span>
                  </button>
                ))}
              </div>
              <Button
                variant="text"
                size="sm"
                className="self-start"
                onClick={() => setSearching(false)}
              >
                {t("useKeypad")}
              </Button>
            </div>
          ) : (
            <>
              <div
                aria-live="polite"
                className="flex min-h-[88px] flex-col items-center justify-center rounded-xl bg-canvas px-3 py-2 text-center"
              >
                <p
                  className={`text-[40px] leading-[48px] font-extrabold num ${digits ? "" : "text-ink-muted"}`}
                >
                  {digits || t("typeNumber")}
                </p>
                {number > 0 && index.get(number) && (
                  <p className="t-small text-ink">{index.get(number)}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0"].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    aria-label={k === "del" ? t("delete") : k}
                    className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-2xl font-bold text-ink active:bg-primary-soft"
                  >
                    {k === "del" ? <Icon name="left" /> : k}
                  </button>
                ))}
                <Button
                  size="lg"
                  className="min-h-14"
                  disabled={!number || pending || left === 0}
                  onClick={submit}
                  aria-label={t("send")}
                >
                  <Icon name="send" />
                </Button>
              </div>
              {index.size > 0 && (
                <Button
                  variant="text"
                  size="sm"
                  icon="search"
                  className="self-start"
                  onClick={() => setSearching(true)}
                >
                  {t("searchByTitle")}
                </Button>
              )}
            </>
          )}

          <label className="flex min-h-11 items-center gap-3 text-[15px] font-semibold">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="size-5 shrink-0"
            />
            {t("anonymous")}
          </label>
          {notice && (
            <p
              role="status"
              className={`t-small font-semibold ${notice.tone === "error" ? "text-danger-ink" : "text-success-ink"}`}
            >
              {notice.text}
            </p>
          )}
        </Card>
      )}

      {(view.mine.length > 0 || waiting.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="t-subhead">{t("yourRequests")}</h2>
          {waiting.map((w, i) => (
            <div
              key={`w${i}`}
              className="flex min-h-12 items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface px-3"
            >
              <Icon name="off" size={18} className="text-ink-2" />
              <span className="min-w-0 flex-1 font-semibold">{hymnWord(w.number)}</span>
              <Badge tone="warn">{t("waitingSignal")}</Badge>
            </div>
          ))}
          {view.mine.map((r) => {
            const text = hymnText(r, view.hymnals, hymnWord);
            return (
              <div
                key={r.id}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-1.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{text.main}</span>
                  {text.sub && <span className="t-caption block">{text.sub}</span>}
                </span>
                <Badge
                  tone={STATUS_TONE[r.status]}
                  icon={r.status === "sung" ? "check" : undefined}
                >
                  {statusText(r.status)}
                </Badge>
                {r.status === "requested" && live && (
                  <button
                    type="button"
                    aria-label={t("withdraw", { hymn: text.main })}
                    onClick={() =>
                      start(async () => {
                        await cancelSongRequest(r.id);
                        await refresh();
                      })
                    }
                    className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-2"
                  >
                    <Icon name="x" size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}

      {live && comingUp.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="t-subhead">{t("comingUp")}</h2>
          <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line-soft">
            {comingUp.map((g) => {
              const text = hymnText(g, view.hymnals, hymnWord);
              return (
                <div key={g.ids[0]} className="flex min-h-12 items-center gap-3 px-3.5 py-1.5">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{text.main}</span>
                    {text.sub && <span className="t-caption block">{text.sub}</span>}
                  </span>
                  {g.count > 1 && <Badge>{t("times", { count: g.count })}</Badge>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
