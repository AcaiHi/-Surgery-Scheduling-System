// shiftGanttWrapper.jsx
import { useEffect, useState } from "react";
import Gantt from "./Gantt/gantt";
import "./ganttMain.css";
import SettingsWrapper from "./ParameterSettings/settingsWrapper";
import FilterToggleTag from "./Filter/FilterToggleTag";
import FilterDrawer from "./Filter/FilterDrawer";

function ShiftGanttWrapper({ timeSettings, operatingRooms, closedRoomIds, ganttRefetchKey }) {
  const [activeView, setActiveView] = useState("gantt");
  const [ts, setTs] = useState(timeSettings);
  const [rooms, setRooms] = useState(operatingRooms || []);

  // 篩選器
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({}); // 集中存放篩選條件

  useEffect(() => {
    setTs(timeSettings);
  }, [timeSettings]);

  useEffect(() => {
    setRooms(operatingRooms || []);
  }, [operatingRooms]);

  return (
    <div className="shift-gantt-wrapper relative">
      <div className="tabs-bar" role="tablist" aria-label="頁面切換">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "gantt"}
          className={`tab ${activeView === "gantt" ? "active" : ""}`}
          onClick={() => setActiveView("gantt")}
        >
          手術排程甘特圖
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "settings"}
          className={`tab ${activeView === "settings" ? "active" : ""}`}
          onClick={() => setActiveView("settings")}
        >
          參數設定
        </button>
      </div>

      {/* ✅ FilterDrawer 永遠掛在畫面上，用 open 控制顯示 */}
      <FilterDrawer
        open={activeView === "gantt" && filterOpen}
        onClose={() => setFilterOpen(false)}
        onFiltersChange={setFilters} // 把條件回拋到父層
      />

      {/* ✅ 只有在「甘特圖頁」且篩選器關閉時，才顯示開啟按鈕 */}
      {activeView === "gantt" && !filterOpen && (
        <FilterToggleTag onClick={() => setFilterOpen(true)} />
      )}

      {activeView === "gantt" ? (
        <Gantt
          timeSettings={ts}
          operatingRooms={rooms}
          closedRoomIds={closedRoomIds}
          filters={filters} // 往下傳給 Gantt
          ganttRefetchKey={ganttRefetchKey}
        />
      ) : (
        <SettingsWrapper
          timeSettings={ts}
          operatingRooms={rooms}
          onRoomsChange={setRooms}
          onApply={(nextDto) => setTs(nextDto)}
        />
      )}
    </div>
  );
}

export default ShiftGanttWrapper;
