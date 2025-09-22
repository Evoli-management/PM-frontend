import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// Simple auth check: look for a cookie or localStorage token
function isAuthenticated() {
    // If you use httpOnly cookies, you may need to check with the backend
    // For demo, check localStorage (replace with your real logic)
    return !!localStorage.getItem("access_token");
}

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};

export default PrivateRoute;
