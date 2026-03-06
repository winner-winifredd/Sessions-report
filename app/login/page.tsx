"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, LogIn } from "lucide-react";

const TILT_MAX = 12;
const SPOTLIGHT_SIZE = 420;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
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

        const card = cardRef.current?.getBoundingClientRect();
        if (card) {
          const cx = card.left + card.width / 2;
          const cy = card.top + card.height / 2;
          const dx = (e.clientX - cx) / (card.width / 2);
          const dy = (e.clientY - cy) / (card.height / 2);
          setCardTilt({
            x: Math.max(-1, Math.min(1, dy)) * -TILT_MAX,
            y: Math.max(-1, Math.min(1, dx)) * TILT_MAX,
          });
        }
      });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setCardTilt({ x: 0, y: 0 });
    setCursorPos({ x: -100, y: -100 });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      // session cookie is now set; send user to main dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  const orb1X = 20 + (mouse.x - 0.5) * 15;
  const orb1Y = 25 + (mouse.y - 0.5) * 10;
  const orb2X = 80 + (mouse.x - 0.5) * -12;
  const orb2Y = 33 + (mouse.y - 0.5) * -8;
  const orb3X = 50 + (mouse.x - 0.5) * 10;
  const orb3Y = 70 + (mouse.y - 0.5) * 8;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#0c1116] to-slate-950 text-slate-200 flex items-center justify-center px-4"
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
          background: "radial-gradient(circle, rgba(45,212,191,0.25) 0%, rgba(14,165,233,0.12) 40%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Cursor ring — follows exact pointer */}
      <div
        className="pointer-events-none fixed h-8 w-8 rounded-full border-2 border-teal-400/30 transition-all duration-100 ease-out"
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          transform: "translate(-50%, -50%)",
        }}
        aria-hidden
      />

      {/* Cursor trail dots (fixed so clientX/Y work) */}
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
        className="pointer-events-none absolute h-72 w-72 rounded-full bg-teal-500/25 blur-3xl login-orb transition-transform duration-200 ease-out"
        style={{ left: `${orb1X}%`, top: `${orb1Y}%`, transform: "translate(-50%, -50%)" }}
      />
      <div
        className="pointer-events-none absolute h-80 w-80 rounded-full bg-sky-500/20 blur-3xl animate-float transition-transform duration-200 ease-out"
        style={{ left: `${orb2X}%`, top: `${orb2Y}%`, transform: "translate(-50%, -50%)", animationDelay: "-1s" }}
      />
      <div
        className="pointer-events-none absolute left-1/2 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl animate-gradient-shift transition-transform duration-200 ease-out"
        style={{ left: `${orb3X}%`, top: `${orb3Y}%`, transform: "translate(-50%, -50%)" }}
      />

      <div
        ref={cardRef}
        className="login-initial login-card-enter relative w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-950/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm transition-transform duration-200 ease-out"
        style={{
          transform: `perspective(800px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
        }}
      >
        {/* Subtle animated border glow */}
        <div className="absolute inset-0 rounded-2xl border border-teal-500/20 shadow-[inset_0_0_30px_rgba(20,184,166,0.05)]" aria-hidden />

        <div className="mb-6 text-center relative">
          <div className="login-lock-float mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 shadow-lg shadow-teal-500/10 transition-transform duration-300 hover:scale-110">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="login-initial animate-fade-in-up login-delay-1 text-lg font-semibold text-white">
            Sign in to Session Reports
          </h1>
          <p className="login-initial animate-fade-in-up login-delay-2 mt-1 text-xs text-slate-500">
            Contact an admin for valid login credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-4">
          <div className="group login-initial animate-fade-in-up login-delay-3">
            <label className="mb-1 block text-xs font-medium text-slate-400 transition-colors duration-200 group-focus-within:text-teal-400">Email</label>
            <div className="relative transition-all duration-300 focus-within:scale-[1.01]">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-teal-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition-all duration-300 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:placeholder-slate-600"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="group login-initial animate-fade-in-up login-delay-4">
            <label className="mb-1 block text-xs font-medium text-slate-400 transition-colors duration-200 group-focus-within:text-teal-400">Password</label>
            <div className="relative transition-all duration-300 focus-within:scale-[1.01]">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors duration-200 group-focus-within:text-teal-400" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 py-2.5 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition-all duration-300 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:placeholder-slate-600"
                placeholder="contact an admin for valid pass"
                required
              />
            </div>
          </div>

          {error && (
            <p className="animate-fade-in-up text-xs text-rose-400 bg-rose-950/40 border border-rose-900/60 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="login-initial animate-fade-in-up login-delay-5 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02] hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-500/25 disabled:opacity-60 disabled:hover:scale-100"
            >
              <LogIn className={`h-4 w-4 transition-transform duration-300 ${loading ? "animate-spin" : "group-hover:translate-x-0.5"}`} />
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

