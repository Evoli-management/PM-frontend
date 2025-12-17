import React, { useState, useEffect } from "react";
import Sidebar from "../components/shared/Sidebar";
import { FaBars, FaSearch } from "react-icons/fa";
import organizationService from "../services/organizationService";
import cultureService from "../services/cultureService";
import keyAreaService from "../services/keyAreaService";
import recognitionsService from "../services/recognitionsService";

export default function GiveStrokes() {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    // External recipient
    const [externalName, setExternalName] = useState("");
    const [externalEmail, setExternalEmail] = useState("");
    
    // Selected recipient
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    
    // Modal states
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedType, setSelectedType] = useState(null); // 'employeeship', 'performance', 'achievement'
    
    // Recognition details
    const [cultureValues, setCultureValues] = useState([]);
    const [keyAreas, setKeyAreas] = useState([]);
    const [recentAchievements, setRecentAchievements] = useState({ goals: [], milestones: [] });
    const [selectedValue, setSelectedValue] = useState(null);
    const [selectedKeyArea, setSelectedKeyArea] = useState(null);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [selectedMilestone, setSelectedMilestone] = useState(null);
    const [selectedBehaviors, setSelectedBehaviors] = useState([]);
    const [personalNote, setPersonalNote] = useState("");

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = async () => {
        try {
            setLoading(true);
            const data = await organizationService.getOrganizationMembers();
            setMembers(data || []);
        } catch (err) {
            console.error("Failed to load members:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMemberSelect = (member) => {
        setSelectedRecipient({ id: member.id, name: `${member.firstName} ${member.lastName}`, type: 'member' });
        setShowTypeModal(true);
    };

    const handleExternalRecipient = () => {
        if (!externalName || !externalEmail) return;
        setSelectedRecipient({ name: externalName, email: externalEmail, type: 'external' });
        setShowTypeModal(true);
    };

    const handleTypeSelect = async (type) => {
        setSelectedType(type);
        setShowTypeModal(false);
        
        // Load data based on type
        if (type === 'employeeship') {
            const values = await cultureService.getValues();
            setCultureValues(values || []);
        } else if (type === 'performance') {
            const areas = await keyAreaService.getKeyAreas(selectedRecipient.id);
            setKeyAreas(areas || []);
        } else if (type === 'achievement') {
            const achievements = await recognitionsService.getRecentAchievements(selectedRecipient.id);
            setRecentAchievements(achievements);
        }
        
        setShowDetailsModal(true);
    };

    const toggleBehavior = (behavior) => {
        if (selectedBehaviors.includes(behavior)) {
            setSelectedBehaviors(selectedBehaviors.filter(b => b !== behavior));
        } else {
            setSelectedBehaviors([...selectedBehaviors, behavior]);
        }
    };

    const handleSubmit = async () => {
        try {
            const data = {
                type: selectedType,
                personalNote,
            };

            if (selectedRecipient.type === 'member') {
                data.recipientId = selectedRecipient.id;
            } else {
                data.recipientName = selectedRecipient.name;
                data.recipientEmail = selectedRecipient.email;
            }

            if (selectedType === 'employeeship') {
                data.cultureValueId = selectedValue?.id;
                data.selectedBehaviors = selectedBehaviors;
            } else if (selectedType === 'performance') {
                data.keyAreaId = selectedKeyArea?.id;
            } else if (selectedType === 'achievement') {
                if (selectedGoal) data.goalId = selectedGoal.id;
                if (selectedMilestone) data.milestoneId = selectedMilestone.id;
            }

            await recognitionsService.createRecognition(data);
            
            // Reset
            setShowDetailsModal(false);
            setSelectedRecipient(null);
            setSelectedType(null);
            setSelectedValue(null);
            setSelectedKeyArea(null);
            setSelectedGoal(null);
            setSelectedMilestone(null);
            setSelectedBehaviors([]);
            setPersonalNote("");
            setExternalName("");
            setExternalEmail("");
            
            alert("Recognition sent successfully!");
        } catch (err) {
            console.error("Failed to send recognition:", err);
            alert("Failed to send recognition");
        }
    };

    const filteredMembers = members.filter(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <div className="max-w-7xl mx-auto pb-8">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <button
                                className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                onClick={() => setMobileSidebarOpen(true)}
                            >
                                <FaBars />
                            </button>
                        </div>

                        <div className="rounded-lg bg-white p-6 shadow-sm">
                            <h1 className="text-2xl font-semibold text-cyan-500 text-center mb-8">
                                Whom do you wish to recognise?
                            </h1>

                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Members Section */}
                                <div>
                                    <h2 className="text-cyan-500 text-lg font-semibold mb-4">Members:</h2>
                                    <div className="relative mb-4">
                                        <FaSearch className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search..."
                                            className="w-full pl-10 pr-4 py-2 border-b-2 border-cyan-400 focus:outline-none focus:border-cyan-600"
                                        />
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {loading ? (
                                            <p className="text-gray-500 text-center py-4">Loading...</p>
                                        ) : filteredMembers.length === 0 ? (
                                            <p className="text-gray-500 text-center py-4">No members found</p>
                                        ) : (
                                            filteredMembers.map((member) => (
                                                <button
                                                    key={member.id}
                                                    onClick={() => handleMemberSelect(member)}
                                                    className="w-full text-left px-3 py-2 hover:bg-cyan-50 rounded text-cyan-600 transition"
                                                >
                                                    {member.firstName} {member.lastName}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* External People Section */}
                                <div>
                                    <h2 className="text-cyan-500 text-lg font-semibold mb-4">
                                        People outside your company:
                                    </h2>
                                    <div className="space-y-4">
                                        <input
                                            value={externalName}
                                            onChange={(e) => setExternalName(e.target.value)}
                                            placeholder="Name"
                                            className="w-full px-4 py-2 border-b-2 border-cyan-400 focus:outline-none focus:border-cyan-600"
                                        />
                                        <input
                                            value={externalEmail}
                                            onChange={(e) => setExternalEmail(e.target.value)}
                                            placeholder="Email"
                                            className="w-full px-4 py-2 border-b-2 border-cyan-400 focus:outline-none focus:border-cyan-600"
                                        />
                                        <button
                                            onClick={handleExternalRecipient}
                                            disabled={!externalName || !externalEmail}
                                            className="px-6 py-2 bg-lime-400 text-white rounded-full hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            GIVE STROKES
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Type Selection Modal */}
            {showTypeModal && (
                <TypeSelectionModal
                    onSelect={handleTypeSelect}
                    onClose={() => setShowTypeModal(false)}
                />
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedType === 'employeeship' && (
                <EmployeeshipModal
                    values={cultureValues}
                    selectedValue={selectedValue}
                    onSelectValue={setSelectedValue}
                    selectedBehaviors={selectedBehaviors}
                    onToggleBehavior={toggleBehavior}
                    personalNote={personalNote}
                    onPersonalNoteChange={setPersonalNote}
                    recipientName={selectedRecipient?.name}
                    onSubmit={handleSubmit}
                    onBack={() => { setShowDetailsModal(false); setShowTypeModal(true); }}
                />
            )}

            {showDetailsModal && selectedType === 'performance' && (
                <PerformanceModal
                    keyAreas={keyAreas}
                    selectedKeyArea={selectedKeyArea}
                    onSelectKeyArea={setSelectedKeyArea}
                    personalNote={personalNote}
                    onPersonalNoteChange={setPersonalNote}
                    recipientName={selectedRecipient?.name}
                    onSubmit={handleSubmit}
                    onBack={() => { setShowDetailsModal(false); setShowTypeModal(true); }}
                />
            )}

            {showDetailsModal && selectedType === 'achievement' && (
                <AchievementModal
                    achievements={recentAchievements}
                    selectedGoal={selectedGoal}
                    selectedMilestone={selectedMilestone}
                    onSelectGoal={setSelectedGoal}
                    onSelectMilestone={setSelectedMilestone}
                    personalNote={personalNote}
                    onPersonalNoteChange={setPersonalNote}
                    recipientName={selectedRecipient?.name}
                    onSubmit={handleSubmit}
                    onBack={() => { setShowDetailsModal(false); setShowTypeModal(true); }}
                />
            )}
        </div>
    );
}

// Type Selection Modal Component
function TypeSelectionModal({ onSelect, onClose }) {
    const types = [
        { id: 'employeeship', label: 'Employeeship', icon: '👔' },
        { id: 'performance', label: 'Performance', icon: '📊' },
        { id: 'achievement', label: 'Achievement', icon: '🏆' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
                <h2 className="text-2xl font-semibold text-center mb-8">Give strokes</h2>
                <div className="grid grid-cols-3 gap-6">
                    {types.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => onSelect(type.id)}
                            className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-cyan-500 hover:shadow-lg transition"
                        >
                            <div className="text-6xl mb-4">{type.icon}</div>
                            <span className="text-lg font-medium text-cyan-600">{type.label}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
}

// Employeeship Modal Component
function EmployeeshipModal({ values, selectedValue, onSelectValue, selectedBehaviors, onToggleBehavior, personalNote, onPersonalNoteChange, recipientName, onSubmit, onBack }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8">
                <h2 className="text-2xl font-semibold text-cyan-500 text-center mb-6">Employeeship Strokes</h2>
                
                {!selectedValue ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        {values.map((value) => (
                            <button
                                key={value.id}
                                onClick={() => onSelectValue(value)}
                                className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-cyan-500 transition"
                            >
                                {value.imageUrl && (
                                    <img src={value.imageUrl} alt={value.heading} className="w-16 h-16 mb-2" />
                                )}
                                <span className="text-sm text-cyan-600 font-medium text-center">{value.heading}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            {selectedValue.imageUrl && (
                                <img src={selectedValue.imageUrl} alt={selectedValue.heading} className="w-24 h-24" />
                            )}
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-cyan-600 mb-2">{selectedValue.heading}</h3>
                                <div className="space-y-2">
                                    {selectedValue.behaviors?.map((behavior, idx) => (
                                        <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                            <button
                                                onClick={() => onToggleBehavior(behavior.description)}
                                                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                                                    selectedBehaviors.includes(behavior.description)
                                                        ? 'bg-lime-400 border-lime-400 text-white'
                                                        : 'border-gray-300'
                                                }`}
                                            >
                                                {selectedBehaviors.includes(behavior.description) && '+'}
                                            </button>
                                            <span className="text-sm">{behavior.description}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-cyan-600 font-medium mb-2">
                                Select a "+" mark and add your personal note:
                            </label>
                            <textarea
                                value={personalNote}
                                onChange={(e) => onPersonalNoteChange(e.target.value)}
                                placeholder={`${recipientName}, I think you did a very good job...`}
                                className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-cyan-500"
                                rows={4}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                                Back
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={selectedBehaviors.length === 0 || !personalNote}
                                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Performance Modal Component
function PerformanceModal({ keyAreas, selectedKeyArea, onSelectKeyArea, personalNote, onPersonalNoteChange, recipientName, onSubmit, onBack }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8">
                <h2 className="text-2xl font-semibold text-cyan-500 text-center mb-6">Performance Strokes</h2>
                
                <div className="mb-6">
                    <p className="text-gray-600 mb-4">Select a key area to recognize:</p>
                    {keyAreas.length === 0 ? (
                        <p className="text-center text-gray-500">No key areas found for this user</p>
                    ) : (
                        <div className="space-y-2">
                            {keyAreas.map((area) => (
                                <button
                                    key={area.id}
                                    onClick={() => onSelectKeyArea(area)}
                                    className={`w-full text-left px-4 py-3 rounded border-2 transition ${
                                        selectedKeyArea?.id === area.id
                                            ? 'border-cyan-500 bg-cyan-50'
                                            : 'border-gray-200 hover:border-cyan-300'
                                    }`}
                                >
                                    {area.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedKeyArea && (
                    <div className="mb-6">
                        <label className="block text-cyan-600 font-medium mb-2">
                            Add your personal note:
                        </label>
                        <textarea
                            value={personalNote}
                            onChange={(e) => onPersonalNoteChange(e.target.value)}
                            placeholder={`${recipientName}, I think you did a very good job...`}
                            className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-cyan-500"
                            rows={4}
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                        Back
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={!selectedKeyArea || !personalNote}
                        className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}

// Achievement Modal Component
function AchievementModal({ achievements, selectedGoal, selectedMilestone, onSelectGoal, onSelectMilestone, personalNote, onPersonalNoteChange, recipientName, onSubmit, onBack }) {
    const hasAchievements = achievements.goals.length > 0 || achievements.milestones.length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8">
                <h2 className="text-2xl font-semibold text-cyan-500 text-center mb-6">Achievement Strokes</h2>
                
                {!hasAchievements ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">There are no current achievements that you can stroke.</p>
                        <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                            Back
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-600 mb-4">Select a completed goal or milestone (last 2 weeks):</p>
                        
                        {achievements.goals.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">Goals</h3>
                                <div className="space-y-2">
                                    {achievements.goals.map((goal) => (
                                        <button
                                            key={goal.id}
                                            onClick={() => { onSelectGoal(goal); onSelectMilestone(null); }}
                                            className={`w-full text-left px-4 py-3 rounded border-2 transition ${
                                                selectedGoal?.id === goal.id
                                                    ? 'border-cyan-500 bg-cyan-50'
                                                    : 'border-gray-200 hover:border-cyan-300'
                                            }`}
                                        >
                                            {goal.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {achievements.milestones.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">Milestones</h3>
                                <div className="space-y-2">
                                    {achievements.milestones.map((milestone) => (
                                        <button
                                            key={milestone.id}
                                            onClick={() => { onSelectMilestone(milestone); onSelectGoal(null); }}
                                            className={`w-full text-left px-4 py-3 rounded border-2 transition ${
                                                selectedMilestone?.id === milestone.id
                                                    ? 'border-cyan-500 bg-cyan-50'
                                                    : 'border-gray-200 hover:border-cyan-300'
                                            }`}
                                        >
                                            {milestone.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(selectedGoal || selectedMilestone) && (
                            <div className="mb-6">
                                <label className="block text-cyan-600 font-medium mb-2">
                                    Add your personal note:
                                </label>
                                <textarea
                                    value={personalNote}
                                    onChange={(e) => onPersonalNoteChange(e.target.value)}
                                    placeholder={`${recipientName}, I think you did a very good job...`}
                                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-cyan-500"
                                    rows={4}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                                Back
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={(!selectedGoal && !selectedMilestone) || !personalNote}
                                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                                Submit
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
