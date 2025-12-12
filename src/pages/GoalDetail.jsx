import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import GoalDetailModal from "../components/goals/GoalDetailModal";
import * as goalService from "../services/goalService";
import { FaArrowLeft } from "react-icons/fa";

const GoalDetail = () => {
    const { goalId } = useParams();
    const navigate = useNavigate();
    const [goal, setGoal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [keyAreas, setKeyAreas] = useState([]);
    const location = useLocation();

    useEffect(() => {
        let mounted = true;

        // If the list page passed the goal in navigation state, render it immediately
        // so the page opens instantly. Then perform a background refresh to keep
        // the data in sync with the server.
        const initial = location?.state?.goal;
        if (initial && initial.id && String(initial.id) === String(goalId)) {
            setGoal(initial);
            setLoading(false);

            // background refresh
            (async () => {
                try {
                    const mod = await import("../services/goalService");
                    const fn = mod.getGoalById || mod.getGoal || (mod.default && (mod.default.getGoalById || mod.default.getGoal));
                    if (typeof fn === "function") {
                        const g = await fn(goalId);
                        if (mounted) setGoal(g);
                    }
                } catch (e) {
                    // ignore background refresh errors
                    console.debug("Background goal refresh failed:", e);
                }
            })();
        } else {
            (async () => {
                setLoading(true);
                try {
                    const mod = await import("../services/goalService");
                    const fn = mod.getGoalById || mod.getGoal || (mod.default && (mod.default.getGoalById || mod.default.getGoal));
                    if (typeof fn === "function") {
                        const g = await fn(goalId);
                        if (mounted) setGoal(g);
                    } else {
                        console.warn("No getGoalById/getGoal function exported from goalService");
                    }
                } catch (e) {
                    console.error("Failed to fetch goal:", e);
                    if (mounted) setError("Failed to load goal. Please try again later.");
                } finally {
                    if (mounted) setLoading(false);
                }
            })();
        }

        (async () => {
            try {
                const mod = await import("../services/keyAreaService");
                const fn = mod.getKeyAreas || (mod.default && mod.default.getKeyAreas);
                if (fn) {
                    const list = await fn();
                    if (mounted) setKeyAreas(list);
                }
            } catch (e) {
                // non-fatal
                console.error("Failed to fetch key areas:", e);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [goalId, location]);

    const handleClose = () => {
        navigate("/goals");
    };

    const handleUpdate = async (id, update) => {
        // Persist update to backend and update local copy.
        try {
            const updated = await goalService.updateGoal(id, update);
            // update local state with returned server representation
            setGoal((g) => (g && g.id === id ? { ...g, ...updated } : g));
        } catch (e) {
            console.error("Failed to persist goal update:", e);
            // Fallback: still apply optimistic update locally so UI feels responsive
            setGoal((g) => (g && g.id === id ? { ...g, ...update } : g));
            throw e;
        }
    };

    const handleDelete = () => {
        // After deletion, navigate back to list
        navigate("/goals");
    };

    return (
        <div className="min-h-screen bg-[#EDEDED]">
            <div className="flex w-full min-h-screen">
                <Sidebar />
                <main className="flex-1 min-w-0 w-full min-h-screen transition-all overflow-y-auto">
                    <div className="container mx-auto max-w-7xl overflow-x-hidden pb-1 min-h-full px-4">
                        <div className="py-6">
                            {loading && (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl max-w-md">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {goal && (
                                <GoalDetailModal
                                    goal={goal}
                                    isPage={true}
                                    onClose={handleClose}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                    keyAreas={keyAreas}
                                />
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default GoalDetail;
