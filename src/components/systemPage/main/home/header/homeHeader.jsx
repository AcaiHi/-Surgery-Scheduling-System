import { useState, useMemo } from "react";
import "../header/homeHeader.css";
import GeneratePDFButton from "./generatePDFButton";

/**
 * props:
 * - title: string
 * - timeScaleRef: React.RefObject<HTMLElement>
 * - ganttChartRef: React.RefObject<HTMLElement>
 * - defaultSchedule?: "today" | "tomorrow"
 * - onScheduleChange?: (v: "today" | "tomorrow") => void
 * - dndEnabled?: boolean            // 啟用移動修改
 * - onToggleDnd?: () => void        // 切換移動修改
 */
function HomeHeader({
  title,
  timeScaleRef,
  ganttChartRef,
  defaultSchedule = "today",
  onScheduleChange,
  dndEnabled = false,
  onToggleDnd,
}) {
  const [schedule, setSchedule] = useState(defaultSchedule);

  const subtitle = useMemo(
    () =>
      schedule === "today"
        ? "顯示今日所有手術室的排程安排"
        : "顯示明日所有手術室的排程安排",
    [schedule]
  );

  const handleScheduleChange = (e) => {
    const v = e.target.value === "tomorrow" ? "tomorrow" : "today";
    setSchedule(v);
    onScheduleChange?.(v);
  };

  const dndLabel = dndEnabled ? "關閉移動修改" : "啟用移動修改";

  return (
    <div className="home-header flex items-center justify-between px-3 py-2 bg-white">
      <div className="home-header__title">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="home-header__actions flex items-center gap-2">
        <label className="sr-only" htmlFor="home-schedule-select">
          選擇班表
        </label>
        <select
          id="home-schedule-select"
          className="home-header__select border rounded px-2 py-1"
          value={schedule}
          onChange={handleScheduleChange}
          title="選擇班表"
        >
          <option value="today">今日班表</option>
          <option value="tomorrow">明日班表</option>
        </select>

        {/* 啟用移動修改按鈕（樣式參考 GeneratePDFButton） */}
        <button
          type="button"
          onClick={onToggleDnd}
          aria-pressed={dndEnabled}
          className={
            "gantt-buttons flex items-center font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-300 " +
            (dndEnabled
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-white text-blue-700 border border-blue-600 hover:bg-blue-50")
          }
          title="切換是否允許拖曳移動手術卡片"
        >
          {dndEnabled ? (
            <span className="mr-2 w-2 h-2 rounded-full bg-green-400" />
          ) : (
            <span className="mr-2 w-2 h-2 rounded-full bg-gray-300" />
          )}
          {dndLabel}
        </button>

        {/* PDF 生成按鈕固定在 Header 右側 */}
        <GeneratePDFButton
          timeScaleRef={timeScaleRef}
          ganttChartRef={ganttChartRef}
        />
      </div>
    </div>
  );
}

export default HomeHeader;
