// src/components/goals/QuickGoalsPanel.jsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaTimes, FaUnlink, FaUsers, FaUser } from "react-icons/fa";

/** Progress bar color based on percent */
const progressColor = (p) =>
  p >= 90 ? "bg-green-500" : p >= 70 ? "bg-blue-500" : p >= 40 ? "bg-yellow-500" : "bg-red-500";

/** Small badge distinguishing personal vs team goals */
const GoalTypeBadge = ({ isTeam, teamName }) =>
  isTeam ? (
    <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-100 text-indigo-700 whitespace-nowrap">
      <FaUsers className="w-2.5 h-2.5" />
      {teamName || "Team"}
    </span>
  ) : (
    <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">
      <FaUser className="w-2.5 h-2.5" />
      Personal
    </span>
  );

const QuickGoalsPanel = ({ goals, onClose }) => {
  const { t } = useTranslation();

  const [teamGoals, setTeamGoals] = useState([]);
  const [teamMap, setTeamMap] = useState({}); // teamId → team name
  const [loading, setLoading] = useState(true);

  // Load all team goals from the user's teams
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const teamsModule = await import("../../services/teamsService");
        const svc = teamsModule.default || teamsModule;
        const teams = await svc.getTeams();
        const teamList = Array.isArray(teams) ? teams : (teams?.teams || teams?.data || []);

        // Build teamId → name map
        const tMap = {};
        teamList.forEach((t) => { if (t.id) tMap[t.id] = t.name || "Team"; });
        if (mounted) setTeamMap(tMap);

        // Fetch goals for each team
        const { getTeamGoals } = await import("../../services/goalService");
        const fetched = await Promise.all(
          teamList.map((team) =>
            getTeamGoals(team.id)
              .then((list) =>
                (Array.isArray(list) ? list : []).map((g) => ({
                  ...g,
                  _isTeamGoal: true,
                  _teamName: team.name || "Team",
                }))
              )
              .catch(() => [])
          )
        );

        if (mounted) setTeamGoals(fetched.flat());
      } catch {
        // teams fetch failed — show personal goals only
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Merge personal + team goals, dedup by id
  const allGoals = (() => {
    const map = {};
    // Personal goals first
    (Array.isArray(goals) ? goals : []).forEach((g) => {
      map[g.id] = { ...g, _isTeamGoal: !!g.teamId };
    });
    // Team goals from other members (may overlap with user's own)
    teamGoals.forEach((g) => {
      if (!map[g.id]) map[g.id] = g;
      else map[g.id] = { ...map[g.id], _isTeamGoal: true, _teamName: g._teamName };
    });
    return Object.values(map);
  })();

  // Enrich _teamName using teamMap for goals the user owns but have teamId
  const enriched = allGoals.map((g) => ({
    ...g,
    _teamName: g._teamName || (g.teamId ? teamMap[g.teamId] : undefined),
    _isTeamGoal: g._isTeamGoal || !!g.teamId,
  }));

  /** Build hierarchy tree.
   *  Team goals with no parent float to the top.
   *  Personal goals with parentGoalId pointing to another goal become children.
   *  Personal goals with no parent stay at the top too.
   */
  const buildHierarchy = (goals) => {
    const goalMap = {};
    const roots = [];
    goals.forEach((g) => { goalMap[g.id] = { ...g, children: [] }; });

    goals.forEach((g) => {
      if (g.parentGoalId && goalMap[g.parentGoalId]) {
        goalMap[g.parentGoalId].children.push(goalMap[g.id]);
      } else {
        roots.push(goalMap[g.id]);
      }
    });

    // Sort: team goals first, then by title
    const sortNodes = (arr) => {
      arr.sort((a, b) => {
        if (a._isTeamGoal && !b._isTeamGoal) return -1;
        if (!a._isTeamGoal && b._isTeamGoal) return 1;
        return (a.title || "").localeCompare(b.title || "");
      });
      arr.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);
    return roots;
  };

  const hierarchy = buildHierarchy(enriched);

  const renderGoalNode = (goal, level = 0) => {
    const pct = goal.progressPercent ?? 0;
    const isTeam = goal._isTeamGoal;

    return (
      <div key={goal.id} className="mb-2">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            isTeam
              ? level === 0
                ? "bg-indigo-50 border-indigo-200"
                : "bg-indigo-50/60 border-indigo-100"
              : level === 0
              ? "bg-white border-slate-200"
              : "bg-slate-50 border-slate-100"
          }`}
        >
          {/* Icon */}
          <div
            className={`shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
              isTeam ? "bg-indigo-200 text-indigo-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {isTeam ? <FaUsers className="w-3 h-3" /> : level === 0 ? "G" : "S"}
          </div>

          {/* Title + progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-slate-900 truncate text-sm">{goal.title}</h4>
              <GoalTypeBadge isTeam={isTeam} teamName={goal._teamName} />
            </div>
            <div className="flex items-center mt-1 gap-2">
              <div className="w-24 bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${progressColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{pct}%</span>
            </div>
          </div>

          {/* Status badge */}
          <span
            className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
              goal.status === "completed"
                ? "bg-green-100 text-green-800"
                : goal.status === "active"
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {goal.status}
          </span>
        </div>

        {/* Children */}
        {goal.children.length > 0 && (
          <div className="ml-5 pl-4 border-l-2 border-slate-200 mt-1.5 space-y-1.5">
            {goal.children.map((child) => renderGoalNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const personalCount = enriched.filter((g) => !g._isTeamGoal).length;
  const teamCount = enriched.filter((g) => g._isTeamGoal).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-blue-600 to-indigo-600 text-white shrink-0">
          <div>
            <h2 className="text-xl font-bold">{t("quickGoalsPanel.title", "Goals Network")}</h2>
            <p className="text-blue-100 text-sm mt-0.5">
              {loading
                ? "Loading team goals…"
                : `${personalCount} personal · ${teamCount} team`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-lg transition-colors">
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-200 inline-block" />
            Team goal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-100 inline-block" />
            Personal goal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-l-2 border-slate-300 inline-block" />
            Child / linked goal
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Loading goals network…
            </div>
          ) : hierarchy.length > 0 ? (
            <div className="space-y-3">
              {hierarchy.map((goal) => renderGoalNode(goal))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                <FaUnlink className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                {t("quickGoalsPanel.noHierarchy", "No goals network yet")}
              </h3>
              <p className="text-slate-500 text-sm">
                {t("quickGoalsPanel.noHierarchyText", "Create goals and link them to team goals to see the network here.")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <p className="text-sm text-slate-500">
            {t("quickGoalsPanel.footer", {
              top: hierarchy.length,
              sub: enriched.filter((g) => g.parentGoalId).length,
              defaultValue: `${hierarchy.length} top-level · ${enriched.filter((g) => g.parentGoalId).length} linked`,
            })}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            {t("quickGoalsPanel.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickGoalsPanel;
