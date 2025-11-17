import React from "react";

export default function DashboardTile({ title, children, footer = null, className = "", square = true }) {
	const aspectClass = square ? "aspect-square" : "min-h-[12rem]";
	const style = square ? { aspectRatio: "1 / 1" } : undefined;

	return (
		<div style={style} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col ${aspectClass} ${className}`}>
			{title && (
				<div className="mb-3">
					<h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{title}</h2>
				</div>
			)}

			<div className={`flex-1 overflow-auto`}>{children}</div>

			{footer && <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">{footer}</div>}
		</div>
	);
}
