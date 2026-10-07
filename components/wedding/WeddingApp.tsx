"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { guestFromSearchParams } from "@/lib/wedding/guest";
import {
  createWeddingWish,
  fetchPublicWeddingWishes,
  type WeddingWish,
} from "@/lib/wedding/wishes";
import { MusicPlayer, type MusicPlayerHandle } from "./MusicPlayer";
import "./wedding-shell.css";

const COUNTDOWN_END = new Date("2026-10-18T11:00:00").getTime();

type Props = {
  envelopeHtml: string;
  inviteHtml: string;
};

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wishTickerItemHtml(wish: WeddingWish) {
  const name = escapeHtml(wish.name?.trim() || "Quý Khách");
  const message = escapeHtml(wish.message?.trim() || "");
  return `<div class="wish-ticker-item"><strong>${name}:</strong> ${message}</div>`;
}

function wishSignature(wishes: WeddingWish[]) {
  return wishes.map((wish) => wish.id).join("|");
}

/** Merge poll results: keep current order, append only new wishes, drop removed ones. */
function mergeWishList(
  current: WeddingWish[],
  incoming: WeddingWish[],
): { next: WeddingWish[]; changed: boolean } {
  if (current.length === 0) {
    return { next: incoming, changed: incoming.length > 0 };
  }

  const incomingById = new Map(incoming.map((wish) => [wish.id, wish]));
  const currentIds = new Set(current.map((wish) => wish.id));
  const kept = current.filter((wish) => incomingById.has(wish.id));
  const newcomers = incoming.filter((wish) => !currentIds.has(wish.id));
  const next = [...kept, ...newcomers];
  const changed = wishSignature(next) !== wishSignature(current);
  return { next, changed };
}

function renderWishTicker(root: HTMLElement, wishes: WeddingWish[]) {
  const ticker = root.querySelector<HTMLElement>("#wedding-wish-ticker");
  const viewport = root.querySelector<HTMLElement>(".wish-ticker-viewport");
  const track = root.querySelector<HTMLElement>("[data-wish-track]");
  if (!ticker || !track) return;

  if (wishes.length === 0) {
    track.innerHTML = "";
    track.classList.remove("is-scrolling");
    track.style.removeProperty("animation");
    track.style.removeProperty("--wish-scroll-distance");
    ticker.classList.add("is-empty");
    return;
  }

  const itemsHtml = wishes.map(wishTickerItemHtml).join("");
  ticker.classList.remove("is-empty");
  track.classList.remove("is-scrolling");
  track.style.removeProperty("animation");
  track.innerHTML = `<div class="wish-ticker-group" data-wish-group>${itemsHtml}</div>`;

  const group = track.querySelector<HTMLElement>("[data-wish-group]");
  if (!group) return;

  // Fill until one cycle is at least as tall as the viewport — avoids empty gap on loop
  const minHeight = Math.max(viewport?.clientHeight ?? 0, ticker.clientHeight, 1);
  let guard = 0;
  while (group.offsetHeight < minHeight && guard < 24) {
    group.insertAdjacentHTML("beforeend", itemsHtml);
    guard += 1;
  }

  const cycleHeight = group.offsetHeight;
  track.appendChild(group.cloneNode(true));
  track.style.setProperty("--wish-scroll-distance", `${cycleHeight}px`);

  const durationSec = Math.max(4, cycleHeight / 55);
  // Full shorthand so duration isn't lost when restarting the animation
  void track.offsetHeight;
  track.style.animation = `wish-ticker-scroll ${durationSec}s linear infinite`;
  track.classList.add("is-scrolling");
}

export function WeddingApp({ envelopeHtml, inviteHtml }: Props) {
  const searchParams = useSearchParams();
  const guestName = guestFromSearchParams(searchParams);

  const [phase, setPhase] = useState<"envelope" | "opening" | "invite">("envelope");
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [inviteVisible, setInviteVisible] = useState(false);
  /** loading-gate: null | "closed" | "open" | "finished" — mirrors original tranghieu */
  const [gateState, setGateState] = useState<"closed" | "open" | "finished" | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const envelopeRef = useRef<HTMLDivElement>(null);
  const inviteRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<MusicPlayerHandle>(null);
  const submittingWishRef = useRef(false);

  // Inject guest name into envelope markup
  const envelopeWithGuest = envelopeHtml.replace(
    /(id="w-3rh00552"[\s\S]*?<h1 class="text-block-css full-width">)([\s\S]*?)(<\/h1>)/,
    `$1${guestName}$3`,
  );

  useEffect(() => {
    document.documentElement.classList.add("wedding-root");
    document.title = `Thân mời ${guestName}`;
    return () => document.documentElement.classList.remove("wedding-root");
  }, [guestName]);

  // Envelope is a fixed 420×784 canvas. On mobile always scale to the full
  // layout WIDTH (never by height, which leaves side gutters on shorter
  // phones). On desktop, fit inside the window without upscaling.
  useEffect(() => {
    const root = document.documentElement;
    if (phase !== "envelope") {
      root.classList.remove("wedding-envelope");
      root.style.removeProperty("--envelope-scale");
      return;
    }

    root.classList.add("wedding-envelope");

    const fit = () => {
      const vw = root.clientWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const scale = vw < 768 ? vw / 420 : Math.min(1, vw / 420, vh / 784);
      root.style.setProperty("--envelope-scale", String(scale));
    };

    fit();
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      root.classList.remove("wedding-envelope");
      root.style.removeProperty("--envelope-scale");
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [phase]);

  // Invite is a fixed 420px layout — on mobile scale it to the device width so
  // the hero and every section are edge-to-edge.
  useEffect(() => {
    if (phase !== "invite" && !inviteVisible) return;
    const root = document.documentElement;
    const layer = inviteRef.current;
    const pageview = layer?.querySelector<HTMLElement>(".pageview") ?? null;

    const reset = () => {
      root.classList.remove("wedding-fullbleed");
      root.style.removeProperty("--invite-scale");
      layer?.style.removeProperty("width");
      layer?.style.removeProperty("height");
    };

    const fit = () => {
      const vw = root.clientWidth;
      if (vw >= 768 || !layer || !pageview) {
        reset();
        return;
      }
      const scale = vw / 420;
      root.classList.add("wedding-fullbleed");
      root.style.setProperty("--invite-scale", String(scale));
      // transform doesn't change layout size, so size the layer to the scaled
      // content; otherwise the page scroll height is wrong.
      layer.style.width = `${vw}px`;
      layer.style.height = `${pageview.offsetHeight * scale}px`;
    };

    fit();
    const ro =
      pageview && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(fit)
        : null;
    if (pageview && ro) ro.observe(pageview);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      reset();
      ro?.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [phase, inviteVisible]);

  // Countdown updater once invite is shown
  useEffect(() => {
    if (phase !== "invite") return;
    const root = inviteRef.current;
    if (!root) return;

    const dayEl = root.querySelector(".countdown-item-day > div:first-child");
    const hourEl = root.querySelector(".countdown-item-hour > div:first-child");
    const minEl = root.querySelector(".countdown-item-minute > div:first-child");
    const secEl = root.querySelector(".countdown-item-second > div:first-child");

    const tick = () => {
      const diff = Math.max(0, COUNTDOWN_END - Date.now());
      const s = Math.floor(diff / 1000);
      const days = Math.floor(s / 86400);
      const hours = Math.floor((s % 86400) / 3600);
      const mins = Math.floor((s % 3600) / 60);
      const secs = s % 60;
      if (dayEl) dayEl.textContent = pad(days);
      if (hourEl) hourEl.textContent = pad(hours);
      if (minEl) minEl.textContent = pad(mins);
      if (secEl) secEl.textContent = pad(secs);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Scroll-triggered entrance animations — match e.ewedding.site webcake:
  // IntersectionObserver({ threshold: 0, rootMargin: `0px 0px ${vh/10}px 0px` })
  // Positive bottom margin expands the hit area so nearby elements (e.g. the two
  // polaroids ~77px apart) intersect in the same frame and animate together.
  // Hero (#w-4hid1bt8) waits longer after the gate opens so names stay readable.
  useEffect(() => {
    if (phase !== "invite") return;
    if (gateState === "closed") return;
    const root = inviteRef.current;
    if (!root) return;

    const heroSection = root.querySelector("#w-4hid1bt8");
    /** Delay after gate opens before hero text starts animating */
    const HERO_REVEAL_MS = 1400;
    const pendingTimers: number[] = [];

    const activate = (el: Element) => {
      el.classList.add("animation");
      el.classList.remove("is-animation", "hidden-animation");
    };

    const activateMaybeDelayed = (el: Element) => {
      if (heroSection?.contains(el)) {
        const id = window.setTimeout(() => activate(el), HERO_REVEAL_MS);
        pendingTimers.push(id);
        return;
      }
      activate(el);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          activateMaybeDelayed(entry.target);
        }
      },
      {
        threshold: 0,
        rootMargin: `0px 0px ${Math.round(window.innerHeight / 10)}px 0px`,
      },
    );

    root.querySelectorAll(".is-animation").forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      pendingTimers.forEach((id) => window.clearTimeout(id));
    };
  }, [phase, gateState]);

  // Wish ticker + form submit
  useEffect(() => {
    if (phase !== "invite") return;
    const root = inviteRef.current;
    if (!root) return;

    let cancelled = false;
    let displayedWishes: WeddingWish[] = [];
    let pendingWishes: WeddingWish[] | null = null;
    let waitingForLoop = false;
    let loopListener: (() => void) | null = null;

    const trackEl = () =>
      root.querySelector<HTMLElement>("[data-wish-track]");

    const applyDisplayed = (wishes: WeddingWish[]) => {
      displayedWishes = wishes;
      renderWishTicker(root, wishes);
    };

    const flushPendingAtLoop = () => {
      waitingForLoop = false;
      loopListener = null;
      if (cancelled || !pendingWishes) return;
      const next = pendingWishes;
      pendingWishes = null;
      if (wishSignature(next) === wishSignature(displayedWishes)) return;
      applyDisplayed(next);
    };

    const scheduleDisplay = (wishes: WeddingWish[]) => {
      if (wishSignature(wishes) === wishSignature(displayedWishes)) return;

      const track = trackEl();
      const canDefer =
        Boolean(track?.classList.contains("is-scrolling")) &&
        displayedWishes.length > 0;

      if (!canDefer) {
        pendingWishes = null;
        applyDisplayed(wishes);
        return;
      }

      // Swap only when a seamless loop finishes — no mid-scroll jump
      pendingWishes = wishes;
      if (waitingForLoop || !track) return;
      waitingForLoop = true;
      loopListener = flushPendingAtLoop;
      track.addEventListener("animationiteration", flushPendingAtLoop, {
        once: true,
      });
    };

    const refreshTicker = () =>
      fetchPublicWeddingWishes()
        .then((incoming) => {
          if (cancelled) return;
          const base = pendingWishes ?? displayedWishes;
          const { next, changed } = mergeWishList(base, incoming);
          if (!changed) return;
          scheduleDisplay(next);
        })
        .catch(() => {
          // Keep current list on transient fetch errors
        });

    void refreshTicker();
    const pollId = window.setInterval(() => {
      void refreshTicker();
    }, 5000);

    const form = root.querySelector<HTMLFormElement>("#npnmha4s");
    const nameInput = root.querySelector<HTMLInputElement>("input[name='full_name']");
    // Keep name empty; API defaults blank names to "Quý Khách"
    if (nameInput) nameInput.value = "";

    const onSubmit = (e: Event) => {
      e.preventDefault();
      if (!form || submittingWishRef.current) return;

      const formData = new FormData(form);
      const name = String(formData.get("full_name") || "").trim();
      const message = String(formData.get("guiloichuc") || "").trim();
      const willAttendRaw = formData.get("willAttend");

      if (!message || willAttendRaw == null) {
        setToast({
          type: "error",
          message: "Vui lòng nhập lời chúc và xác nhận tham dự.",
        });
        window.setTimeout(() => setToast(null), 3500);
        return;
      }

      submittingWishRef.current = true;
      void createWeddingWish({
        name,
        message,
        willAttend: willAttendRaw === "true",
      })
        .then(() => {
          setToast({
            type: "success",
            message: "Lời chúc của bạn đã được ghi nhận.",
          });
          form.reset();
          if (nameInput) nameInput.value = "";
          return refreshTicker();
        })
        .catch((error: unknown) => {
          setToast({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Không gửi được lời chúc. Vui lòng thử lại.",
          });
        })
        .finally(() => {
          submittingWishRef.current = false;
          window.setTimeout(() => setToast(null), 3500);
        });
    };
    form?.addEventListener("submit", onSubmit);

    // Make visible submit button work (hidden native submit exists)
    const fakeBtn = root.querySelector("#w-t0wvktbp");
    const onFakeClick = () => {
      form?.requestSubmit();
    };
    fakeBtn?.addEventListener("click", onFakeClick);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      const track = trackEl();
      if (track && loopListener) {
        track.removeEventListener("animationiteration", loopListener);
      }
      form?.removeEventListener("submit", onSubmit);
      fakeBtn?.removeEventListener("click", onFakeClick);
    };
  }, [phase]);

  const openingRef = useRef(false);

  const openInvite = () => {
    if (phase !== "envelope" || openingRef.current) return;
    openingRef.current = true;
    setPhase("opening");
    void musicRef.current?.play();

    // Same flow as original: show invite + fullscreen gate, then open wings
    setInviteVisible(true);
    setPhase("invite");
    setShowEnvelope(false);
    setGateState("closed");
    window.scrollTo(0, 0);

    // Original: open after 500ms, finished after 5000ms
    window.setTimeout(() => setGateState("open"), 500);
    window.setTimeout(() => setGateState("finished"), 5000);
  };

  // Wire original seal / hand / label taps
  useEffect(() => {
    const root = envelopeRef.current;
    if (!root || phase !== "envelope") return;

    const handler = (e: Event) => {
      e.preventDefault();
      openInvite();
    };

    const triggers = root.querySelectorAll("[data-open-invite]");
    triggers.forEach((el) => el.addEventListener("click", handler));
    return () => {
      triggers.forEach((el) => el.removeEventListener("click", handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, envelopeWithGuest]);

  return (
    <div className="wedding-app">
      <div className="wedding-stage">
        {showEnvelope && (
          <div ref={envelopeRef} className="wedding-envelope-layer">
            <div dangerouslySetInnerHTML={{ __html: envelopeWithGuest }} />
            <button
              type="button"
              className="envelope-open-hitbox"
              aria-label="Ấn để mở thiệp"
              onClick={openInvite}
            />
          </div>
        )}

        {(phase === "invite" || inviteVisible) && (
          <div
            ref={inviteRef}
            className={`wedding-invite-layer${inviteVisible ? " is-visible" : ""}`}
            dangerouslySetInnerHTML={{ __html: inviteHtml }}
          />
        )}
      </div>

      {gateState && gateState !== "finished" && (
        <div
          id="loading-gate"
          className={gateState === "open" ? "open" : undefined}
          aria-hidden
        >
          <div className="gate-bg-layer" />
          <div className="gate-wing left-wing" />
          <div className="gate-wing right-wing" />
        </div>
      )}

      <MusicPlayer ref={musicRef} visible={phase !== "envelope"} />

      {toast && (
        <div
          className={`wedding-toast${toast.type === "error" ? " is-error" : ""}`}
          role="status"
        >
          <strong>{toast.type === "error" ? "Có lỗi xảy ra" : "Cảm ơn bạn!"}</strong>
          <p>{toast.message}</p>
        </div>
      )}
    </div>
  );
}
