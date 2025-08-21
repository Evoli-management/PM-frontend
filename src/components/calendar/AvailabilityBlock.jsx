import React from "react";

const AvailabilityBlock = ({ type = "available", start, end }) => {
	const color = type === "available" ? "bg-green-400" : "bg-red-400";
	return (
		<div className={`rounded px-2 py-1 text-xs text-white font-bold ${color} mb-1`}>
			{type === "available" ? "Available" : "Protected"} {start} - {end}
		</div>
	);
};

export default AvailabilityBlock;
