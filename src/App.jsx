import { Routes, Route, useLocation } from "react-router-dom";
import { Suspense } from "react";
import Navbar from "./components/shared/Navbar.jsx";
import ModalManager from "./components/shared/ModalManager.jsx";
import PrivateRoute from "./components/shared/PrivateRoute.jsx";
import Footer from "./components/shared/Footer.jsx";
import { isFeatureEnabled } from "./utils/flags.js";

// Core pages
import LoginPage from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import PasswordPageForget from "./pages/PasswordPageForget.jsx";
import ResetPasswordpage from "./pages/ResetPasswordpage.jsx";
import Registration from "./pages/Registration.jsx";
import RequestRegistrationLink from "./pages/RequestRegistrationLink.jsx";
import ProfileSetting from "./pages/SetProfile.jsx";
import ConnectionTest from "./pages/ConnectionTest.jsx";
import Contacts from "./pages/Contacts.jsx";
import Modules from "./pages/Modules.jsx";
import Testimonials from "./pages/Testimonials.jsx"

// Dashboard pages
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import ENPS from "./pages/dashboard/ENPS.jsx";
import Recognition from "./pages/dashboard/Recognition.jsx";
import Notifications from "./pages/dashboard/Notifications.jsx";
import TeamDashboard from "./pages/dashboard/TeamDashboard.jsx";
import EnpsDashboard from "./pages/admin/EnpsDashboard.jsx";

// Main feature pages
import Calendar from "./pages/Calendar.jsx";
import Goals from "./pages/Goals.jsx";
import GoalDetail from "./pages/GoalDetail.jsx";
import DontForget from "./pages/DontForget.jsx";
import KeyAreas from "./pages/KeyAreas.jsx";
import MyFocus from "./pages/MyFocus.jsx";
import Teams from "./pages/Teams.jsx";
import TeamDetail from "./pages/TeamDetail.jsx";
import GiveStrokes from "./pages/GiveStrokes.jsx";
import ViewStrokes from "./pages/ViewStrokes.jsx";
import MemberProfile from "./pages/MemberProfile.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import VerifyPasswordChange from "./pages/VerifyPasswordChange.jsx";
import VerifyEmailChange from "./pages/VerifyEmailChange.jsx";
import Pricing from "./pages/Pricing.jsx";
import Reminders from "./pages/Reminders.jsx";
import JoinOrganization from "./pages/JoinOrganization.jsx";
import InvitationEntry from "./pages/InvitationEntry.jsx";
import OnboardingWizard from "./pages/OnboardingWizard.jsx";
import CalendarSyncStatus from "./pages/CalendarSyncStatus.jsx";
export default function App() {
    const calendarEnabled = isFeatureEnabled("calendar");
    // Only show footer on public/auth pages
    const publicFooterRoutes = [
        "/", "/login", "/PasswordPageForget", "/reset-password", "/registration", 
        "/get-started", "/verify-email", "/verify-password-change", "/verify-email-change"
    ];
    // Use react-router location so route changes (including client-side navigation)
    // update layout immediately. This prevents the main content from rendering
    // without the left margin when navigating (e.g. after login) which caused
    // dashboard tiles to appear beneath the fixed sidebar until a full refresh.
    const location = useLocation();
    const isPublicRoute = publicFooterRoutes.includes(location.pathname);
    return (
            <div className="page-bg">
                <Navbar />
                <ModalManager />
                <main className={isPublicRoute ? "flex-grow" : "flex-grow pt-[72px] md:pt-[72px] md:ml-64"}>
                    <Suspense
                        fallback={
                            <div className="w-full py-10 flex items-center justify-center text-gray-600">
                                Loading...
                            </div>
                        }
                    >
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/PasswordPageForget" element={<PasswordPageForget />} />
                            {/* Recently Added */}
                            <Route path="/modules" element={<Modules />} />
                            <Route path="/contacts" element={<Contacts />} />
                            <Route path="/testimonials" element={<Testimonials />} />
                            <Route path="/pricing" element={<Pricing />} />

                            <Route path="/reset-password" element={<ResetPasswordpage />} />
                            <Route path="/get-started" element={<RequestRegistrationLink />} />
                            <Route path="/registration" element={<Registration />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/verify-password-change" element={<VerifyPasswordChange />} />
                            <Route path="/invite" element={<InvitationEntry />} />
                            <Route path="/join" element={<JoinOrganization />} />
                            <Route path="/onboarding" element={<OnboardingWizard />} />
                            <Route path="/verify-email-change" element={<VerifyEmailChange />} />
                            <Route path="/profile-settings" element={<ProfileSetting />} />
                            <Route path="/profile" element={<ProfileSetting />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            {calendarEnabled && <Route path="/calendar" element={<Calendar />} />}
                            <Route path="/tasks" element={<DontForget />} />
                            <Route path="/my-focus" element={<MyFocus />} />
                            <Route path="/goals" element={<Goals />} />
                            <Route path="/goals/:goalId" element={<GoalDetail />} />
                            <Route path="/enps" element={<ENPS />} />
                            <Route path="/recognition" element={<Recognition />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/dashboard/team" element={<TeamDashboard />} />
                            <Route path="/admin/enps" element={<EnpsDashboard />} />
                            <Route path="/teams" element={<Teams />} />
                            <Route path="/teams/:teamId" element={<TeamDetail />} />
                            <Route path="/give-strokes" element={<GiveStrokes />} />
                            <Route path="/view-strokes" element={<ViewStrokes />} />
                            <Route path="/member/:userId" element={<MemberProfile />} />
                            <Route path="/key-areas" element={<KeyAreas />} />
                            <Route path="/connection-test" element={<ConnectionTest />} />
                            {/* Private routes below */}
                            <Route path="/profile-settings" element={<PrivateRoute><ProfileSetting /></PrivateRoute>} />
                            <Route path="/profile" element={<PrivateRoute><ProfileSetting /></PrivateRoute>} />
                            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                            {calendarEnabled && <Route path="/calendar" element={<PrivateRoute><Calendar /></PrivateRoute>} />}
                            <Route path="/tasks" element={<PrivateRoute><DontForget /></PrivateRoute>} />
                            <Route path="/my-focus" element={<PrivateRoute><MyFocus /></PrivateRoute>} />
                            <Route path="/goals" element={<PrivateRoute><Goals /></PrivateRoute>} />
                            <Route path="/goals/:goalId" element={<PrivateRoute><GoalDetail /></PrivateRoute>} />
                            <Route path="/enps" element={<PrivateRoute><ENPS /></PrivateRoute>} />
                            <Route path="/recognition" element={<PrivateRoute><Recognition /></PrivateRoute>} />
                            <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
                            <Route path="/dashboard/team" element={<PrivateRoute><TeamDashboard /></PrivateRoute>} />
                            <Route path="/admin/enps" element={<PrivateRoute><EnpsDashboard /></PrivateRoute>} />
                            <Route path="/key-areas" element={<PrivateRoute><KeyAreas /></PrivateRoute>} />
                            <Route path="/teams" element={<PrivateRoute><Teams /></PrivateRoute>} />
                            <Route path="/teams/:teamId" element={<PrivateRoute><TeamDetail /></PrivateRoute>} />
                            <Route path="/member/:userId" element={<PrivateRoute><MemberProfile /></PrivateRoute>} />
                            <Route path="/give-strokes" element={<PrivateRoute><GiveStrokes /></PrivateRoute>} />
                            <Route path="/view-strokes" element={<PrivateRoute><ViewStrokes /></PrivateRoute>} />
                            <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
                            <Route path="/calendar-sync" element={<PrivateRoute><CalendarSyncStatus /></PrivateRoute>} />
                        </Routes>
                    </Suspense>
                </main>
                {isPublicRoute && <Footer />}
            </div>
    );
}