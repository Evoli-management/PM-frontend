import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { FaBars, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import { getUserGoals, adminUpdateGoal } from "../services/goalService";
import keyAreaService from "../services/keyAreaService";
import usersService from "../services/usersService";
import authService from "../services/authService";

export default function MemberProfile() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [member, setMember] = useState(null);
    const [goals, setGoals] = useState([]);
    const [keyAreas, setKeyAreas] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current user info to check if admin
            const meResp = await authService.verifyToken();
            const meUser = meResp?.user || meResp; // some routes return { user }
            setCurrentUser(meUser);
            setIsAdmin(meUser?.role === 'admin' || meUser?.isSuperUser === true);

            // Load member details
            const memberData = await usersService.getUser(userId);
            setMember(memberData);

            // Load member's goals (public only for non-admin, all for admin)
            const goalsData = await getUserGoals(userId);
            setGoals(goalsData || []);

            // Load member's key areas
            const areasData = await keyAreaService.getMemberKeyAreas(userId);
            setKeyAreas(areasData || []);
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || 'Failed to load member profile';
            setError(message);
            console.error('Error loading member profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const startEditGoal = (goal) => {
        setEditingGoal(goal.id);
        setEditForm({
            title: goal.title,
            description: goal.description || '',
            status: goal.status,
            visibility: goal.visibility,
            dueDate: goal.dueDate,
            progressPercent: goal.progressPercent || 0,
        });
    };

    const cancelEdit = () => {
        setEditingGoal(null);
        setEditForm({});
    };

    const saveGoal = async (goalId) => {
        try {
            await adminUpdateGoal(editingGoal, editForm);
            setEditingGoal(null);
            setEditForm({});
            loadData(); // Reload to get fresh data
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to update goal';
            setError(message);
        }
    };

    const getKeyAreaName = (keyAreaId) => {
        const area = keyAreas.find(ka => ka.id === keyAreaId);
        return area ? area.name : 'No Key Area';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'active': return 'bg-blue-100 text-blue-800';
            case 'archived': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getVisibilityBadge = (visibility) => {
        return visibility === 'private' ? (
            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">Private</span>
        ) : (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Public</span>
        );
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar onMobileToggle={setMobileSidebarOpen} isOpen={mobileSidebarOpen} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-gray-600">Loading member profile...</div>
                </div>
            </div>
        );
    }

    if (error || !member) {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar onMobileToggle={setMobileSidebarOpen} isOpen={mobileSidebarOpen} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-red-600 mb-4">{error || 'Member not found'}</p>
                        <button
                            onClick={() => navigate('/profile-settings?tab=Organization')}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            Back to Organization
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar onMobileToggle={setMobileSidebarOpen} isOpen={mobileSidebarOpen} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                            className="p-2 rounded hover:bg-gray-100 md:hidden"
                        >
                            <FaBars />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {member.firstName} {member.lastName}
                            </h1>
                            <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                    </div>
                    {isAdmin && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm font-medium">
                            Admin View
                        </span>
                    )}
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Member Info Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Job Title</p>
                                    <p className="font-medium">{member.jobTitle || 'Not specified'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Department</p>
                                    <p className="font-medium">{member.department || 'Not specified'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Manager</p>
                                    <p className="font-medium">{member.manager || 'Not specified'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Status</p>
                                    <p className="font-medium capitalize">{member.status || 'active'}</p>
                                </div>
                            </div>
                            {member.bio && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-600">Bio</p>
                                    <p className="text-gray-800 mt-1">{member.bio}</p>
                                </div>
                            )}
                        </div>

                        {/* Key Areas */}
                        {keyAreas.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold mb-4">Key Areas</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {keyAreas.map((area) => (
                                        <div
                                            key={area.id}
                                            className="p-3 border rounded-lg hover:border-blue-300 transition"
                                            style={{ borderLeftColor: area.color, borderLeftWidth: '4px' }}
                                        >
                                            <p className="font-medium">{area.title}</p>
                                            {area.description && (
                                                <p className="text-sm text-gray-600 mt-1">{area.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Goals */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">
                                    Goals {!isAdmin && <span className="text-sm font-normal text-gray-500">(Public only)</span>}
                                </h2>
                                {isAdmin && (
                                    <span className="text-sm text-gray-600">
                                        You can edit these goals as an admin
                                    </span>
                                )}
                            </div>

                            {goals.length === 0 ? (
                                <p className="text-gray-600 text-center py-8">
                                    No {!isAdmin && 'public'} goals found for this member.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {goals.map((goal) => (
                                        <div key={goal.id} className="border rounded-lg p-4 hover:border-blue-300 transition">
                                            {editingGoal === goal.id ? (
                                                /* Edit Mode */
                                                <div className="space-y-3">
                                                    <input
                                                        type="text"
                                                        value={editForm.title}
                                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                        placeholder="Goal title"
                                                    />
                                                    <textarea
                                                        value={editForm.description}
                                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                        placeholder="Description"
                                                        rows="3"
                                                    />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <select
                                                            value={editForm.status}
                                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                                            className="px-3 py-2 border rounded"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="completed">Completed</option>
                                                            <option value="archived">Archived</option>
                                                        </select>
                                                        <select
                                                            value={editForm.visibility}
                                                            onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                                                            className="px-3 py-2 border rounded"
                                                        >
                                                            <option value="public">Public</option>
                                                            <option value="private">Private</option>
                                                        </select>
                                                    </div>
                                                    <input
                                                        type="date"
                                                        value={editForm.dueDate}
                                                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded"
                                                    />
                                                    <div>
                                                        <label className="text-sm text-gray-600">Progress: {editForm.progressPercent}%</label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={editForm.progressPercent}
                                                            onChange={(e) => setEditForm({ ...editForm, progressPercent: parseInt(e.target.value) })}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="px-3 py-1 border rounded hover:bg-gray-100 flex items-center gap-1"
                                                        >
                                                            <FaTimes /> Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => saveGoal(goal.id)}
                                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                                                        >
                                                            <FaCheck /> Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* View Mode */
                                                <div>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-lg">{goal.title}</h3>
                                                            {goal.description && (
                                                                <p className="text-gray-600 text-sm mt-1">{goal.description}</p>
                                                            )}
                                                        </div>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => startEditGoal(goal)}
                                                                className="ml-3 p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Edit goal"
                                                            >
                                                                <FaEdit />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 items-center mt-3">
                                                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(goal.status)}`}>
                                                            {goal.status}
                                                        </span>
                                                        {getVisibilityBadge(goal.visibility)}
                                                        <span className="text-xs text-gray-600">
                                                            Due: {new Date(goal.dueDate).toLocaleDateString()}
                                                        </span>
                                                        {goal.keyAreaId && (
                                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                                                {getKeyAreaName(goal.keyAreaId)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {goal.progressPercent > 0 && (
                                                        <div className="mt-3">
                                                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                                <span>Progress</span>
                                                                <span>{goal.progressPercent}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                                                    style={{ width: `${goal.progressPercent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
