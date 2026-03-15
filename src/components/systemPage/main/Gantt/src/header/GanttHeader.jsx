import React from "react";
import ConfirmScheduleButton from "../components/Time/ConfirmScheduleButton";
import ORSMButton from "../components/Time/ORSMButton";

const GanttHeader = ({ reservedRooms, selectedClosedRooms, currentDate, filteredRows, setRows }) => {
    return (
        <div className="gantt-header">
            <div className="gantt-title">
                <div className="gantt-date">
                    <h2 className="gantt-title-text">{currentDate}手術排程甘特圖</h2>
                    <p className="gantt-subtitle">顯示所有手術室的排程安排</p>
                </div>
            </div>

            <div className="gantt-actions">
                <div className="gantt-room-count">
                    <svg
                        className="h-5 w-5 mr-1"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span className="gantt-room-count-text">
                        共 {filteredRows.length} 間手術室
                    </span>
                </div>

                <ConfirmScheduleButton rows={filteredRows} setRows={setRows} />
                <ORSMButton
                    reservedRooms={reservedRooms}
                    selectedClosedRooms={selectedClosedRooms}
                />
            </div>
        </div>
    );
};

export default GanttHeader;
