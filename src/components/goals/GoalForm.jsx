import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronDown, Plus, Trash2, User, X } from "lucide-react";
import { FaInfoCircle, FaUser, FaUsers } from "react-icons/fa";
import { useDraggable } from "../../hooks/useDraggable";
import { useResizable } from "../../hooks/useResizable";
import { formatKeyAreaLabel } from "../../utils/keyAreaDisplay";
import GoalGauge from "./GoalGauge";

const TABS = ['milestones', 'associatedMembers'];

const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50";
const inputErrorCls = "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-50";
const textareaCls = `${inputCls} min-h-[160px] resize-none`;
const dateCls = `${inputCls} appearance-none pr-12 no-calendar`;
const selectCls = `${inputCls} appearance-none pr-12`;
const memberFieldCls = `${selectCls} pl-11`;
const labelCls = "mb-2 block text-sm font-medium text-slate-700";

const GoalForm = ({ onClose, onGoalCreated, keyAreas = [], goal, isEditing = false }) => {
  const { t } = useTranslation();
  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];

  const [activeTab, setActiveTab] = useState('milestones');

  const [formData, setFormData] = useState({
    title: goal?.title || "",
    description: goal?.description || "",
    priority: goal?.priority || "medium",
    tags: goal?.tags || [],
    startDate: goal?.startDate ? new Date(goal.startDate).toISOString().split("T")[0] : defaultDate,
    dueDate: goal?.dueDate ? new Date(goal.dueDate).toISOString().split("T")[0] : defaultDate,
    keyAreaId: goal?.keyAreaId || "",
    visibility: goal?.visibility || "public",
    parentGoalId: goal?.parentGoalId || null,
    teamId: goal?.teamId || null,
  });
  const [tagsDraft, setTagsDraft] = useState(
    Array.isArray(goal?.tags) ? goal.tags.join(", ") : ""
  );

  const [milestones, setMilestones] = useState(
    goal?.milestones?.length > 0
      ? goal.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          weight: m.weight || 1.0,
          score: m.score != null ? m.score : 0,
          startDate: m.startDate ? new Date(m.startDate).toISOString().split("T")[0] : "",
          dueDate: m.dueDate ? new Date(m.dueDate).toISOString().split("T")[0] : "",
          target: m.target != null ? m.target : "",
          performance: m.performance != null ? m.performance : "",
          done: m.done || false,
        }))
      : [{ title: "", weight: 1.0, score: 0, startDate: defaultDate, dueDate: defaultDate, target: "", performance: "", done: false }]
  );

  const [raci, setRaci] = useState({ responsible: [], consulted: [], informed: [] });
  const [orgMembers, setOrgMembers] = useState([]);
  const [userTeams, setUserTeams] = useState([]);
  const [availableGoals, setAvailableGoals] = useState([]);
  const [parentGoalSearch, setParentGoalSearch] = useState('');
  const [showParentGoalDropdown, setShowParentGoalDropdown] = useState(false);
  const parentGoalPickerRef = useRef(null);
  const [openMembersRole, setOpenMembersRole] = useState(null);
  const membersMenuRefs = useRef({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const prevStartRef = useRef(formData.startDate);
  const startRef = useRef(null);
  const dueRef = useRef(null);

  const { position, isDragging, handleMouseDown, handleMouseMove, handleMouseUp, resetPosition } = useDraggable();
  const { size, isDraggingResize, handleResizeMouseDown } = useResizable(700, 580);

  // Load org members for RACI member selection
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('../../services/usersService');
        const svc = mod.default || mod;
        const members = await svc.list();
        if (mounted) setOrgMembers(Array.isArray(members) ? members : []);
      } catch { /* optional */ }
    })();
    return () => { mounted = false; };
  }, []);

  // Load user's teams for Team Goal selector
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('../../services/teamsService');
        const svc = mod.default || mod;
        const result = await svc.getTeams();
        const teams = Array.isArray(result) ? result : (result?.teams || result?.data || []);
        if (mounted) setUserTeams(teams);
      } catch { /* optional */ }
    })();
    return () => { mounted = false; };
  }, []);

  // Load available goals for parent picker (own goals + team goals)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { getGoals, getTeamGoals } = await import('../../services/goalService');
        const [ownList, teamsModule] = await Promise.all([
          getGoals({ status: 'active' }),
          import('../../services/teamsService'),
        ]);
        const own = Array.isArray(ownList) ? ownList : [];

        // Also fetch team goals so personal goals can be linked to team goals
        let teamGoalsList = [];
        try {
          const svc = teamsModule.default || teamsModule;
          const teamsResult = await svc.getTeams();
          const teams = Array.isArray(teamsResult) ? teamsResult : (teamsResult?.teams || teamsResult?.data || []);
          const fetched = await Promise.all(teams.map((t) => getTeamGoals(t.id).catch(() => [])));
          teamGoalsList = fetched.flat();
        } catch { /* team goals optional */ }

        // Merge, dedup by id
        const merged = [...own];
        const ownIds = new Set(own.map((g) => g.id));
        teamGoalsList.forEach((g) => { if (!ownIds.has(g.id)) merged.push(g); });

        if (mounted) setAvailableGoals(merged);
      } catch { /* optional */ }
    })();
    return () => { mounted = false; };
  }, []);

  // Load existing RACI when editing
  useEffect(() => {
    if (!goal?.id) return;
    let mounted = true;
    (async () => {
      try {
        const { getGoalRaci } = await import('../../services/goalService');
        const entries = await getGoalRaci(goal.id);
        if (!mounted || !Array.isArray(entries)) return;
        const byRole = { responsible: [], consulted: [], informed: [] };
        for (const e of entries) {
          if (byRole[e.role]) byRole[e.role].push(e.userId);
        }
        setRaci(byRole);
      } catch { /* optional */ }
    })();
    return () => { mounted = false; };
  }, [goal?.id]);

  // Sync form state when goal prop changes (e.g., edit mode re-open)
  useEffect(() => {
    if (!goal) return;
    setFormData({
      title: goal.title || "",
      description: goal.description || "",
      priority: goal.priority || "medium",
      tags: goal.tags || [],
      startDate: goal.startDate ? new Date(goal.startDate).toISOString().split("T")[0] : defaultDate,
      dueDate: goal.dueDate ? new Date(goal.dueDate).toISOString().split("T")[0] : defaultDate,
      keyAreaId: goal.keyAreaId || "",
      visibility: goal.visibility || "public",
      parentGoalId: goal.parentGoalId || null,
      teamId: goal.teamId || null,
    });
    setTagsDraft(Array.isArray(goal.tags) ? goal.tags.join(", ") : "");
    setMilestones(
      goal.milestones?.length > 0
        ? goal.milestones.map((m) => ({
            id: m.id, title: m.title, weight: m.weight || 1.0, score: m.score != null ? m.score : 0,
            startDate: m.startDate ? new Date(m.startDate).toISOString().split("T")[0] : "",
            dueDate: m.dueDate ? new Date(m.dueDate).toISOString().split("T")[0] : "",
            target: m.target != null ? m.target : "",
            performance: m.performance != null ? m.performance : "",
            done: m.done || false,
          }))
        : [{ title: "", weight: 1.0, score: 0, startDate: defaultDate, dueDate: defaultDate, target: "", performance: "", done: false }]
    );
    prevStartRef.current = goal.startDate ? new Date(goal.startDate).toISOString().split("T")[0] : defaultDate;
  }, [goal]);

  // Drag event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => { if (onClose) resetPosition(); }, [resetPosition]);

  // Close parent goal dropdown on outside click
  useEffect(() => {
    if (!showParentGoalDropdown) return;
    const handler = (e) => {
      if (parentGoalPickerRef.current && !parentGoalPickerRef.current.contains(e.target))
        setShowParentGoalDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showParentGoalDropdown]);

  useEffect(() => {
    if (!openMembersRole) return;
    const handlePointerDown = (e) => {
      const menu = membersMenuRefs.current?.[openMembersRole];
      if (menu && !menu.contains(e.target)) {
        setOpenMembersRole(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpenMembersRole(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMembersRole]);

  // Auto-sync dueDate to startDate for new goals
  useEffect(() => {
    if (isEditing) { prevStartRef.current = formData.startDate; return; }
    const prev = prevStartRef.current;
    const current = formData.startDate;
    setFormData((prevState) => {
      if (!prevState.dueDate || prevState.dueDate === prev) return { ...prevState, dueDate: current };
      return prevState;
    });
    setMilestones((prev) =>
      prev.map((m) => {
        const updated = { ...m };
        if (!updated.startDate || updated.startDate === prev) updated.startDate = current;
        if (!updated.dueDate || updated.dueDate === prev) updated.dueDate = current;
        return updated;
      })
    );
    prevStartRef.current = current;
  }, [formData.startDate, isEditing]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleMilestoneChange = (index, field, value) => {
    setMilestones((prev) => {
      const updated = [...prev];
      const m = { ...updated[index], [field]: value };
      // Auto-sync dueDate when startDate changes
      if (field === 'startDate' && (!updated[index].dueDate || updated[index].dueDate === updated[index].startDate)) {
        m.dueDate = value;
      }
      updated[index] = m;
      return updated;
    });
  };

  const addMilestone = () => {
    if (milestones.length >= 10) return;
    setMilestones((prev) => [...prev, { title: "", weight: 1.0, score: 0, startDate: "", dueDate: "", target: "", performance: "", done: false }]);
  };

  const removeMilestone = (index) => {
    if (milestones.length === 1) return;
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRaciMember = (role, userId) => {
    setRaci((prev) => ({
      ...prev,
      [role]: prev[role].includes(userId)
        ? prev[role].filter((id) => id !== userId)
        : [...prev[role], userId],
    }));
  };

  const formatMemberSummary = (memberIds = []) => {
    const selectedMembers = orgMembers.filter((member) => memberIds.includes(String(member.id)));
    if (selectedMembers.length === 0) return 'Select members';
    if (selectedMembers.length <= 2) return selectedMembers.map((member) => member.name).join(', ');
    return `${selectedMembers[0].name}, ${selectedMembers[1].name} +${selectedMembers.length - 2}`;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = t("goalForm.errTitleRequired");
    else if (formData.title.length < 3) newErrors.title = t("goalForm.errTitleMinLength");
    else if (formData.title.length > 200) newErrors.title = t("goalForm.errTitleMaxLength", { n: formData.title.length });

    if (!formData.dueDate) newErrors.dueDate = t("goalForm.errDeadlineRequired");
    else {
      const dueDate = new Date(formData.dueDate);
      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
      if (dueDate < todayMidnight && !isEditing) newErrors.dueDate = t("goalForm.errDeadlinePast");
    }
    if (formData.startDate && formData.dueDate && new Date(formData.startDate) > new Date(formData.dueDate)) {
      newErrors.startDate = t("goalForm.errStartAfterDue");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const goalData = {
      title: formData.title.trim(),
      description: formData.description ? formData.description.trim() : null,
      startDate: formData.startDate || null,
      dueDate: formData.dueDate,
      keyAreaId: formData.keyAreaId || null,
      visibility: formData.visibility,
      priority: formData.priority,
      parentGoalId: formData.parentGoalId || null,
      teamId: formData.teamId || null,
      tags: formData.tags || [],
      milestones: milestones
        .filter((m) => m.title.trim())
        .map((m) => ({
          ...(m.id && { id: m.id }),
          title: m.title.trim(),
          weight: parseFloat(m.weight) || 1.0,
          score: m.score != null ? parseFloat(m.score) || 0 : 0,
          startDate: m.startDate || null,
          dueDate: m.dueDate || null,
          target: m.target !== "" && m.target != null ? parseFloat(m.target) : undefined,
          performance: m.performance !== "" && m.performance != null ? parseFloat(m.performance) : undefined,
        })),
      responsible: raci.responsible,
      consulted: raci.consulted,
      informed: raci.informed,
    };
    try {
      const saved = await onGoalCreated(goalData);
      // When editing, persist RACI changes separately via dedicated endpoints
      if (isEditing && goal?.id) {
        try {
          const { setGoalRaciRole } = await import('../../services/goalService');
          await Promise.all([
            setGoalRaciRole(goal.id, 'responsible', raci.responsible),
            setGoalRaciRole(goal.id, 'consulted', raci.consulted),
            setGoalRaciRole(goal.id, 'informed', raci.informed),
          ]);
        } catch { /* RACI update non-fatal */ }
      }
      onClose();
    } catch (err) {
      setErrors({ general: err.message || t("goalForm.errSave") });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressPercent = (() => {
    if (!Array.isArray(milestones) || milestones.length === 0) return 0;
    const totalWeight = milestones.reduce((sum, milestone) => {
      const weight = parseFloat(milestone.weight);
      return sum + (Number.isFinite(weight) && weight > 0 ? weight : 1);
    }, 0);
    if (totalWeight <= 0) return 0;
    const weightedScore = milestones.reduce((sum, milestone) => {
      const weight = parseFloat(milestone.weight);
      const safeWeight = Number.isFinite(weight) && weight > 0 ? weight : 1;
      const score = milestone.done ? 1 : Math.max(0, Math.min(1, parseFloat(milestone.score) || 0));
      return sum + score * safeWeight;
    }, 0);
    return Math.round((weightedScore / totalWeight) * 100);
  })();

  const tabLabels = {
    milestones: t("goalForm.tabMilestones", "Milestones"),
    associatedMembers: t("goalForm.tabAssociatedMembers", "Associated Members"),
  };

  const InformedMembersIcon = () => (
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
      <FaUsers className="h-5 w-5 text-slate-500" />
      <FaInfoCircle className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-white text-slate-500" />
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .goal-form-modal { animation: slideUp 0.25s ease-out; }
        input.no-calendar::-webkit-calendar-picker-indicator { opacity: 0; pointer-events: none; width: 0; height: 0; }
        input.no-calendar::-webkit-clear-button,
        input.no-calendar::-webkit-inner-spin-button { display: none; }
        input.no-calendar { -webkit-appearance: none; appearance: none; }
      `}</style>

      <div
        className="goal-form-modal relative bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
          width: `${size.width}px`,
          height: `${size.height}px`,
          minWidth: '400px',
          minHeight: '440px',
        }}
      >
        {/* ── Header (draggable) ── */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-gray-200 cursor-grab active:cursor-grabbing select-none shrink-0"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? t("goalForm.editGoalTitle") : t("goalForm.addGoalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">

          {errors.general && (
            <div className="mx-6 mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-r text-red-700 text-sm shrink-0">
              <strong>Error:</strong> {errors.general}
            </div>
          )}

          {/* ── Always-visible top section ── */}
          <div className="px-6 pt-4 pb-3 shrink-0">
            <div className="flex gap-5 items-start">
              {/* Left: title + description + tags + dates + goal information */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Title */}
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <label className={labelCls}>
                      {t("goalForm.goalNameLabel")} <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-xs ${formData.title.length > 150 ? 'text-red-500' : 'text-slate-400'}`}>
                      {formData.title.length}/200
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength="200"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    className={`${inputCls} ${errors.title ? inputErrorCls : ""}`}
                    placeholder={t("goalForm.goalNamePlaceholder")}
                  />
                  {errors.title && <p className="mt-2 text-xs text-red-600">{errors.title}</p>}
                </div>

                {/* Description */}
                <div>
                  <label className={labelCls}>{t("goalForm.descLabel")}</label>
                  <textarea
                    rows={5}
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className={textareaCls}
                    placeholder={t("goalForm.descPlaceholder")}
                  />
                </div>

                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>{t("goalForm.keyAreaLabel")}</label>
                    <div className="relative">
                      <select
                        value={formData.keyAreaId}
                        onChange={(e) => handleInputChange("keyAreaId", e.target.value)}
                        className={selectCls}
                      >
                        <option value="">{t("goalForm.keyAreaPlaceholder")}</option>
                        {keyAreas.map((area, idx) => (
                          <option key={area.id} value={area.id}>{formatKeyAreaLabel(area, idx)}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t("goalForm.priorityLabel")}</label>
                    <div className="relative">
                      <select
                        value={formData.priority}
                        onChange={(e) => handleInputChange("priority", e.target.value)}
                        className={selectCls}
                      >
                        <option value="low">{t("goalForm.lowOpt")}</option>
                        <option value="medium">{t("goalForm.mediumOpt")}</option>
                        <option value="high">{t("goalForm.highOpt")}</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t("goalForm.startDateLabel")}</label>
                    <div className="relative">
                      <input
                        ref={startRef}
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                        className={`${dateCls} ${errors.startDate ? inputErrorCls : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => { try { startRef.current?.showPicker?.(); } catch {} }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label="Open start date picker"
                      >
                        <CalendarDays className="h-5 w-5" />
                      </button>
                    </div>
                    {errors.startDate && <p className="mt-2 text-xs text-red-600">{errors.startDate}</p>}
                  </div>

                  <div>
                    <label className={labelCls}>{t("goalForm.visibilityLabel")}</label>
                    <div className="relative">
                      <select
                        value={formData.visibility}
                        onChange={(e) => handleInputChange("visibility", e.target.value)}
                        className={selectCls}
                      >
                        <option value="public">{t("goalForm.publicOpt")}</option>
                        <option value="private">{t("goalForm.privateOpt")}</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>
                      {t("goalForm.deadlineLabel")} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={dueRef}
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => handleInputChange("dueDate", e.target.value)}
                        className={`${dateCls} ${errors.dueDate ? inputErrorCls : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => { try { dueRef.current?.showPicker?.(); } catch {} }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label="Open deadline picker"
                      >
                        <CalendarDays className="h-5 w-5" />
                      </button>
                    </div>
                    {errors.dueDate && <p className="mt-2 text-xs text-red-600">{errors.dueDate}</p>}
                  </div>

                  <div>
                    <label className={labelCls}>{t("goalForm.tagsLabel")}</label>
                    <input
                      type="text"
                      value={tagsDraft}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        setTagsDraft(rawValue);
                        const tags = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                        handleInputChange("tags", tags);
                      }}
                      className={inputCls}
                      placeholder={t("goalForm.tagsPlaceholder")}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Team Goal{" "}
                      <span className="text-gray-400 font-normal text-xs">(optional)</span>
                    </label>
                    <div className="relative">
                      <select
                        value={formData.teamId || ""}
                        onChange={(e) => handleInputChange("teamId", e.target.value || null)}
                        className={selectCls}
                      >
                        <option value="">Personal goal (no team)</option>
                        {userTeams.map((team) => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
                    </div>
                    {formData.teamId && (
                      <p className="text-xs text-indigo-600 mt-0.5">This goal will be visible to the selected team.</p>
                    )}
                  </div>

                  <div ref={parentGoalPickerRef} className="relative">
                    <label className={labelCls}>
                      {t("goalForm.parentGoalLabel")}{" "}
                      <span className="text-gray-400 font-normal text-xs">{t("goalForm.parentGoalOptional")}</span>
                    </label>
                    {formData.parentGoalId ? (
                      <div className="flex items-center gap-2 rounded-xl border border-purple-300 bg-purple-50 px-4 py-3 shadow-sm">
                        <span className="flex-1 text-sm text-purple-800 truncate">
                          {availableGoals.find((g) => g.id === formData.parentGoalId)?.title || t("goalForm.parentGoalSelected")}
                        </span>
                        <button type="button" onClick={() => handleInputChange("parentGoalId", null)} className="text-purple-500 hover:text-purple-700">✕</button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          placeholder={t("goalForm.parentGoalPlaceholder")}
                          value={parentGoalSearch}
                          onChange={(e) => { setParentGoalSearch(e.target.value); setShowParentGoalDropdown(true); }}
                          onFocus={() => setShowParentGoalDropdown(true)}
                          className={inputCls}
                        />
                        {showParentGoalDropdown && (
                          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {availableGoals
                              .filter((g) => g.id !== goal?.id && g.title?.toLowerCase().includes(parentGoalSearch.toLowerCase()))
                              .slice(0, 8)
                              .map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-purple-50 truncate"
                                  onClick={() => {
                                    handleInputChange("parentGoalId", g.id);
                                    setParentGoalSearch("");
                                    setShowParentGoalDropdown(false);
                                  }}
                                >
                                  {g.title}
                                </button>
                              ))}
                            {availableGoals.filter((g) => g.id !== goal?.id && g.title?.toLowerCase().includes(parentGoalSearch.toLowerCase())).length === 0 && (
                              <div className="px-3 py-2 text-sm text-slate-400">{t("goalForm.noMatchingGoals")}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: progress gauge */}
              <div className="flex flex-col items-center overflow-visible shrink-0 pt-1">
                <GoalGauge percent={progressPercent} size={64} />
                <span className="mt-2 relative z-10 text-xs font-semibold text-slate-600">
                  {progressPercent}% Progress
                </span>
              </div>
            </div>
          </div>

          {/* ── Divider + Tabs ── */}
          <div className="flex border-b border-slate-200 px-6 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          {/* ── Tab content (scrollable) ── */}
          <div className="px-6 py-4">

            {/* ── Tab: Milestones ── */}
            {activeTab === 'milestones' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={addMilestone}
                    disabled={milestones.length >= 10}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add milestone
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-left">
                        <th className="px-2 py-2 font-medium w-6">✓</th>
                        <th className="px-2 py-2 font-medium w-40">Score</th>
                        <th className="px-2 py-2 font-medium">Name</th>
                        <th className="px-2 py-2 font-medium w-20">Target</th>
                        <th className="px-2 py-2 font-medium w-20">Value</th>
                        <th className="px-2 py-2 font-medium w-28">Start date</th>
                        <th className="px-2 py-2 font-medium w-28">End date</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m, idx) => (
                        <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={!!m.done}
                              onChange={(e) => handleMilestoneChange(idx, 'done', e.target.checked)}
                              className="rounded accent-purple-600"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xs md:hidden text-gray-500">Score</span>
                              <div className="text-sm w-8 text-right">
                                {Math.round((parseFloat(m.score) || 0) * 100)}
                              </div>
                              <input
                                min="0"
                                max="100"
                                className="flex-1"
                                type="range"
                                value={Math.round((parseFloat(m.score) || 0) * 100)}
                                onChange={(e) => handleMilestoneChange(idx, 'score', Number(e.target.value) / 100)}
                              />
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={m.title}
                              onChange={(e) => handleMilestoneChange(idx, 'title', e.target.value)}
                              placeholder="Milestone name"
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-purple-400 min-w-[110px]"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              value={m.target}
                              onChange={(e) => handleMilestoneChange(idx, 'target', e.target.value)}
                              placeholder="—"
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-purple-400"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              value={m.performance}
                              onChange={(e) => handleMilestoneChange(idx, 'performance', e.target.value)}
                              placeholder="—"
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-purple-400"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="date"
                              value={m.startDate}
                              onChange={(e) => handleMilestoneChange(idx, 'startDate', e.target.value)}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-purple-400 appearance-none no-calendar"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="date"
                              value={m.dueDate}
                              onChange={(e) => handleMilestoneChange(idx, 'dueDate', e.target.value)}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-purple-400 appearance-none no-calendar"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeMilestone(idx)}
                              disabled={milestones.length === 1}
                              className="text-red-400 hover:text-red-600 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Tab: Associated Members ── */}
            {activeTab === 'associatedMembers' && (
              <div className="space-y-4">
                <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
                  {/* Owner (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Owner</label>
                    <div className="flex min-h-[50px] items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 shadow-sm">
                      <User className="h-5 w-5 text-slate-400 shrink-0" />
                      <span className="text-slate-600">
                        {goal
                          ? (orgMembers.find(m => m.id === goal.userId)?.name || 'Goal owner')
                          : 'You (auto-assigned)'}
                      </span>
                      <span className="ml-auto text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">Owner</span>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Responsible</label>
                    <div className="relative">
                      <FaUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                      <select
                        className={memberFieldCls}
                        value={raci.responsible[0] || ""}
                        onChange={(e) => setRaci((prev) => ({
                          ...prev,
                          responsible: e.target.value ? [String(e.target.value)] : [],
                        }))}
                      >
                        <option value="">Unassigned</option>
                        {orgMembers.map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />
                    </div>
                  </div>

                  {[
                    { role: 'consulted', label: 'Consulted', value: raci.consulted, Icon: FaUsers },
                    { role: 'informed', label: 'Informed', value: raci.informed, Icon: InformedMembersIcon },
                  ].map(({ role, label, value, Icon }) => (
                    <div key={role}>
                      <label className={labelCls}>{label}</label>
                      <div
                        ref={(node) => {
                          if (node) membersMenuRefs.current[role] = node;
                          else delete membersMenuRefs.current[role];
                        }}
                        className="relative"
                      >
                        {role === 'informed' ? (
                          <Icon />
                        ) : (
                          <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                        )}
                        <button
                          type="button"
                          className={`${memberFieldCls} text-left transition-colors hover:border-slate-400 ${value.length ? 'text-slate-900' : 'text-slate-400'}`}
                          style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#cbd5e1' }}
                          onClick={() => setOpenMembersRole((current) => (current === role ? null : role))}
                        >
                          {formatMemberSummary(value)}
                        </button>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-500" />

                        {openMembersRole === role && (
                          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                            <div className="max-h-48 space-y-1 overflow-y-auto">
                              {orgMembers.map((member) => {
                                const checked = value.includes(String(member.id));
                                return (
                                  <label key={`${role}-${member.id}`} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      checked={checked}
                                      onChange={() => toggleRaciMember(role, String(member.id))}
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
                  ))}
                </div>

                <p className="text-xs text-slate-400 pt-1">
                  Owner is auto-assigned and cannot be changed here.
                </p>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 shrink-0">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"/>
            </svg>
            {isSubmitting ? t("goalForm.saving") : isEditing ? t("goalForm.update") : t("goalForm.save")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t("goalForm.cancel")}
          </button>
        </div>

        {/* ── Resize handles ── */}
        <div onMouseDown={(e) => handleResizeMouseDown(e, 'right')} className="absolute top-0 right-0 w-1 h-full cursor-e-resize hover:bg-blue-500/20 transition-colors" style={{ zIndex: 40 }} />
        <div onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')} className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize hover:bg-blue-500/20 transition-colors" style={{ zIndex: 40 }} />
        <div onMouseDown={(e) => handleResizeMouseDown(e, 'se')} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/30 rounded-tl transition-colors" style={{ zIndex: 41 }} title="Drag to resize" />
      </div>
    </div>
  );
};

export default GoalForm;
