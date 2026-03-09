import React from "react";
import { useTranslation } from "react-i18next";

const TodoPanel = ({ todos = [], onTaskDrop }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white shadow rounded p-4 my-4">
            <h3 className="font-bold mb-2">{t("todoPanel.title")}</h3>
            <ul>
                {todos.length === 0 && <li className="text-gray-400">{t("todoPanel.noTasks")}</li>}
                {todos.map((todo, idx) => (
                    <li key={idx} className="flex items-center gap-2 mb-2">
                        <span className="flex-1">{todo.title}</span>
                        <button
                            className="bg-blue-500 text-white px-2 py-1 rounded"
                            onClick={() => onTaskDrop(todo, new Date())}
                        >
                            {t("todoPanel.timebox")}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TodoPanel;
