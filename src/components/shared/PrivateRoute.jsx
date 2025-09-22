import React from "react";
import { Navigate, useLocation } from "react-router-dom";

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
        fetch("/api/users/me", {
            method: "GET",
            credentials: "include",
        })
            .then((res) => {
                if (res.status === 200) {
                    setIsAuth(true);
                } else {
                    setIsAuth(false);
                }
            })
            .catch(() => setIsAuth(false))
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
