import React, { useEffect, useState } from 'react';
import Sidebar from '../components/shared/Sidebar';
import { FaAlignJustify } from 'react-icons/fa';
import taskService from '../services/taskService';
import { computeEisenhowerQuadrant, toDateOnly, getQuadrantColorClass } from '../utils/keyareasHelpers';

export default function MyFocus() {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [keyAreasMap, setKeyAreasMap] = useState({});
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [showActivities, setShowActivities] = useState(true);
    const [showDontForget, setShowDontForget] = useState(true);
    const [showNoDateItems, setShowNoDateItems] = useState(true);
    const [selectedKeyArea, setSelectedKeyArea] = useState('');
    const [selectedList, setSelectedList] = useState('');

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // load tasks and key areas in parallel so we can show KA color
                const [list, kaModule] = await Promise.all([
                    taskService.list({}),
                    import('../services/keyAreaService')
                ]);
                const keyAreaSvc = kaModule && (kaModule.default || kaModule);
                let kaList = [];
                try { kaList = keyAreaSvc && typeof keyAreaSvc.list === 'function' ? await keyAreaSvc.list({ includeTaskCount: false }) : []; } catch (e) { kaList = []; }
                const kaMap = (kaList || []).reduce((acc, k) => { acc[String(k.id)] = k; return acc; }, {});
                if (mounted) setKeyAreasMap(kaMap);
                if (!mounted) return;
                // compute/evaluate quadrant for each task for client-side filtering
                const enriched = (list || []).map((t) => {
                        const q = computeEisenhowerQuadrant({
                            deadline: t.deadline || t.dueDate || null,
                            end_date: t.end_date || t.endDate || null,
                            start_date: t.start_date || t.startDate || null,
                            priority: t.priority,
                            status: t.status,
                            key_area_id: t.key_area_id || t.keyAreaId || t.key_area || t.keyArea || null,
                        });
                    // normalize key area id so rendering logic can rely on `key_area_id`
                    const normalizedKA = t.key_area_id || t.keyAreaId || t.key_area || t.keyArea || null;
                    return { ...t, key_area_id: normalizedKA, eisenhower_quadrant: q };
                });
                setTasks(enriched);
            } catch (e) {
                console.warn('MyFocus: failed to load tasks', e);
                setTasks([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Prevent page/html scrolling on My Focus; keep scroll inside quadrant panels.
    useEffect(() => {
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevBodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overflow = prevBodyOverflow;
        };
    }, []);

    const getListValue = (t) => String(t.tab ?? t.list ?? t.list_id ?? t.task_list_id ?? '');
    const isActivityItem = (t) => {
        const itemType = String(t?.type || t?.item_type || t?.recordType || '').toLowerCase();
        if (itemType === 'activity') return true;
        if (t?.activity_id !== undefined && t?.activity_id !== null) return true;
        if (t?.activityId !== undefined && t?.activityId !== null) return true;
        return false;
    };
    const isDontForgetItem = (t) => {
        if (isActivityItem(t)) return false;
        return !Boolean(t?.key_area_id || t?.keyAreaId || t?.key_area || t?.keyArea);
    };
    const hasDate = (t) => Boolean(
        toDateOnly(t.deadline || t.dueDate || null) ||
        toDateOnly(t.end_date || t.endDate || null) ||
        toDateOnly(t.start_date || t.startDate || null)
    );

    const keyAreaOptions = Object.values(keyAreasMap || {}).sort((a, b) =>
        String(a?.title || a?.name || '').localeCompare(String(b?.title || b?.name || ''))
    );

    const listOptions = Array.from(
        new Set((tasks || []).map((t) => getListValue(t)).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

    const filteredTasks = (tasks || []).filter((t) => {
        if (!showActivities && isActivityItem(t)) return false;
        if (!showDontForget && isDontForgetItem(t)) return false;
        if (!showNoDateItems && !hasDate(t)) return false;
        if (selectedKeyArea && String(t.key_area_id || '') !== String(selectedKeyArea)) return false;
        if (selectedList && getListValue(t) !== String(selectedList)) return false;
        return true;
    });

    const counts = filteredTasks.reduce((acc, t) => {
        const q = String(t.eisenhower_quadrant || '4');
        acc[q] = (acc[q] || 0) + 1;
        acc.all = (acc.all || 0) + 1;
        return acc;
    }, { all: 0 });

    const byQuadrant = filteredTasks.reduce((acc, t) => {
        const q = Number(t.eisenhower_quadrant || 4);
        acc[q] = acc[q] || [];
        acc[q].push(t);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-[#EDEDED]">
            <div className="flex w-full min-h-screen">
                <Sidebar
                    user={{ name: 'User' }}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
                <main className="flex-1 min-w-0 w-full h-[calc(100vh-72px)] min-h-0 transition-all overflow-hidden">
                    <div className="max-w-full overflow-x-hidden pb-1 h-full min-h-0 flex flex-col">
                        <div className="px-1 md:px-2 p-3 md:p-4 flex-1 min-h-0 overflow-hidden">
                            {loading ? (
                                <div className="text-sm text-slate-500">Loading tasks…</div>
                            ) : (
                                <div className="relative h-full min-h-0 flex flex-col">
                                    <div className="shrink-0 mb-2 border-b border-slate-300 pb-2">
                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                            <span className="text-slate-700 mr-1">Filter:</span>
                                            <button
                                                type="button"
                                                title="Filter activities"
                                                className={`p-2 rounded border transition ${showActivities ? 'text-blue-700 border-blue-300 bg-blue-50' : 'text-slate-500 border-slate-300 bg-white'}`}
                                                onClick={() => setShowActivities((v) => !v)}
                                            >
                                                <FaAlignJustify />
                                            </button>
                                            <button
                                                type="button"
                                                title="Filter don't forget"
                                                className={`p-2 rounded border transition ${showDontForget ? 'text-blue-700 border-blue-300 bg-blue-50' : 'text-slate-500 border-slate-300 bg-white'}`}
                                                onClick={() => setShowDontForget((v) => !v)}
                                            >
                                                <img
                                                    src={`${import.meta.env.BASE_URL}dont-forget.png`}
                                                    alt="Don't forget"
                                                    className="w-5 h-5 object-contain"
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                title="Show/hide no date items"
                                                className={`p-2 rounded border transition ${showNoDateItems ? 'text-blue-700 border-blue-300 bg-blue-50' : 'text-slate-500 border-slate-300 bg-white'}`}
                                                onClick={() => setShowNoDateItems((v) => !v)}
                                            >
                                                <span className="relative inline-flex">
                                                    <svg
                                                        viewBox="0 0 448 512"
                                                        className="w-4 h-4"
                                                        fill="currentColor"
                                                        aria-hidden="true"
                                                    >
                                                        <path d="M0 464c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V192H0v272zm320-196c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zM192 268c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12h-40c-6.6 0-12-5.4-12-12v-40zM64 268c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H76c-6.6 0-12-5.4-12-12v-40zm0 128c0-6.6 5.4-12 12-12h40c6.6 0 12 5.4 12 12v40c0 6.6-5.4 12-12 12H76c-6.6 0-12-5.4-12-12v-40zM400 64h-48V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v48H160V16c0-8.8-7.2-16-16-16h-32c-8.8 0-16 7.2-16 16v48H48C21.5 64 0 85.5 0 112v48h448v-48c0-26.5-21.5-48-48-48z" />
                                                    </svg>
                                                    {!showNoDateItems && (
                                                        <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] leading-none flex items-center justify-center font-bold">
                                                            x
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                            <select
                                                className="h-8 px-2 rounded border border-slate-300 bg-white text-sm min-w-[140px]"
                                                value={selectedKeyArea}
                                                onChange={(e) => setSelectedKeyArea(e.target.value)}
                                                title="Key Area"
                                            >
                                                <option value="">Key Area</option>
                                                {keyAreaOptions.map((ka) => (
                                                    <option key={ka.id} value={ka.id}>{ka.title || ka.name}</option>
                                                ))}
                                            </select>
                                            <select
                                                className="h-8 px-2 rounded border border-slate-300 bg-white text-sm min-w-[90px]"
                                                value={selectedList}
                                                onChange={(e) => setSelectedList(e.target.value)}
                                                title="List"
                                            >
                                                <option value="">List</option>
                                                {listOptions.map((listValue) => (
                                                    <option key={listValue} value={listValue}>{listValue}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {/* Top headers */}
                                    <div className="grid grid-cols-2 gap-3 mb-2 shrink-0">
                                        <div className="text-center font-semibold text-sm md:text-base whitespace-nowrap">Urgent</div>
                                        <div className="text-center font-semibold text-sm md:text-base whitespace-nowrap">Not urgent</div>
                                    </div>

                                    <div className="grid flex-1 min-h-0 grid-rows-2 grid-cols-[auto_1fr_1fr] gap-3 [grid-template-rows:minmax(0,1fr)_minmax(0,1fr)]">
                                        {/* Row 1, Col 1: Important label (rotated) */}
                                        <div className="flex items-center justify-center">
                                            <div className="transform -rotate-90 origin-center text-sm md:text-base font-semibold whitespace-nowrap">Important</div>
                                        </div>

                                        {/* Row 1, Col 2: Q1 (Urgent & Important) */}
                                        <div className={`p-3 rounded shadow-sm h-full min-h-0 flex flex-col ${getQuadrantColorClass(1).badge}`}>
                                            <div className="flex items-center justify-between mb-2 shrink-0">
                                                <div className="font-semibold">Q1</div>
                                                <div className="text-xs text-slate-700">{(byQuadrant[1] || []).length}</div>
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden hover-scrollbar">
                                                {(byQuadrant[1] || []).length === 0 ? (
                                                    null
                                                ) : (
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
                                                        {(byQuadrant[1] || []).slice(0, 20).map((t) => (
                                                            <li key={t.id} className="py-2 relative border-b border-black/60 min-w-0">
                                                                <div className="text-sm flex items-center gap-2 min-w-0">
                                                                    {t.key_area_id ? (
                                                                        // show key-area SVG with the key area color when available
                                                                        (() => {
                                                                            const ka = keyAreasMap[String(t.key_area_id)];
                                                                            const color = (ka && ka.color) || '#4DC3D8';
                                                                            return (
                                                                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="text-[20px]" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color }}>
                                                                                    <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                                                                                </svg>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <img
                                                                            src={`${import.meta.env.BASE_URL}dont-forget.png`}
                                                                            alt="Don't forget"
                                                                            className="w-4 h-4 object-contain opacity-80"
                                                                        />
                                                                    )}
                                                                    <span className="truncate">{t.title || t.name}</span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 1, Col 3: Q2 (Not urgent, Important) */}
                                        <div className={`p-3 rounded shadow-sm h-full min-h-0 flex flex-col ${getQuadrantColorClass(2).badge}`}>
                                            <div className="flex items-center justify-between mb-2 shrink-0">
                                                <div className="font-semibold">Q2</div>
                                                <div className="text-xs text-slate-700">{(byQuadrant[2] || []).length}</div>
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden hover-scrollbar">
                                                {(byQuadrant[2] || []).length === 0 ? (
                                                    null
                                                ) : (
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
                                                        {(byQuadrant[2] || []).slice(0, 20).map((t) => (
                                                            <li key={t.id} className="py-2 relative border-b border-black/60 min-w-0">
                                                                <div className="text-sm flex items-center gap-2 min-w-0">
                                                                    {t.key_area_id ? (
                                                                        (() => {
                                                                            const ka = keyAreasMap[String(t.key_area_id)];
                                                                            const color = (ka && ka.color) || '#4DC3D8';
                                                                            return (
                                                                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="text-[20px]" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color }}>
                                                                                    <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                                                                                </svg>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <img
                                                                            src={`${import.meta.env.BASE_URL}dont-forget.png`}
                                                                            alt="Don't forget"
                                                                            className="w-4 h-4 object-contain opacity-80"
                                                                        />
                                                                    )}
                                                                    <span className="truncate">{t.title || t.name}</span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2, Col 1: Not important label (rotated) */}
                                        <div className="flex items-center justify-center">
                                            <div className="transform -rotate-90 origin-center text-sm md:text-base font-semibold whitespace-nowrap">Not important</div>
                                        </div>

                                        {/* Row 2, Col 2: Q3 (Urgent, Not important) */}
                                        <div className={`p-3 rounded shadow-sm h-full min-h-0 flex flex-col ${getQuadrantColorClass(3).badge}`}>
                                            <div className="flex items-center justify-between mb-2 shrink-0">
                                                <div className="font-semibold">Q3</div>
                                                <div className="text-xs text-slate-700">{(byQuadrant[3] || []).length}</div>
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden hover-scrollbar">
                                                {(byQuadrant[3] || []).length === 0 ? (
                                                    null
                                                ) : (
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
                                                        {(byQuadrant[3] || []).slice(0, 20).map((t) => (
                                                            <li key={t.id} className="py-2 relative border-b border-black/60 min-w-0">
                                                                <div className="text-sm flex items-center gap-2 min-w-0">
                                                                    {t.key_area_id ? (
                                                                        (() => {
                                                                            const ka = keyAreasMap[String(t.key_area_id)];
                                                                            const color = (ka && ka.color) || '#4DC3D8';
                                                                            return (
                                                                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="text-[20px]" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color }}>
                                                                                    <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                                                                                </svg>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <img
                                                                            src={`${import.meta.env.BASE_URL}dont-forget.png`}
                                                                            alt="Don't forget"
                                                                            className="w-4 h-4 object-contain opacity-80"
                                                                        />
                                                                    )}
                                                                    <span className="truncate">{t.title || t.name}</span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2, Col 3: Q4 (Not urgent, Not important) */}
                                        <div className={`p-3 rounded shadow-sm h-full min-h-0 flex flex-col ${getQuadrantColorClass(4).badge}`}>
                                            <div className="flex items-center justify-between mb-2 shrink-0">
                                                <div className="font-semibold">Q4</div>
                                                <div className="text-xs text-slate-700">{(byQuadrant[4] || []).length}</div>
                                            </div>
                                            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden hover-scrollbar">
                                                {(byQuadrant[4] || []).length === 0 ? (
                                                    null
                                                ) : (
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
                                                        {(byQuadrant[4] || []).slice(0, 20).map((t) => (
                                                            <li key={t.id} className="py-2 relative border-b border-black/60 min-w-0">
                                                                <div className="text-sm flex items-center gap-2 min-w-0">
                                                                    {t.key_area_id ? (
                                                                        (() => {
                                                                            const ka = keyAreasMap[String(t.key_area_id)];
                                                                            const color = (ka && ka.color) || '#4DC3D8';
                                                                            return (
                                                                                <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 448 512" className="text-[20px]" aria-hidden="true" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg" style={{ color }}>
                                                                                    <path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"></path>
                                                                                </svg>
                                                                            );
                                                                        })()
                                                                    ) : (
                                                                        <img
                                                                            src={`${import.meta.env.BASE_URL}dont-forget.png`}
                                                                            alt="Don't forget"
                                                                            className="w-4 h-4 object-contain opacity-80"
                                                                        />
                                                                    )}
                                                                    <span className="truncate">{t.title || t.name}</span>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
