// Dashboard v2 — Power BI style — build trigger
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { tripApi } from "../api/tripApi";
import { userApi } from "../api/userApi";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import WeatherWidget from "../components/WeatherWidget";

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
);

/* ─── constants ─────────────────────────────────────────────── */
const STATUS_STYLE = {
  PLANNED: "bg-indigo-50  text-indigo-700  border-indigo-200",
  ONGOING: "bg-amber-50   text-amber-700   border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100  text-slate-500   border-slate-200",
};

const STATUS_COLORS = {
  PLANNED: "#6366f1",
  ONGOING: "#f59e0b",
  COMPLETED: "#10b981",
  CANCELLED: "#94a3b8",
};

const EXPENSE_COLORS = {
  TRANSPORTATION: "#6366f1",
  HOTEL: "#f59e0b",
  FOOD: "#10b981",
  SHOPPING: "#ec4899",
  ENTERTAINMENT: "#8b5cf6",
  MISCELLANEOUS: "#94a3b8",
};

const EXPENSE_ICONS = {
  TRANSPORTATION: "🚌",
  HOTEL: "🏨",
  FOOD: "🍜",
  SHOPPING: "🛍️",
  ENTERTAINMENT: "🎭",
  MISCELLANEOUS: "📦",
};

/* ─── helpers ────────────────────────────────────────────────── */
const formatDate = (v) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(new Date(v));
};

const formatINR = (v) => {
  if (!v && v !== 0) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(v));
};

const shortINR = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
};

/* ─── Reusable KPI card ──────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, accent, trend }) {
  return (
    <div className={`relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden`}>
      {/* accent bar top */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between mt-1">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl ${accent.replace("bg-", "bg-opacity-10 bg-")} bg-opacity-10`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-3 text-xs font-semibold flex items-center gap-1 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton block ─────────────────────────────────────────── */
const Skeleton = ({ h = "h-32" }) => (
  <div className={`${h} rounded-xl bg-slate-100 animate-pulse`} />
);

/* ─── Chart options ──────────────────────────────────────────── */
const doughnutOpts = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw}` } },
  },
};

const barOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => ` ${formatINR(c.raw)}` } },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 }, color: "#64748b" },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      ticks: {
        font: { size: 11 },
        color: "#94a3b8",
        callback: (v) => shortINR(v),
      },
      grid: { color: "#f1f5f9" },
    },
  },
};

const lineOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => ` ${c.raw} trip(s)` } },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 }, color: "#64748b" },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      ticks: { stepSize: 1, font: { size: 11 }, color: "#94a3b8" },
      grid: { color: "#f1f5f9" },
    },
  },
};

/* ─── Section header ─────────────────────────────────────────── */
function SectionHeader({ title, sub, action }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <div>
        <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [tripSummary, setTripSummary] = useState({
    totalTrips: 0, activePlans: 0, completedTrips: 0, plannedBudget: 0,
  });
  const [expenseSummaries, setExpenseSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    Promise.all([
      tripApi.getMyTrips(),
      tripApi.getSummary(),
      userApi.getUserCount(),
    ])
      .then(async ([tripsRes, summaryRes, countRes]) => {
        const tripList = tripsRes.data || [];
        setTrips(tripList);
        setTripSummary({
          totalTrips: Number(summaryRes.data?.totalTrips) || 0,
          activePlans: Number(summaryRes.data?.activePlans) || 0,
          completedTrips: Number(summaryRes.data?.completedTrips) || 0,
          plannedBudget: Number(summaryRes.data?.plannedBudget) || 0,
        });
        setUserCount(Number(countRes.data) || 0);

        const summaries = await Promise.all(
          tripList.slice(0, 5).map((t) =>
            tripApi.getExpenseSummary(t.id)
              .then((r) => ({ tripId: t.id, tripTitle: t.title, data: r.data }))
              .catch(() => null),
          ),
        );
        setExpenseSummaries(summaries.filter(Boolean));
      })
      .catch(() => setErrorMsg("Could not load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  /* ─── Derived ───────────────────────────────────────────────── */
  const upcomingTrips = useMemo(() =>
    [...trips]
      .filter((t) => t.status !== "CANCELLED")
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5),
    [trips]);

  const statusCounts = useMemo(() => {
    const m = { PLANNED: 0, ONGOING: 0, COMPLETED: 0, CANCELLED: 0 };
    trips.forEach((t) => { if (m[t.status] !== undefined) m[t.status]++; });
    return m;
  }, [trips]);

  const statusSegments = useMemo(() =>
    Object.entries(statusCounts).filter(([, v]) => v > 0),
    [statusCounts]);

  const aggregatedCategories = useMemo(() => {
    const totals = {};
    expenseSummaries.forEach(({ data }) => {
      if (!data?.categoryTotals) return;
      Object.entries(data.categoryTotals).forEach(([cat, amt]) => {
        totals[cat] = (totals[cat] || 0) + Number(amt);
      });
    });
    return Object.entries(totals)
      .map(([cat, value]) => ({
        label: cat.charAt(0) + cat.slice(1).toLowerCase(),
        value,
        color: EXPENSE_COLORS[cat] || "#94a3b8",
        icon: EXPENSE_ICONS[cat] || "📦",
        category: cat,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenseSummaries]);

  const totalSpent = aggregatedCategories.reduce((s, c) => s + c.value, 0);

  const budgetVsSpent = useMemo(() =>
    expenseSummaries.map((es) => {
      const trip = trips.find((t) => t.id === es.tripId);
      const budget = Number(trip?.budget) || 0;
      const spent = Number(es.data?.totalSpent) || 0;
      const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
      return { title: es.tripTitle, budget, spent, pct };
    }),
    [expenseSummaries, trips]);

  /* ─── Trips-over-months line chart ──────────────────────────── */
  const tripsOverMonths = useMemo(() => {
    const months = {};
    trips.forEach((t) => {
      if (!t.startDate) return;
      const key = new Date(t.startDate)
        .toLocaleString("en-IN", { month: "short", year: "2-digit" });
      months[key] = (months[key] || 0) + 1;
    });
    const sorted = Object.entries(months).sort(
      ([a], [b]) => new Date("1 " + a) - new Date("1 " + b),
    );
    return {
      labels: sorted.map(([k]) => k),
      values: sorted.map(([, v]) => v),
    };
  }, [trips]);

  /* ─── Chart datasets ─────────────────────────────────────────── */
  const doughnutData = {
    labels: statusSegments.map(([l]) => l),
    datasets: [{
      data: statusSegments.map(([, v]) => v),
      backgroundColor: statusSegments.map(([l]) => STATUS_COLORS[l]),
      borderWidth: 3,
      borderColor: "#fff",
      hoverOffset: 8,
    }],
  };

  const expenseBarData = {
    labels: aggregatedCategories.map((c) => c.label),
    datasets: [{
      data: aggregatedCategories.map((c) => c.value),
      backgroundColor: aggregatedCategories.map((c) => c.color + "cc"),
      borderColor: aggregatedCategories.map((c) => c.color),
      borderWidth: 1.5,
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  const lineData = {
    labels: tripsOverMonths.labels,
    datasets: [{
      data: tripsOverMonths.values,
      borderColor: "#6366f1",
      backgroundColor: "rgba(99,102,241,0.08)",
      fill: true,
      tension: 0.4,
      pointBackgroundColor: "#6366f1",
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  /* ─── KPI cards config ───────────────────────────────────────── */
  const kpis = [
    {
      icon: "🗺️",
      label: "Total Trips",
      value: tripSummary.totalTrips,
      sub: "All your journeys",
      accent: "bg-indigo-500",
    },
    {
      icon: "✈️",
      label: "Active Plans",
      value: tripSummary.activePlans,
      sub: "Planned + Ongoing",
      accent: "bg-amber-500",
    },
    {
      icon: "✅",
      label: "Completed",
      value: tripSummary.completedTrips,
      sub: "Successfully finished",
      accent: "bg-emerald-500",
    },
    {
      icon: "👤",
      label: "Platform Users",
      value: userCount,
      sub: "Total registered",
      accent: "bg-violet-500",
    },
    {
      icon: "💰",
      label: "Planned Budget",
      value: shortINR(tripSummary.plannedBudget),
      sub: formatINR(tripSummary.plannedBudget),
      accent: "bg-rose-500",
    },
  ];

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Power BI-style header banner ── */}
      <div className="bg-gradient-to-r from-[#1a2340] via-[#1e3a8a] to-[#2563eb] text-white px-6 py-8 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300 mb-1">
              📊 TripNest Analytics Dashboard
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName?.split(" ")[0] || "Traveller"} 👋
            </h1>
            <p className="text-blue-200 text-sm mt-1">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>
          <Link
            to="/trips/new"
            className="self-start md:self-auto bg-white text-brand-700 hover:bg-blue-50 font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg transition active:scale-95"
          >
            + New Trip
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {errorMsg && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {loading
            ? [...Array(5)].map((_, i) => <Skeleton key={i} h="h-28" />)
            : kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* ── Row 1: Upcoming trips + Status donut + Quick actions ── */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-5 mb-5">

          {/* Upcoming trips table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <SectionHeader
              title="Upcoming Trips"
              sub="Your active and planned journeys"
              action={
                <Link to="/trips" className="text-xs font-semibold text-brand-600 hover:underline">
                  See all →
                </Link>
              }
            />
            {loading ? (
              <div className="p-5 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} h="h-12" />)}
              </div>
            ) : upcomingTrips.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-5xl mb-3">✈️</p>
                <p className="font-semibold text-slate-700">No trips yet</p>
                <p className="text-sm text-slate-400 mt-1 mb-5">
                  Create your first trip to get started.
                </p>
                <Link
                  to="/trips/new"
                  className="inline-block text-sm font-bold bg-brand-600 text-white px-5 py-2 rounded-xl hover:bg-brand-700 transition"
                >
                  Plan a trip →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-5 py-3 text-left font-semibold">Trip</th>
                      <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Destination</th>
                      <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">Dates</th>
                      <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Budget</th>
                      <th className="px-5 py-3 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingTrips.map((trip) => (
                      <tr
                        key={trip.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => window.location.href = `/trips/${trip.id}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-base flex-shrink-0">
                              🗺️
                            </div>
                            <span className="font-medium text-slate-800 truncate max-w-[140px]">
                              {trip.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                          {trip.destination}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-xs hidden md:table-cell whitespace-nowrap">
                          {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-700 hidden lg:table-cell">
                          {trip.budget ? shortINR(trip.budget) : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[trip.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">

            {/* Status donut */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <SectionHeader title="Trip Status Overview" />
              <div className="p-5">
                {loading ? (
                  <Skeleton h="h-28" />
                ) : trips.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No trips yet</p>
                ) : (
                  <div className="flex items-center gap-5">
                    <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                      <Doughnut data={doughnutData} options={doughnutOpts} />
                    </div>
                    <div className="space-y-2 flex-1">
                      {statusSegments.map(([label, count]) => (
                        <div key={label} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: STATUS_COLORS[label] }}
                          />
                          <span className="text-xs text-slate-500 flex-1">{label}</span>
                          <span className="text-xs font-bold text-slate-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <SectionHeader title="Quick Actions" />
              <div className="p-4 space-y-2">
                {[
                  { to: "/trips/new", label: "Create travel plan", icon: "➕" },
                  { to: "/destinations", label: "Explore destinations", icon: "🌍" },
                  { to: "/groups", label: "Manage groups", icon: "👥" },
                  { to: "/notifications", label: "View notifications", icon: "🔔" },
                  { to: "/profile", label: "Update profile", icon: "👤" },
                ].map((a) => (
                  <Link
                    key={a.to}
                    to={a.to}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{a.icon}</span>
                      {a.label}
                    </span>
                    <span className="text-slate-300 text-base">›</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Analytics charts ── */}
        <div className="grid lg:grid-cols-3 gap-5 mb-5">

          {/* Expense breakdown bar */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <SectionHeader
              title="Expense Breakdown"
              sub="Spending distribution across your trips"
              action={
                totalSpent > 0 && (
                  <span className="text-sm font-extrabold text-emerald-600">
                    {formatINR(totalSpent)}
                  </span>
                )
              }
            />
            <div className="p-5">
              {loading ? (
                <Skeleton h="h-44" />
              ) : aggregatedCategories.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-2">💸</p>
                  <p className="font-semibold text-slate-600">No expenses recorded</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Add expenses to trips to see the breakdown.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ height: 180 }}>
                    <Bar data={expenseBarData} options={barOpts} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-3 border-t border-slate-100">
                    {aggregatedCategories.map((c) => (
                      <div key={c.category} className="flex items-center gap-1.5 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-slate-500">{c.icon} {c.label}</span>
                        <span className="font-bold text-slate-700">{shortINR(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Budget vs Spent */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <SectionHeader title="Budget Utilisation" sub="Per trip spending vs. budget" />
            <div className="p-5">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} h="h-10" />)}
                </div>
              ) : budgetVsSpent.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-2">📊</p>
                  <p className="font-semibold text-slate-600">No budget data</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Set a budget on trips to track spending.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {budgetVsSpent.map((b) => {
                    const barColor =
                      b.pct >= 90 ? "bg-red-500"
                        : b.pct >= 70 ? "bg-amber-500"
                          : "bg-emerald-500";
                    return (
                      <div key={b.title}>
                        <div className="flex justify-between items-baseline mb-1">
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[55%]">
                            {b.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            <span className={`font-bold ${b.pct >= 90 ? "text-red-500" : "text-emerald-600"}`}>
                              {shortINR(b.spent)}
                            </span>
                            {b.budget > 0 && ` / ${shortINR(b.budget)}`}
                          </p>
                        </div>
                        {b.budget > 0 ? (
                          <>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${barColor} transition-all duration-700`}
                                style={{ width: `${b.pct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 text-right">
                              {b.pct.toFixed(0)}% used
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-400">No budget set</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 3: Trips over time line chart ── */}
        {trips.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-5">
            <SectionHeader
              title="Trips Over Time"
              sub="Monthly trip frequency trend"
            />
            <div className="p-5">
              {loading ? (
                <Skeleton h="h-36" />
              ) : tripsOverMonths.labels.length < 2 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Need trips across multiple months to display trend.
                </p>
              ) : (
                <div style={{ height: 140 }}>
                  <Line data={lineData} options={lineOpts} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Weather ── */}
        {!loading && upcomingTrips.length > 0 && upcomingTrips[0].destination && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              🌤️ Weather at Next Destination —{" "}
              <span className="text-brand-600">{upcomingTrips[0].destination}</span>
            </h2>
            <WeatherWidget city={upcomingTrips[0].destination} />
          </div>
        )}

        {/* ── CTA banner ── */}
        {!loading && (
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-[#1a2340] via-[#1e3a8a] to-[#2563eb] p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="text-white text-center sm:text-left">
                <p className="font-extrabold text-lg leading-tight">
                  {trips.length === 0
                    ? "Start your first adventure today 🌏"
                    : "Ready for your next adventure? ✈️"}
                </p>
                <p className="text-blue-200 text-sm mt-1">
                  {trips.length === 0
                    ? "Plan, track and share trips — all in one place."
                    : "Explore destinations, plan a trip, or invite friends."}
                </p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Link
                  to="/trips/new"
                  className="bg-white text-brand-700 hover:bg-blue-50 font-bold text-sm px-5 py-2.5 rounded-xl shadow transition active:scale-95"
                >
                  Plan New Trip
                </Link>
                <Link
                  to="/destinations"
                  className="bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow transition active:scale-95"
                >
                  Explore
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
