import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { tripApi } from "../api/tripApi";
import {
  inviteTraveler,
  getTripInvitations,
} from "../api/tripInvitationApi";
import { getDocuments, uploadDocument, deleteDocument } from "../api/documentApi";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";

/* ── Constants ──────────────────────────────────────────────── */
const ACTIVITY_TYPES = [
  ["SIGHTSEEING", "🏛  Sightseeing"],
  ["TRANSPORTATION", "🚌  Transportation"],
  ["ACCOMMODATION", "🏨  Accommodation"],
  ["DINING", "🍜  Dining"],
  ["ADVENTURE", "🧗  Adventure"],
  ["SHOPPING", "🛍  Shopping"],
  ["OTHER", "📍  Other"],
];

const EXPENSE_CATS = ["Food", "Stay", "Transport", "Tickets", "Shopping", "Other"];

const ACTIVITY_COLORS = {
  SIGHTSEEING: "#6366f1", TRANSPORTATION: "#f59e0b", ACCOMMODATION: "#10b981",
  DINING: "#ec4899", ADVENTURE: "#ef4444", SHOPPING: "#8b5cf6", OTHER: "#64748b",
};

const ACTIVITY_ICONS = {
  SIGHTSEEING: "🏛", TRANSPORTATION: "🚌", ACCOMMODATION: "🏨",
  DINING: "🍜", ADVENTURE: "🧗", SHOPPING: "🛍", OTHER: "📍",
};

const EMPTY_ITINERARY = {
  title: "", activityDate: "", startTime: "", endTime: "",
  activityType: "SIGHTSEEING", location: "", placeAddress: "",
  lat: "", lng: "", reminderAt: "", notes: "",
};

const EMPTY_EXPENSE = {
  title: "", amount: "", category: "Food", expenseDate: "", notes: "",
};

const DOC_TYPES = ["TICKET", "HOTEL_BOOKING", "PASSPORT", "VISA", "INSURANCE", "PHOTO", "OTHER"];
const DOC_ICONS = { TICKET: "🎫", HOTEL_BOOKING: "🏨", PASSPORT: "🛂", VISA: "📋", INSURANCE: "🛡️", PHOTO: "📷", OTHER: "📄" };
const CAT_COLORS = {
  Food: "#10b981", Stay: "#6366f1", Transport: "#f59e0b",
  Tickets: "#8b5cf6", Shopping: "#ec4899", Other: "#64748b",
};

/* Simple conic-gradient donut — no deps */
function BudgetDonut({ spent, budget, size = 100 }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget > 0 && spent > budget;
  const color = over ? "#ef4444" : pct > 80 ? "#f59e0b" : "#10b981";
  const bg = "#e2e8f0";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-full flex items-center justify-center" style={{
        width: size, height: size,
        background: `conic-gradient(${color} 0% ${pct}%, ${bg} ${pct}% 100%)`,
      }}>
        <div className="bg-white rounded-full flex flex-col items-center justify-center"
          style={{ width: size * 0.62, height: size * 0.62 }}>
          <span className="text-lg font-extrabold" style={{ color }}>{Math.round(pct)}%</span>
          <span className="text-[9px] text-slate-400">used</span>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────── */
const fmtMoney = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const fmtDate = (v) => v ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v)) : "—";


/* ── Geocode via Nominatim (free, no key) ───────────────────── */
async function geocodeAddress(query) {
  if (!query || query.trim().length < 3) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

/* ── GPS Picker button ──────────────────────────────────────── */
function GpsPicker({ onGot, disabled }) {
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const pick = () => {
    if (!navigator.geolocation) { setState("error"); return; }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => { onGot(pos.coords.latitude, pos.coords.longitude); setState("done"); },
      () => setState("error"),
      { timeout: 8000 }
    );
  };
  return (
    <button type="button" onClick={pick} disabled={disabled || state === "loading"}
      title="Use my current GPS location"
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${state === "done" ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
        state === "error" ? "bg-red-50 border-red-300 text-red-600" :
          "bg-white border-slate-300 text-slate-600 hover:border-brand-400 hover:text-brand-600"
        }`}>
      {state === "loading" ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg> : "📍"}
      {state === "loading" ? "Locating…" : state === "done" ? "Located ✓" : state === "error" ? "GPS failed" : "Use GPS"}
    </button>
  );
}


/* ── Activity card in timeline ──────────────────────────────── */
function TimelineItem({ item, index, total, onDelete }) {
  const color = ACTIVITY_COLORS[item.activityType] || "#64748b";
  const icon = ACTIVITY_ICONS[item.activityType] || "📍";
  const hasCoords = item.lat && item.lng;

  return (
    <div className="flex gap-4 animate-fadeInUp" style={{ animationDelay: `${index * 0.06}s` }}>
      {/* Connector */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md border-2 border-white"
          style={{ background: color }}>
          {icon}
        </div>
        {index < total - 1 && <div className="w-0.5 flex-1 mt-1 mb-1" style={{ background: `${color}40` }} />}
      </div>

      {/* Card */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{item.title}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                style={{ background: color }}>
                {icon} {item.activityType?.charAt(0) + item.activityType?.slice(1).toLowerCase()}
              </span>
              {item.startTime && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  🕐 {item.startTime}{item.endTime ? ` – ${item.endTime}` : ""}
                </span>
              )}
            </div>
            {item.location && (
              <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1">
                📍 {item.location}
                {item.placeAddress && <span className="text-slate-400">· {item.placeAddress}</span>}
              </p>
            )}
            {hasCoords && (
              <a href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand-600 hover:underline font-medium">
                🗺 View on Google Maps
              </a>
            )}
            {item.reminderAt && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                🔔 Reminder: {new Date(item.reminderAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
            {item.notes && <p className="text-sm text-slate-500 mt-1.5 italic">{item.notes}</p>}
          </div>
          <button onClick={() => onDelete(item.id)}
            className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}


/* ── Main component ─────────────────────────────────────────── */
export default function TripDetail() {
  const { id } = useParams();
  // useAuth available for future owner-check features
  const { user: _user } = useAuth(); // eslint-disable-line no-unused-vars

  const [trip, setTrip] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expReport, setExpReport] = useState({ totalSpent: 0, categoryTotals: {} });
  const [invitations, setInvitations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState(null);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState(null);
  const [inviteSending, setInviteSending] = useState(false);
  // Budget editing state
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);
  // Document upload state
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState("OTHER");
  const [docDesc, setDocDesc] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [iForm, setIForm] = useState(EMPTY_ITINERARY);
  const [eForm, setEForm] = useState(EMPTY_EXPENSE);
  const [savingI, setSavingI] = useState(false);
  const [savingE, setSavingE] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [miniMapCoords, setMiniMapCoords] = useState(null);

  /* ── Load ── */
  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      tripApi.getTrip(id),
      tripApi.getItinerary(id),
      tripApi.getExpenses(id),
      tripApi.getExpenseSummary(id),
    ]).then(([tr, it, ex, er]) => {
      setTrip(tr.data);
      const sorted = (it.data || []).sort((a, b) =>
        `${a.activityDate || ""}${a.startTime || ""}`.localeCompare(`${b.activityDate || ""}${b.startTime || ""}`));
      setItinerary(sorted);
      setExpenses(ex.data || []);
      setExpReport({
        totalSpent: Number(er.data?.totalSpent) || 0,
        plannedBudget: er.data?.plannedBudget ?? null,
        remainingBudget: er.data?.remainingBudget ?? null,
        categoryTotals: er.data?.categoryTotals || {},
      });
      setIForm(f => ({ ...f, activityDate: f.activityDate || tr.data.startDate || "" }));
      setEForm(f => ({ ...f, expenseDate: f.expenseDate || tr.data.startDate || "" }));
    }).catch(() => setErrMsg("Could not load this trip."))
      .finally(() => setLoading(false));

    // Also load invitations separately (don't block main load if it fails)
    getTripInvitations(id)
      .then(r => setInvitations(r.data || []))
      .catch(() => { });
    // Load documents
    getDocuments(id).then(r => setDocuments(r.data || [])).catch(() => { });
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Derived ── */
  const expenseTotal = useMemo(() =>
    Number(expReport.totalSpent) ||
    expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [expReport.totalSpent, expenses]);

  const remaining = useMemo(() =>
    trip?.budget ? Number(trip.budget) - expenseTotal : null,
    [trip, expenseTotal]);

  const itineraryByDay = useMemo(() =>
    itinerary.reduce((acc, item) => {
      const d = item.activityDate || "Unscheduled";
      return { ...acc, [d]: [...(acc[d] || []), item] };
    }, {}),
    [itinerary]);

  /* Map markers for timeline — only items that have lat/lng */
  const mapMarkers = useMemo(() =>
    itinerary
      .filter(i => i.lat && i.lng)
      .map((i, idx) => ({
        lat: parseFloat(i.lat), lng: parseFloat(i.lng),
        label: i.title, sublabel: i.location,
        time: i.startTime, type: i.activityType, index: idx,
      })),
    [itinerary]);


  /* ── GPS handler ── */
  const handleGps = (lat, lng) => {
    setIForm(f => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    setMiniMapCoords({ lat, lng });
  };

  /* ── Geocode address ── */
  const handleGeocode = async () => {
    const query = `${iForm.location} ${iForm.placeAddress} ${trip?.destination || ""}`.trim();
    setGeocoding(true);
    const coords = await geocodeAddress(query);
    if (coords) {
      setIForm(f => ({ ...f, lat: coords.lat.toFixed(6), lng: coords.lng.toFixed(6) }));
      setMiniMapCoords(coords);
    } else {
      alert("Could not geocode this address. Try a more specific name.");
    }
    setGeocoding(false);
  };

  /* ── Submit itinerary ── */
  const handleItinerarySubmit = async (e) => {
    e.preventDefault();
    setSavingI(true);
    try {
      const payload = {
        ...iForm,
        startTime: iForm.startTime || null,
        endTime: iForm.endTime || null,
        reminderAt: iForm.reminderAt || null,
        lat: iForm.lat ? parseFloat(iForm.lat) : null,
        lng: iForm.lng ? parseFloat(iForm.lng) : null,
      };
      const res = await tripApi.addItineraryItem(id, payload);
      setItinerary(prev =>
        [...prev, res.data].sort((a, b) =>
          `${a.activityDate || ""}${a.startTime || ""}`.localeCompare(`${b.activityDate || ""}${b.startTime || ""}`)));
      setIForm({ ...EMPTY_ITINERARY, activityDate: iForm.activityDate });
      setMiniMapCoords(null);
    } catch (err) {
      alert(err.response?.data?.message || "Could not add activity.");
    } finally { setSavingI(false); }
  };

  /* ── Submit expense ── */
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setSavingE(true);
    try {
      const res = await tripApi.addExpense(id, { ...eForm, amount: Number(eForm.amount) });
      setExpenses(prev => [res.data, ...prev]);
      const er = await tripApi.getExpenseSummary(id);
      setExpReport({
        totalSpent: Number(er.data?.totalSpent) || 0,
        plannedBudget: er.data?.plannedBudget ?? null,
        remainingBudget: er.data?.remainingBudget ?? null,
        categoryTotals: er.data?.categoryTotals || {}
      });
      setEForm({ ...EMPTY_EXPENSE, expenseDate: eForm.expenseDate });
    } catch (err) {
      alert(err.response?.data?.message || "Could not add expense.");
    } finally { setSavingE(false); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Delete this activity?")) return;
    await tripApi.deleteItineraryItem(id, itemId);
    setItinerary(prev => prev.filter(i => i.id !== itemId));
  };

  const handleDeleteExpense = async (expId) => {
    if (!window.confirm("Delete this expense?")) return;
    await tripApi.deleteExpense(id, expId);
    setExpenses(prev => prev.filter(e => e.id !== expId));
    const er = await tripApi.getExpenseSummary(id);
    setExpReport({
      totalSpent: Number(er.data?.totalSpent) || 0,
      plannedBudget: er.data?.plannedBudget ?? null,
      remainingBudget: er.data?.remainingBudget ?? null,
      categoryTotals: er.data?.categoryTotals || {}
    });
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteMsg(null);
    setInviteSending(true);
    try {
      const res = await inviteTraveler(id, inviteEmail);
      setInvitations(prev => {
        const filtered = prev.filter(i => i.id !== res.data.id);
        return [res.data, ...filtered];
      });
      setInviteMsg({ type: "success", text: `Invitation sent to ${inviteEmail}! They'll see it in their notifications.` });
      setInviteEmail("");
    } catch (err) {
      setInviteMsg({ type: "error", text: err?.response?.data?.message || "Could not send invitation." });
    } finally {
      setInviteSending(false);
    }
  };

  /* ── Save budget ── */
  const handleSaveBudget = async () => {
    if (!budgetInput || isNaN(Number(budgetInput))) return;
    setSavingBudget(true);
    try {
      // Build minimal update — keep existing trip fields, only change budget
      const res = await tripApi.updateTrip(id, {
        title: trip.title, destination: trip.destination,
        startDate: trip.startDate, endDate: trip.endDate,
        budget: Number(budgetInput), description: trip.description, status: trip.status,
      });
      setTrip(res.data);
      setEditingBudget(false);
      // Refresh expense summary
      const er = await tripApi.getExpenseSummary(id);
      setExpReport({ totalSpent: Number(er.data?.totalSpent) || 0, plannedBudget: er.data?.plannedBudget ?? null, remainingBudget: er.data?.remainingBudget ?? null, categoryTotals: er.data?.categoryTotals || {} });
    } catch (err) {
      alert(err?.response?.data?.message || "Could not update budget.");
    } finally {
      setSavingBudget(false);
    }
  };

  /* ── Upload document ── */
  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docFile) return;
    setUploadingDoc(true);
    try {
      const res = await uploadDocument(id, docFile, docType, docDesc);
      setDocuments(prev => [res.data, ...prev]);
      setDocFile(null); setDocDesc(""); setDocType("OTHER");
      e.target.reset();
    } catch (err) {
      alert(err?.response?.data?.message || "Upload failed. Max size is 20 MB.");
    } finally {
      setUploadingDoc(false);
    }
  };

  /* ── Delete document ── */
  const handleDocDelete = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await deleteDocument(id, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert(err?.response?.data?.message || "Could not delete document.");
    }
  };


  /* ── Early returns ── */
  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center animate-fadeIn">
      <svg className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="text-slate-500">Loading trip…</p>
    </div>
  );

  if (errMsg) return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <p className="text-4xl mb-3">⚠️</p>
      <p className="text-red-600 font-medium">{errMsg}</p>
      <Link to="/trips" className="mt-4 inline-block text-brand-600 hover:underline text-sm">← Back to trips</Link>
    </div>
  );

  if (!trip) return null;

  const TABS = [
    { id: "itinerary", label: "📅 Itinerary", count: itinerary.length },
    { id: "timeline", label: "🗺 Timeline & Map", count: mapMarkers.length },
    { id: "budget", label: "💰 Budget", count: null },
    { id: "expenses", label: "🧾 Expenses", count: expenses.length },
    { id: "documents", label: "📁 Documents", count: documents.length },
    { id: "sharing", label: "👥 Sharing", count: invitations.length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fadeIn">
      <Link to="/trips" className="text-sm text-brand-600 hover:underline mb-5 inline-flex items-center gap-1">
        ← Back to trips
      </Link>

      {/* ── Trip header ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 animate-fadeInDown">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{trip.title}</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-1">📍 {trip.destination}</p>
          </div>
          <Link to={`/trips/${trip.id}/edit`}
            className="text-sm font-semibold text-brand-600 hover:underline border border-brand-200 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors">
            Edit Trip
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            { label: "Dates", val: `${fmtDate(trip.startDate)} → ${fmtDate(trip.endDate)}` },
            { label: "Status", val: trip.status },
            { label: "Budget", val: trip.budget ? fmtMoney(trip.budget) : "Not set" },
            { label: "Spent", val: fmtMoney(expenseTotal) },
            { label: "Remaining", val: remaining === null ? "No budget" : fmtMoney(remaining), red: remaining !== null && remaining < 0 },
            { label: "Organiser", val: trip.ownerName },
            { label: "Travellers", val: trip.travelerCount },
            { label: "Activities", val: itinerary.length },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-slate-400 mb-0.5">{s.label}</p>
              <p className={`font-semibold text-sm ${s.red ? "text-red-600" : "text-slate-800"}`}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Budget progress bar */}
        {trip.budget && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Budget used</span>
              <span>{Math.min(100, Math.round((expenseTotal / Number(trip.budget)) * 100))}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${expenseTotal > Number(trip.budget) ? "bg-red-500" :
                expenseTotal / Number(trip.budget) > 0.8 ? "bg-amber-400" : "bg-emerald-500"
                }`} style={{ width: `${Math.min(100, (expenseTotal / Number(trip.budget)) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>


      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-200 mb-6 gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t.id
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
            {t.label}
            {t.count !== undefined && (
              <span className={`text-[11px] rounded-full px-1.5 py-0.5 font-semibold ${activeTab === t.id ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB: ITINERARY (form + day-grouped list)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === "itinerary" && (
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-1">Add Activity</h2>
            <p className="text-sm text-slate-500 mb-5">
              Schedule an activity with optional GPS location and reminder.
            </p>

            <form onSubmit={handleItinerarySubmit} className="space-y-3">
              {/* Title + type */}
              <div className="grid sm:grid-cols-2 gap-3">
                <input required placeholder="Activity title"
                  value={iForm.title} onChange={e => setIForm(f => ({ ...f, title: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <select value={iForm.activityType} onChange={e => setIForm(f => ({ ...f, activityType: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {ACTIVITY_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              {/* Date + times */}
              <div className="grid grid-cols-3 gap-3">
                <input type="date" required value={iForm.activityDate}
                  onChange={e => setIForm(f => ({ ...f, activityDate: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <input type="time" placeholder="Start" value={iForm.startTime}
                  onChange={e => setIForm(f => ({ ...f, startTime: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <input type="time" placeholder="End" value={iForm.endTime}
                  onChange={e => setIForm(f => ({ ...f, endTime: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              {/* Location */}
              <input placeholder="Place name (e.g. Eiffel Tower)"
                value={iForm.location} onChange={e => setIForm(f => ({ ...f, location: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <input placeholder="Address or area"
                value={iForm.placeAddress} onChange={e => setIForm(f => ({ ...f, placeAddress: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />

              {/* GPS row */}
              <div className="flex flex-wrap gap-2 items-center">
                <GpsPicker onGot={handleGps} />
                <button type="button" onClick={handleGeocode} disabled={geocoding}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-all disabled:opacity-60">
                  {geocoding
                    ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> Geocoding…</>
                    : "🌐 Geocode Address"}
                </button>
                {(iForm.lat && iForm.lng) && (
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg font-mono">
                    {parseFloat(iForm.lat).toFixed(4)}, {parseFloat(iForm.lng).toFixed(4)}
                  </span>
                )}
              </div>

              {/* Mini map preview */}
              {miniMapCoords && (
                <div className="animate-scaleIn">
                  <p className="text-xs text-slate-500 mb-1">📍 Location preview</p>
                  <MapView markers={[{ lat: miniMapCoords.lat, lng: miniMapCoords.lng, label: iForm.location || "Selected location", type: iForm.activityType }]}
                    height="180px" zoom={14} />
                </div>
              )}

              {/* Reminder */}
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">🔔 Activity Reminder</label>
                <input type="datetime-local" value={iForm.reminderAt}
                  onChange={e => setIForm(f => ({ ...f, reminderAt: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              <textarea rows={2} placeholder="Notes (optional)" value={iForm.notes}
                onChange={e => setIForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />

              <button type="submit" disabled={savingI}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm shadow transition-all active:scale-[0.98]">
                {savingI ? "Adding…" : "Add Activity"}
              </button>
            </form>
          </div>

          {/* Day-grouped list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-y-auto max-h-[760px]">
            <h2 className="font-bold text-slate-900 mb-4">
              Activities <span className="text-slate-400 font-normal text-sm">({itinerary.length})</span>
            </h2>
            {itinerary.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl mb-2">📅</p>
                <p className="text-slate-500 text-sm">No activities yet. Add your first one!</p>
              </div>
            ) : (
              Object.entries(itineraryByDay).map(([day, items], di) => (
                <div key={day} className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-slate-100" />
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600 px-2">
                      Day {di + 1} · {fmtDate(day)}
                    </span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  {items.map(item => (
                    <div key={item.id} className="mb-3 pl-3 border-l-2 border-brand-100 hover:border-brand-400 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                            <span>{ACTIVITY_ICONS[item.activityType] || "📍"}</span> {item.title}
                          </p>
                          {item.startTime && <p className="text-xs text-slate-400 mt-0.5">🕐 {item.startTime}{item.endTime ? ` – ${item.endTime}` : ""}</p>}
                          {item.location && <p className="text-xs text-slate-500 mt-0.5">📍 {item.location}</p>}
                          {item.lat && item.lng && (
                            <p className="text-[11px] text-emerald-600 mt-0.5 font-mono">
                              GPS: {parseFloat(item.lat).toFixed(4)}, {parseFloat(item.lng).toFixed(4)}
                            </p>
                          )}
                          {item.reminderAt && (
                            <p className="text-xs text-amber-600 mt-0.5">🔔 {new Date(item.reminderAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</p>
                          )}
                        </div>
                        <button onClick={() => handleDeleteItem(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 flex-shrink-0 px-2 py-1 border border-red-200 hover:bg-red-50 rounded-lg">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════
          TAB: TRAVEL TIMELINE + MAP ROUTE
      ═══════════════════════════════════════════════════════ */}
      {activeTab === "timeline" && (
        <div className="space-y-6">

          {/* Full-width map */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-slate-900">Route Map</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {mapMarkers.length > 0
                    ? `${mapMarkers.length} pinned location${mapMarkers.length !== 1 ? "s" : ""} — dashed line shows your travel route`
                    : "Add GPS coordinates to activities to see them here"}
                </p>
              </div>
              {mapMarkers.length > 0 && (
                <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                  {mapMarkers.length} stop{mapMarkers.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {mapMarkers.length === 0 ? (
              <div className="h-64 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">🗺</span>
                <div className="text-center">
                  <p className="font-medium text-slate-600 text-sm">No locations pinned yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Use "Use GPS" or "Geocode Address" when adding activities to pin them on the map.
                  </p>
                </div>
                <button onClick={() => setActiveTab("itinerary")}
                  className="text-xs font-medium text-brand-600 hover:underline">
                  → Add activity with location
                </button>
              </div>
            ) : (
              <MapView
                markers={mapMarkers}
                drawRoute={mapMarkers.length > 1}
                height="380px"
                className="shadow-sm"
              />
            )}

            {/* Legend */}
            {mapMarkers.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
                {Object.entries(ACTIVITY_ICONS).map(([type, icon]) => {
                  const hasType = mapMarkers.some(m => m.type === type);
                  if (!hasType) return null;
                  return (
                    <span key={type} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ background: ACTIVITY_COLORS[type] }} />
                      {icon} {type.charAt(0) + type.slice(1).toLowerCase()}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline cards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-5">
              Travel Timeline
              <span className="ml-2 text-sm font-normal text-slate-400">
                {itinerary.length} activit{itinerary.length !== 1 ? "ies" : "y"}
              </span>
            </h2>

            {itinerary.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-5xl mb-3">🗓</p>
                <p className="font-medium text-slate-600">Timeline is empty</p>
                <p className="text-sm text-slate-400 mt-1">Add activities in the Itinerary tab to build your timeline.</p>
              </div>
            ) : (
              <div>
                {Object.entries(itineraryByDay).map(([day, items], di) => (
                  <div key={day}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-md">
                        <span className="text-[10px] font-semibold">DAY</span>
                        <span className="text-base font-extrabold leading-none">{di + 1}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{fmtDate(day)}</p>
                        <p className="text-xs text-slate-400">{items.length} activit{items.length !== 1 ? "ies" : "y"}</p>
                      </div>
                    </div>
                    <div className="ml-5">
                      {items.map((item, i) => (
                        <TimelineItem key={item.id} item={item}
                          index={i} total={items.length} onDelete={handleDeleteItem} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════
          TAB: EXPENSES
      ═══════════════════════════════════════════════════════ */}
      {activeTab === "expenses" && (
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          {/* Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-1">Add Expense</h2>
            <p className="text-sm text-slate-500 mb-5">Record spending for this trip.</p>

            <form onSubmit={handleExpenseSubmit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input required placeholder="Expense title" value={eForm.title}
                  onChange={e => setEForm(f => ({ ...f, title: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
                  <input type="number" min="0.01" step="0.01" required placeholder="Amount"
                    value={eForm.amount} onChange={e => setEForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <select value={eForm.category} onChange={e => setEForm(f => ({ ...f, category: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="date" required value={eForm.expenseDate}
                  onChange={e => setEForm(f => ({ ...f, expenseDate: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <textarea rows={2} placeholder="Notes (optional)" value={eForm.notes}
                onChange={e => setEForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              <button type="submit" disabled={savingE}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm shadow transition-all active:scale-[0.98]">
                {savingE ? "Adding…" : "Add Expense"}
              </button>
            </form>
          </div>

          {/* Summary + list */}
          <div className="space-y-4">
            {/* Summary card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-3">Budget Summary</h2>
              <div className="space-y-2 text-sm">
                {[
                  { l: "Planned", v: trip.budget ? fmtMoney(trip.budget) : "Not set" },
                  { l: "Spent", v: fmtMoney(expenseTotal) },
                  { l: "Remaining", v: remaining === null ? "No budget" : fmtMoney(remaining), red: remaining !== null && remaining < 0 },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-500">{r.l}</span>
                    <span className={`font-semibold ${r.red ? "text-red-600" : "text-slate-800"}`}>{r.v}</span>
                  </div>
                ))}
              </div>
              {Object.keys(expReport.categoryTotals || {}).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">By Category</p>
                  {Object.entries(expReport.categoryTotals).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between text-sm">
                      <span className="text-slate-500">{cat}</span>
                      <span className="font-medium text-slate-800">{fmtMoney(amt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expense list */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm max-h-80 overflow-y-auto">
              <h2 className="font-bold text-slate-900 mb-3">Expenses ({expenses.length})</h2>
              {expenses.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No expenses yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {expenses.map(ex => (
                    <div key={ex.id} className="py-3 flex justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{ex.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{ex.category} · {ex.expenseDate}</p>
                        {ex.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{ex.notes}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-800">{fmtMoney(ex.amount)}</p>
                        <button onClick={() => handleDeleteExpense(ex.id)}
                          className="text-xs text-red-500 hover:underline mt-0.5">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Expense split per person ── */}
          {(trip.travelerCount || 1) > 1 && expenses.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
              <h3 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                👥 Split Summary
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                {[
                  { l: "Total Spent", v: fmtMoney(expenseTotal) },
                  { l: "Travellers", v: trip.travelerCount || 1 },
                  { l: "Per Person", v: fmtMoney(expenseTotal / (trip.travelerCount || 1)) },
                ].map(s => (
                  <div key={s.l} className="bg-white rounded-xl p-2.5">
                    <p className="font-extrabold text-emerald-700">{s.v}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB: BUDGET
      ═══════════════════════════════════════════════════════ */}
      {activeTab === "budget" && (
        <div className="space-y-6">
          {/* Budget overview card */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Donut + figures */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center gap-4">
              <BudgetDonut spent={expenseTotal} budget={Number(trip.budget) || 0} size={110} />
              <div className="w-full space-y-2 text-sm">
                {[
                  { l: "Planned Budget", v: trip.budget ? fmtMoney(trip.budget) : "Not set", cls: "text-brand-600 font-bold" },
                  { l: "Total Spent", v: fmtMoney(expenseTotal), cls: "text-slate-800 font-bold" },
                  {
                    l: "Remaining", v: remaining === null ? "No budget" : fmtMoney(remaining),
                    cls: remaining !== null && remaining < 0 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"
                  },
                ].map(r => (
                  <div key={r.l} className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-500">{r.l}</span>
                    <span className={r.cls}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit budget */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="font-bold text-slate-900 mb-1">Edit Budget</h2>
                <p className="text-xs text-slate-500 mb-4">Set or update your planned budget for this trip.</p>
              </div>
              {editingBudget ? (
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                    <input type="number" min="0" step="100" autoFocus
                      value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveBudget} disabled={savingBudget}
                      className="flex-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold py-2 rounded-xl">
                      {savingBudget ? "Saving…" : "Save Budget"}
                    </button>
                    <button onClick={() => setEditingBudget(false)}
                      className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-xl hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
                    <p className="text-2xl font-extrabold text-brand-600">
                      {trip.budget ? fmtMoney(trip.budget) : "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Current budget</p>
                  </div>
                  <button onClick={() => { setBudgetInput(trip.budget || ""); setEditingBudget(true); }}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-2.5 rounded-xl">
                    ✏️ {trip.budget ? "Edit Budget" : "Set Budget"}
                  </button>
                </div>
              )}
            </div>

            {/* Budget progress bar card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-4">Budget Health</h2>
              {!trip.budget ? (
                <div className="text-center py-6">
                  <p className="text-3xl mb-2">🎯</p>
                  <p className="text-sm text-slate-500">No budget set yet.</p>
                  <button onClick={() => { setBudgetInput(""); setEditingBudget(true); setActiveTab("budget"); }}
                    className="mt-2 text-brand-600 text-sm font-medium hover:underline">Set one now →</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const pct = Math.min((expenseTotal / Number(trip.budget)) * 100, 100);
                    const over = expenseTotal > Number(trip.budget);
                    return (
                      <>
                        <div>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Spent</span><span>{Math.round(pct)}%</span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 80 ? "bg-amber-400" : "bg-emerald-500"}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <div className={`rounded-xl p-3 text-sm text-center font-semibold ${over ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {over ? `⚠️ Over budget by ${fmtMoney(expenseTotal - Number(trip.budget))}` : `✅ ${fmtMoney(Number(trip.budget) - expenseTotal)} remaining`}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <p className="font-bold text-slate-800">{fmtMoney(expenseTotal)}</p>
                            <p className="text-slate-400">Spent</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <p className="font-bold text-slate-800">{fmtMoney(trip.budget)}</p>
                            <p className="text-slate-400">Budget</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Category breakdown */}
          {Object.keys(expReport.categoryTotals || {}).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-4">Spending by Category</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(expReport.categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                  const total = Object.values(expReport.categoryTotals).reduce((s, v) => s + Number(v), 0);
                  const pct = total > 0 ? Math.round((Number(amt) / total) * 100) : 0;
                  const color = CAT_COLORS[cat] || "#64748b";
                  return (
                    <div key={cat} className="rounded-xl border border-slate-100 p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0" style={{ background: color }}>
                        {cat === "Food" ? "🍜" : cat === "Stay" ? "🏨" : cat === "Transport" ? "🚌" : cat === "Tickets" ? "🎫" : cat === "Shopping" ? "🛍" : "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700 truncate">{cat}</span>
                          <span className="font-bold text-slate-800 flex-shrink-0">{fmtMoney(amt)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{pct}% of total</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cost estimation */}
          {trip.startDate && trip.endDate && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-3">Cost Estimation</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {(() => {
                  const days = Math.max(1, Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / (1000 * 60 * 60 * 24)));
                  const travelers = (trip.travelerCount || 1);
                  const perDay = expenseTotal / days;
                  const perPerson = expenseTotal / travelers;
                  return [
                    { l: "Trip Days", v: days },
                    { l: "Travellers", v: travelers },
                    { l: "Cost/Day", v: fmtMoney(perDay) },
                    { l: "Cost/Person", v: fmtMoney(perPerson) },
                  ].map(s => (
                    <div key={s.l} className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-extrabold text-slate-800">{s.v}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{s.l}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB: DOCUMENTS
      ═══════════════════════════════════════════════════════ */}
      {activeTab === "documents" && (
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
          {/* Upload form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-1">Upload Document</h2>
            <p className="text-sm text-slate-500 mb-5">
              Upload tickets, hotel bookings, passports, photos and more. Max 20 MB.
            </p>
            <form onSubmit={handleDocUpload} className="space-y-3">
              {/* File picker */}
              <label className="block cursor-pointer">
                <div className={`border-2 border-dashed rounded-xl px-4 py-6 text-center transition-colors ${docFile ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300"}`}>
                  {docFile ? (
                    <div>
                      <p className="text-2xl mb-1">📎</p>
                      <p className="font-medium text-brand-700 text-sm truncate">{docFile.name}</p>
                      <p className="text-xs text-slate-400">{(docFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-3xl mb-1">📁</p>
                      <p className="text-sm text-slate-500">Click to choose a file</p>
                      <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOC, DOCX</p>
                    </div>
                  )}
                </div>
                <input type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                  onChange={e => setDocFile(e.target.files[0] || null)} />
              </label>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {DOC_TYPES.map(t => (
                    <option key={t} value={t}>{DOC_ICONS[t]} {t.replace("_", " ")}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <input placeholder="Description (optional)" value={docDesc}
                onChange={e => setDocDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />

              <button type="submit" disabled={uploadingDoc || !docFile}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm shadow transition-all active:scale-[0.98]">
                {uploadingDoc ? "Uploading…" : "📤 Upload Document"}
              </button>
            </form>
          </div>

          {/* Document list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              Documents
              <span className="text-sm font-normal text-slate-400">({documents.length})</span>
            </h2>
            {documents.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-4xl mb-3">📂</p>
                <p className="text-slate-500 font-medium">No documents yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload tickets, bookings, photos and more.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto">
                {documents.map(doc => (
                  <div key={doc.id}
                    className="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors">
                    <span className="text-2xl flex-shrink-0">{DOC_ICONS[doc.docType] || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{doc.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {doc.docType?.replace("_", " ")}
                        </span>
                        {doc.fileSize && (
                          <span className="text-[10px] text-slate-400">
                            {(doc.fileSize / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}
                        {doc.description && (
                          <span className="text-[10px] text-slate-400 italic truncate">{doc.description}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        By {doc.uploadedByName} · {new Date(doc.uploadedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a href={`${(process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api").replace(/\/api$/, "")}${doc.fileUrl}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-brand-600 border border-brand-200 hover:bg-brand-50 px-2 py-1 rounded-lg">
                        View
                      </a>
                      <button onClick={() => handleDocDelete(doc.id)}
                        className="text-xs text-red-500 border border-red-200 hover:bg-red-50 px-2 py-1 rounded-lg">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB: SHARING
      ═══════════════════════════════════════════════════════ */}
      {activeTab === "sharing" && (
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">

          {/* ── Left: Invite form ── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-1">Invite a Traveller</h2>
            <p className="text-sm text-slate-500 mb-5">
              Enter their TripNest email — they'll receive an invitation they can accept or decline.
            </p>

            {inviteMsg && (
              <div className={`mb-4 text-sm rounded-xl px-4 py-3 border flex items-start gap-2 animate-scaleIn ${inviteMsg.type === "success"
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-red-700 bg-red-50 border-red-200"
                }`}>
                <span className="flex-shrink-0 mt-0.5">{inviteMsg.type === "success" ? "✅" : "⚠️"}</span>
                <span>{inviteMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-3">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                <input
                  type="email" required
                  placeholder="traveler@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <button
                type="submit"
                disabled={inviteSending}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm shadow transition-all active:scale-[0.98]"
              >
                {inviteSending ? "Sending…" : "📨 Send Invitation"}
              </button>
            </form>

            <div className="mt-5 bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-2">How it works</p>
              <ul className="text-xs text-slate-500 space-y-1.5 list-disc pl-4">
                <li>They receive an invitation in their <strong>Notifications</strong>.</li>
                <li>They can <span className="text-emerald-600 font-medium">Accept ✓</span> or <span className="text-red-500 font-medium">Decline ✕</span>.</li>
                <li>On accept, they're added as a traveller on this trip.</li>
                <li>You get notified of their response.</li>
              </ul>
            </div>
          </div>

          {/* ── Right: Invitation history ── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              Invitation History
              <span className="text-sm font-normal text-slate-400">({invitations.length})</span>
            </h2>

            {invitations.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-3xl mb-2">📬</p>
                <p className="text-slate-500 text-sm">No invitations sent yet.</p>
                <p className="text-xs text-slate-400 mt-1">Invite someone using the form.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
                {invitations.map(inv => {
                  const STATUS_MAP = {
                    PENDING: { label: "Pending", icon: "⏳", cls: "bg-amber-50 border-amber-200 text-amber-700", bar: "border-l-amber-400" },
                    ACCEPTED: { label: "Accepted", icon: "✅", cls: "bg-emerald-50 border-emerald-200 text-emerald-700", bar: "border-l-emerald-500" },
                    REJECTED: { label: "Declined", icon: "❌", cls: "bg-red-50 border-red-200 text-red-600", bar: "border-l-red-400" },
                  };
                  const s = STATUS_MAP[inv.status] ?? STATUS_MAP.PENDING;
                  return (
                    <div
                      key={inv.id}
                      className={`flex items-start justify-between gap-3 rounded-xl border border-l-4 ${s.bar} px-4 py-3 ${s.cls}`}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{inv.inviteeEmail}</p>
                        {inv.inviteeName && (
                          <p className="text-xs opacity-75 mt-0.5">{inv.inviteeName}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] opacity-70">
                          <span>Invited by {inv.invitedByName}</span>
                          {inv.createdAt && (
                            <span>· {new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                          )}
                          {inv.respondedAt && (
                            <span>· Responded {new Date(inv.respondedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                          )}
                        </div>
                      </div>
                      <span className="flex-shrink-0 flex items-center gap-1 text-xs font-bold whitespace-nowrap">
                        {s.icon} {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {invitations.length > 0 && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                {[
                  { label: "Pending", count: invitations.filter(i => i.status === "PENDING").length, color: "text-amber-600" },
                  { label: "Accepted", count: invitations.filter(i => i.status === "ACCEPTED").length, color: "text-emerald-600" },
                  { label: "Declined", count: invitations.filter(i => i.status === "REJECTED").length, color: "text-red-500" },
                ].map(s => (
                  <div key={s.label} className="flex-1 text-center">
                    <p className={`text-xl font-extrabold ${s.color}`}>{s.count}</p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
