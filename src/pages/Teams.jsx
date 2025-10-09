import React, { useState, useRef, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";

export default function Teams() {
    // ---------------- Teams & Members UI state (local only) ----------------
    const [teamsUI, setTeamsUI] = useState({
        mainTeam: {
            id: "main-001",
            name: "Product Development",
            leaderId: "u1",
            members: [
                { id: "u1", name: "John Smith", role: "Lead Developer" },
                { id: "u2", name: "Sarah Connor", role: "Designer" },
                { id: "u3", name: "Mike Johnson", role: "QA Engineer" },
            ],
            invites: [],
        },
        otherTeams: [
            {
                id: "other-001",
                name: "Marketing Team",
                leaderId: "u4",
                members: [
                    { id: "u4", name: "Lisa Park", role: "Leader" },
                    { id: "u5", name: "David Lee", role: "Content Writer" },
                ],
                invites: [
                    { id: "inv1", contact: "new.marketer@company.com", status: "Pending" },
                ],
                joinRequests: [],
            },
            {
                id: "other-002",
                name: "Design System",
                leaderId: "u6",
                members: [
                    { id: "u6", name: "Emma Wilson", role: "Leader" },
                    { id: "u7", name: "Tom Brown", role: "UI Designer" },
                    { id: "u8", name: "Anna Davis", role: "UX Researcher" },
                ],
                invites: [],
                joinRequests: [
                    { id: "jr1", user: "You", status: "Pending" },
                ],
            },
        ],
    });
    const [teamsSearch, setTeamsSearch] = useState("");
    const [joinMenuOpen, setJoinMenuOpen] = useState(false);
    const [joinMenuFilter, setJoinMenuFilter] = useState("");
    const [draggingMember, setDraggingMember] = useState(null); // { memberId, fromTeamId }

    // Derived team permissions
    const canCreateTeams = true;
    const canJoinTeams = true;
    const canManageTeams = true;

    // Teams management functions
    const createTeam = (name) => {
        if (!name || !name.trim()) return;
        const newTeam = {
            id: `team-${Date.now()}`,
            name: name.trim(),
            leaderId: null,
            members: [{ id: "you", name: "You", role: "Leader" }],
            invites: [],
            joinRequests: [],
        };
        setTeamsUI((s) => ({
            ...s,
            mainTeam: s.mainTeam || newTeam,
            otherTeams: s.mainTeam ? [...s.otherTeams, newTeam] : s.otherTeams,
        }));
    };

    const renameTeam = (teamId, newName) => {
        if (!newName || !newName.trim()) return;
        setTeamsUI((s) => ({
            ...s,
            mainTeam: s.mainTeam?.id === teamId ? { ...s.mainTeam, name: newName.trim() } : s.mainTeam,
            otherTeams: s.otherTeams.map((t) => (t.id === teamId ? { ...t, name: newName.trim() } : t)),
        }));
    };

    const addMember = (teamId, memberName) => {
        const member = { id: `m-${Date.now()}`, name: memberName.trim() || "New Member", role: "Member" };
        setTeamsUI((s) => ({
            ...s,
            mainTeam:
                s.mainTeam?.id === teamId ? { ...s.mainTeam, members: [...s.mainTeam.members, member] } : s.mainTeam,
            otherTeams: s.otherTeams.map((t) =>
                t.id === teamId ? { ...t, members: [...t.members, member] } : t
            ),
        }));
    };

    const removeMember = (teamId, memberId) => {
        setTeamsUI((s) => ({
            ...s,
            mainTeam:
                s.mainTeam?.id === teamId
                    ? { ...s.mainTeam, members: s.mainTeam.members.filter((m) => m.id !== memberId) }
                    : s.mainTeam,
            otherTeams: s.otherTeams.map((t) =>
                t.id === teamId ? { ...t, members: t.members.filter((m) => m.id !== memberId) } : t
            ),
        }));
    };

    const moveMember = (fromTeamId, toTeamId, memberId) => {
        if (fromTeamId === toTeamId) return;
        setTeamsUI((s) => {
            let memberToMove = null;
            // Find and remove from source
            if (s.mainTeam?.id === fromTeamId) {
                memberToMove = s.mainTeam.members.find((m) => m.id === memberId);
            } else {
                const sourceTeam = s.otherTeams.find((t) => t.id === fromTeamId);
                memberToMove = sourceTeam?.members.find((m) => m.id === memberId);
            }
            if (!memberToMove) return s;
            
            // Remove from source and add to target
            return {
                ...s,
                mainTeam:
                    s.mainTeam?.id === fromTeamId
                        ? { ...s.mainTeam, members: s.mainTeam.members.filter((m) => m.id !== memberId) }
                        : s.mainTeam?.id === toTeamId
                            ? { ...s.mainTeam, members: [...s.mainTeam.members, memberToMove] }
                            : s.mainTeam,
                otherTeams: s.otherTeams.map((t) => {
                    if (t.id === fromTeamId) {
                        return { ...t, members: t.members.filter((m) => m.id !== memberId) };
                    }
                    if (t.id === toTeamId) {
                        return { ...t, members: [...t.members, memberToMove] };
                    }
                    return t;
                }),
            };
        });
    };

    const sendInvite = (teamId, contact) => {
        if (!contact || !contact.trim()) return;
        const invite = { id: `inv-${Date.now()}`, contact: contact.trim(), status: "Pending" };
        setTeamsUI((s) => ({
            ...s,
            mainTeam:
                s.mainTeam?.id === teamId
                    ? { ...s.mainTeam, invites: [...(s.mainTeam.invites || []), invite] }
                    : s.mainTeam,
            otherTeams: s.otherTeams.map((t) =>
                t.id === teamId ? { ...t, invites: [...(t.invites || []), invite] } : t
            ),
        }));
    };

    const cancelInvite = (teamId, inviteId) => {
        setTeamsUI((s) => ({
            ...s,
            mainTeam:
                s.mainTeam?.id === teamId
                    ? { ...s.mainTeam, invites: (s.mainTeam.invites || []).filter((i) => i.id !== inviteId) }
                    : s.mainTeam,
            otherTeams: s.otherTeams.map((t) =>
                t.id === teamId ? { ...t, invites: (t.invites || []).filter((i) => i.id !== inviteId) } : t
            ),
        }));
    };

    const requestJoin = (teamId) => {
        const request = { id: `jr-${Date.now()}`, user: "You", status: "Pending" };
        setTeamsUI((s) => ({
            ...s,
            otherTeams: s.otherTeams.map((t) =>
                t.id === teamId ? { ...t, joinRequests: [...(t.joinRequests || []), request] } : t
            ),
        }));
    };

    const cancelJoinRequest = (teamId, requestId) => {
        setTeamsUI((s) => ({
            ...s,
            otherTeams: s.otherTeams.map((t) =>
                t.id === teamId
                    ? { ...t, joinRequests: (t.joinRequests || []).filter((r) => r.id !== requestId) }
                    : t
            ),
        }));
    };

    const setLeader = (teamId, memberId) => {
        setTeamsUI((s) => ({
            ...s,
            mainTeam: s.mainTeam?.id === teamId ? { ...s.mainTeam, leaderId: memberId } : s.mainTeam,
            otherTeams: s.otherTeams.map((t) => (t.id === teamId ? { ...t, leaderId: memberId } : t)),
        }));
    };

    // Enhanced Section Component
    const Section = ({ title, children, divider = true }) => (
        <section className={divider ? "mt-5 border-t border-gray-200 pt-5" : "mt-5 pt-5"}>
            {title ? <h2 className="mb-3 text-[15px] font-semibold text-gray-800">{title}</h2> : null}
    const Section = ({ title, children }) => (
        <section className="mt-5 border-t border-gray-200 pt-5">
            <h2 className="mb-3 text-[15px] font-semibold text-gray-800">{title}</h2>
            {children}
        </section>
    );

    return (
        <div className="min-h-screen bg-[#EDEDED] px-2 py-4 sm:px-4 sm:py-6">
            <div className="flex gap-[5mm]">
                <Sidebar />
                <main className="flex-1">
                    <div className="mx-auto max-w-5xl rounded-lg bg-white p-3 shadow-sm sm:p-4">
                        <div className="space-y-4">
                            <Section divider={false}>
                        <h1 className="mb-3 text-lg font-semibold text-gray-600 sm:text-xl">Teams & Members</h1>

                        <div className="space-y-4">
                            <div className="mb-3 rounded bg-[#EDEDED] px-3 py-2 text-center text-[11px] font-semibold tracking-wide text-gray-700 sm:text-[12px]">
                                TEAM MANAGEMENT
                            </div>
                            <Section title="Teams & Members">
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <input
                                            value={teamsSearch}
                                            onChange={(e) => setTeamsSearch(e.target.value)}
                                            placeholder="Search members or teams..."
                                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                        />
                                        {canCreateTeams && (
                                            <div className="flex gap-2">
                                                <input id="newTeamName" placeholder="Enter new team name" className="px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500" />
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById('newTeamName');
                                                        const val = el?.value?.trim();
                                                        if (!val) return;
                                                        createTeam(val);
                                                        if (el) el.value = '';
                                                    }}
                                                    className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                >
                                                    Create Team
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Main Team Card */}
                                        <div
                                            className="rounded border border-blue-200 bg-blue-50 p-3"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                const payload = draggingMember;
                                                setDraggingMember(null);
                                                if (teamsUI.mainTeam && payload) moveMember(payload.fromTeamId, teamsUI.mainTeam.id, payload.memberId);
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-gray-800">Main Team</h4>
                                                {teamsUI.mainTeam && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-600 text-white">Primary</span>
                                                )}
                                            </div>
                                            {teamsUI.mainTeam ? (
                                                <div>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                            {teamsUI.mainTeam.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-800">{teamsUI.mainTeam.name}</div>
                                                            <div className="text-xs text-gray-600">{teamsUI.mainTeam.members.length} members</div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {teamsUI.mainTeam.members
                                                            .filter((m) => m.name.toLowerCase().includes(teamsSearch.toLowerCase()))
                                                            .map((m) => (
                                                                <div
                                                                    key={m.id}
                                                                    className="flex items-center justify-between rounded border bg-white px-2 py-1"
                                                                    draggable
                                                                    onDragStart={() => setDraggingMember({ memberId: m.id, fromTeamId: teamsUI.mainTeam.id })}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-blue-400 text-white text-xs flex items-center justify-center">
                                                                            {m.name.charAt(0)}
                                                                        </div>
                                                                        <div className="text-sm text-gray-800">{m.name}</div>
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${teamsUI.mainTeam.leaderId === m.id || m.role === 'Leader' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                                            {teamsUI.mainTeam.leaderId === m.id || m.role === 'Leader' ? 'Leader' : 'Member'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        {canManageTeams && (
                                                                            <button onClick={() => setLeader(teamsUI.mainTeam.id, m.id)} className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50">Set Leader</button>
                                                                        )}
                                                                        {canManageTeams && (
                                                                            <button onClick={() => removeMember(teamsUI.mainTeam.id, m.id)} className="text-xs px-2 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50">Remove</button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                    </div>
                                                    {canManageTeams && (
                                                        <div className="mt-2 flex gap-2">
                                                            <input id="addMainMember" placeholder="Add member name" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                            <button
                                                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                                                                onClick={() => {
                                                                    const el = document.getElementById('addMainMember');
                                                                    addMember(teamsUI.mainTeam.id, el?.value || 'New Member');
                                                                    if (el) el.value = '';
                                                                }}
                                                            >
                                                                Add Member
                                                            </button>
                                                        </div>
                                                    )}
                                                    {canManageTeams && (
                                                        <div className="mt-2">
                                                            <div className="text-xs font-semibold text-gray-700 mb-1">Invite members</div>
                                                            <div className="flex gap-2">
                                                                <input id="inviteMain" placeholder="Email or username" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                                <button
                                                                    className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                                                                    onClick={() => {
                                                                        const el = document.getElementById('inviteMain');
                                                                        sendInvite(teamsUI.mainTeam.id, el?.value || 'someone@example.com');
                                                                        if (el) el.value = '';
                                                                    }}
                                                                >
                                                                    Send Invite
                                                                </button>
                                                            </div>
                                                            {(teamsUI.mainTeam.invites || []).length > 0 && (
                                                                <div className="mt-2 space-y-1">
                                                                    {(teamsUI.mainTeam.invites || []).map((iv) => (
                                                                        <div key={iv.id} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-white">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">Pending</span>
                                                                                <span className="text-gray-800">{iv.contact}</span>
                                                                            </div>
                                                                            <button className="px-2 py-0.5 border rounded hover:bg-gray-50" onClick={() => cancelInvite(teamsUI.mainTeam.id, iv.id)}>Cancel</button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-gray-500">
                                                    <div className="text-4xl mb-2">👥</div>
                                                    <p className="text-sm">No main team assigned</p>
                                                    {canCreateTeams && (
                                                        <button className="mt-3 px-4 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600" onClick={() => createTeam('My Team')}>
                                                            Create Team
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Other Teams Cards */}
                                        <div className="rounded border p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-gray-800">Other Teams</h4>
                                                {canJoinTeams && (
                                                    <div className="relative">
                                                        <button
                                                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                            onClick={() => setJoinMenuOpen((v) => {
                                                                const next = !v;
                                                                if (next) setJoinMenuFilter("");
                                                                return next;
                                                            })}
                                                        >
                                                            Join Team
                                                        </button>
                                                        {joinMenuOpen && (
                                                            <div className="absolute right-0 mt-1 w-64 rounded border bg-white shadow z-10">
                                                                <div className="p-2 border-b">
                                                                    <input
                                                                        autoFocus
                                                                        value={joinMenuFilter}
                                                                        onChange={(e) => setJoinMenuFilter(e.target.value)}
                                                                        placeholder="Search teams..."
                                                                        className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-500"
                                                                    />
                                                                </div>
                                                                <div className="max-h-56 overflow-auto py-1">
                                                                    {(() => {
                                                                        const banned = /^(new team|team)$/i;
                                                                        const q = joinMenuFilter.trim().toLowerCase();
                                                                        const items = (teamsUI.otherTeams || [])
                                                                            .filter((t) => !banned.test(t.name))
                                                                            .filter((t) => !(t.members || []).some((m) => m.name === 'You'))
                                                                            .filter((t) => !q || t.name.toLowerCase().includes(q))
                                                                            .slice(0, 12);
                                                                        return items.length ? items.map((t) => (
                                                                            <button
                                                                                key={t.id}
                                                                                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                                                                                onClick={() => {
                                                                                    requestJoin(t.id);
                                                                                    setJoinMenuOpen(false);
                                                                                }}
                                                                            >
                                                                                {t.name}
                                                                            </button>
                                                                        )) : (
                                                                            <div className="px-3 py-2 text-xs text-gray-500">No teams found</div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                {teamsUI.otherTeams
                                                    .filter((t) => t.name.toLowerCase().includes(teamsSearch.toLowerCase()) || t.members.some((m) => m.name.toLowerCase().includes(teamsSearch.toLowerCase())))
                                                    .map((t) => (
                                                        <div
                                                            key={t.id}
                                                            className="border rounded p-2 bg-white"
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={() => {
                                                                const payload = draggingMember;
                                                                setDraggingMember(null);
                                                                if (payload) moveMember(payload.fromTeamId, t.id, payload.memberId);
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 bg-gray-500 rounded-full text-white text-xs flex items-center justify-center">
                                                                        {t.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                                                                        <div className="text-xs text-gray-600">{t.members.length} members</div>
                                                                    </div>
                                                                </div>
                                                                {canManageTeams && (
                                                                    <div className="flex items-center gap-2">
                                                                        <input id={`rn-${t.id}`} placeholder="Rename" className="px-2 py-1 text-xs border rounded" />
                                                                        <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={() => {
                                                                            const el = document.getElementById(`rn-${t.id}`);
                                                                            renameTeam(t.id, el?.value || t.name);
                                                                            if (el) el.value = '';
                                                                        }}>Rename</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                {t.members
                                                                    .filter((m) => m.name.toLowerCase().includes(teamsSearch.toLowerCase()))
                                                                    .map((m) => (
                                                                        <div
                                                                            key={m.id}
                                                                            className="flex items-center justify-between rounded border px-2 py-1"
                                                                            draggable
                                                                            onDragStart={() => setDraggingMember({ memberId: m.id, fromTeamId: t.id })}
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-6 h-6 rounded-full bg-gray-400 text-white text-xs flex items-center justify-center">
                                                                                    {m.name.charAt(0)}
                                                                                </div>
                                                                                <div className="text-sm text-gray-800">{m.name}</div>
                                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.leaderId === m.id || m.role === 'Leader' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                                                                    {t.leaderId === m.id || m.role === 'Leader' ? 'Leader' : 'Member'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex gap-1">
                                                                                {canManageTeams && (
                                                                                    <button onClick={() => setLeader(t.id, m.id)} className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50">Set Leader</button>
                                                                                )}
                                                                                {canManageTeams && (
                                                                                    <button onClick={() => removeMember(t.id, m.id)} className="text-xs px-2 py-0.5 border border-red-300 text-red-600 rounded hover:bg-red-50">Remove</button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                            {canJoinTeams && !t.members.some((m) => m.name === 'You') && (
                                                                <div className="mt-2">
                                                                    <button
                                                                        className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                                                                        onClick={() => requestJoin(t.id)}
                                                                    >
                                                                        Request to Join
                                                                    </button>
                                                                    {(t.joinRequests || []).some((r) => r.user === 'You' && r.status === 'Pending') && (
                                                                        <span className="ml-2 text-xs text-yellow-700">Pending approval…</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {(t.joinRequests || []).length > 0 && (
                                                                <div className="mt-2 space-y-1">
                                                                    {(t.joinRequests || []).map((r) => (
                                                                        <div key={r.id} className="flex items-center justify-between text-xs border rounded px-2 py-1 bg-white">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`px-1.5 py-0.5 rounded ${r.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'}`}>{r.status}</span>
                                                                                <span className="text-gray-800">{r.user}</span>
                                                                            </div>
                                                                            {r.user === 'You' && r.status === 'Pending' && (
                                                                                <button className="px-2 py-0.5 border rounded hover:bg-gray-50" onClick={() => cancelJoinRequest(t.id, r.id)}>Cancel</button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {canManageTeams && (
                                                                <div className="mt-2 flex gap-2">
                                                                    <input id={`add-${t.id}`} placeholder="Add member name" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                                    <button
                                                                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
                                                                        onClick={() => {
                                                                            const el = document.getElementById(`add-${t.id}`);
                                                                            addMember(t.id, el?.value || 'New Member');
                                                                            if (el) el.value = '';
                                                                        }}
                                                                    >
                                                                        Add Member
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {canManageTeams && (
                                                                <div className="mt-2">
                                                                    <div className="text-xs font-semibold text-gray-700 mb-1">Invite members</div>
                                                                    <div className="flex gap-2">
                                                                        <input id={`invite-${t.id}`} placeholder="Email or username" className="flex-1 px-2 py-1 text-sm border rounded" />
                                                                        <button
                                                                            className="text-xs px-2 py-1 bg-green-600 text-white rounded"
                                                                            onClick={() => {
                                                                                const el = document.getElementById(`invite-${t.id}`);
                                                                                sendInvite(t.id, el?.value || 'someone@example.com');
                                                                                if (el) el.value = '';
                                                                            }}
                                                                        >
                                                                            Send Invite
                                                                        </button>
                                                                    </div>
                                                                    {(t.invites || []).length > 0 && (
                                                                        <div className="mt-2 space-y-1">
                                                                            {(t.invites || []).map((iv) => (
                                                                                <div key={iv.id} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">Pending</span>
                                                                                        <span className="text-gray-800">{iv.contact}</span>
                                                                                    </div>
                                                                                    <button className="px-2 py-0.5 border rounded hover:bg-gray-50" onClick={() => cancelInvite(t.id, iv.id)}>Cancel</button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                {teamsUI.otherTeams.length === 0 && (
                                                    <div className="text-center py-4 text-gray-500 border border-gray-200 rounded-lg">
                                                        <p className="text-sm">No additional teams</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
