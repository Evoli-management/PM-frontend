import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";
import { FaBars } from "react-icons/fa";
import teamsService from "../services/teamsService";

export default function Teams() {
    // ============ API STATE ============
    const [teamsData, setTeamsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    // ============ UI STATE ============
    const [teamsSearch, setTeamsSearch] = useState("");
    const [draggingMember, setDraggingMember] = useState(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [selectedTeamForMembers, setSelectedTeamForMembers] = useState(null);

    // ============ TOAST/NOTIFICATIONS ============
    const [toast, setToast] = useState({ message: '', visible: false });
    const showToast = (message, type = 'success') => {
        setToast({ message, visible: true, type });
        setTimeout(() => setToast({ visible: false }), 3000);
    };

    // ============ LOAD INITIAL DATA ============
    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            setLoading(true);
            setError(null);
            const teams = await teamsService.getTeams();
            setTeamsData(teams || []);
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
        if (!name || !name.trim()) return;
        setSaving(true);
        try {
            const newTeam = await teamsService.createTeam({
                name: name.trim(),
            });
            setTeamsData([...teamsData, newTeam]);
            showToast('Team created successfully');
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to create team';
            showToast(message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const renameTeam = async (teamId, newName) => {
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
                                    <h1 className="mb-3 text-lg font-semibold text-gray-600 sm:text-xl">Teams & Members</h1>
                                    <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                        TEAM MANAGEMENT
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
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                    <input
                                                        value={teamsSearch}
                                                        onChange={(e) => setTeamsSearch(e.target.value)}
                                                        placeholder="Search members or teams..."
                                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                                    />
                                                    <div className="flex gap-2">
                                                        <input 
                                                            id="newTeamName" 
                                                            placeholder="Enter new team name" 
                                                            className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500" 
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const el = document.getElementById('newTeamName');
                                                                const val = el?.value?.trim();
                                                                if (!val) return;
                                                                createTeam(val);
                                                                if (el) el.value = '';
                                                            }}
                                                            disabled={saving}
                                                            className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                                                        >
                                                            {saving ? 'Creating...' : 'Create Team'}
                                                        </button>
                                                    </div>
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
                                                                />
                                                            ))
                                                    )}
                                                </div>
                                            </div>
                                        </Section>
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

function TeamCard({ team, onRename, onDelete, onAddMember, onRemoveMember, onSetLead, saving }) {
    const [showRenameInput, setShowRenameInput] = useState(false);
    const [renameValue, setRenameValue] = useState(team.name);

    return (
        <div className="rounded border p-3 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {team.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{team.name}</h3>
                        <p className="text-xs text-gray-600">{team.memberCount || 0} members</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setShowRenameInput(!showRenameInput)}
                        className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                    >
                        Rename
                    </button>
                    <button
                        onClick={() => onDelete(team.id)}
                        disabled={saving}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-60"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {showRenameInput && (
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

            <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {team.members && team.members.length > 0 ? (
                    team.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded border bg-gray-50 px-2 py-1">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center">
                                    {member.firstName?.charAt(0) || 'U'}
                                </div>
                                <div className="text-sm text-gray-800">
                                    {member.firstName} {member.lastName}
                                </div>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${member.role === 'lead' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                    {member.role === 'lead' ? 'Lead' : 'Member'}
                                </span>
                            </div>
                            <div className="flex gap-1">
                                {member.role !== 'lead' && (
                                    <button
                                        onClick={() => onSetLead(team.id, member.id)}
                                        disabled={saving}
                                        className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50 disabled:opacity-60"
                                    >
                                        Set Lead
                                    </button>
                                )}
                                <button
                                    onClick={() => onRemoveMember(team.id, member.id)}
                                    disabled={saving}
                                    className="text-xs px-2 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50 disabled:opacity-60"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-gray-500">No members yet</p>
                )}
            </div>
        </div>
    );
}
