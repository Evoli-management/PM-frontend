import Navbar from "./components/shared/Navbar.jsx";
import Footer from "./components/shared/Footer.jsx";
import SetProfile from "./pages/SetProfile.jsx";
import PasswordPageForget from "./pages/PasswordPageForget.jsx";
import Pricing from "./pages/Pricing.jsx";


export default function App() {
    return (
        <>
            <Navbar />
             <Home />
            <SetProfile />
            <PasswordPageForget />
            <ResetPasswordpage />
            <Login />


            <Footer />
        </>
    )
}