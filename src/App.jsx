import { HashRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import Navbar from "./components/shared/Navbar.jsx";
import Footer from "./components/shared/Footer.jsx";
// Core pages (eager imports)
import LoginPage from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import PasswordPageForget from "./pages/PasswordPageForget.jsx";
import ResetPasswordpage from "./pages/ResetPasswordpage.jsx";
import Registration from "./pages/Registration.jsx";
import ProfileSetting from "./pages/SetProfile.jsx";
import AdminSettings from "./pages/AdminSettings.jsx";
// Dashboard pages (eager imports)
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import ENPS from "./pages/dashboard/ENPS.jsx";
import Recognition from "./pages/dashboard/Recognition.jsx";
import Notifications from "./pages/dashboard/Notifications.jsx";
import Analytics from "./pages/dashboard/Analytics.jsx";
import TeamDashboard from "./pages/dashboard/TeamDashboard.jsx";
// Remaining sections (eager imports)
import Calendar from "./pages/Calendar.jsx";
import Goals from "./pages/Goals.jsx";
import Tasks from "./pages/Tasks.jsx";
import GoalDetailPage from "./pages/GoalDetailPage.jsx";
import KeyAreas from "./pages/KeyAreas.jsx";

export default function App() {
    return (
        <Router>
            <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-grow">
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
                            <Route path="/reset-password" element={<ResetPasswordpage />} />
                            <Route path="/registration" element={<Registration />} />
                            <Route path="/profile-settings" element={<ProfileSetting />} />
                            <Route path="/profile" element={<ProfileSetting />} />
                            <Route path="/admin-settings" element={<AdminSettings />} />
                            <Route path="/settings" element={<AdminSettings />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/calendar" element={<Calendar />} />
                            <Route path="/tasks" element={<Tasks />} />
                            <Route path="/goals" element={<Goals />} />
                            <Route path="/enps" element={<ENPS />} />
                            <Route path="/recognition" element={<Recognition />} />
                            <Route path="/notifications" element={<Notifications />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/dashboard/team" element={<TeamDashboard />} />
                            <Route path="/key-areas" element={<KeyAreas />} />
                        </Routes>
                    </Suspense>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/PasswordPageForget" element={<PasswordPageForget />} />
                        <Route path="/reset-password" element={<ResetPasswordpage />} />
                        <Route path="/registration" element={<Registration />} />
                        <Route path="/profile-settings" element={<ProfileSetting />} />
                        <Route path="/profile" element={<ProfileSetting />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/goals" element={<Goals />} />
                        <Route path="/goals/:goalId" element={<GoalDetailPage />} />
                        <Route path="/key-areas" element={<KeyAreas />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
}
