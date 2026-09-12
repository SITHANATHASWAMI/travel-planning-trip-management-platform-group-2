import React, { useEffect, useState } from "react";
import { authApi } from "../api/authApi";

const BACKEND_URL = process.env.REACT_APP_API_BASE_URL
  ? process.env.REACT_APP_API_BASE_URL.replace("/api", "")
  : "https://backend-production-8a24f.up.railway.app";

const GOOGLE_AUTH_URL = `${BACKEND_URL}/oauth2/authorization/google`;

export default function GoogleLoginButton() {
  const [status, setStatus] = useState("loading"); // loading | enabled | disabled

  useEffect(() => {
    authApi
      .oauthEnabled()
      .then((res) =>
        setStatus(res.data?.enabled === true ? "enabled" : "disabled"),
      )
      .catch(() => setStatus("disabled"));
  }, []);

  // Hide entirely when disabled or still loading — no error message shown
  if (status !== "enabled") return null;

  return (
    <>
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400 font-medium">
          or continue with
        </span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={() => { window.location.href = GOOGLE_AUTH_URL; }}
        className="w-full flex items-center justify-center gap-3 border border-slate-300 bg-white text-slate-700 font-medium py-3 rounded-xl text-sm shadow-sm hover:bg-slate-50 hover:shadow-md hover:border-slate-400 active:scale-[0.98] transition-all duration-200"
      >
        {/* Official Google G SVG */}
        <svg
          className="w-5 h-5 flex-shrink-0"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>
    </>
  );
}
