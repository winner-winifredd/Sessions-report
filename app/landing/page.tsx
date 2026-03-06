"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

const SPOTLIGHT_SIZE = 420;
const TILT_MAX = 8;

export default function LandingPage() {
  const router = useRouter();
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [contentTilt, setContentTilt] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMouse({ x, y });
      setCursorPos({ x: e.clientX, y: e.clientY });
      trailRef.current = [{ x: e.clientX, y: e.clientY }, ...trailRef.current].slice(0, 8);
      setTrail([...trailRef.current]);

      const content = contentRef.current?.getBoundingClientRect();
      if (content) {
        const cx = content.left + content.width / 2;
        const cy = content.top + content.height / 2;
        const dx = (e.clientX - cx) / (content.width / 2);
        const dy = (e.clientY - cy) / (content.height / 2);
        setContentTilt({
          x: Math.max(-1, Math.min(1, dy)) * -TILT_MAX,
          y: Math.max(-1, Math.min(1, dx)) * TILT_MAX,
        });
      }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setContentTilt({ x: 0, y: 0 });
    setCursorPos({ x: -100, y: -100 });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const orb1X = 15 + (mouse.x - 0.5) * 12;
  const orb1Y = 15 + (mouse.y - 0.5) * 8;
  const orb2X = 85 + (mouse.x - 0.5) * -10;
  const orb2Y = 25 + (mouse.y - 0.5) * -6;
  const orb3X = 50 + (mouse.x - 0.5) * 8;
  const orb3Y = 75 + (mouse.y - 0.5) * 6;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100"
    >
      {/* Cursor spotlight */}
      <div
        className="pointer-events-none absolute rounded-full blur-3xl transition-all duration-150 ease-out"
        style={{
          left: `${mouse.x * 100}%`,
          top: `${mouse.y * 100}%`,
          width: SPOTLIGHT_SIZE,
          height: SPOTLIGHT_SIZE,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(45,212,191,0.22) 0%, rgba(14,165,233,0.1) 40%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Cursor ring */}
      <div
        className="pointer-events-none fixed h-8 w-8 rounded-full border-2 border-teal-400/30 transition-all duration-100 ease-out"
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          transform: "translate(-50%, -50%)",
        }}
        aria-hidden
      />

      {/* Trail dots */}
      {trail.map((p, i) => (
        <div
          key={`${p.x}-${p.y}-${i}`}
          className="pointer-events-none fixed h-2 w-2 rounded-full bg-teal-400/50 transition-all duration-200 ease-out"
          style={{
            left: p.x,
            top: p.y,
            transform: `translate(-50%, -50%) scale(${1 - i * 0.1})`,
            opacity: 1 - i * 0.14,
          }}
          aria-hidden
        />
      ))}

      {/* Parallax orbs */}
      <div
        className="pointer-events-none absolute h-80 w-80 rounded-full bg-teal-500/30 blur-3xl animate-float transition-transform duration-200 ease-out"
        style={{ left: `${orb1X}%`, top: `${orb1Y}%`, transform: "translate(-50%, -50%)" }}
      />
      <div
        className="pointer-events-none absolute h-96 w-96 rounded-full bg-sky-500/25 blur-3xl animate-float-slow transition-transform duration-200 ease-out"
        style={{ left: `${orb2X}%`, top: `${orb2Y}%`, transform: "translate(-50%, -50%)", animationDelay: "-2s" }}
      />
      <div
        className="pointer-events-none absolute h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl animate-gradient-shift transition-transform duration-200 ease-out"
        style={{ left: `${orb3X}%`, top: `${orb3Y}%`, transform: "translate(-50%, -50%)" }}
      />

      <div
        ref={contentRef}
        className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-between px-4 py-12 sm:px-8 transition-transform duration-200 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(${contentTilt.x}deg) rotateY(${contentTilt.y}deg)`,
        }}
      >
        {/* Top nav */}
        <header className="landing-initial animate-fade-in-up mb-10 flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 shadow-lg shadow-teal-500/20 transition-transform duration-300 hover:scale-110 hover:rotate-3">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-teal-300">
                Session Reports
              </p>
              <p className="text-sm text-slate-400">
                Billing & time cards, fully in sync.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-100 shadow-sm shadow-slate-900/40 transition-all duration-300 hover:scale-105 hover:border-teal-400 hover:bg-slate-900"
          >
            Login
          </button>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="landing-initial animate-fade-in-up landing-delay-1 inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-slate-950/60 px-4 py-1 text-[11px] text-teal-200 shadow-md shadow-teal-500/20 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span>From Simple Practice to final payroll — no spreadsheets open.</span>
          </div>

          <h1 className="landing-initial animate-fade-in-up landing-delay-2 mt-6 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-slate-50 via-teal-200 to-sky-300 bg-clip-text text-transparent">
              Session reports, time cards, and audits
            </span>
            <br />
            <span className="text-slate-300">in one live, trusted view.</span>
          </h1>

          <p className="landing-initial animate-fade-in-up landing-delay-3 mt-4 max-w-xl text-sm text-slate-400 sm:text-base">
            See every appointment, CPT, and no-show attestation in one place. Audit in the
            UI, route insurance automatically, and keep provider pay cards up to date —
            without re-running the same file twice.
          </p>

          <div className="landing-initial animate-fade-in-up landing-delay-4 mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => router.push("/login")}
              className="group inline-flex items-center gap-2 rounded-full bg-teal-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-teal-500/40 transition-all duration-300 hover:scale-105 hover:bg-teal-400 hover:shadow-teal-400/50"
            >
              Login to start
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => router.push("/timecards")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-medium text-slate-100 shadow-sm shadow-slate-900/40 transition-all duration-300 hover:scale-105 hover:border-sky-400 hover:bg-slate-900"
            >
              View provider time cards
            </button>
          </div>

          <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
            <FeaturePill
              delayClass="landing-delay-5"
              title="CPT & timing validation"
              body="Flags missing therapy time, bad combos, and level 5 codes before billing."
            />
            <FeaturePill
              delayClass="landing-delay-6"
              title="Auto where to bill"
              body="Headway vs Lytec routing driven from the UI, not hidden scripts."
            />
            <FeaturePill
              delayClass="landing-delay-7"
              title="Provider time cards"
              body="Twice-monthly earnings, penalties, and billable counts in one dashboard."
              icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="landing-initial animate-fade-in-up landing-delay-8 mt-10 w-full border-t border-slate-800/70 pt-4 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Built for high-accuracy psychiatry billing teams.</span>
            <span>Session Reports UI · {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeaturePill({
  title,
  body,
  icon,
  delayClass = "",
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
  delayClass?: string;
}) {
  return (
    <div className={`landing-initial animate-fade-in-up ${delayClass} relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 text-left shadow-sm shadow-black/40 backdrop-blur transition-all duration-300 hover:scale-[1.02] hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/10`}>
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-teal-500/10 blur-xl" />
      <div className="relative flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-teal-300">
          {icon ?? <FileSpreadsheet className="h-3.5 w-3.5" />}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-100">{title}</div>
          <div className="mt-1 text-[11px] leading-snug text-slate-400">{body}</div>
        </div>
      </div>
    </div>
  );
}

