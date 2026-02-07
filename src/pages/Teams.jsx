import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { FaBars, FaEdit, FaTrash, FaEye } from "react-icons/fa";
import teamsService from "../services/teamsService";
import userProfileService from "../services/userProfileService";
import organizationService from "../services/organizationService";
import { CanWillMatrix } from "../components/teams/CanWillMatrix";
import { SelectionPane } from "../components/teams/SelectionPane";
import { IndexPanel } from "../components/teams/IndexPanel";

export default function Teams() {
    // ============ API STATE ============
    const [teamsData, setTeamsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [hasOrganization, setHasOrganization] = useState(true); // Track if user has organization
    const [usage, setUsage] = useState(null); // Plan usage and limits

    // ============ UI STATE ============
    const [teamsSearch, setTeamsSearch] = useState("");
    const [draggingMember, setDraggingMember] = useState(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);
    const [canManage, setCanManage] = useState(false);
    const location = useLocation();
    const [view, setView] = useState('list'); // 'list' or 'reports'
    const [reportLevel, setReportLevel] = useState('organization'); // 'organization', 'myteams', 'myself'
    const [selectedItems, setSelectedItems] = useState([]);
    const [matrixData, setMatrixData] = useState([]);
    const [userProfile, setUserProfile] = useState(null);
    const [employeeshipMetrics, setEmployeeshipMetrics] = useState([]);
    const [performanceMetrics, setPerformanceMetrics] = useState([]);
    const [mySelfReport, setMySelfReport] = useState(null);

    // ============ TOAST/NOTIFICATIONS ============
    const [toast, setToast] = useState({ message: '', visible: false });
    const showToast = (message, type = 'success') => {
        setToast({ message, visible: true, type });
        setTimeout(() => setToast({ visible: false }), 3000);
    };

    const loadUsage = async () => {
        try {
            const usageData = await organizationService.getCurrentUsage();
            setUsage(usageData);
        } catch (error) {
            console.log('Could not load usage:', error);
        }
    };

    const checkPermissions = async () => {
        try {
            const profile = await userProfileService.getProfile();
            // All authenticated users can create teams per backend permissions
            setCanManage(true);
            setUserProfile(profile);
            setHasOrganization(true);
            return true;
        } catch (e) {
            // User has no organization yet
            console.log('User has no organization:', e?.response?.status);
            setCanManage(false);
            setHasOrganization(false);
            return false;
        }
    };

    // ============ LOAD INITIAL DATA ============
    useEffect(() => {
        const init = async () => {
            const hasOrg = await checkPermissions();
            if (hasOrg) {
                await Promise.all([loadTeams(), loadUsage()]);
            } else {
                // No org: stop loading so empty state renders
                setLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const tab = params.get('tab') || 'teams-members';
        if (tab === 'teams-members') {
            setView('list');
        } else if (tab === 'organization') {
            setView('reports');
            setReportLevel('organization');
        } else if (tab === 'myteams') {
            setView('reports');
            setReportLevel('myteams');
        } else if (tab === 'myreport') {
            setView('reports');
            setReportLevel('myself');
        }
    }, [location.search]);

    const loadTeams = async () => {
        try {
            setLoading(true);
            setError(null);
            const teams = await teamsService.getTeams();
            const normalized = Array.isArray(teams)
                ? teams
                : Array.isArray(teams?.teams)
                    ? teams.teams
                    : [];
            setTeamsData(normalized);
        } catch (err) {
            const message = err?.response?.data?.message || err?.message || 'Failed to load teams';
            setError(message);
            showToast(message, 'error');
            setTeamsData([]);
        } finally {
            setLoading(false);
        }
    };

    // ============ TEAM OPERATIONS ============
    const createTeam = async (name) => {
        if (!canManage) return;
        if (!name || !name.trim()) return;
        setSaving(true);
        try {
            const newTeam = await teamsService.createTeam({
                name: name.trim(),
            });
            setTeamsData([...teamsData, newTeam]);
            showToast('Team created successfully');
            loadUsage(); // Reload usage stats
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to create team';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const renameTeam = async (teamId, newName) => {
        if (!canManage) return;
        if (!newName || !newName.trim()) return;
        setSaving(true);
        try {
            const updated = await teamsService.updateTeam(teamId, {
                name: newName.trim(),
            });
            setTeamsData(teamsData.map(t => t.id === teamId ? updated : t));
            showToast('Team renamed successfully');
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to rename team';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const deleteTeam = async (teamId) => {
        if (!canManage) return;
        if (!confirm('Are you sure you want to delete this team?')) return;
        setSaving(true);
        try {
            await teamsService.deleteTeam(teamId);
            setTeamsData(teamsData.filter(t => t.id !== teamId));
            showToast('Team deleted successfully');
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to delete team';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const addMemberToTeam = async (teamId, userId) => {
        if (!canManage) return;
        if (!userId) return;
        setSaving(true);
        try {
            await teamsService.addTeamMember(teamId, userId, 'member');
            await loadTeams();
            showToast('Member added successfully');
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to add member';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const removeMemberFromTeam = async (teamId, userId) => {
        if (!canManage) return;
        if (!confirm('Remove this member from the team?')) return;
        setSaving(true);
        try {
            await teamsService.removeTeamMember(teamId, userId);
            await loadTeams();
            showToast('Member removed successfully');
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to remove member';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const setTeamLead = async (teamId, userId) => {
        if (!canManage) return;
        setSaving(true);
        try {
            await teamsService.updateTeam(teamId, {
                leadId: userId,
            });
            await loadTeams();
            showToast('Team leader updated successfully');
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to update team leader';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ============ REPORT FUNCTIONS ============
    const loadReportData = async () => {
        try {
            setLoading(true);
            let data = [];
            
            if (reportLevel === 'organization') {
                const report = await teamsService.getOrganizationReport();
                data = report.teams.map(team => ({
                    id: team.id,
                    name: team.name,
                    type: 'team',
                    canScore: team.canScore,
                    willScore: team.willScore,
                    score: team.overallScore,
                }));
            } else if (reportLevel === 'myteams') {
                const report = await teamsService.getMyTeamsReport();
                data = report.users.map(user => ({
                    id: user.id,
                    name: user.name,
                    type: 'user',
                    canScore: user.canScore,
                    willScore: user.willScore,
                    score: user.overallScore,
                }));
            } else if (reportLevel === 'myself') {
                const report = await teamsService.getMySelfReport();
                setMySelfReport(report);
                data = [
                    {
                        id: report.user.id,
                        name: report.user.name,
                        type: 'user',
                        canScore: report.user.canScore,
                        willScore: report.user.willScore,
                        score: report.user.overallScore,
                    },
                    {
                        id: 'team-avg',
                        name: report.teamAverage.name,
                        type: 'team',
                        canScore: report.teamAverage.canScore,
                        willScore: report.teamAverage.willScore,
                        score: report.teamAverage.overallScore,
                    }
                ];
            }
            
            setMatrixData(data);
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to load report data';
            showToast(message, 'error');
            setMatrixData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (view === 'reports' && teamsData.length > 0) {
            loadReportData();
            loadMetrics();
        }
    }, [view, reportLevel, teamsData]);

    const loadMetrics = async () => {
        try {
            const empMetrics = await teamsService.getEmployeeshipMetrics(reportLevel, null);
            const perfMetrics = await teamsService.getPerformanceMetrics(reportLevel, null);
            
            setEmployeeshipMetrics([
                { key: 'commitment', label: 'Commitment', value: empMetrics.commitment },
                { key: 'responsibility', label: 'Responsibility', value: empMetrics.responsibility },
                { key: 'loyalty', label: 'Loyalty', value: empMetrics.loyalty },
                { key: 'initiative', label: 'Initiative', value: empMetrics.initiative },
                { key: 'productivity', label: 'Productivity', value: empMetrics.productivity },
                { key: 'relations', label: 'Relations', value: empMetrics.relations },
                { key: 'quality', label: 'Quality', value: empMetrics.quality },
                { key: 'competence', label: 'Professional Competence', value: empMetrics.competence },
                { key: 'flexibility', label: 'Flexibility', value: empMetrics.flexibility },
                { key: 'implementation', label: 'Implementation', value: empMetrics.implementation },
                { key: 'energy', label: 'Energy', value: empMetrics.energy },
            ]);
            
            setPerformanceMetrics([
                { key: 'overall', label: 'Overall Performance', value: perfMetrics.overall },
            ]);
        } catch (err) {
            console.error('Failed to load metrics:', err);
            // Use default/fallback values
            setEmployeeshipMetrics(getDefaultEmployeeshipMetrics());
            setPerformanceMetrics(getDefaultPerformanceMetrics());
        }
    };

    const handleItemSelect = (itemId) => {
        if (!canManage && reportLevel !== 'myself') return;
        
        setSelectedItems(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            }
            return [...prev, itemId];
        });
    };

    const getDefaultEmployeeshipMetrics = () => {
        return [
            { key: 'commitment', label: 'Commitment', value: 75 },
            { key: 'responsibility', label: 'Responsibility', value: 68 },
            { key: 'loyalty', label: 'Loyalty', value: 82 },
            { key: 'initiative', label: 'Initiative', value: 71 },
            { key: 'productivity', label: 'Productivity', value: 79 },
            { key: 'relations', label: 'Relations', value: 73 },
            { key: 'quality', label: 'Quality', value: 85 },
            { key: 'competence', label: 'Professional Competence', value: 77 },
            { key: 'flexibility', label: 'Flexibility', value: 69 },
            { key: 'implementation', label: 'Implementation', value: 74 },
            { key: 'energy', label: 'Energy', value: 80 },
        ];
    };

    const getDefaultPerformanceMetrics = () => {
        return [
            { key: 'overall', label: 'Overall Performance', value: 76 },
        ];
    };

    const employeeshipAverage = useMemo(() => {
        const metrics = employeeshipMetrics.length > 0 ? employeeshipMetrics : getDefaultEmployeeshipMetrics();
        const values = metrics.map((m) => Number(m.value) || 0);
        const sum = values.reduce((acc, v) => acc + v, 0);
        return values.length ? sum / values.length : 0;
    }, [employeeshipMetrics]);

    const performanceOverall = useMemo(() => {
        const metrics = performanceMetrics.length > 0 ? performanceMetrics : getDefaultPerformanceMetrics();
        const overall = metrics.find((m) => m.key === 'overall');
        return Number(overall?.value) || 0;
    }, [performanceMetrics]);

    const profileStars = useMemo(() => {
        const avg = (employeeshipAverage + performanceOverall) / 2;
        if (avg >= 80) return 3;
        if (avg >= 60) return 2;
        if (avg >= 40) return 1;
        return 0;
    }, [employeeshipAverage, performanceOverall]);

    const profileStatus = useMemo(() => {
        if (profileStars >= 3) return 'Star Double Bagger';
        if (profileStars === 2) return 'Star Performer';
        if (profileStars === 1) return 'Double Bagger';
        return '';
    }, [profileStars]);

    const strongestWeakest = useMemo(() => {
        const metrics = employeeshipMetrics.length > 0 ? employeeshipMetrics : getDefaultEmployeeshipMetrics();
        if (!metrics.length) return { strongest: null, weakest: null };
        const sorted = [...metrics].sort((a, b) => (b.value || 0) - (a.value || 0));
        return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
    }, [employeeshipMetrics]);

    const renderReportSidePanel = () => {
        if (reportLevel === 'myself') {
            const avatarUrl = userProfile?.avatarUrl || userProfile?.avatar || '';
            const displayName = userProfile?.fullName || userProfile?.name || 'Profile';
            const teamEmployeeship = Number(mySelfReport?.teamAverage?.canScore) || 0;
            const teamPerformance = Number(mySelfReport?.teamAverage?.overallScore) || 0;
            const personalOverall = (employeeshipAverage + performanceOverall) / 2;
            const trendDirection = teamPerformance
                ? (personalOverall >= teamPerformance ? 'up' : 'down')
                : 'neutral';
            const trendLabel = trendDirection === 'up'
                ? 'Trending up vs team avg'
                : trendDirection === 'down'
                    ? 'Below team avg'
                    : 'No team average yet';

            return (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col items-center gap-3 text-center">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={displayName}
                                className="h-20 w-20 rounded-full object-cover border"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-3xl">
                                {displayName.charAt(0)}
                            </div>
                        )}
                        {profileStatus && (
                            <div className="text-sm text-gray-700">Profile status: {profileStatus}</div>
                        )}
                        <div className="flex items-center gap-1 text-blue-600">
                            {[1, 2, 3].map((i) => (
                                <span key={i} className={i <= profileStars ? 'text-blue-600' : 'text-gray-300'}>
                                    ★
                                </span>
                            ))}
                        </div>
                        <div className={`text-xs font-medium ${trendDirection === 'up' ? 'text-green-600' : trendDirection === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                            {trendDirection === 'up' ? '▲' : trendDirection === 'down' ? '▼' : '•'} {trendLabel}
                        </div>
                    </div>

                    <div className="mt-4 space-y-3 text-left">
                        <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">Employeeship</div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500 w-16">You</span>
                                    <div className="flex-1 bg-gray-200 h-2 rounded-full">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(employeeshipAverage, 100)}%` }}></div>
                                    </div>
                                    <span className="text-[11px] text-gray-600 w-10 text-right">{employeeshipAverage.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500 w-16">Team avg</span>
                                    <div className="flex-1 bg-gray-200 h-2 rounded-full">
                                        <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(teamEmployeeship, 100)}%` }}></div>
                                    </div>
                                    <span className="text-[11px] text-gray-600 w-10 text-right">{teamEmployeeship.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-semibold text-gray-700 mb-1">Performance</div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500 w-16">You</span>
                                    <div className="flex-1 bg-gray-200 h-2 rounded-full">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(performanceOverall, 100)}%` }}></div>
                                    </div>
                                    <span className="text-[11px] text-gray-600 w-10 text-right">{performanceOverall.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-500 w-16">Team avg</span>
                                    <div className="flex-1 bg-gray-200 h-2 rounded-full">
                                        <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(teamPerformance, 100)}%` }}></div>
                                    </div>
                                    <span className="text-[11px] text-gray-600 w-10 text-right">{teamPerformance.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>

                        {strongestWeakest.strongest && strongestWeakest.weakest && (
                            <div className="rounded-md bg-slate-50 border border-slate-200 p-2 text-xs text-gray-700">
                                <div><span className="font-semibold">Strongest:</span> {strongestWeakest.strongest.label}</div>
                                <div><span className="font-semibold">Next focus:</span> {strongestWeakest.weakest.label}</div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        const listTitle = reportLevel === 'organization'
            ? 'Select a team you lead to see the report:'
            : 'Select team member to see his/her report:';
        const listItems = matrixData || [];

        return (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-700 mb-2">{listTitle}</div>
                {listItems.length === 0 ? (
                    <div className="text-xs text-gray-500">No items available.</div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {listItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleItemSelect(item.id)}
                                className={`px-2 py-1 text-xs rounded border ${
                                    selectedItems.includes(item.id)
                                        ? 'border-blue-600 text-blue-700 bg-blue-50'
                                        : 'border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300'
                                }`}
                            >
                                {item.name}
                            </button>
                        ))}
                    </div>
                )}
                {reportLevel === 'myteams' && (
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => navigate('/teams?tab=organization')}
                            className="px-3 py-1.5 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const Section = ({ title, children, divider = true }) => (
        <section className={divider ? "mt-5 border-t border-gray-200 pt-5" : "mt-5 pt-5"}>
            {title ? <h2 className="mb-3 text-[15px] font-semibold text-gray-800">{title}</h2> : null}
            {children}
        </section>
    );

    return (
        <div className="min-h-screen bg-[#EDEDED]">
            <div className="flex w-full min-h-screen">
                <Sidebar 
                    user={{ name: "Hussein" }} 
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                {mobileSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
                <main className="flex-1 min-w-0 w-full min-h-screen transition-all md:ml-[1mm] overflow-y-auto px-1 md:px-2">
                    <div className="max-w-full overflow-x-hidden pb-8 min-h-full">
                        <div className="flex items-center justify-between gap-4 mb-0 p-0 pb-0">
                            <div className="flex items-center gap-4">
                                <button
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                    onClick={() => setMobileSidebarOpen(true)}
                                    aria-label="Open sidebar"
                                >
                                    <FaBars />
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="rounded-lg bg-white p-3 shadow-sm sm:p-4">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 mb-3">
                                        <h1 className="text-lg font-semibold text-gray-600 sm:text-xl">{canManage ? 'Teams & Members' : 'Teams'}</h1>
                                    </div>

                                    {view === 'list' ? (
                                        <>
                                            <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                                {canManage ? 'TEAM MANAGEMENT' : 'TEAM DIRECTORY'}
                                            </div>

                                    {toast.visible && (
                                        <div className={`p-3 rounded text-sm ${toast.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                            {toast.message}
                                        </div>
                                    )}

                                    {loading ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <div className="text-4xl mb-2">⏳</div>
                                            <p>Loading teams...</p>
                                        </div>
                                    ) : !hasOrganization ? (
                                        <div className="text-center py-12">
                                            <div className="text-6xl mb-4">🏢</div>
                                            <h2 className="text-2xl font-semibold text-gray-800 mb-2">No Organization Yet</h2>
                                            <p className="text-gray-600 mb-6">You haven't joined or created an organization yet.</p>
                                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                                <button
                                                    onClick={() => {
                                                        // Trigger organization creation
                                                        const orgName = prompt('Enter your organization name:', 'My Organization');
                                                        if (orgName?.trim()) {
                                                            setSaving(true);
                                                            organizationService.createSelfOrganization()
                                                                .then(() => {
                                                                    showToast('Organization created successfully!');
                                                                    // Reload the page to get the new organization
                                                                    window.location.reload();
                                                                })
                                                                .catch(err => {
                                                                    const message = err?.response?.data?.message || 'Failed to create organization';
                                                                    showToast(message, 'error');
                                                                    setSaving(false);
                                                                });
                                        }
                                                    }}
                                                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
                                                >
                                                    ✨ Create Organization
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        // Prompt for invitation token/link
                                                        const token = prompt('Enter your invitation token or link:', '');
                                                        if (token?.trim()) {
                                                            // Navigate to invitation acceptance page
                                                            window.location.href = `/invite/${token.trim()}`;
                                                        }
                                                    }}
                                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
                                                >
                                                    📬 Accept Invitation
                                                </button>
                                            </div>
                                        </div>
                                    ) : error ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <div className="text-4xl mb-2">❌</div>
                                            <p>{error}</p>
                                            <button
                                                onClick={loadTeams}
                                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <Section title="Teams & Members">
                                            <div className="space-y-4">
                                                {/* Usage Stats */}
                                                {usage && (
                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-4 text-sm">
                                                            <span className="text-slate-700">
                                                                <strong>{usage.currentMembers}</strong> / {usage.maxMembers} members
                                                            </span>
                                                            <span className="text-slate-400">•</span>
                                                            <span className="text-slate-700">
                                                                <strong>{usage.currentTeams}</strong> / {usage.maxTeams} teams
                                                            </span>
                                                            <span className="text-slate-400">•</span>
                                                            <span className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded-full font-medium">
                                                                {usage.planName} plan
                                                            </span>
                                                        </div>
                                                        {!usage.canAddTeams && (
                                                            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                                                Team limit reached
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <input
                                                        value={teamsSearch}
                                                        onChange={(e) => setTeamsSearch(e.target.value)}
                                                        placeholder="Search members or teams..."
                                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                                    />
                                                    {canManage && (
                                                        <div className="flex gap-2">
                                                            <input 
                                                                id="newTeamName" 
                                                                placeholder={usage && !usage.canAddTeams ? `Team limit reached (${usage.maxTeams} max)` : "Enter new team name"}
                                                                className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                                                disabled={usage && !usage.canAddTeams}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    if (usage && !usage.canAddTeams) {
                                                                        showToast(`Cannot create team: You have ${usage.currentTeams} team(s) but ${usage.planName} plan allows only ${usage.maxTeams}. Upgrade your plan to add more teams.`, 'error');
                                                                        return;
                                                                    }
                                                                    const el = document.getElementById('newTeamName');
                                                                    const val = el?.value?.trim();
                                                                    if (!val) return;
                                                                    createTeam(val);
                                                                    if (el) el.value = '';
                                                                }}
                                                                disabled={saving || (usage && !usage.canAddTeams)}
                                                                className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                                                title={usage && !usage.canAddTeams ? `Team limit reached (${usage.currentTeams}/${usage.maxTeams} on ${usage.planName} plan). Upgrade to add more teams.` : "Create a new team"}
                                                            >
                                                                {saving ? 'Creating...' : 'Create Team'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {teamsData.length === 0 ? (
                                                        <div className="col-span-full text-center py-12 text-gray-500 border border-gray-200 rounded">
                                                            <div className="text-4xl mb-2">👥</div>
                                                            <p>No teams yet. Create your first team!</p>
                                                        </div>
                                                    ) : (
                                                        teamsData
                                                            .filter(t => t.name.toLowerCase().includes(teamsSearch.toLowerCase()))
                                                            .map((team) => (
                                                                <TeamCard
                                                                    key={team.id}
                                                                    team={team}
                                                                    onRename={renameTeam}
                                                                    onDelete={deleteTeam}
                                                                    onAddMember={addMemberToTeam}
                                                                    onRemoveMember={removeMemberFromTeam}
                                                                    onSetLead={setTeamLead}
                                                                    saving={saving}
                                                                    canManage={canManage}
                                                                />
                                                            ))
                                                    )}
                                                </div>
                                            </div>
                                        </Section>
                                    )}
                                        </>
                                    ) : (
                                        // Reports View
                                        <>
                                            {/* Report Description */}
                                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                                {reportLevel === 'organization' && "Select a team you lead to see the report."}
                                                {reportLevel === 'myteams' && "Select a team member to see the report."}
                                                {reportLevel === 'myself' && "Your personal report compared to your team's average score."}
                                            </div>

                                            {/* Reports Grid */}
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                                {/* Left column: Matrix + Selection */}
                                                <div className="lg:col-span-2 space-y-4">
                                                    <CanWillMatrix
                                                        data={matrixData}
                                                        selectedItems={selectedItems}
                                                        onItemClick={(item) => handleItemSelect(item.id)}
                                                    />
                                                    
                                                    {(canManage || reportLevel === 'myself') && (
                                                        <SelectionPane
                                                            title={`Select ${reportLevel === 'organization' ? 'Teams' : 'Users'} to View`}
                                                            items={matrixData}
                                                            selectedItems={selectedItems}
                                                            onSelect={handleItemSelect}
                                                            canSelect={canManage || reportLevel === 'myself'}
                                                        />
                                                    )}
                                                </div>

                                                {/* Right column: Side panel + Indices */}
                                                <div className="space-y-4">
                                                    {renderReportSidePanel()}
                                                    <IndexPanel
                                                        title="Employeeship Index"
                                                        metrics={employeeshipMetrics.length > 0 ? employeeshipMetrics : getDefaultEmployeeshipMetrics()}
                                                    />
                                                    
                                                    <IndexPanel
                                                        title="Performance Index"
                                                        metrics={performanceMetrics.length > 0 ? performanceMetrics : getDefaultPerformanceMetrics()}
                                                        highlightedMetric="overall"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function TeamCard({ team, onRename, onDelete, onAddMember, onRemoveMember, onSetLead, saving, canManage }) {
    const [showRenameInput, setShowRenameInput] = useState(false);
    const [renameValue, setRenameValue] = useState(team.name);
    const navigate = useNavigate();
    const [showDetails, setShowDetails] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [teamDetail, setTeamDetail] = useState(null);
    const [teamMembers, setTeamMembers] = useState([]);

    const loadTeamDetails = async () => {
        try {
            setDetailsLoading(true);
            const detail = await teamsService.getTeam(team.id);
            setTeamDetail(detail || null);
            const members = await teamsService.getTeamMembers(team.id);
            setTeamMembers(members || []);
        } catch (e) {
            // Silent failure in card; page-level toast already exists
        } finally {
            setDetailsLoading(false);
        }
    };

    return (
        <div className="rounded border p-3 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {team.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{team.name}</h3>
                        <p className="text-xs text-gray-600">
                            {(() => {
                                const count = Number.isFinite(team.memberCount)
                                    ? team.memberCount
                                    : (Array.isArray(team.members) ? team.members.length : 0);
                                return `${count} ${count === 1 ? 'member' : 'members'}`;
                            })()}
                        </p>
                    </div>
                </div>
                {canManage && (
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowRenameInput(!showRenameInput)}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-100 flex items-center justify-center"
                            title="Rename"
                            aria-label="Rename team"
                        >
                            <FaEdit size={12} />
                        </button>
                        <button
                            onClick={() => onDelete(team.id)}
                            disabled={saving}
                            className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-60 flex items-center justify-center"
                            title="Delete"
                            aria-label="Delete team"
                        >
                            <FaTrash size={12} />
                        </button>
                        <button
                            onClick={() => navigate(`/teams/${team.id}`)}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-100 flex items-center justify-center"
                            aria-label="View team details"
                        >
                            <FaEye size={12} />
                        </button>
                    </div>
                )}
                {!canManage && (
                    <div className="flex gap-1">
                        <button
                            onClick={() => navigate(`/teams/${team.id}`)}
                            className="px-2 py-1 text-xs border rounded hover:bg-gray-100 flex items-center justify-center"
                            aria-label="View team details"
                            title="View"
                        >
                            <FaEye size={12} />
                        </button>
                    </div>
                )}
            </div>

            {canManage && showRenameInput && (
                <div className="flex gap-2 mb-3">
                    <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                    />
                    <button
                        onClick={() => {
                            onRename(team.id, renameValue);
                            setShowRenameInput(false);
                        }}
                        disabled={saving}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                    >
                        Save
                    </button>
                </div>
            )}

            {/* Members preview removed to avoid mismatch; see details page */}

            {showDetails && (
                <div className="mt-3 border-t pt-3">
                    {detailsLoading ? (
                        <div className="text-xs text-gray-500">Loading team details…</div>
                    ) : (
                        <>
                            <div className="mb-2">
                                <h4 className="text-sm font-semibold text-gray-900">Description</h4>
                                <p className="text-sm text-gray-700">{teamDetail?.description || 'No description provided.'}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Members</h4>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {(teamMembers && teamMembers.length > 0) ? (
                                        teamMembers.map((m) => (
                                            <div
                                                key={m.id || m.userId}
                                                className="flex items-center justify-between rounded border bg-gray-50 px-2 py-1 cursor-pointer hover:bg-gray-100"
                                                onClick={() => navigate(`/member/${m.id || m.userId}`)}
                                                aria-label={`View profile of ${m.firstName} ${m.lastName}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center">
                                                        {(m.firstName || m.name)?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="text-sm text-gray-800">
                                                        {m.firstName ? `${m.firstName} ${m.lastName}` : m.name}
                                                    </div>
                                                    {m.role && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.role === 'lead' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                            {m.role === 'lead' ? 'Lead' : 'Member'}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/member/${m.id || m.userId}`); }}
                                                    className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50"
                                                >
                                                    View Profile
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-500">No members to display.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
