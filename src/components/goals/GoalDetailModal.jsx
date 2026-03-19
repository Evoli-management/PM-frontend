import React, { useState, Suspense, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import {
    FaLock,
    FaEye,
    FaCheckCircle,
    FaSave,
    FaEllipsisV,
    FaTrash,
    FaUser,
    FaUsers,
    FaInfoCircle,
} from "react-icons/fa";
import { useFormattedDate } from "../../hooks/useFormattedDate";

const GoalForm = React.lazy(() => import("./GoalForm"));
import GoalGauge from "./GoalGauge";

const TAG_COLOR_STORAGE_KEY = "goal-detail-tag-colors";
const GOAL_TAG_MAX_LENGTH = 20;
const TAG_COLOR_OPTIONS = [
    { name: "Rose", fill: "#e11d48" },
    { name: "Amber", fill: "#d97706" },
    { name: "Emerald", fill: "#059669" },
    { name: "Sky", fill: "#06b6d4" },
    { name: "Violet", fill: "#7c3aed" },
    { name: "Slate", fill: "#475569" },
];
const PRIORITY_OPTIONS = [
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

const readStoredTagColors = (goalId) => {
    if (!goalId || typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(TAG_COLOR_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed?.[goalId] && typeof parsed[goalId] === "object"
            ? parsed[goalId]
            : {};
    } catch {
        return {};
    }
};

const writeStoredTagColors = (goalId, colors) => {
    if (!goalId || typeof window === "undefined") return;
    try {
        const raw = window.localStorage.getItem(TAG_COLOR_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[goalId] = colors;
        window.localStorage.setItem(TAG_COLOR_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
        // Ignore storage failures and keep UI functional.
    }
};

const GoalDetailModal = ({
    goal,
    onClose,
    keyAreas, // kept for compatibility (unused in this layout)
    onUpdate,
    onDelete,
    onMilestoneUpdated,
    isPage = false,
}) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [localGoal, setLocalGoal] = useState(goal);
    const [updatingMilestone, setUpdatingMilestone] = useState(null);
    const [dateInputValues, setDateInputValues] = useState({});
    const { formatDate, dateFormat } = useFormattedDate();
    // Parent goal linking state
    const [parentGoalSearch, setParentGoalSearch] = useState('');
    const [showParentGoalDropdown, setShowParentGoalDropdown] = useState(false);
    const [availableGoals, setAvailableGoals] = useState([]);
    const [savingParentGoal, setSavingParentGoal] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [tagColors, setTagColors] = useState({});
    const [openTagColorPicker, setOpenTagColorPicker] = useState(null);
    const [goalRaci, setGoalRaci] = useState({
        responsible: [],
        consulted: [],
        informed: [],
    });
    const [orgMembers, setOrgMembers] = useState([]);
    const [teamMap, setTeamMap] = useState({});
    const [savingInfoField, setSavingInfoField] = useState("");
    const [openMembersRole, setOpenMembersRole] = useState(null);
    const parentGoalPickerRef = useRef(null);
    const tagColorPickerRef = useRef(null);
    const membersMenuRefs = useRef({});

    const formatDateLabel = (value) => {
        if (!value) return `Format: ${dateFormat}`;
        return `${formatDate(value)} (Format: ${dateFormat})`;
    };

    const milestoneDateLabel = (value) => {
        if (!value) return dateFormat;
        return `${formatDate(value)} (${dateFormat})`;
    };

    const normalizeToIsoDate = (value) => {
        if (!value) return "";
        const raw = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        const d = new Date(raw);
        if (isNaN(d.getTime())) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    };

    const parseDateFromDisplay = (value, format) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) return "";
        const ensureValid = (y, m, d) => {
            if (!y || !m || !d) return "";
            const dateObj = new Date(y, m - 1, d);
            if (
                dateObj.getFullYear() !== y ||
                dateObj.getMonth() !== m - 1 ||
                dateObj.getDate() !== d
            ) {
                return "";
            }
            return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
                2,
                "0"
            )}`;
        };

        switch (format) {
            case "MM/dd/yyyy": {
                const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (!match) return "";
                return ensureValid(
                    Number(match[3]),
                    Number(match[1]),
                    Number(match[2])
                );
            }
            case "dd/MM/yyyy": {
                const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (!match) return "";
                return ensureValid(
                    Number(match[3]),
                    Number(match[2]),
                    Number(match[1])
                );
            }
            case "yyyy-MM-dd": {
                const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (!match) return "";
                return ensureValid(
                    Number(match[1]),
                    Number(match[2]),
                    Number(match[3])
                );
            }
            case "MMM dd, yyyy": {
                const match = trimmed.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/);
                if (!match) return "";
                const monthMap = {
                    jan: 1,
                    feb: 2,
                    mar: 3,
                    apr: 4,
                    may: 5,
                    jun: 6,
                    jul: 7,
                    aug: 8,
                    sep: 9,
                    oct: 10,
                    nov: 11,
                    dec: 12,
                };
                const month = monthMap[match[1].toLowerCase()];
                if (!month) return "";
                return ensureValid(
                    Number(match[3]),
                    month,
                    Number(match[2])
                );
            }
            default:
                return "";
        }
    };

    const getDisplayValue = (id, dateValue) => {
        if (Object.prototype.hasOwnProperty.call(dateInputValues, id)) {
            return dateInputValues[id];
        }
        return dateValue ? formatDate(dateValue) : "";
    };

    const handleDisplayChange = (id, value) => {
        setDateInputValues((prev) => ({ ...prev, [id]: value }));
    };

    const clearDisplayOverride = (id) => {
        setDateInputValues((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const commitDisplayValue = (id, value, onValid) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) {
            onValid(null);
            clearDisplayOverride(id);
            return;
        }
        const iso = parseDateFromDisplay(trimmed, dateFormat);
        if (iso) {
            onValid(iso);
        }
        clearDisplayOverride(id);
    };

    React.useEffect(() => {
        // Initialize localGoal from prop when modal opens or goal changes,
        // but avoid overwriting any in-progress edits in the modal.
        try {
            if (!goal) return;
            setLocalGoal((prev) => {
                // If user is currently editing, preserve their unsaved changes.
                if (isEditing) return prev || goal;
                // Otherwise update local copy from incoming prop.
                return goal;
            });
        } catch (e) {
            // fallback to direct assignment
            if (!isEditing) setLocalGoal(goal);
        }
    }, [goal, isEditing]);

    useEffect(() => {
        setTagInput("");
    }, [goal?.id]);

    useEffect(() => {
        setTagColors(readStoredTagColors(goal?.id));
        setOpenTagColorPicker(null);
    }, [goal?.id]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const mod = await import("../../services/usersService");
                const svc = mod.default || mod;
                const list = await svc.list();
                if (mounted) setOrgMembers(Array.isArray(list) ? list : []);
            } catch {
                if (mounted) setOrgMembers([]);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const mod = await import("../../services/teamsService");
                const svc = mod.default || mod;
                const result = await svc.getTeams();
                const teams = Array.isArray(result)
                    ? result
                    : result?.teams || result?.data || [];
                if (!mounted) return;
                const nextMap = {};
                teams.forEach((team) => {
                    if (team?.id) nextMap[team.id] = team.name || "Team";
                });
                setTeamMap(nextMap);
            } catch {
                if (mounted) setTeamMap({});
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!goal?.id) {
            setGoalRaci({ responsible: [], consulted: [], informed: [] });
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const mod = await import("../../services/goalService");
                const svc = mod.default || mod;
                const entries = await svc.getGoalRaci(goal.id);
                if (!mounted || !Array.isArray(entries)) return;
                const byRole = { responsible: [], consulted: [], informed: [] };
                entries.forEach((entry) => {
                    if (byRole[entry.role]) {
                        byRole[entry.role].push(String(entry.userId));
                    }
                });
                setGoalRaci(byRole);
            } catch {
                if (mounted) {
                    setGoalRaci({ responsible: [], consulted: [], informed: [] });
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, [goal?.id]);

    useEffect(() => {
        if (!openTagColorPicker) return undefined;

        const handleOutsideClick = (event) => {
            if (!tagColorPickerRef.current?.contains(event.target)) {
                setOpenTagColorPicker(null);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [openTagColorPicker]);

    if (!goal) return null;

    const milestonesList = localGoal?.milestones || [];
    const totalMilestones = milestonesList.length || 0;
    const completedMilestones =
        milestonesList.filter((m) => m.done).length || 0;

    const computeProgressPercent = (list) => {
        if (!list || list.length === 0) return 0;
        const totalWeight = list.reduce(
            (s, m) => s + (parseFloat(m.weight) || 1),
            0
        );
        if (totalWeight <= 0) return 0;
        const weightedScoreSum = list.reduce((s, m) => {
            const weight = parseFloat(m.weight) || 1;
            let score = 0;
            if (m.done) score = 1;
            else if (m.score !== undefined && m.score !== null) {
                score = parseFloat(m.score) || 0;
            }
            return s + score * weight;
        }, 0);
        return Math.round((weightedScoreSum / totalWeight) * 100);
    };

    const progressPercent = computeProgressPercent(milestonesList);
    const resolvedKeyArea = Array.isArray(keyAreas)
        ? keyAreas.find((area) => String(area.id) === String(localGoal?.keyAreaId))
        : null;
    const resolvedTeamName = localGoal?.teamId
        ? localGoal?.teamName || teamMap[localGoal.teamId] || "Team goal"
        : "Personal goal";
    const formatMemberList = (ids = []) => {
        if (!Array.isArray(ids) || ids.length === 0) return "—";
        const names = ids.map((id) => (
            orgMembers.find((member) => String(member.id) === String(id))?.name || "Unknown member"
        ));
        return names.join(", ");
    };
    const formatMemberSummary = (ids = []) => {
        const names = Array.isArray(ids)
            ? ids
                .map((id) => orgMembers.find((member) => String(member.id) === String(id))?.name)
                .filter(Boolean)
            : [];
        if (names.length === 0) return "Select members";
        if (names.length <= 2) return names.join(", ");
        return `${names[0]}, ${names[1]} +${names.length - 2}`;
    };

    // Tabs: summary / milestones / activities
    const [activeTab, setActiveTab] = useState("milestones");

    // Activities state (simple implementation mirroring ActivityList behavior)
    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [savingActivityIds, setSavingActivityIds] = useState(new Set());
    const [openMilestoneMenuId, setOpenMilestoneMenuId] = useState(null);
    const [editingMilestoneId, setEditingMilestoneId] = useState(null);
    const [editingMilestoneTitle, setEditingMilestoneTitle] = useState("");

    const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
            const mod = await import("../../services/activityService");
            const svc = mod.default || mod;
            // Try filtering by goalId; backend may accept this. Fall back to empty list if not supported.
            const list = await svc.list({ goalId: goal.id }).catch(async (e) => {
                // Fallback: try without filter
                console.debug(
                    "activityService.list(goalId) failed, falling back to svc.list():",
                    e?.message || e
                );
                return (await svc.list()) || [];
            });
            // Keep only activities that reference this goal when backend returned global list
            const filtered = Array.isArray(list)
                ? list.filter(
                    (a) =>
                        (!a.taskId &&
                            String(
                                a.goalId || a.parentGoalId || a.goal_id
                            ) === String(goal.id)) ||
                        (a.goalId && String(a.goalId) === String(goal.id))
                )
                : [];
            setActivities(filtered);
        } catch (err) {
            console.error("Failed to load activities for goal", err);
            setActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    };

    useEffect(() => {
        if (!goal) return;
        // default to milestones tab when opening; keep user's selection otherwise
        if (!activeTab) setActiveTab("milestones");
        // fetch activities so Activities tab is ready
        fetchActivities();
        // Load available goals for parent picker
        (async () => {
            try {
                const mod = await import('../../services/goalService');
                const svc = mod.default || mod;
                const fn = svc.getGoals || svc.list;
                if (typeof fn === 'function') {
                    const list = await fn({ status: 'active' });
                    setAvailableGoals(Array.isArray(list) ? list : []);
                }
            } catch (e) { /* optional */ }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goal?.id]);

    // Close parent goal dropdown on outside click
    useEffect(() => {
        if (!showParentGoalDropdown) return;
        const onDown = (e) => {
            if (parentGoalPickerRef.current && !parentGoalPickerRef.current.contains(e.target))
                setShowParentGoalDropdown(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [showParentGoalDropdown]);

    useEffect(() => {
        if (!openMembersRole) return;
        const onDown = (e) => {
            const menu = membersMenuRefs.current?.[openMembersRole];
            if (menu && !menu.contains(e.target)) {
                setOpenMembersRole(null);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [openMembersRole]);

    const handleSetParentGoal = async (parentGoalId) => {
        setSavingParentGoal(true);
        setSavingInfoField("parentGoalId");
        try {
            await onUpdate(goal.id, { parentGoalId: parentGoalId || null });
            setLocalGoal(prev => ({ ...prev, parentGoalId: parentGoalId || null }));
        } catch (e) {
            console.error('Failed to set parent goal', e);
            alert(e?.response?.data?.message || 'Failed to link goal. Check for circular links.');
        } finally {
            setSavingParentGoal(false);
            setSavingInfoField("");
            setShowParentGoalDropdown(false);
            setParentGoalSearch('');
        }
    };

    const handleInfoFieldUpdate = async (field, value, extraUpdates = {}) => {
        setSavingInfoField(field);
        try {
            await onUpdate(goal.id, { [field]: value });
            setLocalGoal((prev) => ({
                ...prev,
                [field]: value,
                ...extraUpdates,
            }));
        } catch (e) {
            console.error(`Failed to update ${field}`, e);
        } finally {
            setSavingInfoField("");
        }
    };

    const handleRaciRoleChange = async (role, memberIds) => {
        const previous = goalRaci[role] || [];
        const nextIds = Array.isArray(memberIds) ? memberIds.map(String) : [];
        setGoalRaci((prev) => ({ ...prev, [role]: nextIds }));
        setSavingInfoField(role);
        try {
            const mod = await import("../../services/goalService");
            const svc = mod.default || mod;
            await svc.setGoalRaciRole(goal.id, role, nextIds);
        } catch (e) {
            console.error(`Failed to update ${role}`, e);
            setGoalRaci((prev) => ({ ...prev, [role]: previous }));
        } finally {
            setSavingInfoField("");
        }
    };

    const toggleRaciMember = async (role, userId) => {
        const current = goalRaci[role] || [];
        const next = current.includes(userId)
            ? current.filter((id) => id !== userId)
            : [...current, userId];
        await handleRaciRoleChange(role, next);
    };

    // Close milestone menu on outside click
    useEffect(() => {
        if (!openMilestoneMenuId) return;
        const onDocClick = () => setOpenMilestoneMenuId(null);
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [openMilestoneMenuId]);

    const addActivity = async (text) => {
        const t = (text || "").trim();
        if (!t) return;
        try {
            const mod = await import("../../services/activityService");
            const svc = mod.default || mod;
            const created = await svc.create({ text: t, goalId: goal.id });
            setActivities((prev) => [...prev, created]);
        } catch (e) {
            console.error("Failed to add activity for goal", e);
            throw e;
        }
    };

    const removeActivity = async (id) => {
        try {
            const mod = await import("../../services/activityService");
            const svc = mod.default || mod;
            await svc.remove(id);
            setActivities((prev) =>
                prev.filter((a) => String(a.id) !== String(id))
            );
        } catch (e) {
            console.error("Failed to remove activity", e);
        }
    };

    const toggleActivityComplete = async (id) => {
        if (savingActivityIds.has(id)) return;
        setSavingActivityIds((s) => new Set([...s, id]));
        try {
            const mod = await import("../../services/activityService");
            const svc = mod.default || mod;
            const existing = activities.find(
                (a) => String(a.id) === String(id)
            );
            const updated = await svc.update(id, {
                completed: !existing?.completed,
            });
            setActivities((prev) =>
                prev.map((a) => (String(a.id) === String(id) ? updated : a))
            );
        } catch (e) {
            console.error("Failed to toggle activity complete", e);
        } finally {
            setSavingActivityIds((s) => {
                const copy = new Set(s);
                copy.delete(id);
                return copy;
            });
        }
    };

    const handleToggleVisibility = async () => {
        const newVis = localGoal.visibility === "private" ? "public" : "private";
        setLocalGoal((p) => ({ ...p, visibility: newVis }));
        try {
            await onUpdate(goal.id, { visibility: newVis });
        } catch (e) {
            console.error(e);
        }
    };

    const handleToggleComplete = async () => {
        const newStatus =
            localGoal.status === "completed" ? "active" : "completed";
        setLocalGoal((p) => ({ ...p, status: newStatus }));
        try {
            await onUpdate(goal.id, { status: newStatus });
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveHeader = async () => {
        try {
            await onUpdate(goal.id, {
                title: localGoal?.title,
                priority: localGoal?.priority || "medium",
                startDate: localGoal?.startDate || null,
                dueDate: localGoal?.dueDate || null,
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handlePriorityChange = async (nextPriority) => {
        const previousPriority = localGoal?.priority || "medium";
        setLocalGoal((prev) => ({ ...prev, priority: nextPriority }));
        try {
            await onUpdate(goal.id, { priority: nextPriority });
        } catch (e) {
            console.error("Failed to update priority", e);
            setLocalGoal((prev) => ({ ...prev, priority: previousPriority }));
        }
    };

    const handleAddTag = async () => {
        const nextTag = String(tagInput || "").trim().slice(0, GOAL_TAG_MAX_LENGTH);
        if (!nextTag) return;

        const currentTags = Array.isArray(localGoal?.tags) ? localGoal.tags : [];
        if (currentTags.some((tag) => String(tag).toLowerCase() === nextTag.toLowerCase())) {
            setTagInput("");
            return;
        }

        const nextTags = [...currentTags, nextTag];
        setLocalGoal((prev) => ({ ...prev, tags: nextTags }));
        setTagInput("");

        try {
            await onUpdate(goal.id, { tags: nextTags });
        } catch (e) {
            console.error("Failed to add tag", e);
            setLocalGoal((prev) => ({ ...prev, tags: currentTags }));
        }
    };

    const handleTagInputBlur = async () => {
        if (!String(tagInput || "").trim()) return;
        await handleAddTag();
    };

    const handleRemoveTag = async (tagToRemove) => {
        const currentTags = Array.isArray(localGoal?.tags) ? localGoal.tags : [];
        const nextTags = currentTags.filter((tag) => String(tag) !== String(tagToRemove));
        setLocalGoal((prev) => ({ ...prev, tags: nextTags }));
        setTagColors((prev) => {
            if (!Object.prototype.hasOwnProperty.call(prev, tagToRemove)) return prev;
            const next = { ...prev };
            delete next[tagToRemove];
            writeStoredTagColors(goal.id, next);
            return next;
        });
        setOpenTagColorPicker((prev) => (prev === tagToRemove ? null : prev));

        try {
            await onUpdate(goal.id, { tags: nextTags });
        } catch (e) {
            console.error("Failed to remove tag", e);
            setLocalGoal((prev) => ({ ...prev, tags: currentTags }));
        }
    };

    const handleTagColorChange = (tag, fill) => {
        setTagColors((prev) => {
            const next = { ...prev, [tag]: fill };
            writeStoredTagColors(goal.id, next);
            return next;
        });
        setOpenTagColorPicker(null);
    };

    const handleMilestoneScoreChange = async (milestoneId, newPct) => {
        const newScore = Math.max(0, Math.min(100, Number(newPct))) / 100;
        setUpdatingMilestone(milestoneId);
        try {
            const mod = await import("../../services/milestoneService");
            if (mod && mod.updateMilestone) {
                await mod.updateMilestone(milestoneId, { score: newScore });
            }

            setLocalGoal((prev) => {
                if (!prev) return prev;
                const ms = (prev.milestones || []).map((m) =>
                    m.id === milestoneId ? { ...m, score: newScore } : m
                );
                return { ...prev, milestones: ms };
            });

            if (typeof onMilestoneUpdated === "function") {
                await onMilestoneUpdated();
            }
        } catch (error) {
            console.error("Failed to update milestone score:", error);
        } finally {
            setUpdatingMilestone(null);
        }
    };

    const handleCreateMilestone = async (m) => {
        try {
            const mod = await import("../../services/milestoneService");
            if (mod && mod.createMilestone) {
                const created = await mod.createMilestone(goal.id, m);
                // Optimistically append created milestone to local state so UI updates immediately
                setLocalGoal((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev };
                    next.milestones = [...(next.milestones || []), created];
                    return next;
                });
                return created;
            }
            if (typeof onMilestoneUpdated === "function")
                await onMilestoneUpdated();
        } catch (e) {
            console.error("Failed to create milestone:", e);
            throw e;
        }
    };

    // Guarded helper to auto-create a milestone from the temporary "new" inputs.
    const creatingMilestoneRef = useRef(false);
    const tryCreateMilestoneFromInputs = async () => {
        const titleEl = document.getElementById(
            `new-milestone-title-${goal.id}`
        );
        if (!titleEl) return;
        const startEl = document.getElementById(
            `new-milestone-start-display-${goal.id}`
        );
        const dueEl = document.getElementById(
            `new-milestone-due-display-${goal.id}`
        );

        const title = (titleEl.value || "").trim();
        const start = startEl?.value
            ? parseDateFromDisplay(startEl.value, dateFormat) || null
            : null;
        const due = dueEl?.value
            ? parseDateFromDisplay(dueEl.value, dateFormat) || null
            : null;

        if (!title) return; // nothing to save
        if (creatingMilestoneRef.current) return; // already creating

        creatingMilestoneRef.current = true;
        try {
            const created = await handleCreateMilestone({
                title,
                startDate: start,
                dueDate: due,
            });
            // Notify parent pages/components so they can refresh lists/cards immediately
            if (typeof onMilestoneUpdated === "function") {
                try {
                    await onMilestoneUpdated();
                } catch (e) {
                    console.error("onMilestoneUpdated failed:", e);
                }
            }
            // Dispatch a global event so other pages (e.g., Goals list) can refresh
            try {
                window.dispatchEvent(
                    new CustomEvent("milestone:updated", {
                        detail: { goalId: goal.id },
                    })
                );
            } catch (e) {
                // ignore in environments without window or CustomEvent
            }
            // clear inputs after successful create
            try {
                titleEl.value = "";
            } catch (_) { }
            try {
                if (startEl) startEl.value = "";
                clearDisplayOverride(`new-milestone-start-${goal.id}`);
            } catch (_) { }
            try {
                if (dueEl) dueEl.value = "";
                clearDisplayOverride(`new-milestone-due-${goal.id}`);
            } catch (_) { }
        } catch (err) {
            console.error("Failed to auto-create milestone:", err);
        } finally {
            creatingMilestoneRef.current = false;
        }
    };

    const openDatePicker = (id) => {
        try {
            const el = document.getElementById(id);
            if (!el) return;
            // showPicker is supported in some browsers
            try {
                el.showPicker && el.showPicker();
            } catch (e) { }
            try {
                el.focus();
            } catch (e) { }
        } catch (e) {
            // ignore
        }
    };

    const memberFieldCls =
        "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 appearance-none pr-12";
    const InformedMembersIcon = () => (
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
            <FaUsers className="h-5 w-5 text-slate-500" />
            <FaInfoCircle className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white text-slate-500" />
        </span>
    );

    const updateMilestoneDate = async (milestone, field, value) => {
        const prevValue = milestone[field] || null;
        const nextValue = value || null;
        const payload =
            field === "startDate"
                ? { startDate: nextValue }
                : { dueDate: nextValue };

        setLocalGoal((prev) => {
            if (!prev) return prev;
            const ms = (prev.milestones || []).map((mm) =>
                mm.id === milestone.id
                    ? { ...mm, [field]: nextValue }
                    : mm
            );
            return { ...prev, milestones: ms };
        });

        const mod = await import("../../services/milestoneService");
        try {
            await mod.updateMilestone(milestone.id, payload);
            if (typeof onMilestoneUpdated === "function")
                await onMilestoneUpdated();
        } catch (err) {
            console.error(err);
            setLocalGoal((prev) => {
                if (!prev) return prev;
                const ms = (prev.milestones || []).map((mm) =>
                    mm.id === milestone.id
                        ? { ...mm, [field]: prevValue }
                        : mm
                );
                return { ...prev, milestones: ms };
            });
        }
    };

    const handleDeleteMilestone = async (milestoneId) => {
        try {
            const mod = await import("../../services/milestoneService");
            if (mod && mod.deleteMilestone)
                await mod.deleteMilestone(milestoneId);
            if (typeof onMilestoneUpdated === "function")
                await onMilestoneUpdated();
        } catch (e) {
            console.error("Failed to delete milestone:", e);
        }
    };

    // Save inline-edited milestone title (called on blur or Enter)
    const saveMilestoneTitle = async (milestoneId) => {
        // ensure we're editing this milestone
        if (
            !editingMilestoneId ||
            String(editingMilestoneId) !== String(milestoneId)
        ) {
            setEditingMilestoneId(null);
            return;
        }

        const newTitle = (editingMilestoneTitle || "").trim();

        // find current milestone to compare
        const current = (localGoal?.milestones || []).find(
            (mm) => String(mm.id) === String(milestoneId)
        );
        const currentTitle = current?.title || "";
        if (newTitle === currentTitle) {
            setEditingMilestoneId(null);
            return;
        }

        try {
            const mod = await import("../../services/milestoneService");
            if (mod && mod.updateMilestone) {
                await mod.updateMilestone(milestoneId, { title: newTitle });
            }

            // optimistic local update
            setLocalGoal((prev) => {
                if (!prev) return prev;
                const ms = (prev.milestones || []).map((mm) =>
                    String(mm.id) === String(milestoneId)
                        ? { ...mm, title: newTitle }
                        : mm
                );
                return { ...prev, milestones: ms };
            });

            if (typeof onMilestoneUpdated === "function")
                await onMilestoneUpdated();
        } catch (err) {
            console.error("Failed to save milestone title:", err);
        } finally {
            setEditingMilestoneId(null);
        }
    };

    if (isEditing) {
        return (
            <Suspense
                fallback={
                    <div role="status" aria-live="polite" className="p-4">
                        Loading…
                    </div>
                }
            >
                <GoalForm
                    goal={localGoal}
                    onClose={() => setIsEditing(false)}
                    onGoalCreated={async (goalData) => {
                        await onUpdate(goal.id, goalData);
                        setIsEditing(false);
                    }}
                    keyAreas={keyAreas}
                    isEditing={true}
                />
            </Suspense>
        );
    }

    // Header bar (moved outside the main wrapper so it can render above the content)
    const headerBar = (
        <div className="w-full">
            <div className="flex items-center gap-2 w-full">
                <button
                    className="md:hidden p-2 rounded-lg bg-white border border-slate-200 mr-2 self-start"
                    aria-label="Open menu"
                >
                    <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 448 512"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M16 132h416c8.837 0 16-7.163 16-16V76c0-8.837-7.163-16-16-16H16C7.163 60 0 67.163 0 76v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16zm0 160h416c8.837 0 16-7.163 16-16v-40c0-8.837-7.163-16-16-16H16c-8.837 0-16 7.163-16 16v40c0 8.837 7.163 16 16 16z"></path>
                    </svg>
                </button>

                <button
                    onClick={onClose}
                    className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center self-start"
                    aria-label="Back"
                    style={{ minWidth: 36, minHeight: 36 }}
                >
                    <svg
                        stroke="currentColor"
                        fill="currentColor"
                        strokeWidth="0"
                        viewBox="0 0 320 512"
                        height="1em"
                        width="1em"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
                    </svg>
                </button>

                <div className="flex min-w-0 items-center gap-1 self-start">
                    <img
                        alt="Goals"
                        className="w-6 h-6 object-contain block min-w-[24px] min-h-[24px]"
                        src={`${import.meta.env.BASE_URL || '/'}goals.png`}
                    />
                    <div className="min-w-0 flex items-center gap-2 px-1">
                        <span
                            className="relative text-base md:text-lg font-bold text-black truncate"
                        >
                            {localGoal?.title || t("goalDetailModal.untitledGoal")}
                        </span>
                    </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {Array.isArray(localGoal?.tags) && localGoal.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                            {localGoal.tags.map((tag, index) => (
                                <span
                                    key={`${tag}-${index}`}
                                    ref={openTagColorPicker === tag ? tagColorPickerRef : null}
                                    className="relative inline-flex"
                                >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOpenTagColorPicker((prev) =>
                                                    prev === tag ? null : tag
                                                )
                                            }
                                            className="relative inline-flex min-h-6 appearance-none items-center justify-start gap-1 border-0 bg-transparent px-3 pr-8 py-0.5 text-[11px] font-semibold text-white"
                                            aria-label={`Change color for tag ${tag}`}
                                        >
                                        <svg
                                            className="pointer-events-none absolute inset-0 h-full w-full"
                                            viewBox="0 0 96 32"
                                            preserveAspectRatio="none"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M8 2 H68 Q74 2 78 6 Q83 11 90 16 Q83 21 78 26 Q74 30 68 30 H8 Q2 30 2 24 V8 Q2 2 8 2 Z"
                                                fill={tagColors[tag] || TAG_COLOR_OPTIONS[0].fill}
                                            />
                                        </svg>
                                        <span className="relative z-10 block max-w-[140px] truncate text-left leading-none">
                                            {tag}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveTag(tag);
                                        }}
                                        className="absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-[11px] text-white/80 hover:text-white"
                                        aria-label={`Remove tag ${tag}`}
                                    >
                                        ×
                                    </button>
                                    {openTagColorPicker === tag && (
                                        <div
                                            ref={tagColorPickerRef}
                                            className="absolute left-0 top-full z-20 mt-2 flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-lg"
                                        >
                                            {TAG_COLOR_OPTIONS.map((option) => (
                                                <button
                                                    key={option.fill}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTagColorChange(tag, option.fill);
                                                    }}
                                                    className="h-5 w-5 rounded-full border border-white/70 shadow-sm ring-1 ring-slate-200 transition hover:scale-110"
                                                    style={{ backgroundColor: option.fill }}
                                                    aria-label={`Set ${tag} to ${option.name}`}
                                                    title={option.name}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="min-w-[96px] flex-1 max-w-[150px]">
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value.slice(0, GOAL_TAG_MAX_LENGTH))}
                            onBlur={handleTagInputBlur}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddTag();
                                }
                            }}
                            maxLength={GOAL_TAG_MAX_LENGTH}
                            placeholder="Add tag"
                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                        />
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-2 self-start">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                        aria-label="Edit goal"
                    >
                        {t("goalDetailModal.edit")}
                    </button>
                    {typeof onDelete === 'function' && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (window.confirm(t("goalDetailModal.deleteConfirm"))) onDelete(goal.id); }}
                            className="px-3 py-1 rounded-md border border-red-600 text-red-600 text-sm bg-white hover:bg-red-50"
                            aria-label="Delete goal"
                        >
                            {t("goalDetailModal.delete")}
                        </button>
                    )}
                </div>
            </div>
            {localGoal?.description && (
                <div className="mt-1 pl-[52px]">
                    <p className="max-w-full text-sm text-slate-600 break-words">
                        {localGoal.description}
                    </p>
                </div>
            )}
        </div>
    );

    // Inner dialog/page content (reused for modal overlay or page view)
    const wrapperClass = isPage
        ? "bg-white w-full h-full min-h-0 rounded-lg border border-blue-300 shadow-sm flex flex-col animate-slideUp overflow-hidden"
        : "relative bg-white rounded-xl w-full max-w-3xl shadow-2xl flex flex-col animate-slideUp max-h-[90vh] overflow-hidden border border-gray-200";
    const innerContent = (
        <div className={wrapperClass} onClick={(e) => e.stopPropagation()}>
            <style>{`
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                .animate-fadeIn { animation:fadeIn .2s ease-out; }
                .animate-slideUp { animation:slideUp .3s ease-out; }
                .milestone-scroll { scrollbar-width:none; scrollbar-color:transparent transparent; scrollbar-gutter:stable; }
                .milestone-scroll::-webkit-scrollbar { width:0; height:0; }
                .milestone-scroll::-webkit-scrollbar-track { background:#f1f5f9; border-radius:3px; }
                .milestone-scroll::-webkit-scrollbar-thumb { background:transparent; border-radius:3px; }
                .milestone-scroll:hover { scrollbar-width:thin; scrollbar-color:#cbd5e1 transparent; }
                .milestone-scroll:hover::-webkit-scrollbar { width:6px; height:6px; }
                .milestone-scroll:hover::-webkit-scrollbar-thumb { background:#cbd5e1; }
                .milestone-scroll:hover::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
                /* Hide native date picker indicator for inputs using .no-calendar */
                input.no-calendar::-webkit-calendar-picker-indicator {
                    opacity: 0;
                    pointer-events: none;
                    display: block;
                    width: 0;
                    height: 0;
                }
                input.no-calendar::-webkit-clear-button,
                input.no-calendar::-webkit-inner-spin-button {
                    display: none;
                }
                input.no-calendar { -webkit-appearance: none; appearance: none; }
            `}</style>
            {/* SUMMARY CARD – gauge + progress / dates / controls (reduced height) */}
            <div className="px-6 pt-2 pb-2 border-b border-gray-200 bg-white">
                <div className="rounded-2xl border border-gray-200 px-4 py-2 flex items-center gap-4">
                    {/* Gauge – custom SVG gauge component */}
                    <div className="flex flex-col items-center justify-center">
                        <GoalGauge percent={progressPercent} size={68} />
                        <span className="mt-0.5 text-xs font-semibold text-gray-700">
                            {progressPercent}%
                        </span>
                    </div>

                    {/* Right side: Progress / dates / lock / complete / save */}
                    <div className="flex-1 flex flex-col gap-1.5">
                        {/* labels + controls in the same grid so labels line up exactly above their inputs */}
                        <div className="grid grid-cols-1 gap-2 md:[grid-template-columns:88px_112px_136px_136px_60px_60px] md:ml-auto">
                            <div className="md:contents hidden md:block text-xs font-semibold text-gray-500 mb-1">
                                <div className="px-1">{t("goalDetailModal.colProgress")}</div>
                                <div className="px-1">Priority</div>
                                <div className="px-1">{t("goalDetailModal.colStartDate")}</div>
                                <div className="px-1">End date</div>
                                <div className="px-1">{t("goalDetailModal.colVisibility")}</div>
                                <div className="px-1">{t("goalDetailModal.colStatus")}</div>
                            </div>
                            {/* Progress box */}
                            <div className="flex items-center md:block">
                                <span className="md:hidden text-xs mr-2 text-gray-500">
                                    {t("goalDetailModal.colProgress")}
                                </span>
                                <div
                                    id={`top-goal-status-${goal.id}`}
                                    className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 rounded-md bg-white text-sm font-semibold text-gray-700 w-full"
                                >
                                    {progressPercent} %
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="flex items-center md:block">
                                <span className="md:hidden text-xs mr-2 text-gray-500">
                                    Priority
                                </span>
                                <select
                                    value={localGoal?.priority || "medium"}
                                    onChange={(e) =>
                                        handlePriorityChange(e.target.value)
                                    }
                                    className="w-full md:max-w-[112px] px-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white text-gray-700"
                                >
                                    {PRIORITY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Start date */}
                            <div className="flex items-center md:block">
                                <span className="md:hidden text-xs mr-2 text-gray-500">
                                    {t("goalDetailModal.mobileStart")}
                                </span>
                                <div className="md:inline-block">
                                    <div className="relative">
                                        <input
                                            id={`goal-${goal.id}-date_start-display`}
                                            type="text"
                                            value={getDisplayValue(
                                                `goal-start-${goal.id}`,
                                                localGoal?.startDate
                                            )}
                                            onChange={(e) =>
                                                handleDisplayChange(
                                                    `goal-start-${goal.id}`,
                                                    e.target.value
                                                )
                                            }
                                            onBlur={(e) =>
                                                commitDisplayValue(
                                                    `goal-start-${goal.id}`,
                                                    e.target.value,
                                                    (iso) =>
                                                        setLocalGoal((p) => ({
                                                            ...p,
                                                            startDate:
                                                                iso || null,
                                                        }))
                                                )
                                            }
                                            placeholder={`Format: ${dateFormat}`}
                                            className="w-full md:max-w-[136px] px-3 py-1.5 pr-11 border border-slate-300 rounded-md text-sm bg-white text-gray-700 no-calendar"
                                        />
                                        <input
                                            id={`goal-${goal.id}-date_start-input-${goal.id}`}
                                            type="date"
                                            value={normalizeToIsoDate(
                                                localGoal?.startDate
                                            )}
                                            onChange={(e) => {
                                                const next =
                                                    e.target.value || null;
                                                setLocalGoal((p) => ({
                                                    ...p,
                                                    startDate: next,
                                                }));
                                                clearDisplayOverride(
                                                    `goal-start-${goal.id}`
                                                );
                                            }}
                                            tabIndex={-1}
                                            aria-hidden="true"
                                            className="absolute inset-0 opacity-0 pointer-events-none"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                            aria-label="Open date picker"
                                            onClick={() =>
                                                openDatePicker(
                                                    `goal-${goal.id}-date_start-input-${goal.id}`
                                                )
                                            }
                                        >
                                            📅
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* End date */}
                            <div className="flex items-center md:block">
                                <span className="md:hidden text-xs mr-2 text-gray-500">
                                    End date
                                </span>
                                <div className="md:inline-block">
                                    <div className="relative">
                                        <input
                                            id={`goal-${goal.id}-deadline-display`}
                                            type="text"
                                            value={getDisplayValue(
                                                `goal-due-${goal.id}`,
                                                localGoal?.dueDate
                                            )}
                                            onChange={(e) =>
                                                handleDisplayChange(
                                                    `goal-due-${goal.id}`,
                                                    e.target.value
                                                )
                                            }
                                            onBlur={(e) =>
                                                commitDisplayValue(
                                                    `goal-due-${goal.id}`,
                                                    e.target.value,
                                                    (iso) =>
                                                        setLocalGoal((p) => ({
                                                            ...p,
                                                            dueDate:
                                                                iso || null,
                                                        }))
                                                )
                                            }
                                            placeholder={`Format: ${dateFormat}`}
                                            className="w-full md:max-w-[136px] px-3 py-1.5 pr-11 border border-slate-300 rounded-md text-sm bg-white text-gray-700 no-calendar"
                                        />
                                        <input
                                            id={`goal-${goal.id}-deadline-input-${goal.id}`}
                                            type="date"
                                            value={normalizeToIsoDate(
                                                localGoal?.dueDate
                                            )}
                                            onChange={(e) => {
                                                const next =
                                                    e.target.value || null;
                                                setLocalGoal((p) => ({
                                                    ...p,
                                                    dueDate: next,
                                                }));
                                                clearDisplayOverride(
                                                    `goal-due-${goal.id}`
                                                );
                                            }}
                                            tabIndex={-1}
                                            aria-hidden="true"
                                            className="absolute inset-0 opacity-0 pointer-events-none"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                            aria-label="Open date picker"
                                            onClick={() =>
                                                openDatePicker(
                                                    `goal-${goal.id}-deadline-input-${goal.id}`
                                                )
                                            }
                                        >
                                            📅
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Visibility lock */}
                            <div className="flex items-center">
                                <button
                                    id={`goal-public-cb-${goal.id}`}
                                    onClick={handleToggleVisibility}
                                    className="w-full flex items-center justify-center px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-gray-100"
                                    title="Visibility"
                                >
                                    {localGoal?.visibility === "private" ? (
                                        <FaLock className="w-4 h-4 text-gray-800" />
                                    ) : (
                                        <FaEye className="w-4 h-4 text-gray-800" />
                                    )}
                                </button>
                            </div>

                            {/* Complete button - align to the left side of the Status column */}
                            <div className="flex items-center gap-2 justify-start">
                                <button
                                    id={`goal-${goal.id}-completed-icon`}
                                    onClick={handleToggleComplete}
                                    className={`md:flex-none px-3 py-1.5 rounded-md flex items-center justify-center gap-2 text-sm ${localGoal?.status === "completed"
                                            ? "bg-emerald-600 text-white"
                                            : "border border-gray-300 text-gray-800 hover:bg-gray-100"
                                        }`}
                                    title="Complete"
                                >
                                    <FaCheckCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GOAL INFORMATION */}
            <div className="px-6 pb-3 border-b border-gray-200 bg-white">
                <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
                    <div>
                        <div className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500">
                            Key Area
                        </div>
                        <div className="relative">
                            <select
                                value={localGoal?.keyAreaId || ""}
                                disabled={savingInfoField === "keyAreaId"}
                                onChange={(e) => {
                                    const selectedId = e.target.value || null;
                                    handleInfoFieldUpdate("keyAreaId", selectedId);
                                }}
                                className={memberFieldCls}
                            >
                                <option value="">No key area</option>
                                {(Array.isArray(keyAreas) ? keyAreas : []).map((area) => (
                                    <option key={area.id} value={area.id}>
                                        {area.title || area.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
                        </div>
                    </div>

                    <div>
                        <div className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500">
                            Team Goal
                        </div>
                        <div className="relative">
                            <select
                                value={localGoal?.teamId || ""}
                                disabled={savingInfoField === "teamId"}
                                onChange={(e) => {
                                    const nextTeamId = e.target.value || null;
                                    handleInfoFieldUpdate("teamId", nextTeamId, {
                                        teamName: nextTeamId ? teamMap[nextTeamId] || localGoal?.teamName || "" : null,
                                    });
                                }}
                                className={memberFieldCls}
                            >
                                <option value="">Personal goal</option>
                                {Object.entries(teamMap).map(([id, name]) => (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
                        </div>
                    </div>

                    <div ref={parentGoalPickerRef} className="relative">
                        <div className="mb-1.5 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H7a3 3 0 000 6h1a1 1 0 110 2H7A5 5 0 017 7h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            <span className="text-xs font-semibold text-gray-500 tracking-wide">{t("goalDetailModal.parentGoalSection")}</span>
                        </div>

                        {localGoal?.parentGoalId ? (
                            <div className="flex min-h-[44px] items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5">
                                <span className="flex-1 text-sm text-purple-800 truncate">
                                    {availableGoals.find(g => g.id === localGoal.parentGoalId)?.title
                                        || localGoal.parentGoalTitle
                                        || t("goalDetailModal.linkedToParent")}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleSetParentGoal(null)}
                                    disabled={savingParentGoal}
                                    className="text-sm text-purple-500 hover:text-red-600 font-medium disabled:opacity-50 flex-shrink-0"
                                    aria-label="Remove parent goal link"
                                >
                                    {savingParentGoal ? t("goalDetailModal.saving") : "×"}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    placeholder={t("goalDetailModal.searchParentPlaceholder")}
                                    value={parentGoalSearch}
                                    onChange={(e) => { setParentGoalSearch(e.target.value); setShowParentGoalDropdown(true); }}
                                    onFocus={() => setShowParentGoalDropdown(true)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-50"
                                />
                                {showParentGoalDropdown && (
                                    <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                                        {availableGoals
                                            .filter(g => g.id !== goal.id && g.title?.toLowerCase().includes(parentGoalSearch.toLowerCase()))
                                            .slice(0, 8)
                                            .map(g => (
                                                <button
                                                    key={g.id}
                                                    type="button"
                                                    disabled={savingParentGoal}
                                                    className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-purple-50 hover:text-purple-800 truncate disabled:opacity-50"
                                                    onClick={() => handleSetParentGoal(g.id)}
                                                >
                                                    {g.title}
                                                </button>
                                            ))}
                                        {availableGoals.filter(g => g.id !== goal.id && g.title?.toLowerCase().includes(parentGoalSearch.toLowerCase())).length === 0 && (
                                            <div className="px-3 py-2 text-sm text-slate-400">{t("goalDetailModal.noMatchingGoals")}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500">
                            Responsible
                        </div>
                        <div className="relative">
                            <FaUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <select
                                value={goalRaci.responsible[0] || ""}
                                disabled={savingInfoField === "responsible"}
                                onChange={(e) => handleRaciRoleChange("responsible", e.target.value ? [String(e.target.value)] : [])}
                                className={`${memberFieldCls} pl-11`}
                            >
                                <option value="">Unassigned</option>
                                {orgMembers.map((member) => (
                                    <option key={member.id} value={member.id}>
                                        {member.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
                        </div>
                    </div>

                    <div
                        ref={(node) => {
                            if (node) membersMenuRefs.current.consulted = node;
                            else delete membersMenuRefs.current.consulted;
                        }}
                    >
                        <div className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500">
                            Consulted
                        </div>
                        <div className="relative">
                            <FaUsers className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                            <button
                                type="button"
                                disabled={savingInfoField === "consulted"}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 appearance-none pr-12 pl-11 text-left transition-colors hover:border-slate-400"
                                style={{ borderStyle: "solid", borderWidth: 1, borderColor: "#cbd5e1" }}
                                onClick={() => setOpenMembersRole((current) => (current === "consulted" ? null : "consulted"))}
                            >
                                <span className={goalRaci.consulted.length ? "text-slate-900" : "text-slate-400"}>
                                    {formatMemberSummary(goalRaci.consulted)}
                                </span>
                            </button>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
                            {openMembersRole === "consulted" && (
                                <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                    <div className="max-h-48 space-y-1 overflow-y-auto">
                                        {orgMembers.map((member) => {
                                            const checked = goalRaci.consulted.includes(String(member.id));
                                            return (
                                                <label key={`consulted-${member.id}`} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        checked={checked}
                                                        onChange={() => toggleRaciMember("consulted", String(member.id))}
                                                    />
                                                    <span>{member.name}</span>
                                                </label>
                                            );
                                        })}
                                        {orgMembers.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-slate-400">No members found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        ref={(node) => {
                            if (node) membersMenuRefs.current.informed = node;
                            else delete membersMenuRefs.current.informed;
                        }}
                    >
                        <div className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500">
                            Informed
                        </div>
                        <div className="relative">
                            <InformedMembersIcon />
                            <button
                                type="button"
                                disabled={savingInfoField === "informed"}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 appearance-none pr-12 pl-11 text-left transition-colors hover:border-slate-400"
                                style={{ borderStyle: "solid", borderWidth: 1, borderColor: "#cbd5e1" }}
                                onClick={() => setOpenMembersRole((current) => (current === "informed" ? null : "informed"))}
                            >
                                <span className={goalRaci.informed.length ? "text-slate-900" : "text-slate-400"}>
                                    {formatMemberSummary(goalRaci.informed)}
                                </span>
                            </button>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
                            {openMembersRole === "informed" && (
                                <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                                    <div className="max-h-48 space-y-1 overflow-y-auto">
                                        {orgMembers.map((member) => {
                                            const checked = goalRaci.informed.includes(String(member.id));
                                            return (
                                                <label key={`informed-${member.id}`} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        checked={checked}
                                                        onChange={() => toggleRaciMember("informed", String(member.id))}
                                                    />
                                                    <span>{member.name}</span>
                                                </label>
                                            );
                                        })}
                                        {orgMembers.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-slate-400">No members found</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT – Tabs: Summary / Milestones / Activities */}
            {/* Use a light-gray background for the surrounding margins so date fields and small bordered controls
                appear to sit on a subtle gray surface (matches date input/border tones). */}
            <div className="flex-1 min-h-0 overflow-hidden bg-gray-50">
                <div className="flex h-full min-h-0 flex-col px-6 pt-1 pb-6">
                    {/* Tabs removed per user request */}

                    {/* SUMMARY tab - brief summary (gauge already visible above) */}
                    {activeTab === "summary" && (
                        <div className="text-sm text-gray-700">
                            <div className="mb-2">
                                Progress: <strong>{progressPercent}%</strong>
                            </div>
                            <div className="mb-2">
                                Start:{" "}
                                {localGoal?.startDate
                                    ? formatDate(localGoal.startDate)
                                    : "—"}
                            </div>
                            <div className="mb-2">
                                Due:{" "}
                                {localGoal?.dueDate
                                    ? formatDate(localGoal.dueDate)
                                    : "—"}
                            </div>
                            <div className="mb-2">
                                Visibility: {localGoal?.visibility}
                            </div>
                            <div className="mb-2">
                                Status: {localGoal?.status}
                            </div>
                        </div>
                    )}

                    {/* MILESTONES tab - existing milestones UI */}
                    {activeTab === "milestones" && (
                        <>
                            {/* Milestones title */}
                            <div className="mb-2">
                                {/* Use a subtle gray border and neutral text to match date inputs */}
                                <span className="inline-block border border-slate-300 rounded-lg px-4 py-1 text-sm font-semibold text-gray-800 bg-white">
                                    {t("goalDetailModal.milestonesTitle")}
                                </span>
                            </div>

                            {/* Table header */}
                            <div className="text-xs font-semibold text-gray-600 mb-2 px-1 hidden md:grid grid-cols-12">
                                <div className="col-span-3">
                                    {t("goalDetailModal.colScore")}
                                </div>
                                <div className="col-span-5">{t("goalDetailModal.colMilestone")}</div>
                                <div className="col-span-2">{t("goalDetailModal.colStartDate")}</div>
                                <div className="col-span-2">End date</div>
                            </div>

                            {/* Milestones list — all milestones inside one shared container */}
                            <div className="flex-1 min-h-0 overflow-y-auto milestone-scroll">
                                {/* make the milestone card border explicitly gray to match the date inputs */}
                                <div className="p-3 border border-slate-300 rounded-xl bg-white space-y-3">
                                    {milestonesList.map((m, i) => {
                                        const pct = Math.round(
                                            (parseFloat(m.score) || 0) * 100
                                        );
                                        return (
                                            <div
                                                key={m.id || i}
                                                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                                            >
                                                {/* Score/slider */}
                                                <div className="md:col-span-3 flex items-center gap-3">
                                                    <span className="text-xs md:hidden text-gray-500">
                                                        {t("goalDetailModal.mobileScore")}
                                                    </span>
                                                    <div className="text-sm w-8 text-right">
                                                        {pct}
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={100}
                                                        value={pct}
                                                        disabled={
                                                            updatingMilestone ===
                                                            m.id
                                                        }
                                                        onChange={(e) => {
                                                            const val = Number(
                                                                e.target
                                                                    .value || 0
                                                            );
                                                            setLocalGoal(
                                                                (prev) => {
                                                                    if (!prev)
                                                                        return prev;
                                                                    const ms = (
                                                                        prev.milestones ||
                                                                        []
                                                                    ).map(
                                                                        (mm) =>
                                                                            mm.id ===
                                                                                m.id
                                                                                ? {
                                                                                    ...mm,
                                                                                    score:
                                                                                        val /
                                                                                        100,
                                                                                }
                                                                                : mm
                                                                    );
                                                                    return {
                                                                        ...prev,
                                                                        milestones:
                                                                            ms,
                                                                    };
                                                                }
                                                            );
                                                        }}
                                                        onMouseUp={(e) =>
                                                            handleMilestoneScoreChange(
                                                                m.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        onTouchEnd={(e) =>
                                                            handleMilestoneScoreChange(
                                                                m.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="flex-1"
                                                    />
                                                </div>

                                                {/* Milestone title */}
                                                <div className="md:col-span-5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <button
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        setOpenMilestoneMenuId(
                                                                            (
                                                                                prev
                                                                            ) =>
                                                                                prev ===
                                                                                    m.id
                                                                                    ? null
                                                                                    : m.id
                                                                        );
                                                                    }}
                                                                    className="p-1.5 rounded-full border border-gray-300 text-gray-600"
                                                                    aria-haspopup="menu"
                                                                    aria-expanded={
                                                                        openMilestoneMenuId ===
                                                                        m.id
                                                                    }
                                                                    aria-label="Milestone menu"
                                                                >
                                                                    <FaEllipsisV className="w-3 h-3" />
                                                                </button>

                                                                {openMilestoneMenuId ===
                                                                    m.id && (
                                                                        <div
                                                                            onMouseDown={(
                                                                                e
                                                                            ) =>
                                                                                e.stopPropagation()
                                                                            }
                                                                            className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 w-36 bg-white border rounded shadow z-50"
                                                                            role="menu"
                                                                        >
                                                                            <button
                                                                                onClick={async (
                                                                                    e
                                                                                ) => {
                                                                                    e.stopPropagation();
                                                                                    setOpenMilestoneMenuId(
                                                                                        null
                                                                                    );
                                                                                    await handleDeleteMilestone(
                                                                                        m.id
                                                                                    );
                                                                                }}
                                                                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                                                                role="menuitem"
                                                                            >
                                                                                <svg
                                                                                    stroke="currentColor"
                                                                                    fill="currentColor"
                                                                                    strokeWidth="0"
                                                                                    viewBox="0 0 448 512"
                                                                                    className="w-4 h-4 inline-block mr-2 align-middle"
                                                                                    height="1em"
                                                                                    width="1em"
                                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                                >
                                                                                    <path d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z"></path>
                                                                                </svg>
                                                                                Delete
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                            </div>

                                                            <div className="flex-1">
                                                                {/* Click title to edit inline. Save on blur or Enter, Esc cancels. */}
                                                                {editingMilestoneId ===
                                                                    m.id ? (
                                                                    <input
                                                                        autoFocus
                                                                        value={
                                                                            editingMilestoneTitle
                                                                        }
                                                                        onChange={(
                                                                            e
                                                                        ) =>
                                                                            setEditingMilestoneTitle(
                                                                                e
                                                                                    .target
                                                                                    .value
                                                                            )
                                                                        }
                                                                        onKeyDown={async (
                                                                            e
                                                                        ) => {
                                                                            if (
                                                                                e.key ===
                                                                                "Enter"
                                                                            ) {
                                                                                e.preventDefault();
                                                                                await saveMilestoneTitle(
                                                                                    m.id
                                                                                );
                                                                            }
                                                                            if (
                                                                                e.key ===
                                                                                "Escape"
                                                                            ) {
                                                                                setEditingMilestoneId(
                                                                                    null
                                                                                );
                                                                            }
                                                                        }}
                                                                        onBlur={async () => {
                                                                            await saveMilestoneTitle(
                                                                                m.id
                                                                            );
                                                                        }}
                                                                        className="w-full px-2 py-1 border rounded text-sm"
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className={`text-sm font-semibold ${m.done
                                                                                ? "line-through text-gray-500"
                                                                                : "text-gray-900"
                                                                            }`}
                                                                        onClick={() => {
                                                                            setEditingMilestoneId(
                                                                                m.id
                                                                            );
                                                                            setEditingMilestoneTitle(
                                                                                m.title ||
                                                                                ""
                                                                            );
                                                                        }}
                                                                        role="button"
                                                                        tabIndex={
                                                                            0
                                                                        }
                                                                        onKeyDown={(
                                                                            e
                                                                        ) => {
                                                                            if (
                                                                                e.key ===
                                                                                "Enter"
                                                                            ) {
                                                                                setEditingMilestoneId(
                                                                                    m.id
                                                                                );
                                                                                setEditingMilestoneTitle(
                                                                                    m.title ||
                                                                                    ""
                                                                                );
                                                                            }
                                                                        }}
                                                                    >
                                                                        {m.title ||
                                                                            t("goalDetailModal.untitledMilestone")}
                                                                    </div>
                                                                )}
                                                                {m.description && (
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        {
                                                                            m.description
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Dates */}
                                                <div className="md:col-span-2">
                                                    <span className="md:hidden text-xs text-gray-500">
                                                        {t("goalDetailModal.colStartDate")}
                                                    </span>
                                                    <div className="relative">
                                                        <input
                                                            id={`milestone-start-display-${m.id || i}-${goal.id}`}
                                                            type="text"
                                                            value={getDisplayValue(
                                                                `milestone-start-${m.id || i}-${goal.id}`,
                                                                m.startDate
                                                            )}
                                                            onChange={(e) =>
                                                                handleDisplayChange(
                                                                    `milestone-start-${m.id || i}-${goal.id}`,
                                                                    e.target.value
                                                                )
                                                            }
                                                            onBlur={(e) =>
                                                                commitDisplayValue(
                                                                    `milestone-start-${m.id || i}-${goal.id}`,
                                                                    e.target.value,
                                                                    (iso) =>
                                                                        updateMilestoneDate(
                                                                            m,
                                                                            "startDate",
                                                                            iso
                                                                        )
                                                                )
                                                            }
                                                            placeholder={dateFormat}
                                                            className="w-full px-2 py-1 pr-11 border rounded-md text-sm bg-white text-gray-700 border-slate-300 no-calendar"
                                                        />
                                                        <input
                                                            id={`milestone-start-${m.id || i}-${goal.id}`}
                                                            type="date"
                                                            value={normalizeToIsoDate(
                                                                m.startDate
                                                            )}
                                                            onChange={(e) => {
                                                                const next =
                                                                    e.target
                                                                        .value ||
                                                                    null;
                                                                clearDisplayOverride(
                                                                    `milestone-start-${m.id || i}-${goal.id}`
                                                                );
                                                                updateMilestoneDate(
                                                                    m,
                                                                    "startDate",
                                                                    next
                                                                );
                                                            }}
                                                            tabIndex={-1}
                                                            aria-hidden="true"
                                                            className="absolute inset-0 opacity-0 pointer-events-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                                            aria-label="Open date picker"
                                                            onClick={() =>
                                                                openDatePicker(
                                                                    `milestone-start-${m.id || i}-${goal.id}`
                                                                )
                                                            }
                                                        >
                                                            📅
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <span className="md:hidden text-xs text-gray-500">
                                                        End date
                                                    </span>
                                                    <div className="relative">
                                                        <input
                                                            id={`milestone-due-display-${m.id || i}-${goal.id}`}
                                                            type="text"
                                                            value={getDisplayValue(
                                                                `milestone-due-${m.id || i}-${goal.id}`,
                                                                m.dueDate
                                                            )}
                                                            onChange={(e) =>
                                                                handleDisplayChange(
                                                                    `milestone-due-${m.id || i}-${goal.id}`,
                                                                    e.target.value
                                                                )
                                                            }
                                                            onBlur={(e) =>
                                                                commitDisplayValue(
                                                                    `milestone-due-${m.id || i}-${goal.id}`,
                                                                    e.target.value,
                                                                    (iso) =>
                                                                        updateMilestoneDate(
                                                                            m,
                                                                            "dueDate",
                                                                            iso
                                                                        )
                                                                )
                                                            }
                                                            placeholder={dateFormat}
                                                            className="w-full px-2 py-1 pr-11 border rounded-md text-sm bg-white text-gray-700 border-slate-300 no-calendar"
                                                        />
                                                        <input
                                                            id={`milestone-due-${m.id || i}-${goal.id}`}
                                                            type="date"
                                                            value={normalizeToIsoDate(
                                                                m.dueDate
                                                            )}
                                                            onChange={(e) => {
                                                                const next =
                                                                    e.target
                                                                        .value ||
                                                                    null;
                                                                clearDisplayOverride(
                                                                    `milestone-due-${m.id || i}-${goal.id}`
                                                                );
                                                                updateMilestoneDate(
                                                                    m,
                                                                    "dueDate",
                                                                    next
                                                                );
                                                            }}
                                                            tabIndex={-1}
                                                            aria-hidden="true"
                                                            className="absolute inset-0 opacity-0 pointer-events-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                                            aria-label="Open date picker"
                                                            onClick={() =>
                                                                openDatePicker(
                                                                    `milestone-due-${m.id || i}-${goal.id}`
                                                                )
                                                            }
                                                        >
                                                            📅
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add milestone row (inside same container) - hidden for completed goals */}
                                    {localGoal?.status !== "completed" && (
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center mt-0">
                                            <div className="md:col-span-3 flex items-center gap-3">
                                                <span className="text-xs md:hidden text-gray-500">
                                                    Score
                                                </span>
                                                <div className="text-sm w-8 text-right">
                                                    0
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    defaultValue={0}
                                                    className="flex-1"
                                                />
                                            </div>
                                            <div className="md:col-span-5">
                                                <input
                                                    id={`new-milestone-title-${goal.id}`}
                                                    placeholder={t("goalDetailModal.addMilestonePlaceholder")}
                                                    className="w-full px-3 py-2 rounded-xl text-sm border border-gray-300"
                                                    onKeyDown={async (e) => {
                                                        if (
                                                            e.key === "Enter"
                                                        ) {
                                                            e.preventDefault();
                                                            await tryCreateMilestoneFromInputs();
                                                        }
                                                    }}
                                                    onBlur={async () => {
                                                        // attempt to create when the title loses focus
                                                        await tryCreateMilestoneFromInputs();
                                                    }}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <span className="md:hidden text-xs text-gray-500">
                                                    Start date
                                                </span>
                                                <div className="relative">
                                                    <input
                                                        id={`new-milestone-start-display-${goal.id}`}
                                                        type="text"
                                                        value={getDisplayValue(
                                                            `new-milestone-start-${goal.id}`,
                                                            ""
                                                        )}
                                                        onChange={(e) =>
                                                            handleDisplayChange(
                                                                `new-milestone-start-${goal.id}`,
                                                                e.target.value
                                                            )
                                                        }
                                                        onBlur={async () => {
                                                            await tryCreateMilestoneFromInputs();
                                                        }}
                                                        placeholder={dateFormat}
                                                        className="w-full px-2 py-1 pr-11 border rounded-md text-sm bg-white text-gray-700 border-slate-300 no-calendar"
                                                    />
                                                    <input
                                                        id={`new-milestone-start-${goal.id}`}
                                                        type="date"
                                                        value={
                                                            parseDateFromDisplay(
                                                                getDisplayValue(
                                                                    `new-milestone-start-${goal.id}`,
                                                                    ""
                                                                ),
                                                                dateFormat
                                                            ) || ""
                                                        }
                                                        onChange={(e) => {
                                                            const next =
                                                                e.target
                                                                    .value ||
                                                                "";
                                                            clearDisplayOverride(
                                                                `new-milestone-start-${goal.id}`
                                                            );
                                                            handleDisplayChange(
                                                                `new-milestone-start-${goal.id}`,
                                                                next
                                                                    ? formatDate(
                                                                        next
                                                                    )
                                                                    : ""
                                                            );
                                                        }}
                                                        tabIndex={-1}
                                                        aria-hidden="true"
                                                        className="absolute inset-0 opacity-0 pointer-events-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                                        aria-label="Open date picker"
                                                        onClick={() =>
                                                            openDatePicker(
                                                                `new-milestone-start-${goal.id}`
                                                            )
                                                        }
                                                    >
                                                        📅
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <span className="md:hidden text-xs text-gray-500">
                                                    End date
                                                </span>
                                                <div className="relative">
                                                    <input
                                                        id={`new-milestone-due-display-${goal.id}`}
                                                        type="text"
                                                        value={getDisplayValue(
                                                            `new-milestone-due-${goal.id}`,
                                                            ""
                                                        )}
                                                        onChange={(e) =>
                                                            handleDisplayChange(
                                                                `new-milestone-due-${goal.id}`,
                                                                e.target.value
                                                            )
                                                        }
                                                        onBlur={async () => {
                                                            await tryCreateMilestoneFromInputs();
                                                        }}
                                                        placeholder={dateFormat}
                                                        className="w-full px-2 py-1 pr-11 border rounded-md text-sm bg-white text-gray-700 border-slate-300 no-calendar"
                                                    />
                                                    <input
                                                        id={`new-milestone-due-${goal.id}`}
                                                        type="date"
                                                        value={
                                                            parseDateFromDisplay(
                                                                getDisplayValue(
                                                                    `new-milestone-due-${goal.id}`,
                                                                    ""
                                                                ),
                                                                dateFormat
                                                            ) || ""
                                                        }
                                                        onChange={(e) => {
                                                            const next =
                                                                e.target
                                                                    .value ||
                                                                "";
                                                            clearDisplayOverride(
                                                                `new-milestone-due-${goal.id}`
                                                            );
                                                            handleDisplayChange(
                                                                `new-milestone-due-${goal.id}`,
                                                                next
                                                                    ? formatDate(
                                                                        next
                                                                    )
                                                                    : ""
                                                            );
                                                        }}
                                                        tabIndex={-1}
                                                        aria-hidden="true"
                                                        className="absolute inset-0 opacity-0 pointer-events-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600"
                                                        aria-label="Open date picker"
                                                        onClick={() =>
                                                            openDatePicker(
                                                                `new-milestone-due-${goal.id}`
                                                            )
                                                        }
                                                    >
                                                        📅
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ACTIVITIES tab - simple activity list */}
                    {activeTab === "activities" && (
                        <div className="flex-1 min-h-0 overflow-y-auto milestone-scroll space-y-3">
                            <div className="mb-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        id={`new-activity-${goal.id}`}
                                        placeholder={t("goalDetailModal.addActivityPlaceholder")}
                                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                                    />
                                    <button
                                        onClick={async () => {
                                            const v =
                                                document.getElementById(
                                                    `new-activity-${goal.id}`
                                                ).value;
                                            if (!v) return;
                                            try {
                                                await addActivity(v);
                                                document.getElementById(
                                                    `new-activity-${goal.id}`
                                                ).value = "";
                                            } catch (e) {
                                                console.error(e);
                                            }
                                        }}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-md"
                                    >
                                        {t("goalDetailModal.addActivity")}
                                    </button>
                                </div>
                            </div>

                            {loadingActivities ? (
                                <div className="py-6 text-center text-sm text-gray-500">
                                    {t("goalDetailModal.loadingActivities")}
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="py-6 text-center text-sm text-gray-500">
                                    {t("goalDetailModal.noActivities")}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activities.map((a) => (
                                        <div
                                            key={a.id}
                                            className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={!!a.completed}
                                                    onChange={() =>
                                                        toggleActivityComplete(
                                                            a.id
                                                        )
                                                    }
                                                    disabled={savingActivityIds.has(
                                                        a.id
                                                    )}
                                                />
                                                <div
                                                    className={`text-sm ${a.completed
                                                            ? "line-through text-gray-500"
                                                            : "text-gray-900"
                                                        }`}
                                                >
                                                    {a.text ||
                                                        a.title ||
                                                        "Untitled activity"}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() =>
                                                        removeActivity(a.id)
                                                    }
                                                    className="text-red-600 px-2 py-1 rounded-md"
                                                >
                                                    {t("goalDetailModal.deleteActivity")}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // If opened as a full page (via route), render the content inline. Otherwise render inside an overlay.
    if (typeof isPage !== "undefined" && isPage) {
        return (
            <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 px-0 mb-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 w-full">
                            {headerBar}
                        </div>
                    </div>
                </div>
                <div className="flex-1 min-h-0">
                    {innerContent}
                </div>
            </div>
        );
    }


    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            onClick={onClose}
        >
            <div className="w-full max-w-4xl">
                <div className="px-0">
                    <div className="flex items-center justify-between gap-3 mb-4 -mt-2">
                        <div className="flex items-center gap-2 w-full">
                            {headerBar}
                        </div>
                    </div>
                </div>
                {innerContent}
            </div>
        </div>
    );
};

export default GoalDetailModal;
