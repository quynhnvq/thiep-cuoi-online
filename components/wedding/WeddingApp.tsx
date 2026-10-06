"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { guestFromSearchParams } from "@/lib/wedding/guest";
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

export function WeddingApp({ envelopeHtml, inviteHtml }: Props) {
  const searchParams = useSearchParams();
  const guestName = guestFromSearchParams(searchParams);

  const [phase, setPhase] = useState<"envelope" | "opening" | "invite">("envelope");
  const [showEnvelope, setShowEnvelope] = useState(true);
  const [inviteVisible, setInviteVisible] = useState(false);
  /** loading-gate: null | "closed" | "open" | "finished" — mirrors original tranghieu */
  const [gateState, setGateState] = useState<"closed" | "open" | "finished" | null>(null);
  const [toast, setToast] = useState(false);

  const envelopeRef = useRef<HTMLDivElement>(null);
  const inviteRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<MusicPlayerHandle>(null);

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

  // Envelope is a fixed 420×784 canvas — scale to fit the visible viewport and
  // lock scroll so mobile Safari doesn't show a white gap under min-height:100vh.
  useEffect(() => {
    const root = document.documentElement;
    if (phase !== "envelope") {
      root.classList.remove("wedding-envelope");
      root.style.removeProperty("--envelope-scale");
      return;
    }

    root.classList.add("wedding-envelope");

    const fit = () => {
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      // Never upscale past the designed 420×784 canvas (desktop stays 1:1,
      // centered). Only shrink on narrow/short viewports.
      const scale = Math.min(1, vw / 420, vh / 784);
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

  // Form UI handler
  useEffect(() => {
    if (phase !== "invite") return;
    const root = inviteRef.current;
    if (!root) return;

    const form = root.querySelector<HTMLFormElement>("#npnmha4s");
    const nameInput = root.querySelector<HTMLInputElement>("input[name='full_name']");
    if (nameInput && (!nameInput.value || nameInput.value === "Quý Khách")) {
      // show decoded guest name in form (unescape HTML entities for input value)
      const tmp = document.createElement("textarea");
      tmp.innerHTML = guestName;
      nameInput.value = tmp.value;
    }

    const onSubmit = (e: Event) => {
      e.preventDefault();
      setToast(true);
      window.setTimeout(() => setToast(false), 3500);
    };
    form?.addEventListener("submit", onSubmit);

    // Make visible submit button work (hidden native submit exists)
    const fakeBtn = root.querySelector("#w-t0wvktbp");
    const onFakeClick = () => {
      form?.requestSubmit();
    };
    fakeBtn?.addEventListener("click", onFakeClick);

    // Select styling class when chosen
    const select = root.querySelector<HTMLSelectElement>("select[name='ban_se_tham_du_chu']");
    const onSelect = () => {
      if (select && select.value) select.classList.add("select");
    };
    select?.addEventListener("change", onSelect);

    return () => {
      form?.removeEventListener("submit", onSubmit);
      fakeBtn?.removeEventListener("click", onFakeClick);
      select?.removeEventListener("change", onSelect);
    };
  }, [phase, guestName]);

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
        <div className="wedding-toast" role="status">
          <strong>Cảm ơn bạn!</strong>
          <p>Lời chúc của bạn đã được ghi nhận. (Form UI — logic gửi sẽ thêm sau.)</p>
        </div>
      )}
    </div>
  );
}
