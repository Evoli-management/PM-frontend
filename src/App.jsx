import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/shared/Navbar.jsx";
import Footer from "./components/shared/Footer.jsx";
import LoginPage from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import PasswordPageForget from "./pages/PasswordPageForget.jsx";
import ResetPasswordpage from "./pages/ResetPasswordpage.jsx";
import Registration from "./pages/Registration.jsx";

export default function App() {
    return (
        <Router basename="/PM-frontend">
            <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-grow">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/PasswordPageForget" element={<PasswordPageForget />} />
                        <Route path="/reset-password" element={<ResetPasswordpage />} />
                        <Route path="/registration" element={<Registration />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
}
