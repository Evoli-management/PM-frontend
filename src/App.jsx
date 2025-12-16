import { HashRouter as Router, Routes, Route } from "react-router-dom";
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

// Main feature pages
import Calendar from "./pages/Calendar.jsx";
import Goals from "./pages/Goals.jsx";
import GoalDetail from "./pages/GoalDetail.jsx";
import DontForget from "./pages/DontForget.jsx";
import KeyAreas from "./pages/KeyAreas.jsx";
import MyFocus from "./pages/MyFocus.jsx";
import Teams from "./pages/Teams.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import VerifyPasswordChange from "./pages/VerifyPasswordChange.jsx";
import VerifyEmailChange from "./pages/VerifyEmailChange.jsx";
import Pricing from "./pages/Pricing.jsx";
import Reminders from "./pages/Reminders.jsx";

export default function App() {
    const calendarEnabled = isFeatureEnabled("calendar");
    // Only show footer on public/auth pages
    const publicFooterRoutes = [
        "/", "/login", "/PasswordPageForget", "/reset-password", "/registration", 
        "/verify-email", "/verify-password-change", "/verify-email-change"
    ];
    const currentPath = window.location.hash.replace(/^#\/?/, "/");
    return (
        <Router>
            <div className="page-bg">
                <Navbar />
                <ModalManager />
                <main className="flex-grow pt-14 md:pt-14 md:ml-64">
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
                            <Route path="/registration" element={<Registration />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/verify-password-change" element={<VerifyPasswordChange />} />
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
                            <Route path="/teams" element={<Teams />} />
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
                            <Route path="/key-areas" element={<PrivateRoute><KeyAreas /></PrivateRoute>} />
                            <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
                        </Routes>
                    </Suspense>
                </main>
                {publicFooterRoutes.includes(currentPath) && <Footer />}
            </div>
        </Router>
    );
}