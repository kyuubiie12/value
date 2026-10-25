"use client";

import * as React from "react";
import { BellRing, Check, Download, Smartphone } from "lucide-react";
import {
  pushStatusAction,
  sendTestPushAction,
  subscribePushAction,
  unsubscribePushAction,
} from "@/lib/push/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Panel } from "./parts";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** VAPID keys are url-safe base64; the Push API wants raw bytes. */
function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Env = {
  ready: boolean;
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  standalone: boolean;
  ios: boolean;
  serverConfigured: boolean;
  devices: number;
};

const INITIAL: Env = {
  ready: false,
  supported: false,
  permission: "unsupported",
  subscribed: false,
  standalone: false,
  ios: false,
  serverConfigured: false,
  devices: 0,
};

async function readEnv(): Promise<Env> {
  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  let subscribed = false;
  if (supported) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      subscribed = !!(await reg?.pushManager.getSubscription());
    } catch {
      subscribed = false;
    }
  }
  const server = await pushStatusAction().catch(() => ({ configured: false, devices: 0 }));
  const ua = navigator.userAgent;
  return {
    ready: true,
    supported,
    permission: supported ? Notification.permission : "unsupported",
    subscribed,
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
    ios: /iPhone|iPad|iPod/.test(ua),
    serverConfigured: server.configured && !!VAPID_PUBLIC,
    devices: server.devices,
  };
}

/**
 * Install the app + turn on push for this device. Everything browser-specific is
 * read after mount so the server render stays neutral.
 */
export function PushPanel() {
  const [env, setEnv] = React.useState<Env>(INITIAL);
  const [busy, setBusy] = React.useState<null | "on" | "off" | "test" | "install">(null);
  const [note, setNote] = React.useState<string | null>(null);
  const installEvent = React.useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = React.useState(false);

  const refresh = React.useCallback(async () => setEnv(await readEnv()), []);

  React.useEffect(() => {
    let cancelled = false;
    void readEnv().then((e) => {
      if (!cancelled) setEnv(e);
    });
    const onPrompt = (e: Event) => {
      e.preventDefault();
      installEvent.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      installEvent.current = null;
      setCanInstall(false);
      void refresh();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [refresh]);

  const enable = async () => {
    setBusy("on");
    setNote(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setNote(
          perm === "denied"
            ? "Notifikationer er blokeret i din browser. Slå dem til i browserens indstillinger for siden."
            : "Du lukkede spørgsmålet uden at svare.",
        );
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(VAPID_PUBLIC),
        }));
      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      const res = await subscribePushAction(json, navigator.userAgent);
      setNote(res.ok ? "Push er slået til på denne enhed." : "Kunne ikke gemme enheden. Prøv igen.");
    } catch {
      setNote("Kunne ikke slå push til. Prøv igen.");
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const disable = async () => {
    setBusy("off");
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setNote("Push er slået fra på denne enhed.");
    } finally {
      setBusy(null);
      void refresh();
    }
  };

  const test = async () => {
    setBusy("test");
    setNote(null);
    try {
      const r = await sendTestPushAction();
      setNote(
        !r.configured
          ? "Push er ikke sat op på serveren endnu."
          : r.sent > 0
            ? `Test sendt til ${r.sent} ${r.sent === 1 ? "enhed" : "enheder"} — den dukker op om et øjeblik.`
            : "Ingen enheder at sende til. Slå push til først.",
      );
    } finally {
      setBusy(null);
    }
  };

  const install = async () => {
    const ev = installEvent.current;
    if (!ev) return;
    setBusy("install");
    try {
      await ev.prompt();
      await ev.userChoice;
    } finally {
      installEvent.current = null;
      setCanInstall(false);
      setBusy(null);
    }
  };

  const pushAvailable = env.supported && env.serverConfigured;
  // iOS only delivers web push to apps added to the home screen.
  const iosNeedsInstall = env.ios && !env.standalone;

  return (
    <Panel tone={env.subscribed ? "accent" : "default"} className="flex flex-col gap-5">
      <div className="flex items-start gap-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[12px] bg-surface-3 ring-1 ring-inset ring-line/70">
          <BellRing className="size-4 text-primary" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-fg">Push-beskeder & app</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-subtle">
            Få en besked på telefonen eller computeren, selv når siden er lukket. Installér
            Mentor som app for at få den på hjemmeskærmen.
          </p>
        </div>
        {env.ready && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              env.subscribed
                ? "bg-positive/12 text-positive"
                : "bg-surface-3 text-subtle",
            )}
          >
            {env.subscribed ? "Slået til" : "Slået fra"}
          </span>
        )}
      </div>

      {!env.ready ? (
        <p className="text-[12px] text-subtle">Tjekker din enhed…</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {pushAvailable && !env.subscribed && !iosNeedsInstall && (
              <Button size="sm" onClick={enable} loading={busy === "on"}>
                <BellRing className="size-3.5" />
                Slå push til
              </Button>
            )}
            {env.subscribed && (
              <>
                <Button size="sm" variant="outline" onClick={test} loading={busy === "test"}>
                  Send test
                </Button>
                <Button size="sm" variant="ghost" onClick={disable} loading={busy === "off"}>
                  Slå fra på denne enhed
                </Button>
              </>
            )}
            {canInstall && !env.standalone && (
              <Button size="sm" variant="outline" onClick={install} loading={busy === "install"}>
                <Download className="size-3.5" />
                Installér app
              </Button>
            )}
            {env.standalone && (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-positive">
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
                Kører som installeret app
              </span>
            )}
          </div>

          {iosNeedsInstall && (
            <p className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-bg/50 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted">
              <Smartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              På iPhone og iPad: tryk på Del-ikonet i Safari og vælg &ldquo;Føj til hjemmeskærm&rdquo;.
              Åbn derefter appen fra hjemmeskærmen og slå push til her.
            </p>
          )}
          {!env.supported && !iosNeedsInstall && (
            <p className="text-[12px] text-subtle">
              Din browser understøtter ikke push-beskeder.
            </p>
          )}
          {env.supported && !env.serverConfigured && (
            <p className="text-[12px] text-subtle">Push er ikke sat op på serveren endnu.</p>
          )}
          {env.permission === "denied" && !env.subscribed && (
            <p className="text-[12px] text-warning">
              Notifikationer er blokeret for siden i din browser — slå dem til i browserens
              indstillinger, og prøv igen.
            </p>
          )}
          {note && (
            <p role="status" className="text-[12px] text-primary-strong">
              {note}
            </p>
          )}
          {env.devices > 0 && (
            <p className="text-[11.5px] text-subtle">
              {env.devices} {env.devices === 1 ? "enhed" : "enheder"} modtager push på din konto.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
