import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/shared/Sidebar";
import { FaBars, FaSearch } from "react-icons/fa";
import organizationService from "../services/organizationService";
import cultureService from "../services/cultureService";
import keyAreaService from "../services/keyAreaService";
import recognitionsService from "../services/recognitionsService";
import userProfileService from "../services/userProfileService";

export default function GiveStrokes() {
    const { t } = useTranslation();
    const location = useLocation();
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentUserId, setCurrentUserId] = useState(null);
    
    // Tab state
    const [activeTab, setActiveTab] = useState('give'); // 'give' or 'account'
    const [receivedRecognitions, setReceivedRecognitions] = useState([]);
    const [loadingRecognitions, setLoadingRecognitions] = useState(false);
    
    // External recipient
    const [externalName, setExternalName] = useState("");
    const [externalEmail, setExternalEmail] = useState("");
    
    // Selected recipient
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const recipientRef = useRef(null);
    
    // Modal states
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showExternalModal, setShowExternalModal] = useState(false);
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

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const tab = params.get('tab') || 'give';
        setActiveTab(tab === 'account' ? 'account' : 'give');
    }, [location.search]);

    useEffect(() => {
        if (activeTab === 'account' && currentUserId) {
            loadReceivedRecognitions();
        }
    }, [activeTab, currentUserId]);

    const loadReceivedRecognitions = async () => {
        try {
            setLoadingRecognitions(true);
            const recognitions = await recognitionsService.getRecognitions({ recipientId: currentUserId });
            setReceivedRecognitions(recognitions || []);
        } catch (err) {
            console.error("Failed to load recognitions:", err);
        } finally {
            setLoadingRecognitions(false);
        }
    };

    const loadMembers = async () => {
        try {
            setLoading(true);
            const [data, profile] = await Promise.all([
                organizationService.getOrganizationMembers(),
                userProfileService.getProfile(),
            ]);
            const profileId = profile?.id || null;
            setCurrentUserId(profileId);
            const filtered = (data || []).filter(member => member.id !== profileId);
            setMembers(filtered);
        } catch (err) {
            console.error("Failed to load members:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMemberSelect = (member) => {
        if (currentUserId && member.id === currentUserId) {
            return;
        }
        const recipient = { id: member.id, name: `${member.firstName} ${member.lastName}`, type: 'member' };
        recipientRef.current = member.id;
        setSelectedRecipient(recipient);
        setShowTypeModal(true);
    };

    const handleExternalRecipient = () => {
        if (!externalName || !externalEmail) return;
        const recipient = { name: externalName, email: externalEmail, type: 'external' };
        recipientRef.current = null;
        setSelectedRecipient(recipient);
        setSelectedType('employeeship'); // default type for external recognitions
        if (!personalNote) {
            setPersonalNote(`${recipient.name || 'there'}, I think you did a very good job...`);
        }
        setShowExternalModal(true);
    };

    const handleTypeSelect = async (type) => {
        setSelectedType(type);
        setShowTypeModal(false);
        // Load data based on type. Use recipientRef to avoid race with state updates.
        try {
            if (type === 'employeeship') {
                const values = await cultureService.getValues();
                setCultureValues(values || []);
            } else if (type === 'performance') {
                const recipientId = recipientRef.current;
                if (!recipientId) {
                    alert(t("giveStrokes.noOrgForPerformance"));
                    setSelectedType(null);
                    return;
                }
                const areas = await keyAreaService.getKeyAreas(recipientId);
                setKeyAreas(areas || []);
            } else if (type === 'achievement') {
                const recipientId = recipientRef.current;
                if (!recipientId) {
                    alert(t("giveStrokes.noOrgForAchievement"));
                    setSelectedType(null);
                    return;
                }
                const achievements = await recognitionsService.getRecentAchievements(recipientId);
                setRecentAchievements(achievements);
            }
        } catch (err) {
            console.error('Failed to load type data:', err);
            alert(t("giveStrokes.loadDataFailed"));
            setSelectedType(null);
            return;
        }

        if (!personalNote && selectedRecipient?.name) {
            setPersonalNote(`${selectedRecipient.name}, I think you did a very good job...`);
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
            setShowExternalModal(false);
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

            alert(t("giveStrokes.sentSuccess"));
        } catch (err) {
            console.error("Failed to send recognition:", err);
            alert(t("giveStrokes.sentFailed"));
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

                        {activeTab === 'give' ? (
                            <div className="rounded-lg bg-white p-6 shadow-sm">
                                <h1 className="text-2xl font-semibold text-gray-600 text-center mb-8">
                                    {t("giveStrokes.whomToRecognise")}
                                </h1>

                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Members Section */}
                                    <div>
                                        <h2 className="text-gray-600 text-lg font-semibold mb-4">{t("giveStrokes.membersLabel")}</h2>
                                        <div className="relative mb-4">
                                            <FaSearch className="absolute left-3 top-3 text-gray-400" />
                                            <input
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={t("giveStrokes.searchPlaceholder")}
                                                className="w-full pl-10 pr-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {loading ? (
                                                <p className="text-gray-500 text-center py-4">{t("giveStrokes.loading")}</p>
                                            ) : filteredMembers.length === 0 ? (
                                                <p className="text-gray-500 text-center py-4">{t("giveStrokes.noMembers")}</p>
                                            ) : (
                                                filteredMembers.map((member) => (
                                                    <button
                                                        key={member.id}
                                                        onClick={() => handleMemberSelect(member)}
                                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-gray-700 transition"
                                                    >
                                                        {member.firstName} {member.lastName}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* External People Section */}
                                    <div>
                                        <h2 className="text-gray-600 text-lg font-semibold mb-4">
                                            {t("giveStrokes.externalLabel")}
                                        </h2>
                                        <div className="space-y-4">
                                            <input
                                                value={externalName}
                                                onChange={(e) => setExternalName(e.target.value)}
                                                placeholder={t("giveStrokes.namePlaceholder")}
                                                className="w-full px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
                                            />
                                            <input
                                                value={externalEmail}
                                                onChange={(e) => setExternalEmail(e.target.value)}
                                                placeholder={t("giveStrokes.emailPlaceholder")}
                                                className="w-full px-4 py-2 border-b-2 border-gray-300 focus:outline-none focus:border-blue-500"
                                            />
                                            <button
                                                onClick={handleExternalRecipient}
                                                disabled={!externalName || !externalEmail}
                                                className="px-6 py-2 bg-lime-400 text-white rounded-full hover:bg-lime-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t("giveStrokes.giveStrokesBtn")}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <StrokeAccount 
                                recognitions={receivedRecognitions}
                                loading={loadingRecognitions}
                            />
                        )}
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

            {showExternalModal && selectedRecipient?.type === 'external' && (
                <ExternalRecipientModal
                    recipient={selectedRecipient}
                    personalNote={personalNote}
                    onPersonalNoteChange={setPersonalNote}
                    onSubmit={handleSubmit}
                    onClose={() => { setShowExternalModal(false); setSelectedRecipient(null); }}
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
    const { t } = useTranslation();
    const types = [
        { id: 'employeeship', label: t("giveStrokes.typeModal.employeeship"), icon: '👔' },
        { id: 'performance', label: t("giveStrokes.typeModal.performance"), icon: '📊' },
        { id: 'achievement', label: t("giveStrokes.typeModal.achievement"), icon: '🏆' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
                <h2 className="text-2xl font-semibold text-center mb-8">{t("giveStrokes.typeModal.title")}</h2>
                <div className="grid grid-cols-3 gap-6">
                    {types.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => onSelect(type.id)}
                            className="flex flex-col items-center p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-lg transition"
                        >
                            <div className="text-6xl mb-4">{type.icon}</div>
                            <span className="text-lg font-medium text-gray-700">{type.label}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-8 text-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        {t("giveStrokes.typeModal.back")}
                    </button>
                </div>
            </div>
        </div>
    );
}

function ExternalRecipientModal({ recipient, personalNote, onPersonalNoteChange, onSubmit, onClose }) {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-xl w-full">
                <h2 className="text-2xl font-semibold text-center mb-4">{t("giveStrokes.externalModal.title")}</h2>
                <p className="text-gray-600 text-center mb-6">{t("giveStrokes.externalModal.emailNote", { name: recipient?.name || '', email: recipient?.email })}</p>
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-gray-700 font-medium">
                            {t("giveStrokes.externalModal.personalNoteLabel")}
                        </label>
                        <button
                            type="button"
                            onClick={() => onPersonalNoteChange("")}
                            className="text-sm text-red-600 hover:underline"
                        >
                            {t("giveStrokes.externalModal.clear")}
                        </button>
                    </div>
                    <textarea
                        value={personalNote}
                        onChange={(e) => onPersonalNoteChange(e.target.value)}
                        placeholder={t("giveStrokes.notePlaceholder", { name: recipient?.name || '' })}
                        className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        rows={4}
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                        {t("giveStrokes.externalModal.back")}
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={!personalNote}
                        className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                        {t("giveStrokes.externalModal.send")}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Employeeship Modal Component
function EmployeeshipModal({ values, selectedValue, onSelectValue, selectedBehaviors, onToggleBehavior, personalNote, onPersonalNoteChange, recipientName, onSubmit, onBack }) {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8">
                <h2 className="text-2xl font-semibold text-gray-600 text-center mb-6">{t("giveStrokes.employeeshipModal.title")}</h2>

                {values.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">{t("giveStrokes.employeeshipModal.noValues")}</p>
                        <p className="text-gray-500 text-sm mb-6">{t("giveStrokes.employeeshipModal.noValuesHint")}</p>
                        <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                            {t("giveStrokes.employeeshipModal.back")}
                        </button>
                    </div>
                ) : !selectedValue ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        {values.map((value) => (
                            <button
                                key={value.id}
                                onClick={() => onSelectValue(value)}
                                className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition"
                            >
                                {value.imageUrl && (
                                    <img src={value.imageUrl} alt={value.heading} className="w-24 h-24 mb-2 object-cover" />
                                )}
                                <span className="text-sm text-gray-700 font-medium text-center">{value.heading}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div>
                        <div className="flex items-start gap-4 mb-6">
                            {selectedValue.imageUrl && (
                                <img src={selectedValue.imageUrl} alt={selectedValue.heading} className="w-32 h-32 object-cover rounded-lg" />
                            )}
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">{selectedValue.heading}</h3>
                                <p className="text-sm text-gray-600 mb-3 font-medium">{t("giveStrokes.employeeshipModal.selectBehaviors")}</p>
                                {selectedValue.behaviors && selectedValue.behaviors.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedValue.behaviors.map((behavior, idx) => (
                                            <label key={idx} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-100 transition border border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => onToggleBehavior(behavior.name)}
                                                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 font-bold text-lg transition mt-0.5 ${
                                                        selectedBehaviors.includes(behavior.name)
                                                            ? 'bg-lime-400 border-lime-400 text-white'
                                                            : 'border-gray-400 hover:border-lime-400 bg-white'
                                                    }`}
                                                >
                                                    {selectedBehaviors.includes(behavior.name) ? '+' : '○'}
                                                </button>
                                                <div className="flex-1 flex flex-col">
                                                    <span className="font-medium text-gray-900">{behavior.name}</span>
                                                    {behavior.tooltip && <span className="text-xs text-gray-500 mt-0.5">{behavior.tooltip}</span>}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <p className="text-sm text-yellow-800">{t("giveStrokes.employeeshipModal.noBehaviors")}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-gray-700 font-medium">
                                    {t("giveStrokes.employeeshipModal.selectAndNote")}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => onPersonalNoteChange("")}
                                    className="text-sm text-red-600 hover:underline"
                                >
                                    {t("giveStrokes.employeeshipModal.clear")}
                                </button>
                            </div>
                            <textarea
                                value={personalNote}
                                onChange={(e) => onPersonalNoteChange(e.target.value)}
                                placeholder={t("giveStrokes.notePlaceholder", { name: recipientName || '' })}
                                className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                rows={4}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                                {t("giveStrokes.employeeshipModal.back")}
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={selectedBehaviors.length === 0 || !personalNote}
                                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                                {t("giveStrokes.employeeshipModal.submit")}
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
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8">
                <h2 className="text-2xl font-semibold text-gray-600 text-center mb-6">{t("giveStrokes.performanceModal.title")}</h2>

                <div className="mb-6">
                    <p className="text-gray-600 mb-4">{t("giveStrokes.performanceModal.selectKeyArea")}</p>
                    {keyAreas.length === 0 ? (
                        <p className="text-center text-gray-500">{t("giveStrokes.performanceModal.noKeyAreas")}</p>
                    ) : (
                        <div className="space-y-2">
                            {keyAreas.map((area) => (
                                <button
                                    key={area.id}
                                    onClick={() => onSelectKeyArea(area)}
                                    className={`w-full text-left px-4 py-3 rounded border-2 transition ${
                                        selectedKeyArea?.id === area.id
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300'
                                    }`}
                                >
                                    {area.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedKeyArea && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-gray-700 font-medium">
                                {t("giveStrokes.performanceModal.personalNoteLabel")}
                            </label>
                            <button
                                type="button"
                                onClick={() => onPersonalNoteChange("")}
                                className="text-sm text-red-600 hover:underline"
                            >
                                {t("giveStrokes.performanceModal.clear")}
                            </button>
                        </div>
                        <textarea
                            value={personalNote}
                            onChange={(e) => onPersonalNoteChange(e.target.value)}
                            placeholder={t("giveStrokes.notePlaceholder", { name: recipientName || '' })}
                            className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            rows={4}
                        />
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                        {t("giveStrokes.performanceModal.back")}
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={!selectedKeyArea || !personalNote}
                        className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                        {t("giveStrokes.performanceModal.submit")}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Achievement Modal Component
function AchievementModal({ achievements, selectedGoal, selectedMilestone, onSelectGoal, onSelectMilestone, personalNote, onPersonalNoteChange, recipientName, onSubmit, onBack }) {
    const { t } = useTranslation();
    const hasAchievements = achievements.goals.length > 0 || achievements.milestones.length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full my-8">
                <h2 className="text-2xl font-semibold text-gray-600 text-center mb-6">{t("giveStrokes.achievementModal.title")}</h2>

                {!hasAchievements ? (
                    <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">{t("giveStrokes.achievementModal.noAchievements")}</p>
                        <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                            {t("giveStrokes.achievementModal.back")}
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-600 mb-4">{t("giveStrokes.achievementModal.selectAchievement")}</p>

                        {achievements.goals.length > 0 && (
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">{t("giveStrokes.achievementModal.goals")}</h3>
                                <div className="space-y-2">
                                    {achievements.goals.map((goal) => (
                                        <button
                                            key={goal.id}
                                            onClick={() => { onSelectGoal(goal); onSelectMilestone(null); }}
                                            className={`w-full text-left px-4 py-3 rounded border-2 transition ${
                                                selectedGoal?.id === goal.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-300'
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
                                <h3 className="font-semibold text-gray-700 mb-2">{t("giveStrokes.achievementModal.milestones")}</h3>
                                <div className="space-y-2">
                                    {achievements.milestones.map((milestone) => (
                                        <button
                                            key={milestone.id}
                                            onClick={() => { onSelectMilestone(milestone); onSelectGoal(null); }}
                                            className={`w-full text-left px-4 py-3 rounded border-2 transition ${
                                                selectedMilestone?.id === milestone.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-blue-300'
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
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-gray-700 font-medium">
                                        {t("giveStrokes.achievementModal.personalNoteLabel")}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => onPersonalNoteChange("")}
                                        className="text-sm text-red-600 hover:underline"
                                    >
                                        {t("giveStrokes.achievementModal.clear")}
                                    </button>
                                </div>
                                <textarea
                                    value={personalNote}
                                    onChange={(e) => onPersonalNoteChange(e.target.value)}
                                    placeholder={t("giveStrokes.notePlaceholder", { name: recipientName || '' })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                    rows={4}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button onClick={onBack} className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                                {t("giveStrokes.achievementModal.back")}
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={(!selectedGoal && !selectedMilestone) || !personalNote}
                                className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                                {t("giveStrokes.achievementModal.submit")}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
// Stroke Account Component
function StrokeAccount({ recognitions, loading }) {
    const { t } = useTranslation();

    if (loading) {
        return (
            <div className="rounded-lg bg-white p-8 shadow-sm text-center">
                <p className="text-gray-500">{t("giveStrokes.strokeAccount.loading")}</p>
            </div>
        );
    }

    if (recognitions.length === 0) {
        return (
            <div className="rounded-lg bg-white p-8 shadow-sm text-center">
                <p className="text-gray-600 text-lg mb-2">{t("giveStrokes.strokeAccount.none")}</p>
                <p className="text-gray-500 text-sm">{t("giveStrokes.strokeAccount.noneHint")}</p>
            </div>
        );
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getTypeLabel = (type) => {
        const labels = {
            'employeeship': t("giveStrokes.strokeAccount.employeeship"),
            'performance': t("giveStrokes.strokeAccount.performance"),
            'achievement': t("giveStrokes.strokeAccount.achievement"),
        };
        return labels[type] || type;
    };

    const getTypeColor = (type) => {
        const colors = {
            'employeeship': 'bg-purple-100 text-purple-700',
            'performance': 'bg-blue-100 text-blue-700',
            'achievement': 'bg-green-100 text-green-700'
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-gray-600 mb-6">{t("giveStrokes.strokeAccount.title")}</h2>
            <p className="text-gray-600 mb-6">{t("giveStrokes.strokeAccount.totalReceived")} <span className="font-bold text-cyan-500">{recognitions.length}</span></p>
            
            <div className="space-y-4">
                {recognitions.map((recognition) => (
                    <div key={recognition.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(recognition.type)}`}>
                                    {getTypeLabel(recognition.type)}
                                </span>
                                <span className="text-sm text-gray-500">{formatDate(recognition.createdAt)}</span>
                            </div>
                        </div>
                        
                        <div className="bg-cyan-50 border-l-4 border-cyan-400 p-4 rounded">
                            <p className="text-gray-800 italic">"{recognition.personalNote}"</p>
                        </div>
                        
                        {recognition.selectedBehaviors && recognition.selectedBehaviors.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-2">{t("giveStrokes.strokeAccount.behaviorsLabel")}</p>
                                <div className="flex flex-wrap gap-2">
                                    {recognition.selectedBehaviors.map((behavior, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-lime-100 text-lime-700 rounded text-xs">
                                            {behavior}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}