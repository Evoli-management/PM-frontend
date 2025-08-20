import React, { useMemo, useRef, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

/**
 * SetProfile.jsx — Practical Manager (modern task‑management style)
 * Sections (tabs): Account | Preferences | Synchronization
 * - TailwindCSS only (no external icon libs)
 * - 2FA lives inside Account (Security)
 * - Ready to wire to your APIs (handlers marked TODO)
 */
//   const [tab, setTab] = useState("Account");
//   const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
//   const [avatarImage, setAvatarImage] = useState(null);
//   const avatarRef = useRef(null);

//   // Select options
//   const timezones = useMemo(
//     () => [
//       { label: "Pacific Time (US)", value: "America/Los_Angeles" },
//       { label: "Eastern Time (US)", value: "America/New_York" },
//       { label: "Central European Time", value: "Europe/Berlin" },
//       { label: "East Africa Time (GMT+3)", value: "Africa/Nairobi" },
//     ],
//     []
//   );
//   const languages = [
//     { code: "en", label: "English" },
//     { code: "sw", label: "Swahili" },
//     { code: "fr", label: "French" },
//     { code: "es", label: "Spanish" },
//     { code: "de", label: "German" },
//   ];

//   // Form state (stub; replace with your data fetching)
//   const [f, setF] = useState({
//     // Account
//     name: "DAMIAN GALLUSI",
//     email: "gallusi123@gmail.com",
//     phone: "+255 714 478 319",
//     oldPw: "",
//     newPw: "",
//     confirmPw: "",
//     newEmail: "",
//     // Preferences
//     lang: "en",
//     tz: "Africa/Nairobi",
//     dateFmt: "24h",
//     weekStart: "Mon",
//     theme: "system",
//     density: "comfortable", // compact/comfortable
//     notifications: { email: true, push: true, inapp: true },
//     workStart: "09:00",
//     workEnd: "17:00",
//     reminders: { enabled: true, time: "08:00" },
//     // Sync
//     gcal: false,
//     outlook: false,
//     ical: false,
//     googleLogin: false,
//     microsoftLogin: false,
//     slack: false,
//     teams: false,
//     dropbox: false,
//     onedrive: false,
//     drive: false,
//     twoWaySync: true,
//     integrationPerms: "standard", // standard/restricted
//   });
//   const upd = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

//   // Small UI helpers
//   const Toggle = ({ checked, onChange, label }) => (
//     <div className="flex items-center justify-between gap-4">
//       {label ? <span className="text-sm text-gray-700">{label}</span> : null}
//       <button
//         type="button"
//         onClick={() => onChange(!checked)}
//         aria-pressed={checked}
//         className={
//           "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 " +
//           (checked ? "bg-blue-600" : "bg-gray-300")
//         }
//       >
//         <span
//           className={
//             "inline-block h-4 w-4 transform rounded-full bg-white shadow transition " +
//             (checked ? "translate-x-5" : "translate-x-1")
//           }
//         />
//       </button>
//     </div>
//   );

//   const Eye = ({ open }) => (
//     <FontAwesomeIcon 
//       icon={open ? faEye : faEyeSlash} 
//       className="text-lg sm:text-2xl text-gray-500" 
//     />
//   );

//   const PwField = ({ v, onChange, ph, open, toggle }) => (
//     <div className="relative">
//       <input
//         type={open ? "text" : "password"}
//         value={v}
//         onChange={onChange}
//         placeholder={ph}
//         className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//       />
//       <button
//         type="button"
//         onClick={toggle}
//         className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
//         aria-label="Toggle password"
//       >
//         <Eye open={open} />
//       </button>
//     </div>
//   );

//   const Field = ({ label, hint, children }) => (
//     <label className="block text-sm">
//       <span className="mb-1 block font-medium text-gray-800">{label}</span>
//       {children}
//       {hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
//     </label>
//   );

//   const Section = ({ title, children }) => (
//     <section className="mt-6 border-t border-gray-200 pt-5">
//       <h2 className="mb-3 text-[15px] font-semibold text-gray-900">{title}</h2>
//       {children}
//     </section>
//   );

//   // --- Optimized password strength calculation with useMemo ---
//   const passwordStrength = useMemo(() => {
//     const password = f.newPw;
//     if (!password) return { level: 0, text: "", color: "" };
//     if (password.length < 8) return { level: 1, text: "Too short (min 8 characters)", color: "text-red-500" };
//     if (password.length >= 8 && password.length < 12) return { level: 2, text: "Good", color: "text-yellow-500" };
//     return { level: 3, text: "Strong", color: "text-green-500" };
//   }, [f.newPw]);

//   // --- Handlers (replace with real API calls) ---

//   const savePassword = () => {
//     // Validate password requirements
//     if (!f.oldPw) {
//       alert("Please enter your current password.");
//       return;
//     }
    
//     if (!f.newPw) {
//       alert("Please enter a new password.");
//       return;
//     }
    
//     if (f.newPw.length < 8) {
//       alert("Password must be at least 8 characters long.");
//       return;
//     }
    
//     if (f.newPw !== f.confirmPw) {
//       alert("New password and confirm password do not match.");
//       return;
//     }
    
//     // TODO: POST /api/change-password { old: f.oldPw, new: f.newPw }
//     alert("Password updated successfully!");
//   };
//   const saveEmail = () => {
//     // TODO: POST /api/change-email { newEmail: f.newEmail }
//     alert("Email change submitted (stub).");
//   };
//   const setup2FA = () => {
//     // TODO: start 2FA enrollment
//     alert("2FA setup flow (stub).");
//   };
//   const logoutAll = () => {
//     // TODO: POST /api/sessions/logout-all
//     alert("Logged out of all devices (stub).");
//   };
//   const deleteAccount = () => {
//     // TODO: DELETE /api/account
//     if (confirm("Are you sure you want to delete your account?")) {
//       alert("Account deletion requested (stub).");
//     }
//   };

//   const handleAvatarUpload = (event) => {
//     const file = event.target.files[0];
//     if (file && file.type.startsWith('image/')) {
//       const reader = new FileReader();
//       reader.onload = (e) => {
//         setAvatarImage(e.target.result);
//       };
//       reader.readAsDataURL(file);
//     } else {
//       alert("Please select a valid image file (JPG, PNG, GIF, etc.)");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#F5F7FA] px-5 py-8">
//       <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
//         <h1 className="mb-5 text-2xl font-semibold text-gray-900">Profile Settings</h1>

//         <div className="grid gap-6 lg:grid-cols-[240px_auto]">
//           {/* Tabs (left) */}
//           <nav className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-[13px]">
//             {["Account", "Preferences", "Synchronization"].map((t) => (
//               <button
//                 key={t}
//                 onClick={() => setTab(t)}
//                 className={
//                   "mb-1 w-full rounded-lg px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-300 " +
//                   (tab === t ? "bg-white text-blue-700 shadow-inner" : "hover:bg-white hover:text-gray-800")
//                 }
//               >
//                 {t}
//               </button>
//             ))}
//           </nav>

//           {/* Content (right) */}
//           <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
//             <div className="mb-4 rounded bg-gray-100 px-3 py-2 text-center text-[12px] font-semibold tracking-wide text-gray-700">
//               {tab.toUpperCase()}
//             </div>

//             {/* -------------------- ACCOUNT -------------------- */}
//             {tab === "Account" && (
//               <>
//                 {/* Profile Information */}
//                 <div className="grid grid-cols-[96px_1fr] gap-5">
//                   <div className="flex flex-col items-center">
//                     <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-300 text-3xl text-white overflow-hidden">
//                       {avatarImage ? (
//                         <img 
//                           src={avatarImage} 
//                           alt="Profile" 
//                           className="w-full h-full object-cover"
//                         />
//                       ) : (
//                         <span className="text-gray-600 font-bold">DG</span>
//                       )}
//                     </div>
//                     <button
//                       type="button"
//                       onClick={() => avatarRef.current?.click()}
//                       className="mt-2 w-[110px] rounded border border-gray-300 bg-white py-1.5 text-[12px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
//                     >
//                       ↓ Upload
//                     </button>
//                     <input 
//                       ref={avatarRef} 
//                       type="file" 
//                       accept="image/*"
//                       onChange={handleAvatarUpload}
//                       className="hidden" 
//                     />
//                     <p className="mt-1 text-[10px] text-gray-500 text-center">
//                       JPG, PNG up to 5MB
//                     </p>
//                   </div>

//                   <div className="grid grid-cols-1 gap-3">
//                     <Field label="Full Name / Display Name">
//                       <input
//                         value={f.name}
//                         onChange={upd("name")}
//                         placeholder="Your name"
//                         className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                       />
//                     </Field>
//                     <Field label="Email (primary)">
//                       <input
//                         type="email"
//                         value={f.email}
//                         onChange={upd("email")}
//                         placeholder="you@example.com"
//                         className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                       />
//                     </Field>
//                     <Field label="Phone Number (optional)" hint="E.164 format recommended (e.g., +255712345678).">
//                       <input
//                         type="tel"
//                         value={f.phone}
//                         onChange={upd("phone")}
//                         placeholder="+255712345678"
//                         className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                       />
//                     </Field>
//                   </div>
//                 </div>

//                 {/* Authentication & Security */}
//                 <Section title="Authentication & Security">
//                   <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
//                     {/* Change Password */}
//                     <div>
//                       <h3 className="mb-2 text-sm font-semibold text-gray-900">Change Password</h3>
//                       <div className="grid gap-3">
//                         <Field label="Old Password">
//                           <PwField
//                             v={f.oldPw}
//                             onChange={upd("oldPw")}
//                             ph="Old Password"
//                             open={showPw.old}
//                             toggle={() => setShowPw((s) => ({ ...s, old: !s.old }))}
//                           />
//                         </Field>
//                         <Field label="New Password">
//                           <PwField
//                             v={f.newPw}
//                             onChange={upd("newPw")}
//                             ph="New Password"
//                             open={showPw.new1}
//                             toggle={() => setShowPw((s) => ({ ...s, new1: !s.new1 }))}
//                           />
//                           {f.newPw && (
//                             <div className="mt-2">
//                               <div className={`text-xs ${passwordStrength.color}`}>
//                                 Password strength: {passwordStrength.text}
//                               </div>
//                               <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
//                                 <div 
//                                   className={`h-1.5 rounded-full transition-all duration-300 ${
//                                     passwordStrength.level === 1 ? 'bg-red-500 w-1/3' :
//                                     passwordStrength.level === 2 ? 'bg-yellow-500 w-2/3' :
//                                     passwordStrength.level === 3 ? 'bg-green-500 w-full' : 'w-0'
//                                   }`}
//                                 ></div>
//                               </div>
//                             </div>
//                           )}
//                         </Field>
//                         <Field label="Confirm New Password">
//                           <PwField
//                             v={f.confirmPw}
//                             onChange={upd("confirmPw")}
//                             ph="Confirm New Password"
//                             open={showPw.new2}
//                             toggle={() => setShowPw((s) => ({ ...s, new2: !s.new2 }))}
//                           />
//                           {f.confirmPw && (
//                             <div className="mt-2">
//                               <div className={`text-xs ${
//                                 f.newPw === f.confirmPw ? 'text-green-500' : 'text-red-500'
//                               }`}>
//                                 {f.newPw === f.confirmPw ? '✓ Passwords match' : '✗ Passwords do not match'}
//                               </div>
//                             </div>
//                           )}
//                         </Field>
//                         <button
//                           onClick={savePassword}
//                           type="button"
//                           className="mt-1 w-full rounded bg-[#00E676] py-2 text-[14px] font-semibold text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-300"
//                         >
//                           Submit
//                         </button>
//                       </div>
//                     </div>

//                     {/* Change Email + 2FA + sessions */}
//                     <div>
//                       <h3 className="mb-2 text-sm font-semibold text-gray-900">Change Email</h3>
//                       <div className="grid gap-3">
//                         <Field label="New Email">
//                           <input
//                             type="email"
//                             value={f.newEmail}
//                             onChange={upd("newEmail")}
//                             placeholder="Enter new email address"
//                             className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                           />
//                         </Field>
//                         <button
//                           onClick={saveEmail}
//                           type="button"
//                           className="mt-1 w-full rounded bg-[#00E676] py-2 text-[14px] font-semibold text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-300"
//                         >
//                           Submit
//                         </button>
//                       </div>

//                       {/* 2FA */}
//                       <div className="mt-5 rounded border border-gray-200 bg-white p-3">
//                         <div className="flex items-center justify-between">
//                           <div>
//                             <div className="text-sm font-semibold text-gray-900">Two‑Factor Authentication (2FA)</div>
//                             <div className="text-xs text-gray-600">Use an Authenticator app or SMS. Backup codes provided.</div>
//                           </div>
//                           <button
//                             onClick={setup2FA}
//                             className="rounded border border-blue-600 px-3 py-1.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50"
//                           >
//                             Set up
//                           </button>
//                         </div>
//                       </div>

//                       {/* Sessions & Delete */}
//                       <div className="mt-3 flex flex-wrap gap-2">
//                         <button
//                           onClick={logoutAll}
//                           className="rounded border border-gray-300 bg-white px-3 py-1.5 text-[13px] hover:bg-gray-50"
//                         >
//                           Log out of all devices
//                         </button>
//                         <button
//                           onClick={deleteAccount}
//                           className="rounded border border-rose-600 px-3 py-1.5 text-[13px] font-semibold text-rose-600 hover:bg-rose-50"
//                         >
//                           Delete account
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 </Section>
//               </>
//             )}

//             {/* -------------------- PREFERENCES -------------------- */}
//             {tab === "Preferences" && (
//               <>
//                 <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
//                   {/* Localization & UI */}
//                   <div className="rounded border border-gray-200 bg-white p-4">
//                     <div className="mb-2 text-sm font-semibold text-gray-900">Localization & UI</div>
//                     <div className="grid gap-3">
//                       <Field label="Language (multilingual support)">
//                         <select
//                           value={f.lang}
//                           onChange={upd("lang")}
//                           className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                         >
//                           {languages.map((l) => (
//                             <option key={l.code} value={l.code}>
//                               {l.label}
//                             </option>
//                           ))}
//                         </select>
//                       </Field>

//                       <Field label="Time Zone">
//                         <select
//                           value={f.tz}
//                           onChange={upd("tz")}
//                           className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                         >
//                           {timezones.map((tz) => (
//                             <option key={tz.value} value={tz.value}>
//                               {tz.label}
//                             </option>
//                           ))}
//                         </select>
//                       </Field>

//                       <Field label="Date/Time format">
//                         <select
//                           value={f.dateFmt}
//                           onChange={upd("dateFmt")}
//                           className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                         >
//                           <option value="24h">24‑hour</option>
//                           <option value="12h">12‑hour</option>
//                         </select>
//                       </Field>

//                       <Field label="First day of week">
//                         <select
//                           value={f.weekStart}
//                           onChange={upd("weekStart")}
//                           className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                         >
//                           <option value="Mon">Monday</option>
//                           <option value="Sun">Sunday</option>
//                         </select>
//                       </Field>
//                     </div>
//                   </div>

//                   {/* Appearance */}
//                   <div className="rounded border border-gray-200 bg-white p-4">
//                     <div className="mb-2 text-sm font-semibold text-gray-900">Appearance</div>
//                     <div className="grid gap-3">
//                       <Field label="Theme">
//                         <select
//                           value={f.theme}
//                           onChange={upd("theme")}
//                           className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                         >
//                           <option value="light">Light</option>
//                           <option value="dark">Dark</option>
//                           <option value="system">System</option>
//                         </select>
//                       </Field>
//                       <Field label="Density (font size / spacing)">
//                         <select
//                           value={f.density}
//                           onChange={upd("density")}
//                           className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                         >
//                           <option value="compact">Compact</option>
//                           <option value="comfortable">Comfortable</option>
//                         </select>
//                       </Field>
//                     </div>
//                   </div>

//                   {/* Notifications & Productivity */}
//                   <div className="rounded border border-gray-200 bg-white p-4 md:col-span-2">
//                     <div className="mb-2 text-sm font-semibold text-gray-900">Notifications & Productivity</div>
//                     <div className="grid gap-5 md:grid-cols-2">
//                       <div className="grid gap-3">
//                         <Toggle
//                           checked={f.notifications.email}
//                           onChange={(v) => setF((s) => ({ ...s, notifications: { ...s.notifications, email: v } }))}
//                           label="Email notifications"
//                         />
//                         <Toggle
//                           checked={f.notifications.push}
//                           onChange={(v) => setF((s) => ({ ...s, notifications: { ...s.notifications, push: v } }))}
//                           label="Push notifications"
//                         />
//                         <Toggle
//                           checked={f.notifications.inapp}
//                           onChange={(v) => setF((s) => ({ ...s, notifications: { ...s.notifications, inapp: v } }))}
//                           label="In‑app notifications"
//                         />
//                       </div>

//                       <div className="grid gap-3">
//                         <div className="grid grid-cols-2 gap-3">
//                           <Field label="Work Hours — Start">
//                             <input
//                               type="time"
//                               value={f.workStart}
//                               onChange={upd("workStart")}
//                               className="h-10 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                             />
//                           </Field>
//                           <Field label="Work Hours — End">
//                             <input
//                               type="time"
//                               value={f.workEnd}
//                               onChange={upd("workEnd")}
//                               className="h-10 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                             />
//                           </Field>
//                         </div>
//                         <div className="grid grid-cols-2 gap-3">
//                           <Toggle
//                             checked={f.reminders.enabled}
//                             onChange={(v) => setF((s) => ({ ...s, reminders: { ...s.reminders, enabled: v } }))}
//                             label="Goal reminders"
//                           />
//                           <Field label="Reminder time">
//                             <input
//                               type="time"
//                               value={f.reminders.time}
//                               onChange={(e) => setF((s) => ({ ...s, reminders: { ...s.reminders, time: e.target.value } }))}
//                               className="h-10 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                             />
//                           </Field>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </>
//             )}

//             {/* -------------------- SYNCHRONIZATION -------------------- */}
//             {tab === "Synchronization" && (
//               <>
//                 <div className="grid gap-5 md:grid-cols-2">
//                   {/* Calendars */}
//                   <div className="rounded border border-gray-200 bg-white p-4">
//                     <div className="mb-2 text-sm font-semibold text-gray-900">Calendar Integrations</div>
//                     <div className="grid gap-3 text-sm">
//                       <Toggle
//                         checked={f.gcal}
//                         onChange={(v) => setF((s) => ({ ...s, gcal: v }))}
//                         label="Google Calendar (connect/disconnect)"
//                       />
//                       <Toggle
//                         checked={f.outlook}
//                         onChange={(v) => setF((s) => ({ ...s, outlook: v }))}
//                         label="Outlook Calendar"
//                       />
//                       <Toggle
//                         checked={f.ical}
//                         onChange={(v) => setF((s) => ({ ...s, ical: v }))}
//                         label="iCal"
//                       />
//                     </div>
//                   </div>

//                   {/* Connected Accounts */}
//                   <div className="rounded border border-gray-200 bg-white p-4">
//                     <div className="mb-2 text-sm font-semibold text-gray-900">Connected Accounts</div>
//                     <div className="grid gap-3 text-sm">
//                       <Toggle
//                         checked={f.googleLogin}
//                         onChange={(v) => setF((s) => ({ ...s, googleLogin: v }))}
//                         label="Google Login"
//                       />
//                       <Toggle
//                         checked={f.microsoftLogin}
//                         onChange={(v) => setF((s) => ({ ...s, microsoftLogin: v }))}
//                         label="Microsoft Login"
//                       />
//                       <Toggle
//                         checked={f.slack}
//                         onChange={(v) => setF((s) => ({ ...s, slack: v }))}
//                         label="Slack"
//                       />
//                       <Toggle
//                         checked={f.teams}
//                         onChange={(v) => setF((s) => ({ ...s, teams: v }))}
//                         label="Microsoft Teams"
//                       />
//                       <Toggle
//                         checked={f.dropbox}
//                         onChange={(v) => setF((s) => ({ ...s, dropbox: v }))}
//                         label="Dropbox"
//                       />
//                       <Toggle
//                         checked={f.onedrive}
//                         onChange={(v) => setF((s) => ({ ...s, onedrive: v }))}
//                         label="OneDrive"
//                       />
//                       <Toggle
//                         checked={f.drive}
//                         onChange={(v) => setF((s) => ({ ...s, drive: v }))}
//                         label="Google Drive"
//                       />
//                     </div>
//                   </div>

//                   {/* Data Sync Options */}
//                   <div className="rounded border border-gray-200 bg-white p-4 md:col-span-2">
//                     <div className="mb-2 text-sm font-semibold text-gray-900">Data Sync Options</div>
//                     <div className="grid gap-4 md:grid-cols-2">
//                       <Toggle
//                         checked={f.twoWaySync}
//                         onChange={(v) => setF((s) => ({ ...s, twoWaySync: v }))}
//                         label="Two‑way sync (tasks ↔ calendar)"
//                       />
//                       <Field label="Integration permissions">
//                         <select
//                           value={f.integrationPerms}
//                           onChange={upd("integrationPerms")}
//                           className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
//                         >
//                           <option value="standard">Standard</option>
//                           <option value="restricted">Restricted</option>
//                         </select>
//                       </Field>
//                     </div>
//                   </div>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
export default function SetProfile() {
  const [tab, setTab] = useState("Account");
  const [showPw, setShowPw] = useState({ old: false, new1: false, new2: false });
  const [avatarImage, setAvatarImage] = useState(null);
  const avatarRef = useRef(null);

  // 2FA State Management
  const [twoFA, setTwoFA] = useState({
    enabled: false,
    setupStep: 0, // 0: not started, 1: QR code, 2: verify code, 3: backup codes, 4: completed
    secretKey: "",
    qrCode: "",
    verificationCode: "",
    backupCodes: [],
    showBackupCodes: false
  });

  // Stable toggle functions to prevent input re-rendering
  const toggleOldPw = useCallback(() => setShowPw((s) => ({ ...s, old: !s.old })), []);
  const toggleNewPw = useCallback(() => setShowPw((s) => ({ ...s, new1: !s.new1 })), []);
  const toggleConfirmPw = useCallback(() => setShowPw((s) => ({ ...s, new2: !s.new2 })), []);

  // Stable onChange functions for password fields
  const handleOldPwChange = useCallback((e) => setF((s) => ({ ...s, oldPw: e.target.value })), []);
  const handleNewPwChange = useCallback((e) => setF((s) => ({ ...s, newPw: e.target.value })), []);
  const handleConfirmPwChange = useCallback((e) => setF((s) => ({ ...s, confirmPw: e.target.value })), []);

  // Select options
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

  // Form state (stub; replace with your data fetching)
  const [f, setF] = useState({
    // Account
    name: "DAMIAN GALLUSI",
    email: "gallusi123@gmail.com",
    phone: "+255 714 478 319",
    oldPw: "",
    newPw: "",
    confirmPw: "",
    newEmail: "",
    // Preferences
    lang: "en",
    tz: "Africa/Nairobi",
    dateFmt: "24h",
    weekStart: "Mon",
    theme: "system",
    density: "comfortable", // compact/comfortable
    notifications: { email: true, push: true, inapp: true },
    workStart: "09:00",
    workEnd: "17:00",
    reminders: { enabled: true, time: "08:00" },
    // Sync
    gcal: false,
    outlook: false,
    ical: false,
    googleLogin: false,
    microsoftLogin: false,
    slack: false,
    teams: false,
    dropbox: false,
    onedrive: false,
    drive: false,
    twoWaySync: true,
    integrationPerms: "standard", // standard/restricted
  });
  const upd = useCallback((k) => (e) => setF((s) => ({ ...s, [k]: e.target.value })), []);

  // Small UI helpers
  const Toggle = ({ checked, onChange, label }) => (
    <div className="flex items-center justify-between gap-4">
      {label ? <span className="text-sm text-gray-700">{label}</span> : null}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={
          "relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 " +
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
    </div>
  );

  const Eye = ({ open }) => (
    <FontAwesomeIcon 
      icon={open ? faEye : faEyeSlash} 
      className="text-lg sm:text-2xl text-gray-500" 
    />
  );

  const PwField = useCallback(({ v, onChange, ph, open, toggle }) => (
    <div className="relative">
      <input
        type={open ? "text" : "password"}
        value={v}
        onChange={onChange}
        placeholder={ph}
        className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Toggle password"
      >
        <Eye open={open} />
      </button>
    </div>
  ), []);

  const Field = ({ label, hint, children }) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-800">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
    </label>
  );

  const Section = ({ title, children }) => (
    <section className="mt-6 border-t border-gray-200 pt-5">
      <h2 className="mb-3 text-[15px] font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );

  // --- Optimized password strength calculation with useMemo ---
  const passwordStrength = useMemo(() => {
    const password = f.newPw;
    if (!password) return { level: 0, text: "", color: "" };
    if (password.length < 8) return { level: 1, text: "Too short (min 8 characters)", color: "text-red-500" };
    if (password.length >= 8 && password.length < 12) return { level: 2, text: "Good", color: "text-yellow-500" };
    return { level: 3, text: "Strong", color: "text-green-500" };
  }, [f.newPw]);

  // --- Handlers (replace with real API calls) ---

  const savePassword = () => {
    // Validate password requirements
    if (!f.oldPw) {
      alert("Please enter your current password.");
      return;
    }
    
    if (!f.newPw) {
      alert("Please enter a new password.");
      return;
    }
    
    if (f.newPw.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }
    
    if (f.newPw !== f.confirmPw) {
      alert("New password and confirm password do not match.");
      return;
    }
    
    // Front-end simulation: Accept any old password for testing
    // In real implementation, this would validate against backend
    // TODO: POST /api/change-password { old: f.oldPw, new: f.newPw }
    
    // Clear the form and show success
    setF(prev => ({
      ...prev,
      oldPw: "",
      newPw: "",
      confirmPw: ""
    }));
    
    alert("Password updated successfully! (Front-end simulation)");
  };
  const saveEmail = () => {
    // TODO: POST /api/change-email { newEmail: f.newEmail }
    alert("Email change submitted (stub).");
  };
  const setup2FA = () => {
    if (twoFA.enabled) {
      // Disable 2FA
      if (confirm("Are you sure you want to disable Two-Factor Authentication?")) {
        setTwoFA({
          enabled: false,
          setupStep: 0,
          secretKey: "",
          qrCode: "",
          verificationCode: "",
          backupCodes: [],
          showBackupCodes: false
        });
        alert("2FA has been disabled successfully!");
      }
    } else {
      // Start 2FA setup
      const secretKey = generateSecretKey();
      const qrCode = generateQRCode(secretKey);
      setTwoFA(prev => ({
        ...prev,
        setupStep: 1,
        secretKey,
        qrCode
      }));
    }
  };

  // Generate mock secret key for 2FA
  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Generate mock QR code URL
  const generateQRCode = (secret) => {
    const appName = "Practical Manager";
    const userName = f.email;
    return `otpauth://totp/${appName}:${userName}?secret=${secret}&issuer=${appName}`;
  };

  // Generate backup codes
  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  // Handle 2FA verification
  const verify2FACode = () => {
    const code = twoFA.verificationCode;
    // Mock verification - accept any 6-digit code
    if (code.length === 6 && /^\d+$/.test(code)) {
      const backupCodes = generateBackupCodes();
      setTwoFA(prev => ({
        ...prev,
        setupStep: 3,
        backupCodes,
        showBackupCodes: true
      }));
    } else {
      alert("Please enter a valid 6-digit code from your authenticator app.");
    }
  };

  // Complete 2FA setup
  const complete2FASetup = () => {
    setTwoFA(prev => ({
      ...prev,
      enabled: true,
      setupStep: 0,
      verificationCode: "",
      showBackupCodes: false
    }));
    alert("Two-Factor Authentication has been enabled successfully!");
  };
  const logoutAll = () => {
    // TODO: POST /api/sessions/logout-all
    alert("Logged out of all devices (stub).");
  };
  const deleteAccount = () => {
    // TODO: DELETE /api/account
    if (confirm("Are you sure you want to delete your account?")) {
      alert("Account deletion requested (stub).");
    }
  };

  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarImage(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file (JPG, PNG, GIF, etc.)");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] px-5 py-8">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-6 shadow">
        <h1 className="mb-5 text-2xl font-semibold text-gray-900">Profile Settings</h1>

        <div className="grid gap-6 lg:grid-cols-[240px_auto]">
          {/* Tabs (left) */}
          <nav className="rounded-xl border border-gray-200 bg-gray-50 p-2 text-[13px]">
            {["Account", "Preferences", "Synchronization"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  "mb-1 w-full rounded-lg px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-300 " +
                  (tab === t ? "bg-white text-blue-700 shadow-inner" : "hover:bg-white hover:text-gray-800")
                }
              >
                {t}
              </button>
            ))}
          </nav>

          {/* Content (right) */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="mb-4 rounded bg-gray-100 px-3 py-2 text-center text-[12px] font-semibold tracking-wide text-gray-700">
              {tab.toUpperCase()}
            </div>

            {/* -------------------- ACCOUNT -------------------- */}
            {tab === "Account" && (
              <>
                {/* Profile Information */}
                <div className="grid grid-cols-[96px_1fr] gap-5">
                  <div className="flex flex-col items-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-300 text-3xl text-white overflow-hidden">
                      {avatarImage ? (
                        <img 
                          src={avatarImage} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-bold">DG</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarRef.current?.click()}
                      className="mt-2 w-[110px] rounded border border-gray-300 bg-white py-1.5 text-[12px] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      ↓ Upload
                    </button>
                    <input 
                      ref={avatarRef} 
                      type="file" 
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden" 
                    />
                    <p className="mt-1 text-[10px] text-gray-500 text-center">
                      JPG, PNG up to 5MB
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Full Name / Display Name">
                      <input
                        value={f.name}
                        onChange={upd("name")}
                        placeholder="Your name"
                        className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                      />
                    </Field>
                    <Field label="Email (primary)">
                      <input
                        type="email"
                        value={f.email}
                        onChange={upd("email")}
                        placeholder="you@example.com"
                        className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                      />
                    </Field>
                    <Field label="Phone Number (optional)" hint="E.164 format recommended (e.g., +255712345678).">
                      <input
                        type="tel"
                        value={f.phone}
                        onChange={upd("phone")}
                        placeholder="+255712345678"
                        className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                      />
                    </Field>
                  </div>
                </div>

                {/* Authentication & Security */}
                <Section title="Authentication & Security">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Change Password */}
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-900">Change Password</h3>
                      <div className="grid gap-3">
                        <Field label="Old Password">
                          <PwField
                            v={f.oldPw}
                            onChange={handleOldPwChange}
                            ph="Old Password"
                            open={showPw.old}
                            toggle={toggleOldPw}
                          />
                        </Field>
                        <Field label="New Password">
                          <PwField
                            v={f.newPw}
                            onChange={handleNewPwChange}
                            ph="New Password"
                            open={showPw.new1}
                            toggle={toggleNewPw}
                          />
                          {f.newPw && (
                            <div className="mt-2">
                              <div className={`text-xs ${passwordStrength.color}`}>
                                Password strength: {passwordStrength.text}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className={`h-1.5 rounded-full transition-all duration-300 ${
                                    passwordStrength.level === 1 ? 'bg-red-500 w-1/3' :
                                    passwordStrength.level === 2 ? 'bg-yellow-500 w-2/3' :
                                    passwordStrength.level === 3 ? 'bg-green-500 w-full' : 'w-0'
                                  }`}
                                ></div>
                              </div>
                            </div>
                          )}
                        </Field>
                        <Field label="Confirm New Password">
                          <PwField
                            v={f.confirmPw}
                            onChange={handleConfirmPwChange}
                            ph="Confirm New Password"
                            open={showPw.new2}
                            toggle={toggleConfirmPw}
                          />
                          {f.confirmPw && (
                            <div className="mt-2">
                              <div className={`text-xs ${
                                f.newPw === f.confirmPw ? 'text-green-500' : 'text-red-500'
                              }`}>
                                {f.newPw === f.confirmPw ? '✓ Passwords match' : '✗ Passwords do not match'}
                              </div>
                            </div>
                          )}
                        </Field>
                        <button
                          onClick={savePassword}
                          type="button"
                          className="mt-1 w-full rounded bg-[#00E676] py-2 text-[14px] font-semibold text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          Submit
                        </button>
                      </div>
                    </div>

                    {/* Change Email + 2FA + sessions */}
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-gray-900">Change Email</h3>
                      <div className="grid gap-3">
                        <Field label="New Email">
                          <input
                            type="email"
                            value={f.newEmail}
                            onChange={upd("newEmail")}
                            placeholder="Enter new email address"
                            className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                          />
                        </Field>
                        <button
                          onClick={saveEmail}
                          type="button"
                          className="mt-1 w-full rounded bg-[#00E676] py-2 text-[14px] font-semibold text-white hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          Submit
                        </button>
                      </div>

                      {/* 2FA */}
                      <div className="mt-5 rounded border border-gray-200 bg-white p-4">
                        {/* 2FA Header */}
                        {twoFA.setupStep === 0 && (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                Two‑Factor Authentication (2FA)
                                {twoFA.enabled && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Enabled</span>}
                              </div>
                              <div className="text-xs text-gray-600">
                                {twoFA.enabled 
                                  ? "Your account is protected with 2FA. You can disable it or view backup codes."
                                  : "Add an extra layer of security to your account with two-factor authentication."
                                }
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {twoFA.enabled && (
                                <button
                                  onClick={() => setTwoFA(prev => ({ ...prev, showBackupCodes: !prev.showBackupCodes }))}
                                  className="rounded border border-gray-300 px-3 py-1.5 text-[13px] hover:bg-gray-50"
                                >
                                  {twoFA.showBackupCodes ? 'Hide' : 'Show'} Backup Codes
                                </button>
                              )}
                              <button
                                onClick={setup2FA}
                                className={`rounded px-3 py-1.5 text-[13px] font-semibold ${
                                  twoFA.enabled 
                                    ? 'border border-red-600 text-red-600 hover:bg-red-50'
                                    : 'border border-blue-600 text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                {twoFA.enabled ? 'Disable 2FA' : 'Enable 2FA'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Backup Codes Display */}
                        {twoFA.enabled && twoFA.showBackupCodes && twoFA.setupStep === 0 && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="text-sm font-semibold text-gray-900 mb-2">Backup Codes</div>
                            <div className="text-xs text-gray-600 mb-3">
                              Save these codes in a safe place. Each code can only be used once.
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                              {twoFA.backupCodes.map((code, index) => (
                                <div key={index} className="bg-white p-2 rounded border text-center">
                                  {code}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Step 1: QR Code */}
                        {twoFA.setupStep === 1 && (
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900 mb-2">Step 1: Scan QR Code</div>
                            <div className="text-xs text-gray-600 mb-4">
                              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                            </div>
                            
                            {/* Mock QR Code */}
                            <div className="mx-auto w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                              <div className="text-center">
                                <div className="text-4xl mb-2">📱</div>
                                <div className="text-xs text-gray-500">QR Code</div>
                                <div className="text-xs text-gray-400">Scan with authenticator app</div>
                              </div>
                            </div>

                            {/* Manual Entry */}
                            <div className="mb-4">
                              <div className="text-xs text-gray-600 mb-2">Or enter this key manually:</div>
                              <div className="bg-gray-50 p-2 rounded border font-mono text-sm break-all">
                                {twoFA.secretKey}
                              </div>
                            </div>

                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => setTwoFA(prev => ({ ...prev, setupStep: 0 }))}
                                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => setTwoFA(prev => ({ ...prev, setupStep: 2 }))}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                I've Added the Account
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 2: Verify Code */}
                        {twoFA.setupStep === 2 && (
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900 mb-2">Step 2: Verify Code</div>
                            <div className="text-xs text-gray-600 mb-4">
                              Enter the 6-digit code from your authenticator app
                            </div>
                            
                            <div className="max-w-xs mx-auto mb-4">
                              <input
                                type="text"
                                value={twoFA.verificationCode}
                                onChange={(e) => setTwoFA(prev => ({ ...prev, verificationCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                                placeholder="000000"
                                className="w-full text-center text-lg font-mono h-12 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                                maxLength="6"
                              />
                            </div>

                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => setTwoFA(prev => ({ ...prev, setupStep: 1, verificationCode: "" }))}
                                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Back
                              </button>
                              <button
                                onClick={verify2FACode}
                                disabled={twoFA.verificationCode.length !== 6}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Verify Code
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Backup Codes */}
                        {twoFA.setupStep === 3 && (
                          <div className="text-center">
                            <div className="text-sm font-semibold text-gray-900 mb-2">Step 3: Save Backup Codes</div>
                            <div className="text-xs text-gray-600 mb-4">
                              Save these backup codes in a safe place. Each code can only be used once to access your account if you lose your authenticator device.
                            </div>
                            
                            <div className="max-w-md mx-auto mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                                {twoFA.backupCodes.map((code, index) => (
                                  <div key={index} className="bg-white p-2 rounded border text-center">
                                    {code}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="text-xs text-orange-600 mb-4">
                              ⚠️ Important: These codes will not be shown again. Save them now!
                            </div>

                            <button
                              onClick={complete2FASetup}
                              className="px-6 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              I've Saved the Backup Codes
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sessions & Delete */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={logoutAll}
                          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-[13px] hover:bg-gray-50"
                        >
                          Log out of all devices
                        </button>
                        <button
                          onClick={deleteAccount}
                          className="rounded border border-rose-600 px-3 py-1.5 text-[13px] font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Delete account
                        </button>
                      </div>
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* -------------------- PREFERENCES -------------------- */}
            {tab === "Preferences" && (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Localization & UI */}
                  <div className="rounded border border-gray-200 bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Localization & UI</div>
                    <div className="grid gap-3">
                      <Field label="Language (multilingual support)">
                        <select
                          value={f.lang}
                          onChange={upd("lang")}
                          className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                        >
                          {languages.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Time Zone">
                        <select
                          value={f.tz}
                          onChange={upd("tz")}
                          className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                        >
                          {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Date/Time format">
                        <select
                          value={f.dateFmt}
                          onChange={upd("dateFmt")}
                          className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                        >
                          <option value="24h">24‑hour</option>
                          <option value="12h">12‑hour</option>
                        </select>
                      </Field>

                      <Field label="First day of week">
                        <select
                          value={f.weekStart}
                          onChange={upd("weekStart")}
                          className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                        >
                          <option value="Mon">Monday</option>
                          <option value="Sun">Sunday</option>
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="rounded border border-gray-200 bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Appearance</div>
                    <div className="grid gap-3">
                      <Field label="Theme">
                        <select
                          value={f.theme}
                          onChange={upd("theme")}
                          className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                          <option value="system">System</option>
                        </select>
                      </Field>
                      <Field label="Density (font size / spacing)">
                        <select
                          value={f.density}
                          onChange={upd("density")}
                          className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                        >
                          <option value="compact">Compact</option>
                          <option value="comfortable">Comfortable</option>
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* Notifications & Productivity */}
                  <div className="rounded border border-gray-200 bg-white p-4 md:col-span-2">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Notifications & Productivity</div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="grid gap-3">
                        <Toggle
                          checked={f.notifications.email}
                          onChange={(v) => setF((s) => ({ ...s, notifications: { ...s.notifications, email: v } }))}
                          label="Email notifications"
                        />
                        <Toggle
                          checked={f.notifications.push}
                          onChange={(v) => setF((s) => ({ ...s, notifications: { ...s.notifications, push: v } }))}
                          label="Push notifications"
                        />
                        <Toggle
                          checked={f.notifications.inapp}
                          onChange={(v) => setF((s) => ({ ...s, notifications: { ...s.notifications, inapp: v } }))}
                          label="In‑app notifications"
                        />
                      </div>

                      <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Work Hours — Start">
                            <input
                              type="time"
                              value={f.workStart}
                              onChange={upd("workStart")}
                              className="h-10 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                            />
                          </Field>
                          <Field label="Work Hours — End">
                            <input
                              type="time"
                              value={f.workEnd}
                              onChange={upd("workEnd")}
                              className="h-10 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                            />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Toggle
                            checked={f.reminders.enabled}
                            onChange={(v) => setF((s) => ({ ...s, reminders: { ...s.reminders, enabled: v } }))}
                            label="Goal reminders"
                          />
                          <Field label="Reminder time">
                            <input
                              type="time"
                              value={f.reminders.time}
                              onChange={(e) => setF((s) => ({ ...s, reminders: { ...s.reminders, time: e.target.value } }))}
                              className="h-10 w-full rounded border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* -------------------- SYNCHRONIZATION -------------------- */}
            {tab === "Synchronization" && (
              <>
                <div className="grid gap-5 md:grid-cols-2">
                  {/* Calendars */}
                  <div className="rounded border border-gray-200 bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Calendar Integrations</div>
                    <div className="grid gap-3 text-sm">
                      <Toggle
                        checked={f.gcal}
                        onChange={(v) => setF((s) => ({ ...s, gcal: v }))}
                        label="Google Calendar (connect/disconnect)"
                      />
                      <Toggle
                        checked={f.outlook}
                        onChange={(v) => setF((s) => ({ ...s, outlook: v }))}
                        label="Outlook Calendar"
                      />
                      <Toggle
                        checked={f.ical}
                        onChange={(v) => setF((s) => ({ ...s, ical: v }))}
                        label="iCal"
                      />
                    </div>
                  </div>

                  {/* Connected Accounts */}
                  <div className="rounded border border-gray-200 bg-white p-4">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Connected Accounts</div>
                    <div className="grid gap-3 text-sm">
                      <Toggle
                        checked={f.googleLogin}
                        onChange={(v) => setF((s) => ({ ...s, googleLogin: v }))}
                        label="Google Login"
                      />
                      <Toggle
                        checked={f.microsoftLogin}
                        onChange={(v) => setF((s) => ({ ...s, microsoftLogin: v }))}
                        label="Microsoft Login"
                      />
                      <Toggle
                        checked={f.slack}
                        onChange={(v) => setF((s) => ({ ...s, slack: v }))}
                        label="Slack"
                      />
                      <Toggle
                        checked={f.teams}
                        onChange={(v) => setF((s) => ({ ...s, teams: v }))}
                        label="Microsoft Teams"
                      />
                      <Toggle
                        checked={f.dropbox}
                        onChange={(v) => setF((s) => ({ ...s, dropbox: v }))}
                        label="Dropbox"
                      />
                      <Toggle
                        checked={f.onedrive}
                        onChange={(v) => setF((s) => ({ ...s, onedrive: v }))}
                        label="OneDrive"
                      />
                      <Toggle
                        checked={f.drive}
                        onChange={(v) => setF((s) => ({ ...s, drive: v }))}
                        label="Google Drive"
                      />
                    </div>
                  </div>

                  {/* Data Sync Options */}
                  <div className="rounded border border-gray-200 bg-white p-4 md:col-span-2">
                    <div className="mb-2 text-sm font-semibold text-gray-900">Data Sync Options</div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Toggle
                        checked={f.twoWaySync}
                        onChange={(v) => setF((s) => ({ ...s, twoWaySync: v }))}
                        label="Two‑way sync (tasks ↔ calendar)"
                      />
                      <Field label="Integration permissions">
                        <select
                          value={f.integrationPerms}
                          onChange={upd("integrationPerms")}
                          className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                        >
                          <option value="standard">Standard</option>
                          <option value="restricted">Restricted</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
