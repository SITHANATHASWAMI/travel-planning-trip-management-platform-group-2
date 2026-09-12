import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleLoginButton from "../components/GoogleLoginButton";

/* Strength config */
const STRENGTH_LEVELS = [
  {
    label: "Too short",
    color: "bg-red-400",
    textColor: "text-red-500",
    bars: 1,
  },
  {
    label: "Weak",
    color: "bg-orange-400",
    textColor: "text-orange-500",
    bars: 2,
  },
  {
    label: "Fair",
    color: "bg-amber-400",
    textColor: "text-amber-600",
    bars: 3,
  },
  {
    label: "Strong",
    color: "bg-emerald-400",
    textColor: "text-emerald-600",
    bars: 4,
  },
  {
    label: "Very strong",
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    bars: 5,
  },
];

function getStrength(pw) {
  if (!pw || pw.length < 6) return 0;
  let score = 1;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 5);
}

const PERKS = [
  { icon: "✈️", text: "Plan unlimited trips" },
  { icon: "💰", text: "Track budgets & expenses" },
  { icon: "👥", text: "Invite travel companions" },
  { icon: "🗺️", text: "Day-wise itineraries" },
  { icon: "🔔", text: "Trip reminders & alerts" },
];

export default function Register() {
  const { register, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({});
  const [agreed, setAgreed] = useState(false);

  /* Clear server error on change */
  useEffect(() => {
    if (error) setError(null);
  }, [form]); // eslint-disable-line

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const strength = getStrength(form.password);
  const strengthInfo = STRENGTH_LEVELS[Math.max(0, strength - 1)];

  /* Inline validation */
  const nameErr =
    touched.fullName && !form.fullName.trim() ? "Full name is required" : "";
  const emailErr =
    touched.email && !form.email
      ? "Email is required"
      : touched.email && !/\S+@\S+\.\S+/.test(form.email)
        ? "Enter a valid email"
        : "";
  const passErr =
    touched.password && !form.password
      ? "Password is required"
      : touched.password && form.password.length < 6
        ? "Must be at least 6 characters"
        : "";
  const confirmErr =
    touched.confirmPassword && !form.confirmPassword
      ? "Please confirm your password"
      : touched.confirmPassword && form.confirmPassword !== form.password
        ? "Passwords don't match"
        : "";

  const isValid =
    !nameErr &&
    !emailErr &&
    !passErr &&
    !confirmErr &&
    form.fullName &&
    form.email &&
    form.password &&
    form.confirmPassword === form.password &&
    agreed;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });
    if (!isValid) return;
    const { confirmPassword, ...payload } = form;
    const ok = await register(payload);
    if (ok) navigate("/");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex animate-fadeIn">
      {/* ── Left panel ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 p-10 justify-between relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-0 w-64 h-64 rounded-full bg-indigo-400/10 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 animate-slideInLeft">
          <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl">
            ✈
          </span>
          <span className="text-white font-extrabold text-xl tracking-tight">
            TripNest
          </span>
        </div>

        {/* Hero text */}
        <div
          className="relative animate-fadeInUp space-y-5"
          style={{ animationDelay: "0.1s" }}
        >
          <div>
            <p className="text-brand-200 text-xs font-semibold uppercase tracking-widest mb-2">
              Join thousands of travellers
            </p>
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Your next adventure
              <br />
              starts here. 🌍
            </h2>
          </div>

          <p className="text-brand-100 text-sm leading-relaxed">
            TripNest brings all your travel planning into one place — from
            day-wise itineraries to shared group expenses.
          </p>

          {/* Perk list */}
          <ul className="space-y-3">
            {PERKS.map((p, i) => (
              <li
                key={p.text}
                className="flex items-center gap-3 animate-fadeInUp"
                style={{ animationDelay: `${0.15 + i * 0.07}s` }}
              >
                <span className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center text-sm flex-shrink-0">
                  {p.icon}
                </span>
                <span className="text-white/85 text-sm">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <div
          className="relative bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/15 animate-fadeInUp"
          style={{ animationDelay: "0.5s" }}
        >
          <p className="text-white/80 text-sm italic">
            "TripNest made planning our Bali trip a breeze. Shared itinerary,
            split expenses — all in one place!"
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-7 h-7 rounded-full bg-brand-200 flex items-center justify-center text-xs font-bold text-brand-700">
              P
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Priya S.</p>
              <p className="text-white/50 text-[10px]">Traveller · Bangalore</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ──────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center px-6 py-8 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md animate-slideInRight">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <span className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              ✈
            </span>
            <span className="font-extrabold text-xl text-brand-700">
              TripNest
            </span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Create account
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Free forever. Start planning in minutes.
            </p>
          </div>

          {/* Server error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-scaleIn">
              <span className="text-base mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full name */}
            <Field label="Full Name" required error={nameErr}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  👤
                </span>
                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  value={form.fullName}
                  onChange={set("fullName")}
                  onBlur={touch("fullName")}
                  placeholder="Jane Traveler"
                  className={inputCls(nameErr)}
                />
              </div>
            </Field>

            {/* Email */}
            <Field label="Email Address" required error={emailErr}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  📧
                </span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set("email")}
                  onBlur={touch("email")}
                  placeholder="you@example.com"
                  className={inputCls(emailErr)}
                />
              </div>
            </Field>

            {/* Phone */}
            <Field label="Phone Number" hint="Optional">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  📱
                </span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 98765 43210"
                  className={inputCls("")}
                />
              </div>
            </Field>

            {/* Password */}
            <Field label="Password" required error={passErr}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  🔒
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  onBlur={touch("password")}
                  placeholder="At least 6 characters"
                  className={inputCls(passErr)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>

              {/* Strength meter */}
              {form.password && (
                <div className="mt-2 space-y-1 animate-fadeIn">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${n <= strength ? strengthInfo.color : "bg-slate-200"
                          }`}
                      />
                    ))}
                  </div>
                  <p
                    className={`text-[11px] font-semibold ${strengthInfo.textColor}`}
                  >
                    {strengthInfo.label}
                    {strength >= 4 && " ✓"}
                  </p>
                </div>
              )}
            </Field>

            {/* Confirm password */}
            <Field label="Confirm Password" required error={confirmErr}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  🔒
                </span>
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={set("confirmPassword")}
                  onBlur={touch("confirmPassword")}
                  placeholder="Repeat your password"
                  className={inputCls(confirmErr)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
                {/* Match tick */}
                {form.confirmPassword &&
                  form.confirmPassword === form.password && (
                    <span className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-500 text-sm">
                      ✓
                    </span>
                  )}
              </div>
            </Field>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${agreed
                    ? "bg-brand-600 border-brand-600"
                    : "border-slate-300 group-hover:border-brand-400"
                    }`}
                >
                  {agreed && (
                    <span className="text-white text-[10px] font-bold">✓</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed">
                I agree to the{" "}
                <Link
                  to="/login"
                  onClick={(e) => e.preventDefault()}
                  className="text-brand-600 hover:underline font-medium"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/login"
                  onClick={(e) => e.preventDefault()}
                  className="text-brand-600 hover:underline font-medium"
                >
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-brand-200 transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Creating account…
                </span>
              ) : (
                "Create Free Account →"
              )}
            </button>
          </form>

          {/* Google Sign-In */}
          <GoogleLoginButton />

          {/* Login link */}
          <p className="text-sm text-slate-500 mt-5 text-center">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-brand-600 font-bold hover:underline"
            >
              Sign in →
            </Link>
          </p>

          {/* Security note */}
          <p className="text-center text-[11px] text-slate-400 mt-4 flex items-center justify-center gap-1">
            🔐 Your data is encrypted and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function inputCls(err) {
  return `w-full pl-10 pr-11 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${err
    ? "border-red-300 focus:ring-red-200 bg-red-50"
    : "border-slate-200 focus:ring-brand-200 focus:border-brand-400 bg-white"
    }`;
}

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-xs text-red-500 mt-1 ml-1 flex items-center gap-1 animate-fadeIn">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
