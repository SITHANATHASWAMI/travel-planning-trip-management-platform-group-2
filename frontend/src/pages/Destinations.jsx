import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getDestinations } from "../api/Destinationapi";
import { useAuth } from "../context/AuthContext";
import WeatherWidget from "../components/WeatherWidget";

/* ─── Curated fallback data ──────────────────────────────────── */
const CURATED = [
  {
    id: "c1", name: "Bali", country: "Indonesia", type: "Beach",
    description: "Tropical paradise with ancient temples, terraced rice fields and vivid arts scene.",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=700&q=80",
    startingPrice: 35000, durationDays: 7, durationNights: 6, travelGuideUrl: "#",
    latitude: -8.3405, longitude: 115.0920,
  },
  {
    id: "c2", name: "Paris", country: "France", type: "City",
    description: "The city of love — iconic landmarks, world-class cuisine and art at every corner.",
    imageUrl: "https://images.unsplash.com/photo-1431274172761-fcdab704f4df?w=700&q=80",
    startingPrice: 120000, durationDays: 5, durationNights: 4, travelGuideUrl: "#",
    latitude: 48.8566, longitude: 2.3522,
  },
  {
    id: "c3", name: "Goa", country: "India", type: "Beach",
    description: "Sun-soaked beaches, vibrant nightlife and a unique blend of Indian and Portuguese culture.",
    imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=700&q=80",
    startingPrice: 12000, durationDays: 4, durationNights: 3, travelGuideUrl: "#",
    latitude: 15.2993, longitude: 74.1240,
  },
  {
    id: "c4", name: "Santorini", country: "Greece", type: "Island",
    description: "Iconic white-washed buildings, volcanic beaches and breathtaking Aegean sunsets.",
    imageUrl: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=700&q=80",
    startingPrice: 150000, durationDays: 6, durationNights: 5, travelGuideUrl: "#",
    latitude: 36.3932, longitude: 25.4615,
  },
  {
    id: "c5", name: "Tokyo", country: "Japan", type: "City",
    description: "Where ancient temples meet neon-lit skyscrapers — sushi, anime and cherry blossoms await.",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=700&q=80",
    startingPrice: 95000, durationDays: 8, durationNights: 7, travelGuideUrl: "#",
    latitude: 35.6762, longitude: 139.6503,
  },
  {
    id: "c6", name: "Manali", country: "India", type: "Mountain",
    description: "Snow-capped Himalayan peaks, adventure sports and cosy cafés in the mountains.",
    imageUrl: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=700&q=80",
    startingPrice: 8000, durationDays: 5, durationNights: 4, travelGuideUrl: "#",
    latitude: 32.2432, longitude: 77.1892,
  },
  {
    id: "c7", name: "Dubai", country: "UAE", type: "City",
    description: "Futuristic skyline, luxury shopping and desert safari adventures in one city.",
    imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=700&q=80",
    startingPrice: 75000, durationDays: 5, durationNights: 4, travelGuideUrl: "#",
    latitude: 25.2048, longitude: 55.2708,
  },
  {
    id: "c8", name: "Maldives", country: "Maldives", type: "Island",
    description: "Crystal-clear lagoons, overwater bungalows and the world's best snorkelling.",
    imageUrl: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=700&q=80",
    startingPrice: 180000, durationDays: 5, durationNights: 4, travelGuideUrl: "#",
    latitude: 3.2028, longitude: 73.2207,
  },
  {
    id: "c9", name: "Kerala", country: "India", type: "Nature",
    description: "God's Own Country — backwaters, spice gardens and serene Ayurvedic retreats.",
    imageUrl: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=700&q=80",
    startingPrice: 14000, durationDays: 6, durationNights: 5, travelGuideUrl: "#",
    latitude: 10.8505, longitude: 76.2711,
  },
  {
    id: "c10", name: "Rajasthan", country: "India", type: "Heritage",
    description: "Royal palaces, vibrant bazaars and golden desert dunes across the land of kings.",
    imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=700&q=80",
    startingPrice: 18000, durationDays: 7, durationNights: 6, travelGuideUrl: "#",
    latitude: 27.0238, longitude: 74.2179,
  },
  {
    id: "c11", name: "Singapore", country: "Singapore", type: "City",
    description: "A gleaming city-state with world-class food, futuristic gardens and endless entertainment.",
    imageUrl: "https://images.unsplash.com/photo-1555217851-6141535bd771?w=700&q=80",
    startingPrice: 65000, durationDays: 4, durationNights: 3, travelGuideUrl: "#",
    latitude: 1.3521, longitude: 103.8198,
  },
  {
    id: "c12", name: "Coorg", country: "India", type: "Nature",
    description: "Scotland of India — misty coffee estates, waterfalls and lush green hills.",
    imageUrl: "https://images.unsplash.com/photo-1580181735399-a23e7e0ecf3b?w=700&q=80",
    startingPrice: 9000, durationDays: 3, durationNights: 2, travelGuideUrl: "#",
    latitude: 12.3375, longitude: 75.8069,
  },
];

/* ─── Type config ────────────────────────────────────────────── */
const TYPE_CONFIG = {
  All: { emoji: "🌐", color: "from-slate-500 to-slate-700" },
  Beach: { emoji: "🏖️", color: "from-cyan-500 to-blue-600" },
  City: { emoji: "🏙️", color: "from-violet-500 to-purple-700" },
  Mountain: { emoji: "🏔️", color: "from-emerald-500 to-teal-700" },
  Island: { emoji: "🌴", color: "from-amber-400 to-orange-600" },
  Nature: { emoji: "🌿", color: "from-green-500 to-emerald-700" },
  Heritage: { emoji: "🏰", color: "from-rose-500 to-pink-700" },
  Pilgrimage: { emoji: "🙏", color: "from-yellow-500 to-amber-700" },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG);

const BUDGET_RANGES = [
  { label: "All Budgets", min: 0, max: Infinity },
  { label: "Under ₹15K", min: 0, max: 15000 },
  { label: "₹15K – ₹50K", min: 15000, max: 50000 },
  { label: "₹50K – ₹1L", min: 50000, max: 100000 },
  { label: "Above ₹1L", min: 100000, max: Infinity },
];

/* ─── Card ───────────────────────────────────────────────────── */
function DestinationCard({ d, index }) {
  const [imgError, setImgError] = useState(false);
  const [liked, setLiked] = useState(false);

  const duration =
    d.durationDays && d.durationNights
      ? `${d.durationDays}D / ${d.durationNights}N`
      : d.durationDays ? `${d.durationDays} Days` : null;

  return (
    <div
      className="animate-fadeInUp group bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col"
      style={{
        animationDelay: `${index * 0.07}s`,
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 20px 40px -8px rgba(0,0,0,0.18)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.transform = "";
      }}
    >
      {/* Image area */}
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-brand-50 to-brand-100 card-img-zoom flex-shrink-0">
        {d.imageUrl && !imgError ? (
          <img
            src={d.imageUrl}
            alt={d.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl animate-float">{TYPE_CONFIG[d.type]?.emoji || "🏞️"}</span>
            <span className="text-xs text-brand-400">No image</span>
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {/* Duration badge */}
        {duration && (
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm">
            🕐 {duration}
          </span>
        )}

        {/* Type badge */}
        {d.type && (
          <span className={`absolute top-3 right-10 text-[11px] font-semibold px-2.5 py-1 rounded-full text-white shadow-sm bg-gradient-to-r ${TYPE_CONFIG[d.type]?.color || "from-brand-500 to-brand-700"}`}>
            {TYPE_CONFIG[d.type]?.emoji} {d.type}
          </span>
        )}

        {/* Like button */}
        <button
          onClick={(e) => { e.preventDefault(); setLiked((v) => !v); }}
          className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-sm backdrop-blur-sm transition-transform active:scale-90"
          style={{ transition: "transform 0.15s" }}
          title={liked ? "Unlike" : "Save"}
        >
          <span className="text-sm" style={{ transition: "transform 0.2s" }}>
            {liked ? "❤️" : "🤍"}
          </span>
        </button>

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-white text-lg leading-tight drop-shadow-md">{d.name}</h3>
          <p className="text-white/75 text-xs mt-0.5 flex items-center gap-1">
            📍 {d.country}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {d.description && (
          <p className="text-sm text-slate-500 line-clamp-2 flex-1 leading-relaxed">
            {d.description}
          </p>
        )}

        {/* Weather badge */}
        <div className="mt-2">
          <WeatherWidget city={`${d.name},${d.country}`} compact />
        </div>

        {/* Price row */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
          {d.startingPrice != null ? (
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Starting from</p>
              <p className="text-xl font-extrabold text-emerald-600 leading-tight">
                ₹{Number(d.startingPrice).toLocaleString("en-IN")}
                <span className="text-xs font-normal text-slate-400 ml-1">/ person</span>
              </p>
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">Price on request</span>
          )}

          <a
            href={d.travelGuideUrl && d.travelGuideUrl !== "#" ? d.travelGuideUrl : undefined}
            target="_blank"
            rel="noreferrer"
            onClick={(!d.travelGuideUrl || d.travelGuideUrl === "#") ? (e) => e.preventDefault() : undefined}
            className="flex-shrink-0 flex items-center gap-1 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm transition-all duration-200"
          >
            Book Now →
          </a>
        </div>

        {/* Location + Plan trip row */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Link
            to={`/trips/new?destination=${encodeURIComponent(d.name + ", " + d.country)}&title=${encodeURIComponent(d.name + " Trip")}`}
            className="text-xs text-brand-600 font-semibold hover:text-brand-800 flex items-center gap-1 group/link"
          >
            <span className="group-hover/link:translate-x-0.5 transition-transform">✈</span>
            Plan a trip here
          </Link>

          {d.latitude && d.longitude && (
            <a
              href={`https://www.google.com/maps?q=${d.latitude},${d.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
              title={`${d.latitude}, ${d.longitude}`}
            >
              📍 Map
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton card ──────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 animate-fadeIn">
      <div className="h-52 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-full" />
        <div className="h-3 skeleton rounded w-5/6" />
        <div className="flex justify-between mt-4">
          <div className="h-6 skeleton rounded w-24" />
          <div className="h-7 skeleton rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function Destinations() {
  const { user } = useAuth();
  const isAdmin = user && (user.role === "ADMINISTRATOR" || user.role === "GROUP_ADMIN");

  const [apiDestinations, setApiDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("All");
  const [budgetRange, setBudgetRange] = useState(0);
  const [showTop, setShowTop] = useState(false);

  // Scroll-to-top button visibility
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    getDestinations({})
      .then((res) => setApiDestinations(res.data || []))
      .catch(() => setApiDestinations([]))
      .finally(() => setLoading(false));
  }, []);

  const allDestinations = useMemo(
    () => (apiDestinations.length > 0 ? apiDestinations : CURATED),
    [apiDestinations],
  );

  const filtered = useMemo(() => {
    const range = BUDGET_RANGES[budgetRange];
    return allDestinations.filter((d) => {
      const matchSearch =
        !search ||
        `${d.name} ${d.country} ${d.description || ""} ${d.type || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchType = activeType === "All" || d.type === activeType;
      const price = d.startingPrice ?? Infinity;
      const matchBudget = price >= range.min && price < range.max;
      return matchSearch && matchType && matchBudget;
    });
  }, [allDestinations, search, activeType, budgetRange]);

  const clearFilters = useCallback(() => {
    setSearch(""); setActiveType("All"); setBudgetRange(0);
  }, []);

  // Stats for hero banner
  const uniqueCountries = useMemo(
    () => new Set(allDestinations.map((d) => d.country)).size,
    [allDestinations],
  );

  return (
    <div className="min-h-screen">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 animate-gradientShift">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute top-4 right-8 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-96 h-32 rounded-full bg-black/10 blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 py-14 relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="animate-slideInLeft">
              <p className="text-brand-200 text-xs font-semibold uppercase tracking-widest mb-2">
                Destination Discovery
              </p>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Explore the World 🌍
              </h1>
              <p className="text-brand-100 mt-3 max-w-lg text-sm leading-relaxed">
                Browse {allDestinations.length} handpicked destinations across{" "}
                {uniqueCountries} countries. Find your perfect trip and start planning in seconds.
              </p>

              {/* Mini stat row */}
              <div className="flex flex-wrap gap-4 sm:gap-6 mt-6">
                {[
                  { label: "Destinations", value: allDestinations.length, icon: "📍" },
                  { label: "Countries", value: uniqueCountries, icon: "🌐" },
                  { label: "Types", value: ALL_TYPES.length - 1, icon: "🏷️" },
                ].map((s) => (
                  <div key={s.label} className="text-center animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
                    <p className="text-2xl font-extrabold text-white">{s.value}</p>
                    <p className="text-brand-200 text-xs">{s.icon} {s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero right — floating plane */}
            <div className="hidden md:flex flex-col items-center animate-slideInRight">
              <span className="text-8xl animate-float select-none">✈️</span>
              <div className="flex gap-3 mt-6">
                {isAdmin && (
                  <Link
                    to="/destinations/new"
                    className="bg-white text-brand-700 hover:bg-brand-50 text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    + Add Destination
                  </Link>
                )}
                <Link
                  to="/trips/new"
                  className="border-2 border-white/50 text-white hover:bg-white/10 text-sm font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
                >
                  Plan Custom Trip
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile buttons */}
          <div className="flex gap-3 mt-5 md:hidden animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
            {isAdmin && (
              <Link to="/destinations/new" className="bg-white text-brand-700 text-sm font-bold px-4 py-2 rounded-xl shadow">
                + Add
              </Link>
            )}
            <Link to="/trips/new" className="border border-white/50 text-white text-sm font-bold px-4 py-2 rounded-xl">
              Plan Trip
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Filter card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6 animate-fadeInDown space-y-4">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search destinations, countries, or types…"
              className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            )}
          </div>

          {/* Type chips */}
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((t) => {
              const cfg = TYPE_CONFIG[t];
              const active = activeType === t;
              return (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-200 ${active
                    ? "bg-brand-600 text-white border-brand-600 shadow-md scale-105"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700 hover:scale-105"
                    }`}
                >
                  <span>{cfg?.emoji}</span> {t}
                </button>
              );
            })}
          </div>

          {/* Budget chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
              💰 Budget:
            </span>
            {BUDGET_RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setBudgetRange(i)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-200 ${budgetRange === i
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105"
                  : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:scale-105"
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results bar */}
        {!loading && (
          <div className="flex items-center justify-between mb-5 animate-fadeIn">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-800">{filtered.length}</span>{" "}
              destination{filtered.length !== 1 ? "s" : ""}
              {(search || activeType !== "All" || budgetRange !== 0) && (
                <button onClick={clearFilters} className="ml-2 text-brand-600 hover:underline text-xs font-medium">
                  Clear filters ✕
                </button>
              )}
            </p>
            <p className="text-xs text-slate-400 hidden sm:block">
              {apiDestinations.length > 0 ? "Live from your database" : "Showing curated picks"}
            </p>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((d, i) => (
              <DestinationCard key={d.id} d={d} index={i} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center animate-scaleIn">
            <p className="text-6xl mb-4">🗺️</p>
            <p className="text-slate-700 font-semibold text-lg">No destinations found</p>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              Try adjusting your search or filters.
            </p>
            <button
              onClick={clearFilters}
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow transition-all active:scale-95"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Bottom CTA */}
        {!loading && filtered.length > 0 && (
          <div className="mt-10 bg-gradient-to-r from-brand-600 to-indigo-700 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeInUp shadow-lg">
            <div className="text-white text-center sm:text-left">
              <p className="font-bold text-lg">Can't find your dream destination?</p>
              <p className="text-brand-100 text-sm mt-1">
                Create a fully custom trip with any destination you have in mind.
              </p>
            </div>
            <Link
              to="/trips/new"
              className="flex-shrink-0 bg-white text-brand-700 hover:bg-brand-50 font-bold text-sm px-6 py-3 rounded-xl shadow transition-all active:scale-95"
            >
              ✈️ Plan Custom Trip
            </Link>
          </div>
        )}
      </div>

      {/* Scroll-to-top button */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 w-11 h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg flex items-center justify-center text-lg transition-all active:scale-90 animate-scaleIn z-30"
          title="Back to top"
        >
          ↑
        </button>
      )}
    </div>
  );
}
