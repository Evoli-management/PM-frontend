import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import apiClient from "../../services/apiClient";

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    const [state, setState] = React.useState({ loading: true, ok: false });

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                // Use cookie-based session: if valid, backend returns current user
                await apiClient.get("/users/me");
                if (!cancelled) setState({ loading: false, ok: true });
            } catch (e) {
                if (!cancelled) setState({ loading: false, ok: false });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [location.pathname]);

    if (state.loading) return null; // or a tiny spinner if desired
    if (!state.ok) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
};

export default PrivateRoute;
