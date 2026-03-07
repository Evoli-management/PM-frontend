import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { FaBars, FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import { getUserGoals, adminUpdateGoal } from "../services/goalService";
import keyAreaService from "../services/keyAreaService";
import usersService from "../services/usersService";
import authService from "../services/authService";
import teamsService from "../services/teamsService";
import recognitionsService from "../services/recognitionsService";

export default function MemberProfile() {
    const { t } = useTranslation();
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
    const [memberTeams, setMemberTeams] = useState([]);
    const [receivedStrokes, setReceivedStrokes] = useState([]);
    const [givenStrokes, setGivenStrokes] = useState([]);
    const [recognitionScore, setRecognitionScore] = useState(null);
    const [recentAchievements, setRecentAchievements] = useState([]);

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

            // Load teams and verify membership by fetching members per team (robust across APIs)
            try {
                const allTeams = await teamsService.getTeams();
                const teamsArr = Array.isArray(allTeams) ? allTeams : [];
                const membershipChecks = await Promise.all(
                    teamsArr.map(async (team) => {
                        try {
                            const members = await teamsService.getTeamMembers(team.id);
                            const isMember = Array.isArray(members) && members.some((m) => {
                                const mid = String(m.id || m.userId);
                                return mid === String(userId);
                            });
                            return isMember ? { ...team, members } : null;
                        } catch (e) {
                            return null;
                        }
                    })
                );
                setMemberTeams(membershipChecks.filter(Boolean));
            } catch {}

            // Load recognitions (strokes)
            try {
                const [recv, sent] = await Promise.all([
                    recognitionsService.getRecognitions({ recipientId: userId, limit: 10 }),
                    recognitionsService.getRecognitions({ senderId: userId, limit: 10 }),
                ]);
                setReceivedStrokes(Array.isArray(recv) ? recv : []);
                setGivenStrokes(Array.isArray(sent) ? sent : []);
            } catch {}

            // Load recognition score and recent achievements
            try {
                const [score, achievements] = await Promise.all([
                    recognitionsService.getUserScore(userId),
                    recognitionsService.getRecentAchievements(userId),
                ]);
                setRecognitionScore(score || null);
                setRecentAchievements(Array.isArray(achievements) ? achievements : []);
            } catch {}
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || t("memberProfile.loading");
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
            const message = err?.response?.data?.message || t("memberProfile.failedUpdateGoal");
            setError(message);
        }
    };

    const getKeyAreaName = (keyAreaId) => {
        const area = keyAreas.find(ka => ka.id === keyAreaId);
        return area ? area.name : t("memberProfile.noKeyArea");
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
            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">{t("memberProfile.badgePrivate")}</span>
        ) : (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">{t("memberProfile.badgePublic")}</span>
        );
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50">
                <Sidebar onMobileToggle={setMobileSidebarOpen} isOpen={mobileSidebarOpen} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-gray-600">{t("memberProfile.loading")}</div>
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
                        <p className="text-red-600 mb-4">{error || t("memberProfile.notFound")}</p>
                        <button
                            onClick={() => navigate('/profile-settings?tab=Organization')}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                            {t("memberProfile.backToOrg")}
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
                            {t("memberProfile.adminView")}
                        </span>
                    )}
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Member Info Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold mb-4">{t("memberProfile.profileInfo")}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">{t("memberProfile.jobTitle")}</p>
                                    <p className="font-medium">{member.jobTitle || t("memberProfile.notSpecified")}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t("memberProfile.department")}</p>
                                    <p className="font-medium">{member.department || t("memberProfile.notSpecified")}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t("memberProfile.manager")}</p>
                                    <p className="font-medium">{member.manager || t("memberProfile.notSpecified")}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{t("memberProfile.status")}</p>
                                    <p className="font-medium capitalize">{member.status || 'active'}</p>
                                </div>
                            </div>
                            {member.bio && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-600">{t("memberProfile.bio")}</p>
                                    <p className="text-gray-800 mt-1">{member.bio}</p>
                                </div>
                            )}
                        </div>

                        {/* Key Areas */}
                        {keyAreas.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold mb-4">{t("memberProfile.keyAreas")}</h2>
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

                        {/* Teams */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold mb-4">{t("memberProfile.teams")}</h2>
                            {memberTeams.length === 0 ? (
                                <p className="text-gray-600">{t("memberProfile.noTeamMemberships")}</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {memberTeams.map(team => (
                                        <div key={team.id} className="p-3 border rounded hover:border-blue-300 transition">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-blue-500 rounded-full text-white flex items-center justify-center font-bold">
                                                    {team.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{team.name}</p>
                                                    <p className="text-xs text-gray-600">
                                                        {(() => {
                                                            const count = Number.isFinite(team.memberCount)
                                                                ? team.memberCount
                                                                : (Array.isArray(team.members) ? team.members.length : 0);
                                                            return t("memberProfile.member", { count });
                                                        })()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recognitions / Strokes */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">{t("memberProfile.recognitions")}</h2>
                            </div>
                            {/* Score Summary */}
                            {recognitionScore ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                    <div className="p-3 border rounded">
                                        <p className="text-sm text-gray-600">{t("memberProfile.employeeship")}</p>
                                        <p className="text-xl font-semibold">{recognitionScore.employeeshipScore}</p>
                                    </div>
                                    <div className="p-3 border rounded">
                                        <p className="text-sm text-gray-600">{t("memberProfile.performance")}</p>
                                        <p className="text-xl font-semibold">{recognitionScore.performanceScore}</p>
                                    </div>
                                    <div className="p-3 border rounded">
                                        <p className="text-sm text-gray-600">{t("memberProfile.total")}</p>
                                        <p className="text-xl font-semibold">{recognitionScore.totalScore}</p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-600 mb-4">{t("memberProfile.noRecognitionScore")}</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">{t("memberProfile.receivedLatest")}</h3>
                                    {receivedStrokes.length === 0 ? (
                                        <p className="text-gray-600">{t("memberProfile.noRecognitionsReceived")}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {receivedStrokes.map(r => (
                                                <div key={r.id} className="p-2 border rounded">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">{r.type || t("memberProfile.recognition")}</span>
                                                        <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    {r.personalNote && (
                                                        <p className="text-sm text-gray-700 mt-1">{r.personalNote}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">{t("memberProfile.givenLatest")}</h3>
                                    {givenStrokes.length === 0 ? (
                                        <p className="text-gray-600">{t("memberProfile.noRecognitionsGiven")}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {givenStrokes.map(r => (
                                                <div key={r.id} className="p-2 border rounded">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">{r.type || t("memberProfile.recognition")}</span>
                                                        <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    {r.personalNote && (
                                                        <p className="text-sm text-gray-700 mt-1">{r.personalNote}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Achievements */}
                            <div className="mt-6">
                                <h3 className="font-semibold mb-2">{t("memberProfile.recentAchievements")}</h3>
                                {recentAchievements.length === 0 ? (
                                    <p className="text-gray-600">{t("memberProfile.noRecentAchievements")}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {recentAchievements.map(a => (
                                            <div key={a.id || `${a.type}-${a.createdAt}`} className="p-2 border rounded">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">{a.title || a.type || t("memberProfile.recognition")}</span>
                                                    <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</span>
                                                </div>
                                                {a.description && (
                                                    <p className="text-sm text-gray-700 mt-1">{a.description}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Goals */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold">
                                    {t("memberProfile.goals")} {!isAdmin && <span className="text-sm font-normal text-gray-500">{t("memberProfile.goalsPublicOnly")}</span>}
                                </h2>
                                {isAdmin && (
                                    <span className="text-sm text-gray-600">
                                        {t("memberProfile.goalsAdminEdit")}
                                    </span>
                                )}
                            </div>

                            {goals.length === 0 ? (
                                <p className="text-gray-600 text-center py-8">
                                    {isAdmin ? t("memberProfile.noGoals") : t("memberProfile.noPublicGoals")}
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
                                                        placeholder={t("memberProfile.goalTitlePlaceholder")}
                                                    />
                                                    <textarea
                                                        value={editForm.description}
                                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                        placeholder={t("memberProfile.descriptionPlaceholder")}
                                                        rows="3"
                                                    />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <select
                                                            value={editForm.status}
                                                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                                            className="px-3 py-2 border rounded"
                                                        >
                                                            <option value="active">{t("memberProfile.statusActive")}</option>
                                                            <option value="completed">{t("memberProfile.statusCompleted")}</option>
                                                            <option value="archived">{t("memberProfile.statusArchived")}</option>
                                                        </select>
                                                        <select
                                                            value={editForm.visibility}
                                                            onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                                                            className="px-3 py-2 border rounded"
                                                        >
                                                            <option value="public">{t("memberProfile.visibilityPublic")}</option>
                                                            <option value="private">{t("memberProfile.visibilityPrivate")}</option>
                                                        </select>
                                                    </div>
                                                    <input
                                                        type="date"
                                                        value={editForm.dueDate}
                                                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                                                        className="w-full px-3 py-2 border rounded"
                                                    />
                                                    <div>
                                                        <label className="text-sm text-gray-600">{t("memberProfile.progressLabel", { n: editForm.progressPercent })}</label>
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
                                                            <FaTimes /> {t("memberProfile.cancelBtn")}
                                                        </button>
                                                        <button
                                                            onClick={() => saveGoal(goal.id)}
                                                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                                                        >
                                                            <FaCheck /> {t("memberProfile.saveBtn")}
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
                                                            {t("memberProfile.dueDate", { date: new Date(goal.dueDate).toLocaleDateString() })}
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
                                                                <span>{t("memberProfile.progressTitle")}</span>
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
