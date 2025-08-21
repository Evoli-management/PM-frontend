import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/shared/Navbar.jsx";
import Footer from "./components/shared/Footer.jsx";
import LoginPage from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import PasswordPageForget from "./pages/PasswordPageForget.jsx";
import ResetPasswordpage from "./pages/ResetPasswordpage.jsx";
import Registration from "./pages/Registration.jsx";
import ProfileSetting from "./pages/SetProfile.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tasks from "./pages/Tasks.jsx";
import Calendar from "./pages/Calendar.jsx";
import Goals from "./pages/Goals.jsx";
import KeyAreas from "./pages/KeyAreas.jsx";

export default function App() {
    return (
        <Router>
            <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-grow">
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
                        <Route path="/key-areas" element={<KeyAreas />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
}
