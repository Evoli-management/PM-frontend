import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/shared/Sidebar';
import { FaBars } from 'react-icons/fa';
import taskService from '../services/taskService';
import { computeEisenhowerQuadrant, toDateOnly, getQuadrantColorClass } from '../utils/keyareasHelpers';

export default function MyFocus() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [keyAreasMap, setKeyAreasMap] = useState({});
    const [quadrantFilter, setQuadrantFilter] = useState('all');
    const [collapsed, setCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

    const counts = tasks.reduce((acc, t) => {
        const q = String(t.eisenhower_quadrant || '4');
        acc[q] = (acc[q] || 0) + 1;
        acc.all = (acc.all || 0) + 1;
        return acc;
    }, { all: 0 });

    const byQuadrant = tasks.reduce((acc, t) => {
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
                    collapsed={collapsed}
                    onCollapseToggle={() => setCollapsed((c) => !c)}
                    mobileOpen={mobileSidebarOpen}
                    onMobileClose={() => setMobileSidebarOpen(false)}
                />
                {mobileSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setMobileSidebarOpen(false)}
                    />
                )}
                <main className="flex-1 min-w-0 w-full min-h-screen transition-all overflow-y-auto">
                    <div className="max-w-full overflow-x-hidden pb-1 min-h-full">
                        <div className="flex items-center justify-between gap-4 mb-0 p-0 pb-0">
                            <div className="flex items-center gap-4">
                                <button
                                    className="px-2 py-2 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-900 border border-slate-300 shadow-sm hover:bg-slate-50 inline-flex items-center"
                                    aria-label="Back"
                                    style={{ minWidth: 36, minHeight: 36 }}
                                    onClick={() => navigate(-1)}
                                >
                                    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 320 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M34.52 239.03L228.87 44.69c9.37-9.37 24.57-9.37 33.94 0l22.67 22.67c9.36 9.36 9.37 24.52.04 33.9L131.49 256l154.02 154.75c9.34 9.38 9.32 24.54-.04 33.9l-22.67 22.67c-9.37 9.37-24.57 9.37-33.94 0L34.52 272.97c-9.37-9.37-9.37-24.57 0-33.94z"></path>
                                    </svg>
                                </button>

                                <button
                                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                                    onClick={() => setMobileSidebarOpen(true)}
                                    aria-label="Open sidebar"
                                >
                                    <FaBars />
                                </button>

                                <h2 className="text-xl font-semibold">My Focus</h2>
                            </div>
                        </div>
                        <div className="px-1 md:px-2 p-6">
                            {loading ? (
                                <div className="text-sm text-slate-500">Loading tasks…</div>
                            ) : (
                                <div className="relative">
                                    {/* Top headers */}
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <div className="text-center font-semibold text-sm md:text-base whitespace-nowrap">Urgent</div>
                                        <div className="text-center font-semibold text-sm md:text-base whitespace-nowrap">Not urgent</div>
                                    </div>

                                    <div className="grid grid-rows-2 grid-cols-[auto_1fr_1fr] gap-4 min-h-[72vh]">
                                        {/* Row 1, Col 1: Important label (rotated) */}
                                        <div className="flex items-center justify-center">
                                            <div className="transform -rotate-90 origin-center text-sm md:text-base font-semibold whitespace-nowrap">Important</div>
                                        </div>

                                        {/* Row 1, Col 2: Q1 (Urgent & Important) */}
                                        <div className={`p-4 rounded shadow-sm h-full ${getQuadrantColorClass(1).badge}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-semibold">Q1</div>
                                                <div className="text-xs text-slate-700">{(byQuadrant[1] || []).length}</div>
                                            </div>
                                            <div className="max-h-[56vh] overflow-auto">
                                                {(byQuadrant[1] || []).length === 0 ? (
                                                    null
                                                ) : (
                                                    <ul className="divide-y divide-transparent">
                                                        {(byQuadrant[1] || []).slice(0, 20).map((t) => (
                                                            <li key={t.id} className="py-2 relative">
                                                                <div className="text-sm truncate inline-flex items-center gap-2">
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
                                        <div className={`p-4 rounded shadow-sm h-full ${getQuadrantColorClass(2).badge}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-semibold">Q2</div>
                                                <div className="text-xs text-slate-700">{(byQuadrant[2] || []).length}</div>
                                            </div>
                                            <div className="max-h-[56vh] overflow-auto">
                                                {(byQuadrant[2] || []).length === 0 ? (
                                                    null
                                                ) : (
                                                    <ul className="divide-y divide-transparent">
                                                        {(byQuadrant[2] || []).slice(0, 20).map((t) => (
                                                            <li key={t.id} className="py-2 relative">
                                                                <div className="text-sm truncate inline-flex items-center gap-2">
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
                                        <div className={`p-4 rounded shadow-sm h-full ${getQuadrantColorClass(3).badge}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-semibold">Q3</div>
                                                <div className="text-xs text-slate-700">{(byQuadrant[3] || []).length}</div>
                                            </div>
                                            <div className="max-h-[56vh] overflow-auto">
                                                {(byQuadrant[3] || []).length === 0 ? (
                                                    null
                                                ) : (
                                                    <ul className="divide-y divide-transparent">
                                                        {(byQuadrant[3] || []).slice(0, 20).map((t) => (
                                                            <li key={t.id} className="py-2 relative">
                                                                <div className="text-sm truncate inline-flex items-center gap-2">
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
                                        <div className={`p-4 rounded shadow-sm h-full ${getQuadrantColorClass(4).badge}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-semibold">Q4</div>
                                                <div className="text-xs text-slate-700">{(byQuadrant[4] || []).length}</div>
                                            </div>
                                            <div className="max-h-[56vh] overflow-auto">
                                                {(byQuadrant[4] || []).length === 0 ? (
                                                    null
                                                ) : (
                                                    <ul className="divide-y divide-transparent">
                                                        {(byQuadrant[4] || []).slice(0, 20).map((t) => (
                                                            <li key={t.id} className="py-2 relative">
                                                                <div className="text-sm truncate inline-flex items-center gap-2">
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
