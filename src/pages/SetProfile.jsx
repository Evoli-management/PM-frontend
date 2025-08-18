import React, { useMemo, useRef, useState } from "react";

/**
 * ProfileSetting.js — Figma-accurate (desktop-first) — SINGLE FILE
 * - Left vertical tabs (Account, Preferences, 2FA, Synchronization)
 * - Main card: Avatar + Name/Email/Phone
 * - Change Password (old/new/confirm) + neon-green Submit
 * - Change Email (old/new) + neon-green Submit
 * - Account view ALSO shows: Time Zone, Language (multilingual), Work Hours (start/end), Notifications toggle
 * - Google Calendar connect card
 * - Bottom strip with mini cards (Time Zone | Reminders & Work Hours | Google Connect)
 * - Tailwind-only; inline SVG for eye toggles; no external icon libs
 */

export default function ProfileSetting() {
  const [activeTab, setActiveTab] = useState("Account");
  const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
  const fileRef = useRef(null);

  const timezones = useMemo(
    () => [
      { label: "Pacific Time (US)", value: "America/Los_Angeles" },
      { label: "Eastern Time (US)", value: "America/New_York" },
      { label: "Central European Time", value: "Europe/Berlin" },
      { label: "East Africa Time (GMT+3)", value: "Africa/Nairobi" },
    ],
    []
  );
  const languages = [
    { code: "en", label: "English" },
    { code: "sw", label: "Swahili" },
    { code: "fr", label: "French" },
    { code: "es", label: "Spanish" },
    { code: "de", label: "German" },
  ];

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    tz: "America/Los_Angeles",
    lang: "en",
    start: "09:00",
    end: "17:00",
    notifications: true,
    oldEmail: "",
    newEmail: "",
    oldPw: "",
    newPw: "",
    confirmPw: "",
  });

  const upd = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const Toggle = ({ checked, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={
        "relative inline-flex h-5 w-10 items-center rounded-full transition-colors " +
        (checked ? "bg-blue-600" : "bg-gray-300")
      }
    >
      <span
        className={
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition " +
          (checked ? "translate-x-5" : "translate-x-1")
        }
      />
    </button>
  );

  const Eye = ({ open }) => (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor">
      {open ? (
        <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          d="M2.1 12S5.5 5 12 5s9.9 7 9.9 7-3.4 7-9.9 7S2.1 12 2.1 12Zm9.9 3.25A3.25 3.25 0 1 1 15.25 12 3.25 3.25 0 0 1 12 15.25Z"/>
      ) : (
        <>
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
          <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            d="M20.9 12S17.5 5 11 5a10 10 0 0 0-4.6 1.1M3.1 12S6.5 19 13 19a10 10 0 0 0 4.6-1.1"/>
        </>
      )}
    </svg>
  );

  const PasswordField = ({ value, onChange, placeholder, open, toggle }) => (
    <div className="relative">
      <input
        type={open ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-9 w-full rounded border border-gray-300 bg-gray-50 px-3 text-sm outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-2 top-1/2 -translate-y-1/2"
        aria-label="Toggle password"
      >
        <Eye open={open} />
      </button>
    </div>
  );

  const Field = ({ label, children }) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );

  const Section = ({ title, children }) => (
    <section className="mt-5 border-t border-gray-200 pt-5">
      <h2 className="mb-3 text-[15px] font-semibold text-gray-800">{title}</h2>
      {children}
    </section>
  );

  return (
    <div className="min-h-screen bg-[#EDEDED] px-4 py-6">
      <div className="mx-auto max-w-5xl rounded-lg bg-white p-4 shadow-sm">
        <h1 className="mb-3 text-xl font-semibold text-gray-600">Profile Settings</h1>

        <div className="grid gap-4 md:grid-cols-[200px_auto]">
          {/* Left tabs */}
          <nav className="rounded border border-gray-300 bg-[#F4F4F4] p-2 text-[13px]">
            {["Account", "Preferences", "Two Factor Auth (2FA)", "Synchronization"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={
                  "mb-1 w-full rounded px-3 py-2 text-left " +
                  (activeTab === t
                    ? "bg-white text-blue-700 shadow-inner"
                    : "hover:bg-white hover:text-gray-800")
                }
              >
                {t}
              </button>
            ))}
          </nav>

          {/* Main content */}
          <div className="rounded border border-gray-300 bg-[#F7F7F7] p-4">
            {/* Title strip inside card */}
            <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[12px] font-semibold tracking-wide text-gray-700">
              PROFILE INFORMATION
            </div>

            {activeTab === "Account" && (
              <>
                {/* Top: avatar + core fields */}
                <div className="grid grid-cols-[64px_1fr] gap-3">
                  {/* Avatar */}
                  <div className="flex flex-col items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-300 text-2xl text-white">
                      <span>👤</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="mt-2 w-[88px] rounded border border-gray-400 bg-white py-1 text-[12px]"
                    >
                      ↓ Upload
                    </button>
                    <input ref={fileRef} type="file" className="hidden" />
                  </div>

                  {/* Name / Email / Phone */}
                  <div className="grid grid-cols-1 gap-2">
                    <Field label="Name">
                      <input
                        value={form.name}
                        onChange={upd("name")}
                        placeholder="Name"
                        className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        type="email"
                        value={form.email}
                        onChange={upd("email")}
                        placeholder="Email"
                        className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </Field>
                    <Field label="Phone Number">
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={upd("phone")}
                        placeholder="Phone Number"
                        className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </Field>
                  </div>
                </div>

                {/* Change Password */}
                <Section title="Change Password">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="Old Password">
                      <PasswordField
                        value={form.oldPw}
                        onChange={upd("oldPw")}
                        placeholder="Old Password"
                        open={showPw.old}
                        toggle={() => setShowPw((s) => ({ ...s, old: !s.old }))}
                      />
                    </Field>
                    <Field label="New Password">
                      <PasswordField
                        value={form.newPw}
                        onChange={upd("newPw")}
                        placeholder="New Password"
                        open={showPw.new1}
                        toggle={() => setShowPw((s) => ({ ...s, new1: !s.new1 }))}
                      />
                    </Field>
                  </div>
                  <div className="mt-2">
                    <Field label="Confirm New Password">
                      <PasswordField
                        value={form.confirmPw}
                        onChange={upd("confirmPw")}
                        placeholder="Confirm New Password"
                        open={showPw.new2}
                        toggle={() => setShowPw((s) => ({ ...s, new2: !s.new2 }))}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded bg-[#00E676] py-2 text-[14px] font-semibold text-white hover:brightness-95"
                  >
                    Submit
                  </button>
                </Section>

                {/* Change Email */}
                <Section title="Change Email">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="Old Email">
                      <input
                        type="email"
                        value={form.oldEmail}
                        onChange={upd("oldEmail")}
                        placeholder="Old Email"
                        className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </Field>
                    <Field label="New Email">
                      <input
                        type="email"
                        value={form.newEmail}
                        onChange={upd("newEmail")}
                        placeholder="New Email"
                        className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded bg-[#00E676] py-2 text-[14px] font-semibold text-white hover:brightness-95"
                  >
                    Submit
                  </button>
                </Section>

                {/* In-Account controls */}
                <div className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field label="Time Zone">
                    <select
                      value={form.tz}
                      onChange={upd("tz")}
                      className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Language (Multilingual)">
                    <select
                      value={form.lang}
                      onChange={upd("lang")}
                      className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    >
                      {languages.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Work Hours — Start">
                    <input
                      type="time"
                      value={form.start}
                      onChange={upd("start")}
                      className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </Field>
                  <Field label="Work Hours — End">
                    <input
                      type="time"
                      value={form.end}
                      onChange={upd("end")}
                      className="h-9 w-full rounded border border-gray-400 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </Field>
                  <div className="md:col-span-2 flex items-center justify-between rounded border border-gray-300 bg-white px-3 py-2">
                    <span className="text-[13px] font-medium text-gray-700">Notifications</span>
                    <Toggle
                      checked={form.notifications}
                      onChange={(v) => setForm((s) => ({ ...s, notifications: v }))}
                    />
                  </div>
                </div>

                {/* Google Calendar connect card */}
                <div className="mt-5 rounded border border-gray-300 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-gray-800">Google Calendar</div>
                      <div className="text-[12px] text-gray-600">
                        Connect to sync meetings and reminders
                      </div>
                    </div>
                    <button className="rounded border border-blue-600 px-3 py-1.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
                      Connect
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab !== "Account" && (
              <div className="text-sm text-gray-600">
                {activeTab} content (kept minimal to match your earlier design).
              </div>
            )}
          </div>
        </div>

        {/* Bottom strip mini-cards */}
        <div className="mt-4 rounded border border-gray-300 bg-white p-3">
          <div className="flex flex-wrap items-center gap-4 text-[13px]">
            <button
              onClick={() => setActiveTab("Account")}
              className={
                "rounded px-2 py-1 " +
                (activeTab === "Account" ? "bg-blue-50 text-blue-700" : "text-blue-700 underline-offset-2 hover:underline")
              }
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab("Preferences")}
              className={
                "rounded px-2 py-1 " +
                (activeTab === "Preferences" ? "bg-blue-50 text-blue-700" : "text-blue-700 underline-offset-2 hover:underline")
              }
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab("Two Factor Auth (2FA)")}
              className={
                "rounded px-2 py-1 " +
                (activeTab === "Two Factor Auth (2FA)" ? "bg-blue-50 text-blue-700" : "text-blue-700 underline-offset-2 hover:underline")
              }
            >
              Two Factor Auth (2FA)
            </button>
            <button
              onClick={() => setActiveTab("Synchronization")}
              className={
                "rounded px-2 py-1 " +
                (activeTab === "Synchronization" ? "bg-blue-50 text-blue-700" : "text-blue-700 underline-offset-2 hover:underline")
              }
            >
              Synchronization
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded border border-gray-300 bg-[#F7F7F7] p-3">
              <div className="mb-1 text-[12px] font-semibold text-gray-700">Time Zone</div>
              <select
                value={form.tz}
                onChange={upd("tz")}
                className="h-9 w-full rounded border border-gray-400 bg-white px-2 text-sm outline-none"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded border border-gray-300 bg-[#F7F7F7] p-3">
              <div className="mb-1 text-[12px] font-semibold text-gray-700">Reminders & Work Hours</div>
              <select
                className="h-9 w-full rounded border border-gray-400 bg-white px-2 text-sm outline-none"
                defaultValue="Enabled"
              >
                <option>Enabled</option>
                <option>Disabled</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded border border-gray-300 bg-[#F7F7F7] p-3">
              <div>
                <div className="text-[12px] font-semibold text-gray-700">Connected Accounts</div>
                <div className="mt-1 flex items-center gap-2 text-[13px]">
                  <span className="rounded bg-white px-2 py-1">Google</span>
                </div>
              </div>
              <button className="rounded border border-blue-600 px-3 py-1.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50">
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
