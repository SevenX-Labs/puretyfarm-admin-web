"use client";

import React from "react";
import { parseTimeToMinutes } from "@/lib/utils";

/**
 * Explicit 12-hour time selector: hour, minute and AM/PM as three selects.
 *
 * Replaces `<input type="time">`, whose 12h-vs-24h rendering follows the
 * browser's locale rather than ours — an admin on a 24h locale saw "13:00"
 * where the whole product speaks in AM/PM. The value in and out stays 24h
 * "HH:MM", so the API contract is untouched.
 */

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_STEP = 15;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) =>
  String(i * MINUTE_STEP).padStart(2, "0")
);

interface Parts {
  hour12: number;
  minute: string;
  meridiem: "AM" | "PM";
}

function toParts(value: string, fallback: string): Parts {
  const minutes = parseTimeToMinutes(value) ?? parseTimeToMinutes(fallback) ?? 0;
  const h24 = Math.floor(minutes / 60);
  return {
    hour12: h24 % 12 || 12,
    minute: String(minutes % 60).padStart(2, "0"),
    meridiem: h24 >= 12 ? "PM" : "AM",
  };
}

function toValue({ hour12, minute, meridiem }: Parts): string {
  const h24 =
    meridiem === "AM" ? (hour12 === 12 ? 0 : hour12) : hour12 === 12 ? 12 : hour12 + 12;
  return `${String(h24).padStart(2, "0")}:${minute}`;
}

const SELECT_CLASS =
  "h-9 rounded-[8px] border-2 border-black bg-white px-1.5 text-xs font-mono font-black text-[#1A1A1A] focus:outline-none cursor-pointer";

export function TimePicker12h({
  value,
  onChange,
  fallback = "06:00",
  label,
  idPrefix,
  disabled = false,
}: {
  /** 24h "HH:MM". */
  value: string;
  /** Receives 24h "HH:MM". */
  onChange: (next: string) => void;
  /** Used when `value` is empty or malformed. */
  fallback?: string;
  label: string;
  idPrefix: string;
  disabled?: boolean;
}) {
  const parts = toParts(value, fallback);

  const update = (patch: Partial<Parts>) =>
    onChange(toValue({ ...parts, ...patch }));

  // A minute off the step grid (e.g. a legacy "06:05") would otherwise vanish
  // from the dropdown and silently snap on the next edit.
  const minuteOptions = MINUTES.includes(parts.minute)
    ? MINUTES
    : [...MINUTES, parts.minute].sort();

  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1 block text-[11px] font-black uppercase text-[#5C5647]">
        {label}
      </legend>
      <div className="flex items-center gap-1">
        <select
          id={`${idPrefix}-hour`}
          aria-label={`${label} hour`}
          value={parts.hour12}
          onChange={(e) => update({ hour12: parseInt(e.target.value, 10) })}
          className={SELECT_CLASS}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span aria-hidden className="text-xs font-black text-[#1A1A1A]">
          :
        </span>
        <select
          id={`${idPrefix}-minute`}
          aria-label={`${label} minute`}
          value={parts.minute}
          onChange={(e) => update({ minute: e.target.value })}
          className={SELECT_CLASS}
        >
          {minuteOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          id={`${idPrefix}-meridiem`}
          aria-label={`${label} AM or PM`}
          value={parts.meridiem}
          onChange={(e) =>
            update({ meridiem: e.target.value as "AM" | "PM" })
          }
          className={SELECT_CLASS}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </fieldset>
  );
}
