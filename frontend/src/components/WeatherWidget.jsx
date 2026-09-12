import React, { useEffect, useState, useCallback } from "react";

/**
 * WeatherWidget
 * Fetches current weather from OpenWeatherMap free API.
 *
 * Props:
 *   city      – city/destination name string  (required)
 *   compact   – boolean, shows a single-line badge instead of card (default false)
 *
 * API key is read from:
 *   REACT_APP_OPENWEATHER_API_KEY  in .env
 * If the key is missing the widget is hidden silently.
 */

const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || "";

const WX_ICONS = {
  "01d": "☀️", "01n": "🌙",
  "02d": "⛅", "02n": "⛅",
  "03d": "☁️", "03n": "☁️",
  "04d": "☁️", "04n": "☁️",
  "09d": "🌧️", "09n": "🌧️",
  "10d": "🌦️", "10n": "🌦️",
  "11d": "⛈️", "11n": "⛈️",
  "13d": "❄️", "13n": "❄️",
  "50d": "🌫️", "50n": "🌫️",
};

function iconFor(code) {
  return WX_ICONS[code] || "🌡️";
}

export default function WeatherWidget({ city, compact = false }) {
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error | no-key

  const load = useCallback(() => {
    if (!API_KEY) { setStatus("no-key"); return; }
    if (!city) { setStatus("error"); return; }

    setStatus("loading");
    const query = encodeURIComponent(city.split(",")[0].trim());
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${query}&units=metric&appid=${API_KEY}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then((data) => {
        setWeather({
          temp: Math.round(data.main.temp),
          feels: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          wind: Math.round(data.wind.speed * 3.6), // m/s → km/h
          cityName: data.name,
          country: data.sys.country,
        });
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [city]);

  useEffect(() => { load(); }, [load]);

  // No API key or idle (no city yet) → hide silently
  if (status === "no-key" || status === "idle") return null;
  // No weather data yet and not in a known render state → hide
  if (status === "ok" && !weather) return null;

  /* ── Compact badge (used inside Destination cards) ── */
  if (compact) {
    if (status === "loading") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 animate-pulse">
          🌡️ …
        </span>
      );
    }
    if (status !== "ok") return null;
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full"
        title={`${weather.description} — feels like ${weather.feels}°C, humidity ${weather.humidity}%`}
      >
        {iconFor(weather.icon)} {weather.temp}°C
        <span className="text-slate-400 capitalize hidden sm:inline">· {weather.description}</span>
      </span>
    );
  }

  /* ── Full card (used in Dashboard / Trip detail) ── */
  if (status === "loading") {
    return (
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-sky-100 rounded w-1/2 mb-2" />
        <div className="h-8 bg-sky-100 rounded w-1/3" />
      </div>
    );
  }

  if (status === "error" || !weather) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-slate-400">
        🌡️ Weather unavailable for "{city}"
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
          Current Weather
        </p>
        <button
          onClick={load}
          className="text-sky-400 hover:text-sky-600 text-xs"
          title="Refresh"
        >
          ↺
        </button>
      </div>

      {/* Location */}
      <p className="text-sm font-bold text-slate-800 mb-3">
        📍 {weather.cityName}, {weather.country}
      </p>

      {/* Main temp */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-4xl">{iconFor(weather.icon)}</span>
        <div>
          <p className="text-3xl font-extrabold text-slate-900 leading-none">
            {weather.temp}°C
          </p>
          <p className="text-xs text-slate-500 capitalize mt-0.5">
            {weather.description}
          </p>
        </div>
      </div>

      {/* Detail row */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-sky-200">
        {[
          { icon: "🌡️", label: "Feels like", value: `${weather.feels}°C` },
          { icon: "💧", label: "Humidity", value: `${weather.humidity}%` },
          { icon: "💨", label: "Wind", value: `${weather.wind} km/h` },
        ].map((d) => (
          <div key={d.label} className="text-center">
            <p className="text-base">{d.icon}</p>
            <p className="text-xs font-semibold text-slate-700">{d.value}</p>
            <p className="text-[10px] text-slate-400">{d.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
