import React from "react";
import { FaBullseye } from "react-icons/fa";
import GoalCard from "../GoalCard.jsx";

const ListView = ({ filtered, onOpen, onEdit, onDelete }) => {
    return (
        <div className="grid lg:grid-cols-2 gap-6">
            {filtered.map((g) => (
                <GoalCard key={g.id} goal={g} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
            ))}
            {!filtered.length && (
                <div className="lg:col-span-2 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                    <FaBullseye className="mx-auto text-4xl text-slate-400 mb-3" />
                    <div className="text-lg font-semibold text-slate-900 mb-1">No goals found</div>
                    <div className="text-sm text-slate-600">Try adjusting your filters or search terms</div>
                </div>
            )}
        </div>
    );
};

export default ListView;
