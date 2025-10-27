
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaUser, FaBolt } from "react-icons/fa";
import userProfileService from "../../services/userProfileService";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [openQuick, setOpenQuick] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const menuRef = useRef(null);
    const quickRef = useRef(null);

    // Close the profile/settings popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            const node = menuRef.current;
            const qnode = quickRef.current;
            // Close profile menu if click outside
            if (open && node && !node.contains(e.target)) {
                setOpen(false);
            }
            // Close quick actions if click outside
            if (openQuick && qnode && !qnode.contains(e.target)) {
                setOpenQuick(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, openQuick]);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const location = useLocation();
    
    // List of public routes where navbar should not be shown
    const publicRoutes = ["/", "/login", "/registration", "/PasswordPageForget", "/reset-password", "/verify-email"];
    const isPublicRoute = publicRoutes.includes(location.pathname);
    
    useEffect(() => {
        // Check if user is authenticated by looking for access token
        const token = localStorage.getItem("access_token");
        setIsAuthenticated(!!token);
        
        // Fetch user profile for avatar if authenticated
        if (token) {
            fetchUserProfile();
        }
    }, [location]);
    
    // Listen for profile updates to refresh avatar
    useEffect(() => {
        const handleProfileUpdate = () => {
            fetchUserProfile();
        };
        
        window.addEventListener('profileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
    }, []);
    
    const fetchUserProfile = async () => {
        try {
            const profile = await userProfileService.getProfile();
            setUserProfile(profile);
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    };
    
    // Don't render navbar on public pages
    if (isPublicRoute) {
        return null;
    }
    
    // Only render navbar on authenticated pages
    if (!isAuthenticated) {
        return null;
    }

    return (
        <header
            className="text-white"
            style={{
                background: 'linear-gradient(90deg, #dff7f9 0%, #a7eaf0 50%, #59d2df 100%)',
            }}
        >
            <div className="w-full px-2 md:px-4 py-3 flex items-center justify-between">
                <Link to="/" className="font-bold tracking-wide flex items-center gap-2">
                    <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Practical Manager" className="w-8 h-8" />
                    <span className="sr-only">Practical Manager</span>
                </Link>
                <div className="relative flex items-center gap-3">
                    {/* Quick Actions icon */}
                    <div className="relative" ref={quickRef}>
                        <button
                            onClick={() => setOpenQuick((o) => !o)}
                            className="text-white/90 hover:text-white px-3 py-1.5 rounded-full"
                            aria-haspopup="menu"
                            aria-expanded={openQuick ? "true" : "false"}
                            title="Quick Actions"
                        >
                            <FaBolt className="w-5 h-5" />
                        </button>

                        {openQuick && (
                            <div className="absolute right-20 mt-2 w-48 rounded-md bg-white text-slate-800 shadow-lg z-50">
                                <Link
                                    to="/tasks"
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => setOpenQuick(false)}
                                >
                                    ⚡ New Task
                                </Link>
                                <Link
                                    to="/goals"
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => setOpenQuick(false)}
                                >
                                    🎯 Set Goal
                                </Link>
                                <Link
                                    to="/teams"
                                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => setOpenQuick(false)}
                                >
                                    👥 Invite Team
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setOpen((o) => !o)}
                            className="flex items-center gap-3 rounded-full border border-white/30 bg-blue-500/40 px-3 py-1.5 hover:bg-blue-500/60"
                            aria-haspopup="menu"
                            aria-expanded={open ? "true" : "false"}
                        >
                            <span className="w-9 h-9 rounded-full bg-white/30 text-white flex items-center justify-center overflow-hidden">
                                {userProfile?.avatarUrl ? (
                                    <img 
                                        src={userProfile.avatarUrl} 
                                        alt="Profile Avatar"
                                        className="w-full h-full object-cover rounded-full"
                                        onError={(e) => {
                                            // Fallback to icon if image fails to load
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <FaUser 
                                    className={`w-6 h-6 ${userProfile?.avatarUrl ? 'hidden' : 'block'}`}
                                />
                            </span>
                            <svg
                                className="w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                        {open && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md bg-white text-slate-800 shadow-lg z-50">
                                <Link
                                    to="/profile"
                                    className="block px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => setOpen(false)}
                                >
                                    👤 Profile & Settings
                                </Link>
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                    className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                                    onClick={() => {
                                        setOpen(false);
                                        // Clear auth token and redirect to login
                                        localStorage.removeItem("access_token");
                                        try {
                                            window.location.hash = "#/login";
                                        } catch (e) {
                                            window.location.href = "/login";
                                        }
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
