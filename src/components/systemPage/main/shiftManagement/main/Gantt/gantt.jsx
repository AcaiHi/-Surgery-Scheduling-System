// gantt.jsx
import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from "react";
import TimeScale from "./timeScale";
import GanttTable from "./ganttTable";

const ceilTo15 = (mins) => Math.ceil(mins / 15) * 15;

function Gantt({ timeSettings, operatingRooms, filters = {}, ganttRefetchKey /* , closedRoomIds */ }) {
  const safeRooms = useMemo(() => operatingRooms || [], [operatingRooms]);

  const timeScaleRef = useRef(null);
  const ganttScrollRef = useRef(null);

  const startMin = Number(timeSettings?.surgeryStartTime || 510);
  const defaultEndAbs = 1440 + 480;

  const [contentMaxAbsEnd, setContentMaxAbsEnd] = useState(startMin);

  const endAbs = useMemo(
    () => ceilTo15(Math.max(defaultEndAbs, contentMaxAbsEnd)),
    [defaultEndAbs, contentMaxAbsEnd]
  );

  const PX_PER_TICK = 25;
  const tickCount = Math.floor((endAbs - startMin) / 15) + 1;
  const timelineWidth = tickCount * PX_PER_TICK;

  const [sliderVal, setSliderVal] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  const recalcMaxScroll = useCallback(() => {
    const a = timeScaleRef.current;
    const b = ganttScrollRef.current;
    if (!a || !b) return;
    const aMax = Math.max(0, a.scrollWidth - a.clientWidth);
    const bMax = Math.max(0, b.scrollWidth - b.clientWidth);
    const nextMax = Math.min(aMax, bMax);

    setMaxScroll(nextMax);

    const clamped = Math.min(sliderVal, nextMax);
    setSliderVal(clamped);
    if (a.scrollLeft !== clamped) a.scrollLeft = clamped;
    if (b.scrollLeft !== clamped) b.scrollLeft = clamped;
  }, [sliderVal]);

  useLayoutEffect(() => {
    recalcMaxScroll();
  }, [recalcMaxScroll, endAbs, safeRooms, timelineWidth]);

  useEffect(() => {
    const onRz = () => recalcMaxScroll();
    window.addEventListener("resize", onRz);
    return () => window.removeEventListener("resize", onRz);
  }, [recalcMaxScroll]);

  const syncScroll = (val) => {
    const a = timeScaleRef.current;
    const b = ganttScrollRef.current;
    if (a && a.scrollLeft !== val) a.scrollLeft = val;
    if (b && b.scrollLeft !== val) b.scrollLeft = val;
  };

  const handleSliderChange = (e) => {
    const val = Math.min(Number(e.target.value), maxScroll);
    setSliderVal(val);
    syncScroll(val);
  };

  const handleTimeScaleScroll = () => {
    const a = timeScaleRef.current;
    if (!a) return;
    const val = Math.min(a.scrollLeft, maxScroll);
    if (val !== sliderVal) setSliderVal(val);
    syncScroll(val);
  };

  const handleGanttScroll = () => {
    const b = ganttScrollRef.current;
    if (!b) return;
    const val = Math.min(b.scrollLeft, maxScroll);
    if (val !== sliderVal) setSliderVal(val);
    syncScroll(val);
  };

  return (
    <div className="gantt-wrapper" style={{ "--timeline-width": `${timelineWidth}px` }}>
      <TimeScale
        timeSettings={timeSettings}
        scrollRef={timeScaleRef}
        onHostScroll={handleTimeScaleScroll}
        endAbs={endAbs}
      />

      <div className="gantt-slider-bar">
        <input
          type="range"
          className="gantt-slider"
          min={0}
          max={Math.max(0, maxScroll)}
          step={1}
          value={sliderVal}
          onChange={handleSliderChange}
          style={{ "--percent": maxScroll ? `${(sliderVal / maxScroll) * 100}%` : "0%" }}
        />
      </div>

      <GanttTable
        timeSettings={timeSettings}
        operatingRooms={safeRooms}
        scrollRef={ganttScrollRef}
        onHostScroll={handleGanttScroll}
        onContentMaxAbsEnd={(absEnd) => setContentMaxAbsEnd(absEnd || startMin)}
        filters={filters}
        ganttRefetchKey={ganttRefetchKey}
      />
    </div>
  );
}

export default Gantt;
