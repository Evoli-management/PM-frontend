import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import Sidebar from "../components/shared/Sidebar.jsx";

const resultCategoryOrder = ["task", "activity", "goal", "key-area", "appointment", "event", "user", "page", "other"];

const getSearchColumnCount = (count) => {
  if (count > 10) return 3;
  if (count > 5) return 2;
  return 1;
};

const getSearchColumnsClass = () => "grid grid-cols-3";

const splitItemsAcrossColumns = (items, columns) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (columns <= 1) return [items];
  const out = [];
  const total = items.length;
  const base = Math.floor(total / columns);
  const remainder = total % columns;
  let cursor = 0;
  for (let i = 0; i < columns; i += 1) {
    const size = base + (i < remainder ? 1 : 0);
    out.push(items.slice(cursor, cursor + size));
    cursor += size;
  }
  return out.filter((col) => col.length > 0);
};

export default function SearchResults() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const searchCategoryLabels = {
    page: t("searchResults.categories.page"),
    task: t("searchResults.categories.task"),
    activity: t("searchResults.categories.activity"),
    goal: t("searchResults.categories.goal"),
    "key-area": t("searchResults.categories.keyArea"),
    appointment: t("searchResults.categories.appointment"),
    event: t("searchResults.categories.event"),
    user: t("searchResults.categories.user"),
    other: t("searchResults.categories.other"),
  };
  const params = new URLSearchParams(location.search || "");
  const query = params.get("q") || location.state?.q || "";

  const results = useMemo(() => {
    const fromState = Array.isArray(location.state?.results) ? location.state.results : null;
    if (fromState) return fromState;
    try {
      const raw = sessionStorage.getItem("pm:last-search-results");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.q === query && Array.isArray(parsed.results)) return parsed.results;
    } catch (_) {}
    return [];
  }, [location.state, query]);

  const groupedResults = useMemo(() => {
    return (results || []).reduce((acc, item) => {
      if (!item?.title || !item?.route) return acc;
      const key = item.type || "other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [results]);

  const visibleCategories = resultCategoryOrder.filter(
    (type) => Array.isArray(groupedResults[type]) && groupedResults[type].length > 0
  );

  return (
    <div className="h-[calc(100vh-72px)] bg-[#EDEDED] overflow-hidden">
      <div className="flex w-full h-full min-h-0 overflow-hidden">
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

        <main className="flex-1 min-w-0 w-full h-full min-h-0 transition-all overflow-hidden">
          <div className="max-w-full h-full min-h-0 overflow-hidden pb-1">
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
            <div className="px-1 md:px-2 h-full min-h-0 overflow-hidden">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full min-h-0 flex flex-col">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("searchResults.header")}</div>
                </div>

                {visibleCategories.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500">{t("searchResults.noResults")}</div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto py-1">
                    {visibleCategories.map((type) => (
                      <div key={type} className="px-4 py-1.5">
                        <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-50">
                          {searchCategoryLabels[type] || t("searchResults.categories.other")}
                        </div>
                        <div className={`mt-1 px-4 gap-x-8 gap-y-0 ${getSearchColumnsClass()}`}>
                          {splitItemsAcrossColumns(
                            groupedResults[type],
                            getSearchColumnCount(groupedResults[type].length)
                          ).map((col, colIdx) => (
                            <div key={`${type}-col-${colIdx}`} className="space-y-1">
                              {col.map((item, idx) => (
                                <Link
                                  key={`${type}-${item.route}-${colIdx}-${idx}`}
                                  to={item.route}
                                  className="block text-sm font-medium text-slate-600 leading-5 tracking-[0.01em] hover:text-blue-600"
                                >
                                  {item.title}
                                </Link>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
