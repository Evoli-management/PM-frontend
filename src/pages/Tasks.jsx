import Sidebar from "../components/shared/Sidebar.jsx";
import React, { useState } from "react";
import {
    FiPlus,
    FiSearch,
    FiFilter,
    FiCalendar,
    FiUser,
    FiEdit3,
    FiTrash2,
    FiCheck,
    FiClock,
    FiFlag,
    FiRepeat,
    FiMoreHorizontal,
    FiGrid,
    FiList,
    FiTarget,
    FiTrendingUp,
    FiLink,
    FiAlertTriangle,
    FiArchive,
    FiEye,
    FiColumns,
    FiActivity,
    FiZap,
    FiInbox,
    FiCheckCircle,
    FiX,
} from "react-icons/fi";

export default function Tasks() {
    const [tasks, setTasks] = useState([
        {
            id: 1,
            name: "Complete project proposal",
            completed: false,
            tag: "urgent",
            priority: "high",
            recurring: false,
            assignee: "Hussein",
            dueDate: "2025-08-25",
            description: "Prepare comprehensive project proposal for Q4 initiatives",
            createdAt: "2025-08-19",
            status: "active",
            linkedGoal: null,
            keyArea: "Business Development",
            attachments: [],
        },
        {
            id: 2,
            name: "Team standup meeting",
            completed: true,
            tag: "meeting",
            priority: "normal",
            recurring: true,
            assignee: "Sara",
            dueDate: "2025-08-20",
            description: "Daily team synchronization meeting",
            createdAt: "2025-08-18",
            status: "completed",
            linkedGoal: "Improve Team Communication",
            keyArea: "Team Management",
            attachments: [],
        },
        {
            id: 3,
            name: "Update documentation",
            completed: false,
            tag: "review",
            priority: "normal",
            recurring: false,
            assignee: "Ali",
            dueDate: "2025-08-22",
            description: "Review and update project documentation",
            createdAt: "2025-08-17",
            status: "active",
            linkedGoal: null, // Activity Trap candidate
            keyArea: "Documentation",
            attachments: [],
        },
        {
            id: 4,
            name: "Code review for new feature",
            completed: false,
            tag: "development",
            priority: "high",
            recurring: false,
            assignee: "Omar",
            dueDate: "2025-08-21",
            description: "Review pull request for new authentication feature",
            createdAt: "2025-08-19",
            status: "in-progress",
            linkedGoal: "Enhance User Experience",
            keyArea: "Product Development",
            attachments: [],
        },
        {
            id: 5,
            name: "Client presentation",
            completed: false,
            tag: "meeting",
            priority: "high",
            recurring: false,
            assignee: "Fatima",
            dueDate: "2025-08-23",
            description: "Present quarterly results to key client",
            createdAt: "2025-08-18",
            status: "review",
            linkedGoal: "Complete Q4 Targets",
            keyArea: "Sales",
            attachments: [],
        },
        {
            id: 6,
            name: "Database backup",
            completed: true,
            tag: "maintenance",
            priority: "normal",
            recurring: true,
            assignee: "Ahmed",
            dueDate: "2025-08-19",
            description: "Weekly database backup and maintenance",
            createdAt: "2025-08-19",
            status: "completed",
            linkedGoal: "Reduce Technical Debt",
            keyArea: "Operations",
            attachments: [],
        },
    ]);

    const [goals] = useState(getGoalTitles());

    const [keyAreas] = useState([
        "Business Development",
        "Team Management",
        "Documentation",
        "Product Development",
        "Marketing",
        "Sales",
        "Customer Support",
        "Finance",
        "Operations",
        "Ideas", // Always last
    ]);

    const [newTask, setNewTask] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [tag, setTag] = useState("");
    const [priority, setPriority] = useState("normal");
    const [recurring, setRecurring] = useState(false);
    const [assignee, setAssignee] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [selectedKeyArea, setSelectedKeyArea] = useState("");
    const [linkedGoal, setLinkedGoal] = useState("");
    const [showEditModal, setShowEditModal] = useState(false);
    const [editTaskData, setEditTaskData] = useState({
        id: null,
        name: "",
        description: "",
        priority: "medium",
        tag: "",
        assignee: "",
        dueDate: "",
        keyArea: "",
        linkedGoal: "",
        status: "to-do",
        recurring: false,
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterKeyArea, setFilterKeyArea] = useState("");
    const [activeStatsFilter, setActiveStatsFilter] = useState(""); // for stats card filtering
    const [viewMode, setViewMode] = useState("list"); // list, grid, kanban, focus, activity-trap
    const [showAddForm, setShowAddForm] = useState(false);
    const [sortField, setSortField] = useState("");
    const [sortDirection, setSortDirection] = useState("asc");

    const teamMembers = ["Hussein", "Sara", "Ali", "Fatima", "Ahmed", "Layla"];
    const tags = ["urgent", "review", "meeting", "normal", "research", "development"];
    const priorities = ["high", "normal", "low"];
    const statuses = ["active", "inactive", "completed"];

    const handleAddTask = () => {
        if (newTask.trim()) {
            const newTaskObj = {
                id: Date.now(),
                name: newTask,
                description: newDescription,
                completed: false,
                tag,
                priority,
                recurring,
                assignee,
                dueDate,
                createdAt: new Date().toISOString().split("T")[0],
                status: "active",
                linkedGoal: linkedGoal || null,
                keyArea: selectedKeyArea,
                attachments: [],
            };
            setTasks([...tasks, newTaskObj]);
            // Reset form
            setNewTask("");
            setNewDescription("");
            setTag("");
            setPriority("normal");
            setRecurring(false);
            setAssignee("");
            setDueDate("");
            setSelectedKeyArea("");
            setLinkedGoal("");
            setShowAddForm(false);
        }
    };

    const handleToggleTask = (id) => {
        setTasks(
            tasks.map((task) =>
                task.id === id
                    ? {
                          ...task,
                          completed: !task.completed,
                          status: !task.completed ? "completed" : "to-do", // When unchecking, set to to-do instead of active
                      }
                    : task,
            ),
        );
    };

    const handleStatusChange = (taskId, newStatus) => {
        setTasks(
            tasks.map((task) =>
                task.id === taskId
                    ? {
                          ...task,
                          status: newStatus,
                          completed: newStatus === "completed" ? true : false,
                      }
                    : task,
            ),
        );
    };

    const handleAssignGoal = (taskId, goalName) => {
        setTasks(
            tasks.map((task) =>
                task.id === taskId
                    ? {
                          ...task,
                          linkedGoal: goalName,
                      }
                    : task,
            ),
        );
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Stats card click handlers
    const handleStatsCardClick = (filterType) => {
        // If clicking the same filter, toggle it off
        if (activeStatsFilter === filterType) {
            setActiveStatsFilter("");
            setFilterStatus("");
            setFilterPriority("");
            setViewMode("list");
            return;
        }

        setActiveStatsFilter(filterType);

        switch (filterType) {
            case "total":
                // Show all tasks
                setFilterStatus("");
                setFilterPriority("");
                setViewMode("list");
                break;
            case "completed":
                setFilterStatus("completed");
                setFilterPriority("");
                setViewMode("list");
                break;
            case "active":
                setFilterStatus("active");
                setFilterPriority("");
                setViewMode("list");
                break;
            case "inactive":
                setFilterStatus("inactive");
                setFilterPriority("");
                setViewMode("list");
                break;
            case "high-priority":
                setFilterPriority("high");
                setFilterStatus("");
                setViewMode("list");
                break;
            case "activity-trap":
                setFilterStatus("");
                setFilterPriority("");
                setViewMode("activity-trap");
                break;
            default:
                break;
        }
    };

    const handleLinkToGoal = (taskId, goalName) => {
        setTasks(tasks.map((task) => (task.id === taskId ? { ...task, linkedGoal: goalName } : task)));
    };

    const handleToggleStatus = (id) => {
        setTasks(
            tasks.map((task) =>
                task.id === id
                    ? {
                          ...task,
                          status: task.status === "active" ? "inactive" : "active",
                      }
                    : task,
            ),
        );
    };

    const handleDeleteTask = (id) => {
        setTasks(tasks.filter((task) => task.id !== id));
    };

    const handleEditTask = (id) => {
        const task = tasks.find((t) => t.id === id);
        setEditTaskData({
            id: task.id,
            name: task.name,
            description: task.description || "",
            priority: task.priority,
            tag: task.tag || "",
            assignee: task.assignee || "",
            dueDate: task.dueDate || "",
            keyArea: task.keyArea || "",
            linkedGoal: task.linkedGoal || "",
            status: task.status,
            recurring: task.recurring || false,
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = () => {
        setTasks(
            tasks.map((task) =>
                task.id === editTaskData.id
                    ? {
                          ...task,
                          name: editTaskData.name,
                          description: editTaskData.description,
                          priority: editTaskData.priority,
                          tag: editTaskData.tag,
                          assignee: editTaskData.assignee,
                          dueDate: editTaskData.dueDate,
                          keyArea: editTaskData.keyArea,
                          linkedGoal: editTaskData.linkedGoal,
                          status: editTaskData.status,
                          recurring: editTaskData.recurring,
                      }
                    : task,
            ),
        );
        setShowEditModal(false);
        setEditTaskData({
            id: null,
            name: "",
            description: "",
            priority: "medium",
            tag: "",
            assignee: "",
            dueDate: "",
            keyArea: "",
            linkedGoal: "",
            status: "to-do",
            recurring: false,
        });
    };

    // Filter tasks based on search and filters
    const filteredTasks = tasks.filter((task) => {
        const matchesSearch =
            task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPriority = !filterPriority || task.priority === filterPriority;
        const matchesStatus = !filterStatus || task.status === filterStatus;
        const matchesKeyArea = !filterKeyArea || task.keyArea === filterKeyArea;

        // Activity Trap view - only tasks without linked goals
        if (viewMode === "activity-trap") {
            return matchesSearch && matchesPriority && matchesStatus && matchesKeyArea && !task.linkedGoal;
        }

        // Focus view - only high priority active tasks
        if (viewMode === "focus") {
            return matchesSearch && task.priority === "high" && task.status === "active";
        }

        return matchesSearch && matchesPriority && matchesStatus && matchesKeyArea;
    });

    // Apply sorting to filtered tasks
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (!sortField) return 0;

        let aValue = a[sortField];
        let bValue = b[sortField];

        // Handle different field types
        if (sortField === "createdAt" || sortField === "dueDate") {
            aValue = new Date(aValue || 0);
            bValue = new Date(bValue || 0);
        } else if (typeof aValue === "string") {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    // Use sorted tasks as final filtered tasks
    const finalFilteredTasks = sortedTasks;

    // Activity Trap tasks - tasks without linked goals
    const activityTrapTasks = tasks.filter((task) => !task.linkedGoal);

    const taskStats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.completed).length,
        pending: tasks.filter((t) => !t.completed && t.status === "active").length,
        inactive: tasks.filter((t) => t.status === "inactive").length,
        highPriority: tasks.filter((t) => t.priority === "high" && !t.completed).length,
        activityTrap: tasks.filter((t) => !t.linkedGoal && t.status === "active").length,
        byKeyArea: keyAreas.reduce((acc, area) => {
            acc[area] = tasks.filter((t) => t.keyArea === area).length;
            return acc;
        }, {}),
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "high":
                return "bg-red-100 text-red-700 border-red-200";
            case "low":
                return "bg-green-100 text-green-700 border-green-200";
            default:
                return "bg-blue-100 text-blue-700 border-blue-200";
        }
    };

    const getTagColor = (tag) => {
        const colors = {
            urgent: "bg-red-100 text-red-700",
            meeting: "bg-purple-100 text-purple-700",
            review: "bg-yellow-100 text-yellow-700",
            research: "bg-indigo-100 text-indigo-700",
            development: "bg-cyan-100 text-cyan-700",
            normal: "bg-gray-100 text-gray-700",
        };
        return colors[tag] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
            <Sidebar user={{ name: "Hussein" }} />

            <main className="flex-1 p-6">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tasks & Activities</h1>
                            <p className="text-gray-600">
                                Manage your team's tasks with advanced filtering and organization
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200 font-medium"
                        >
                            <FiPlus className="text-lg" />
                            New Task
                        </button>
                    </div>

                    {/* Stats Cards */}
                    {activeStatsFilter && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-600">Active Filter:</span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    {activeStatsFilter === "total" && "All Tasks"}
                                    {activeStatsFilter === "completed" && "Completed Tasks"}
                                    {activeStatsFilter === "active" && "Active Tasks"}
                                    {activeStatsFilter === "inactive" && "Inactive Tasks"}
                                    {activeStatsFilter === "high-priority" && "High Priority Tasks"}
                                    {activeStatsFilter === "activity-trap" && "Activity Trap Tasks"}
                                </span>
                                <button
                                    onClick={() => handleStatsCardClick(activeStatsFilter)}
                                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                                >
                                    Clear Filter
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 mb-8">
                        <button
                            onClick={() => handleStatsCardClick("total")}
                            className={`w-full bg-white rounded-2xl p-6 shadow-sm border transition-all duration-200 text-left ${
                                activeStatsFilter === "total"
                                    ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                                    : "border-gray-200/60 hover:shadow-md hover:border-blue-300"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{taskStats.total}</p>
                                </div>
                                <div
                                    className={`p-3 rounded-xl ${activeStatsFilter === "total" ? "bg-blue-600" : "bg-blue-100"}`}
                                >
                                    <FiTarget
                                        className={`text-xl ${activeStatsFilter === "total" ? "text-white" : "text-blue-600"}`}
                                    />
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleStatsCardClick("completed")}
                            className={`w-full bg-white rounded-2xl p-6 shadow-sm border transition-all duration-200 text-left ${
                                activeStatsFilter === "completed"
                                    ? "border-green-500 ring-2 ring-green-200 shadow-md"
                                    : "border-gray-200/60 hover:shadow-md hover:border-green-300"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Completed</p>
                                    <p className="text-3xl font-bold text-green-600 mt-2">{taskStats.completed}</p>
                                </div>
                                <div
                                    className={`p-3 rounded-xl ${activeStatsFilter === "completed" ? "bg-green-600" : "bg-green-100"}`}
                                >
                                    <FiCheck
                                        className={`text-xl ${activeStatsFilter === "completed" ? "text-white" : "text-green-600"}`}
                                    />
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleStatsCardClick("active")}
                            className={`w-full bg-white rounded-2xl p-6 shadow-sm border transition-all duration-200 text-left ${
                                activeStatsFilter === "active"
                                    ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                                    : "border-gray-200/60 hover:shadow-md hover:border-blue-300"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Active</p>
                                    <p className="text-3xl font-bold text-blue-600 mt-2">{taskStats.pending}</p>
                                </div>
                                <div
                                    className={`p-3 rounded-xl ${activeStatsFilter === "active" ? "bg-blue-600" : "bg-blue-100"}`}
                                >
                                    <FiClock
                                        className={`text-xl ${activeStatsFilter === "active" ? "text-white" : "text-blue-600"}`}
                                    />
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleStatsCardClick("inactive")}
                            className={`w-full bg-white rounded-2xl p-6 shadow-sm border transition-all duration-200 text-left ${
                                activeStatsFilter === "inactive"
                                    ? "border-gray-500 ring-2 ring-gray-200 shadow-md"
                                    : "border-gray-200/60 hover:shadow-md hover:border-gray-400"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Inactive</p>
                                    <p className="text-3xl font-bold text-gray-600 mt-2">{taskStats.inactive}</p>
                                </div>
                                <div
                                    className={`p-3 rounded-xl ${activeStatsFilter === "inactive" ? "bg-gray-600" : "bg-gray-100"}`}
                                >
                                    <FiArchive
                                        className={`text-xl ${activeStatsFilter === "inactive" ? "text-white" : "text-gray-600"}`}
                                    />
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleStatsCardClick("high-priority")}
                            className={`w-full bg-white rounded-2xl p-6 shadow-sm border transition-all duration-200 text-left ${
                                activeStatsFilter === "high-priority"
                                    ? "border-red-500 ring-2 ring-red-200 shadow-md"
                                    : "border-gray-200/60 hover:shadow-md hover:border-red-300"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">High Priority</p>
                                    <p className="text-3xl font-bold text-red-600 mt-2">{taskStats.highPriority}</p>
                                </div>
                                <div
                                    className={`p-3 rounded-xl ${activeStatsFilter === "high-priority" ? "bg-red-600" : "bg-red-100"}`}
                                >
                                    <FiFlag
                                        className={`text-xl ${activeStatsFilter === "high-priority" ? "text-white" : "text-red-600"}`}
                                    />
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => handleStatsCardClick("activity-trap")}
                            className={`w-full bg-white rounded-2xl p-6 shadow-sm border transition-all duration-200 text-left ${
                                activeStatsFilter === "activity-trap"
                                    ? "border-orange-500 ring-2 ring-orange-200 shadow-md"
                                    : "border-gray-200/60 hover:shadow-md hover:border-orange-300"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Activity Trap</p>
                                    <p className="text-3xl font-bold text-orange-600 mt-2">{taskStats.activityTrap}</p>
                                </div>
                                <div
                                    className={`p-3 rounded-xl ${activeStatsFilter === "activity-trap" ? "bg-orange-600" : "bg-orange-100"}`}
                                >
                                    <FiAlertTriangle
                                        className={`text-xl ${activeStatsFilter === "activity-trap" ? "text-white" : "text-orange-600"}`}
                                    />
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Filters and Search */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 mb-6">
                        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                            <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                {/* Search */}
                                <div className="relative flex-1 max-w-md">
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search tasks..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Filters */}
                                <div className="flex gap-3">
                                    <select
                                        value={filterPriority}
                                        onChange={(e) => setFilterPriority(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">All Priorities</option>
                                        <option value="high">High Priority</option>
                                        <option value="normal">Normal Priority</option>
                                        <option value="low">Low Priority</option>
                                    </select>

                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="completed">Completed</option>
                                    </select>

                                    <select
                                        value={filterKeyArea}
                                        onChange={(e) => setFilterKeyArea(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">All Key Areas</option>
                                        {keyAreas.map((area) => (
                                            <option key={area} value={area}>
                                                {area}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* View Toggle */}
                            <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-gray-600"}`}
                                    title="List View"
                                >
                                    <FiList className="text-lg" />
                                </button>
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-gray-600"}`}
                                    title="Grid View"
                                >
                                    <FiGrid className="text-lg" />
                                </button>
                                <button
                                    onClick={() => setViewMode("kanban")}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === "kanban" ? "bg-white shadow-sm text-blue-600" : "text-gray-600"}`}
                                    title="Kanban Board"
                                >
                                    <FiColumns className="text-lg" />
                                </button>
                                <button
                                    onClick={() => setViewMode("focus")}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === "focus" ? "bg-white shadow-sm text-blue-600" : "text-gray-600"}`}
                                    title="My Focus"
                                >
                                    <FiZap className="text-lg" />
                                </button>
                                <button
                                    onClick={() => setViewMode("activity-trap")}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === "activity-trap" ? "bg-white shadow-sm text-blue-600" : "text-gray-600"}`}
                                    title="Activity Trap"
                                >
                                    <FiActivity className="text-lg" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Task Modal */}
                {showAddForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Create New Task</h2>
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FiX className="text-xl text-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
                                    <input
                                        type="text"
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.target.value)}
                                        placeholder="Enter task name..."
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={newDescription}
                                        onChange={(e) => setNewDescription(e.target.value)}
                                        placeholder="Enter task description..."
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {priorities.map((p) => (
                                                <option key={p} value={p}>
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                                        <select
                                            value={tag}
                                            onChange={(e) => setTag(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select tag</option>
                                            {tags.map((t) => (
                                                <option key={t} value={t}>
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Key Area</label>
                                        <select
                                            value={selectedKeyArea}
                                            onChange={(e) => setSelectedKeyArea(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select key area</option>
                                            {keyAreas.map((area) => (
                                                <option key={area} value={area}>
                                                    {area}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Link to Goal
                                        </label>
                                        <select
                                            value={linkedGoal}
                                            onChange={(e) => setLinkedGoal(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">No goal linked</option>
                                            {goals.map((goal) => (
                                                <option key={goal} value={goal}>
                                                    {goal}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Assign to
                                        </label>
                                        <select
                                            value={assignee}
                                            onChange={(e) => setAssignee(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select assignee</option>
                                            {teamMembers.map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={recurring}
                                            onChange={(e) => setRecurring(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Recurring Task</span>
                                    </label>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        onClick={handleAddTask}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                                    >
                                        Create Task
                                    </button>
                                    <button
                                        onClick={() => setShowAddForm(false)}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Task Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Edit Task</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <FiX className="text-xl text-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                                    <input
                                        type="text"
                                        value={editTaskData.name}
                                        onChange={(e) => setEditTaskData({ ...editTaskData, name: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter task title..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={editTaskData.description}
                                        onChange={(e) =>
                                            setEditTaskData({ ...editTaskData, description: e.target.value })
                                        }
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows={3}
                                        placeholder="Add task description..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                        <select
                                            value={editTaskData.priority}
                                            onChange={(e) =>
                                                setEditTaskData({ ...editTaskData, priority: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {priorities.map((p) => (
                                                <option key={p} value={p}>
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                        <select
                                            value={editTaskData.status}
                                            onChange={(e) =>
                                                setEditTaskData({ ...editTaskData, status: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="to-do">To Do</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="review">Review</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
                                        <select
                                            value={editTaskData.tag}
                                            onChange={(e) => setEditTaskData({ ...editTaskData, tag: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select tag</option>
                                            {tags.map((t) => (
                                                <option key={t} value={t}>
                                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Key Area</label>
                                        <select
                                            value={editTaskData.keyArea}
                                            onChange={(e) =>
                                                setEditTaskData({ ...editTaskData, keyArea: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select key area</option>
                                            {keyAreas.map((area) => (
                                                <option key={area} value={area}>
                                                    {area}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Link to Goal
                                        </label>
                                        <select
                                            value={editTaskData.linkedGoal}
                                            onChange={(e) =>
                                                setEditTaskData({ ...editTaskData, linkedGoal: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">No goal linked</option>
                                            {goals.map((goal) => (
                                                <option key={goal} value={goal}>
                                                    {goal}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Assign to
                                        </label>
                                        <select
                                            value={editTaskData.assignee}
                                            onChange={(e) =>
                                                setEditTaskData({ ...editTaskData, assignee: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select assignee</option>
                                            {teamMembers.map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                                        <input
                                            type="date"
                                            value={editTaskData.dueDate}
                                            onChange={(e) =>
                                                setEditTaskData({ ...editTaskData, dueDate: e.target.value })
                                            }
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editTaskData.recurring}
                                            onChange={(e) =>
                                                setEditTaskData({ ...editTaskData, recurring: e.target.checked })
                                            }
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Recurring Task</span>
                                    </label>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        onClick={handleSaveEdit}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                                    >
                                        Update Task
                                    </button>
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tasks List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                    {finalFilteredTasks.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <FiTarget className="text-3xl text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                            <p className="text-gray-500 mb-6">
                                {searchTerm || filterPriority || filterStatus
                                    ? "No tasks match your current filters. Try adjusting your search criteria."
                                    : "Get started by creating your first task."}
                            </p>
                            {!searchTerm && !filterPriority && !filterStatus && (
                                <button
                                    onClick={() => setShowAddForm(true)}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                                >
                                    Create First Task
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Kanban View */}
                            {viewMode === "kanban" && (
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
                                    {["to-do", "in-progress", "review", "completed"].map((status) => (
                                        <div key={status} className="bg-gray-50 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-gray-700 capitalize">
                                                    {status.replace("-", " ")}
                                                </h3>
                                                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                                                    {finalFilteredTasks.filter((t) => t.status === status).length}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {finalFilteredTasks
                                                    .filter((task) => task.status === status)
                                                    .map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                                                        >
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <button
                                                                    onClick={() => handleToggleTask(task.id)}
                                                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                                                        task.completed
                                                                            ? "bg-green-500 border-green-500 text-white"
                                                                            : "border-gray-300 hover:border-green-500"
                                                                    }`}
                                                                >
                                                                    {task.completed && <FiCheck className="text-xs" />}
                                                                </button>
                                                                <h4
                                                                    className={`font-medium text-sm ${task.completed ? "line-through text-gray-400" : "text-gray-900"}`}
                                                                >
                                                                    {task.name}
                                                                </h4>
                                                            </div>
                                                            {task.description && (
                                                                <p className="text-xs text-gray-600 mb-3">
                                                                    {task.description}
                                                                </p>
                                                            )}
                                                            <div className="flex flex-wrap gap-1 mb-3">
                                                                {task.tag && (
                                                                    <span
                                                                        className={`px-2 py-1 rounded text-xs font-medium ${getTagColor(task.tag)}`}
                                                                    >
                                                                        {task.tag}
                                                                    </span>
                                                                )}
                                                                {task.keyArea && (
                                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                                        {task.keyArea}
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}
                                                                >
                                                                    {task.priority}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                                {task.assignee && (
                                                                    <div className="flex items-center gap-1">
                                                                        <FiUser className="text-xs" />
                                                                        <span>{task.assignee}</span>
                                                                    </div>
                                                                )}
                                                                {task.dueDate && (
                                                                    <div className="flex items-center gap-1">
                                                                        <FiCalendar className="text-xs" />
                                                                        <span>{task.dueDate}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                {finalFilteredTasks.filter((t) => t.status === status).length === 0 && (
                                                    <div className="text-center py-8 text-gray-400">
                                                        <FiInbox className="mx-auto text-2xl mb-2" />
                                                        <p className="text-sm">No tasks</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Focus View (Eisenhower Matrix) */}
                            {viewMode === "focus" && (
                                <div className="p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {[
                                            {
                                                title: "Important & Urgent",
                                                subtitle: "Do First",
                                                color: "red",
                                                filter: (t) =>
                                                    t.priority === "high" &&
                                                    new Date(t.dueDate) <=
                                                        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                                            },
                                            {
                                                title: "Important & Not Urgent",
                                                subtitle: "Schedule",
                                                color: "yellow",
                                                filter: (t) =>
                                                    t.priority === "high" &&
                                                    new Date(t.dueDate) >
                                                        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                                            },
                                            {
                                                title: "Not Important & Urgent",
                                                subtitle: "Delegate",
                                                color: "blue",
                                                filter: (t) =>
                                                    t.priority === "medium" &&
                                                    new Date(t.dueDate) <=
                                                        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                                            },
                                            {
                                                title: "Not Important & Not Urgent",
                                                subtitle: "Eliminate",
                                                color: "gray",
                                                filter: (t) => t.priority === "low",
                                            },
                                        ].map((quadrant, idx) => (
                                            <div
                                                key={idx}
                                                className={`border-2 border-${quadrant.color}-200 rounded-xl p-6 bg-${quadrant.color}-50/30`}
                                            >
                                                <div className="mb-4">
                                                    <h3 className={`font-bold text-${quadrant.color}-700`}>
                                                        {quadrant.title}
                                                    </h3>
                                                    <p className={`text-sm text-${quadrant.color}-600`}>
                                                        {quadrant.subtitle}
                                                    </p>
                                                </div>
                                                <div className="space-y-3">
                                                    {finalFilteredTasks.filter(quadrant.filter).map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className="bg-white rounded-lg p-3 shadow-sm"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleToggleTask(task.id)}
                                                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                                                        task.completed
                                                                            ? "bg-green-500 border-green-500 text-white"
                                                                            : "border-gray-300 hover:border-green-500"
                                                                    }`}
                                                                >
                                                                    {task.completed && <FiCheck className="text-xs" />}
                                                                </button>
                                                                <span
                                                                    className={`text-sm font-medium ${task.completed ? "line-through text-gray-400" : "text-gray-900"}`}
                                                                >
                                                                    {task.name}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Activity Trap View */}
                            {viewMode === "activity-trap" && (
                                <div className="p-6">
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                                            <h3 className="font-semibold text-red-800 flex items-center gap-2">
                                                <FiAlertTriangle className="text-red-600" />
                                                Activity Trap Report
                                            </h3>
                                            <p className="text-sm text-red-600 mt-1">
                                                Tasks or activities that are not linked to any goals - assign goals to
                                                move them out of this trap
                                            </p>
                                        </div>

                                        {/* Activity Trap Filters */}
                                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="flex-1">
                                                    <div className="relative">
                                                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search activity trap tasks..."
                                                            value={searchTerm}
                                                            onChange={(e) => setSearchTerm(e.target.value)}
                                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <select
                                                        value={filterPriority}
                                                        onChange={(e) => setFilterPriority(e.target.value)}
                                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    >
                                                        <option value="">All Priorities</option>
                                                        <option value="high">High Priority</option>
                                                        <option value="medium">Medium Priority</option>
                                                        <option value="low">Low Priority</option>
                                                    </select>
                                                    <select
                                                        value={filterStatus}
                                                        onChange={(e) => setFilterStatus(e.target.value)}
                                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    >
                                                        <option value="">All Status</option>
                                                        <option value="to-do">To Do</option>
                                                        <option value="in-progress">In Progress</option>
                                                        <option value="review">Review</option>
                                                        <option value="completed">Completed</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                            onClick={() => handleSort("name")}
                                                        >
                                                            Task/Activity Name
                                                            {sortField === "name" && (
                                                                <span className="ml-1">
                                                                    {sortDirection === "asc" ? "↑" : "↓"}
                                                                </span>
                                                            )}
                                                        </th>
                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                            onClick={() => handleSort("createdAt")}
                                                        >
                                                            Created Date
                                                            {sortField === "createdAt" && (
                                                                <span className="ml-1">
                                                                    {sortDirection === "asc" ? "↑" : "↓"}
                                                                </span>
                                                            )}
                                                        </th>
                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                            onClick={() => handleSort("assignee")}
                                                        >
                                                            Assigned Member
                                                            {sortField === "assignee" && (
                                                                <span className="ml-1">
                                                                    {sortDirection === "asc" ? "↑" : "↓"}
                                                                </span>
                                                            )}
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Key Area
                                                        </th>
                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                            onClick={() => handleSort("priority")}
                                                        >
                                                            Pr
                                                            {sortField === "priority" && (
                                                                <span className="ml-1">
                                                                    {sortDirection === "asc" ? "↑" : "↓"}
                                                                </span>
                                                            )}
                                                        </th>
                                                        <th
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                            onClick={() => handleSort("status")}
                                                        >
                                                            Status
                                                            {sortField === "status" && (
                                                                <span className="ml-1">
                                                                    {sortDirection === "asc" ? "↑" : "↓"}
                                                                </span>
                                                            )}
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {finalFilteredTasks.map((task) => (
                                                        <tr key={task.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {task.name}
                                                                </div>
                                                                {task.description && (
                                                                    <div className="text-sm text-gray-500">
                                                                        {task.description}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {task.createdAt}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {task.assignee || "Unassigned"}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {task.keyArea ? (
                                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                                        {task.keyArea}
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                                                        Not Assigned
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center justify-center">
                                                                    {task.priority === "high" ? (
                                                                        <FiAlertTriangle
                                                                            className="text-red-500 text-lg"
                                                                            title="High Priority"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500 capitalize">
                                                                            {task.priority}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span
                                                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                        task.status === "completed"
                                                                            ? "bg-green-100 text-green-800"
                                                                            : task.status === "in-progress"
                                                                              ? "bg-blue-100 text-blue-800"
                                                                              : task.status === "review"
                                                                                ? "bg-yellow-100 text-yellow-800"
                                                                                : "bg-gray-100 text-gray-800"
                                                                    }`}
                                                                >
                                                                    {task.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-2">
                                                                    <select
                                                                        onChange={(e) => {
                                                                            if (e.target.value) {
                                                                                handleAssignGoal(
                                                                                    task.id,
                                                                                    e.target.value,
                                                                                );
                                                                                e.target.value = ""; // Reset dropdown
                                                                            }
                                                                        }}
                                                                        className="text-xs border border-blue-300 rounded px-2 py-1 bg-blue-50 text-blue-700 cursor-pointer hover:bg-blue-100"
                                                                        defaultValue=""
                                                                    >
                                                                        <option value="" disabled>
                                                                            Assign Goal
                                                                        </option>
                                                                        {goals.map((goal) => (
                                                                            <option key={goal} value={goal}>
                                                                                {goal}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {finalFilteredTasks.length === 0 && (
                                                <div className="text-center py-12">
                                                    <FiCheckCircle className="mx-auto text-4xl text-green-500 mb-4" />
                                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                        No Activity Trap Tasks!
                                                    </h3>
                                                    <p className="text-gray-600">
                                                        All tasks are properly linked to goals and key areas.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* List and Grid Views */}
                            {(viewMode === "list" || viewMode === "grid") && (
                                <div
                                    className={
                                        viewMode === "grid"
                                            ? "p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                            : "p-6 space-y-4"
                                    }
                                >
                                    {filteredTasks.map((task) =>
                                        viewMode === "grid" ? (
                                            // Grid View Card
                                            <div
                                                key={task.id}
                                                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() => handleToggleTask(task.id)}
                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                                task.completed
                                                                    ? "bg-green-500 border-green-500 text-white"
                                                                    : "border-gray-300 hover:border-green-500"
                                                            }`}
                                                        >
                                                            {task.completed && <FiCheck className="text-xs" />}
                                                        </button>
                                                        <span
                                                            className={`font-medium ${task.completed ? "line-through text-gray-400" : "text-gray-900"}`}
                                                        >
                                                            {task.name}
                                                        </span>
                                                    </div>
                                                    <div className="relative">
                                                        <button className="p-1 hover:bg-gray-100 rounded">
                                                            <FiMoreHorizontal className="text-gray-400" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {task.description && (
                                                    <p className="text-sm text-gray-600 mb-4">{task.description}</p>
                                                )}

                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {task.tag && (
                                                        <span
                                                            className={`px-2 py-1 rounded-lg text-xs font-medium ${getTagColor(task.tag)}`}
                                                        >
                                                            {task.tag}
                                                        </span>
                                                    )}
                                                    {task.keyArea && (
                                                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                            {task.keyArea}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(task.priority)}`}
                                                    >
                                                        {task.priority}
                                                    </span>
                                                    <select
                                                        value={task.status || "to-do"}
                                                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                                        className={`px-2 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${
                                                            task.status === "completed"
                                                                ? "bg-green-100 text-green-800"
                                                                : task.status === "in-progress"
                                                                  ? "bg-blue-100 text-blue-800"
                                                                  : task.status === "review"
                                                                    ? "bg-yellow-100 text-yellow-800"
                                                                    : "bg-gray-100 text-gray-800"
                                                        }`}
                                                    >
                                                        <option value="to-do">To-Do</option>
                                                        <option value="in-progress">In Progress</option>
                                                        <option value="review">Review</option>
                                                        <option value="completed">Completed</option>
                                                    </select>
                                                    {task.recurring && (
                                                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700">
                                                            <FiRepeat className="inline text-xs mr-1" />
                                                            Recurring
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-sm text-gray-500">
                                                    <div className="flex items-center gap-4">
                                                        {task.assignee && (
                                                            <div className="flex items-center gap-1">
                                                                <FiUser className="text-xs" />
                                                                <span>{task.assignee}</span>
                                                            </div>
                                                        )}
                                                        {task.dueDate && (
                                                            <div className="flex items-center gap-1">
                                                                <FiCalendar className="text-xs" />
                                                                <span>{task.dueDate}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditTask(task.id)}
                                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                            title="Edit task"
                                                        >
                                                            <FiEdit3 className="text-sm" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTask(task.id)}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Delete task"
                                                        >
                                                            <FiTrash2 className="text-sm" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // List View Row - Improved Structure
                                            <div
                                                key={task.id}
                                                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200 mb-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    {/* Left Section - Main Task Info */}
                                                    <div className="flex items-start gap-4 flex-1">
                                                        <button
                                                            onClick={() => handleToggleTask(task.id)}
                                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-1 ${
                                                                task.completed
                                                                    ? "bg-green-500 border-green-500 text-white"
                                                                    : "border-gray-300 hover:border-green-500"
                                                            }`}
                                                        >
                                                            {task.completed && <FiCheck className="text-sm" />}
                                                        </button>

                                                        <div className="flex-1">
                                                            {/* Task Title */}
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h3
                                                                    className={`text-lg font-semibold ${
                                                                        task.completed
                                                                            ? "line-through text-gray-400"
                                                                            : "text-gray-900"
                                                                    }`}
                                                                >
                                                                    {task.name}
                                                                </h3>

                                                                {/* Status Dropdown */}
                                                                <select
                                                                    value={task.status || "to-do"}
                                                                    onChange={(e) =>
                                                                        handleStatusChange(task.id, e.target.value)
                                                                    }
                                                                    className={`px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${
                                                                        task.status === "completed"
                                                                            ? "bg-green-100 text-green-800"
                                                                            : task.status === "in-progress"
                                                                              ? "bg-blue-100 text-blue-800"
                                                                              : task.status === "review"
                                                                                ? "bg-yellow-100 text-yellow-800"
                                                                                : "bg-gray-100 text-gray-800"
                                                                    }`}
                                                                >
                                                                    <option value="to-do">TO-DO</option>
                                                                    <option value="in-progress">IN PROGRESS</option>
                                                                    <option value="review">REVIEW</option>
                                                                    <option value="completed">COMPLETED</option>
                                                                </select>
                                                            </div>

                                                            {/* Task Description */}
                                                            {task.description && (
                                                                <p className="text-gray-600 mb-3 leading-relaxed">
                                                                    {task.description}
                                                                </p>
                                                            )}

                                                            {/* Tags and Badges Row */}
                                                            <div className="flex flex-wrap gap-2 mb-3">
                                                                {task.tag && (
                                                                    <span
                                                                        className={`px-3 py-1 rounded-full text-xs font-medium ${getTagColor(task.tag)}`}
                                                                    >
                                                                        {task.tag}
                                                                    </span>
                                                                )}
                                                                {task.keyArea && (
                                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                                        📁 {task.keyArea}
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}
                                                                >
                                                                    {task.priority === "high" && "🔥"}{" "}
                                                                    {task.priority.toUpperCase()}
                                                                </span>
                                                                {task.linkedGoal && (
                                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                        🎯 {task.linkedGoal}
                                                                    </span>
                                                                )}
                                                                {task.recurring && (
                                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                                        <FiRepeat className="inline text-xs mr-1" />
                                                                        Recurring
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Bottom Meta Information */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-6 text-sm text-gray-500">
                                                                    {task.assignee && (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                                                                <FiUser className="text-xs text-blue-600" />
                                                                            </div>
                                                                            <span className="font-medium">
                                                                                {task.assignee}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {task.dueDate && (
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                                                                <FiCalendar className="text-xs text-orange-600" />
                                                                            </div>
                                                                            <span>Due {task.dueDate}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                                                            <FiClock className="text-xs text-gray-600" />
                                                                        </div>
                                                                        <span>Created {task.createdAt}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right Section - Action Buttons */}
                                                    <div className="flex flex-col gap-2 ml-6">
                                                        <button
                                                            onClick={() => handleEditTask(task.id)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                                                            title="Edit task"
                                                        >
                                                            <FiEdit3 className="text-lg" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTask(task.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                                            title="Delete task"
                                                        >
                                                            <FiTrash2 className="text-lg" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
