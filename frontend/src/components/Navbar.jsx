import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../api/Notificationapi";

const NAV_LINKS = [
  { to: "/trips", label: "My Trips", icon: "🗺️" },
  { to: "/destinations", label: "Explore", icon: "🌍" },
  { to: "/groups", label: "Groups", icon: "👥" },
  { to: "/portals", label: "Portals", icon: "🎫" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Poll unread notification count every 30 s
  useEffect(() => {
    if (!user) return;
    const fetchCount = () =>
      getUnreadCount()
        .then((r) => setUnread(Number(r.data?.count ?? r.data) || 0))
        .catch(() => { });
    fetchCount();
    const id = setInterval(fetchCount, 30_000);
    return () => clearInterval(id);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-extrabold text-xl text-brand-700 flex-shrink-0"
        >
          <span className="inline-flex w-8 h-8 rounded-lg bg-brand-600 text-white items-center justify-center text-base">
            ✈
          </span>
          TripNest
        </Link>

        {user ? (
          <>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(link.to)
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:text-brand-700 hover:bg-slate-50"
                    }`}
                >
                  {link.icon} {link.label}
                </Link>
              ))}
              {user?.role === "ADMINISTRATOR" && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${isActive("/admin")
                    ? "bg-red-50 text-red-700"
                    : "text-red-600 hover:bg-red-50"
                    }`}
                >
                  🛡 Admin
                </Link>
              )}
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3">
              {/* Notification bell */}
              <Link
                to="/notifications"
                className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <span className="text-xl">🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>

              {/* Profile */}
              <div className="hidden sm:flex items-center gap-1 pl-3 border-l border-slate-200">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-brand-700 hover:bg-slate-50 transition-colors"
                >
                  <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                    {user.fullName?.[0]?.toUpperCase() || "U"}
                  </span>
                  {user.fullName?.split(" ")[0]}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu"
              >
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-brand-700">
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {user && menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pb-4 pt-2 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${isActive(link.to)
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              {link.icon} {link.label}
            </Link>
          ))}
          <Link
            to="/notifications"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            🔔 Notifications
            {unread > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {unread}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            👤 Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            🚪 Logout
          </button>
          {user?.role === "ADMINISTRATOR" && (
            <Link
              to="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50"
            >
              🛡 Admin Dashboard
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
