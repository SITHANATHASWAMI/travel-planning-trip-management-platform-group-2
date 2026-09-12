import React, { useState } from "react";

/* ─── Portal data ───────────────────────────────────────────── */
const PORTALS = {
  train: [
    {
      name: "IRCTC Rail Connect",
      description: "Book train tickets, check PNR status, cancel & manage journeys on Indian Railways.",
      url: "https://www.irctc.co.in",
      icon: "🚂",
      tag: "Official • Indian Railways",
      color: "blue",
    },
    {
      name: "National Train Enquiry System",
      description: "Live train running status, seat availability and schedule information.",
      url: "https://enquiry.indianrail.gov.in",
      icon: "🔍",
      tag: "Indian Railways NTES",
      color: "blue",
    },
    {
      name: "Rail Madad (Complaints)",
      description: "Lodge and track complaints related to Indian Railways journey.",
      url: "https://railmadad.indianrailways.gov.in",
      icon: "📞",
      tag: "Helpdesk • Indian Railways",
      color: "blue",
    },
  ],
  flight: [
    {
      name: "AAI — Airport Authority of India",
      description: "Official portal for flight schedules, airport info, and passenger services across India.",
      url: "https://www.aai.aero",
      icon: "✈️",
      tag: "Official • AAI",
      color: "indigo",
    },
    {
      name: "DGCA India — Air Sewa",
      description: "File complaints, check airline policies, and access passenger rights information.",
      url: "https://airsewa.gov.in",
      icon: "🛡️",
      tag: "DGCA • Ministry of Civil Aviation",
      color: "indigo",
    },
    {
      name: "IndiGo Airlines",
      description: "Book flights, manage bookings, web check-in on India's largest carrier.",
      url: "https://www.goindigo.in",
      icon: "🛫",
      tag: "Airline",
      color: "indigo",
    },
    {
      name: "Air India",
      description: "National carrier — book international & domestic flights, manage reservations.",
      url: "https://www.airindia.in",
      icon: "🇮🇳",
      tag: "National Carrier",
      color: "indigo",
    },
  ],
  bus: [
    {
      name: "APSRTC",
      description: "Andhra Pradesh State Road Transport Corporation — book bus tickets online.",
      url: "https://www.apsrtconline.in",
      icon: "🚌",
      tag: "Andhra Pradesh",
      color: "green",
    },
    {
      name: "KSRTC",
      description: "Karnataka State Road Transport Corporation — inter-city and express bus bookings.",
      url: "https://www.ksrtc.in",
      icon: "🚌",
      tag: "Karnataka",
      color: "green",
    },
    {
      name: "TSRTC",
      description: "Telangana State Road Transport Corporation — book buses across Telangana.",
      url: "https://www.tsrtconline.in",
      icon: "🚌",
      tag: "Telangana",
      color: "green",
    },
    {
      name: "MSRTC",
      description: "Maharashtra State Road Transport Corporation — ST bus bookings across Maharashtra.",
      url: "https://msrtconline.maharashtra.gov.in",
      icon: "🚌",
      tag: "Maharashtra",
      color: "green",
    },
    {
      name: "TNSTC",
      description: "Tamil Nadu State Transport Corporation — book buses across Tamil Nadu.",
      url: "https://www.tnstc.in",
      icon: "🚌",
      tag: "Tamil Nadu",
      color: "green",
    },
    {
      name: "RedBus (Aggregator)",
      description: "Book bus tickets across all operators — private and government buses in one place.",
      url: "https://www.redbus.in",
      icon: "🔴",
      tag: "Aggregator",
      color: "green",
    },
  ],
  other: [
    {
      name: "Passport Seva (MEA)",
      description: "Apply for new passport, track application status, schedule appointment at PSK.",
      url: "https://www.passportindia.gov.in",
      icon: "📗",
      tag: "Ministry of External Affairs",
      color: "purple",
    },
    {
      name: "Visa Application Center — India",
      description: "Government visa information, application forms and VFS appointment booking.",
      url: "https://www.vfsglobal.com/india",
      icon: "📋",
      tag: "Visa Services",
      color: "purple",
    },
    {
      name: "IRCTC Tourism",
      description: "Book tour packages, holiday specials and pilgrim trains by Indian Railways Tourism.",
      url: "https://www.irctctourism.com",
      icon: "🏖️",
      tag: "IRCTC Tourism",
      color: "purple",
    },
    {
      name: "Incredible India (Tourism)",
      description: "Official tourism portal of India — discover destinations, plan travel across India.",
      url: "https://www.incredibleindia.org",
      icon: "🗺️",
      tag: "Ministry of Tourism",
      color: "purple",
    },
  ],
};

const TABS = [
  { id: "train", label: "Train", icon: "🚂", color: "blue" },
  { id: "flight", label: "Flights", icon: "✈️", color: "indigo" },
  { id: "bus", label: "Bus", icon: "🚌", color: "green" },
  { id: "other", label: "Other", icon: "🗺️", color: "purple" },
];

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-100 text-blue-600", badge: "bg-blue-100 text-blue-700", btn: "bg-blue-600 hover:bg-blue-700", tab: "border-blue-600 text-blue-700 bg-blue-50" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", icon: "bg-indigo-100 text-indigo-600", badge: "bg-indigo-100 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700", tab: "border-indigo-600 text-indigo-700 bg-indigo-50" },
  green: { bg: "bg-green-50", border: "border-green-200", icon: "bg-green-100 text-green-600", badge: "bg-green-100 text-green-700", btn: "bg-green-600 hover:bg-green-700", tab: "border-green-600 text-green-700 bg-green-50" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", icon: "bg-purple-100 text-purple-600", badge: "bg-purple-100 text-purple-700", btn: "bg-purple-600 hover:bg-purple-700", tab: "border-purple-600 text-purple-700 bg-purple-50" },
};

export default function TravelPortals() {
  const [activeTab, setActiveTab] = useState("train");
  const [search, setSearch] = useState("");

  const portals = PORTALS[activeTab] || [];
  const filtered = portals.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xl">🎫</span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Government Travel Portals</h1>
            <p className="text-slate-500 text-sm">Official portals for trains, flights, buses and more — all in one place.</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search portals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 bg-white"
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(tab => {
          const c = COLOR_MAP[tab.color];
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${active
                  ? `${c.tab} border-current`
                  : "border-transparent text-slate-600 bg-slate-100 hover:bg-slate-200"
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${active ? c.badge : "bg-slate-200 text-slate-500"}`}>
                {PORTALS[tab.id].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Portal Cards ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-medium">No portals found for "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((portal, i) => {
            const c = COLOR_MAP[portal.color];
            return (
              <div
                key={i}
                className={`rounded-2xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3 hover:shadow-md transition-shadow`}
              >
                {/* Icon + name */}
                <div className="flex items-start gap-3">
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${c.icon}`}>
                    {portal.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{portal.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge} mt-1 inline-block`}>
                      {portal.tag}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-slate-600 text-xs leading-relaxed flex-1">{portal.description}</p>

                {/* CTA */}
                <a
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full text-center text-white text-sm font-semibold py-2.5 rounded-xl transition-colors ${c.btn}`}
                >
                  Open Portal →
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Disclaimer ── */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex gap-2">
        <span className="text-base flex-shrink-0">⚠️</span>
        <span>
          These are links to official government and public transport portals. TripNest does not manage bookings —
          you will be redirected to the respective external websites. Always verify URLs before entering personal information.
        </span>
      </div>
    </div>
  );
}
