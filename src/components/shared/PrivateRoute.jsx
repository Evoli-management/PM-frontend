import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import apiClient from "../../services/apiClient";

// Simple auth check: look for a cookie or localStorage token
function isAuthenticated() {
    // Check authentication by calling backend /api/users/me
    // Synchronous check is not possible, so use a hook in the component below
    return null;
}

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    const [authChecked, setAuthChecked] = React.useState(false);
    const [isAuth, setIsAuth] = React.useState(false);

    React.useEffect(() => {
        // Use apiClient instead of fetch to ensure proper API base URL
        const token = localStorage.getItem("access_token");
        console.log("PrivateRoute: Checking auth, token exists:", !!token);
        console.log("PrivateRoute: API Base URL:", import.meta.env.VITE_API_BASE_URL);
        
        apiClient.get("/users/me")
            .then((res) => {
                console.log("PrivateRoute: Auth check successful:", res.status);
                if (res.status === 200) {
                    setIsAuth(true);
                } else {
                    setIsAuth(false);
                }
            })
            .catch((error) => {
                console.log("PrivateRoute: Auth check failed:", {
                    status: error.response?.status,
                    message: error.message,
                    hasToken: !!token
                });
                setIsAuth(false);
            })
            .finally(() => setAuthChecked(true));
    }, []);

    if (!authChecked) {
        return <div className="w-full py-10 flex items-center justify-center text-gray-600">Checking authentication...</div>;
    }
    if (!isAuth) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};

export default PrivateRoute;
