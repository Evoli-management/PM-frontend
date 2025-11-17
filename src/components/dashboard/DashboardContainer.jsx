import React from "react";

export default function DashboardContainer({ title, children, className = "" }) {
	return (
		<div className={`min-h-screen bg-[#EDEDED] dark:bg-gray-900 ${className}`}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-6rem)]">
				{title && (
					<div className="mb-4">
						<h1 className="text-2xl font-semibold text-blue-700 dark:text-blue-300">{title}</h1>
					</div>
				)}

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch auto-rows-fr h-full">
					{children}
				</div>
			</div>
		</div>
	);
}
