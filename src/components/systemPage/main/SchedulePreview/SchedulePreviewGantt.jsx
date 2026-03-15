// src/components/systemPage/main/SchedulePreview/SchedulePreviewGantt.jsx

import { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import "./SchedulePreviewGantt.css";

/* =========================
 * Drag preview portal
 * ========================= */
let dragPortalEl = null;
function getDragPortal() {
  if (typeof document === "undefined") return null;
  if (dragPortalEl) return dragPortalEl;

  const existing = document.getElementById("drag-portal");
  if (existing) {
    dragPortalEl = existing;
    return dragPortalEl;
  }

  const div = document.createElement("div");
  div.id = "drag-portal";
  div.style.position = "fixed";
  div.style.inset = "0";
  div.style.zIndex = "9999";
  div.style.pointerEvents = "none";
  document.body.appendChild(div);

  dragPortalEl = div;
  return dragPortalEl;
}

function DragPreview({ preview }) {
  if (!preview) return null;
  const portal = getDragPortal();
  if (!portal) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        left: preview.x,
        top: preview.y,
        transform: "translate(12px, 12px)",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          display: "flex",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
          border: "1px solid rgba(0,0,0,0.12)",
          background: "#fff",
        }}
      >
        <div
          style={{
            width: Math.max(12, preview.surgeryW),
            height: preview.h,
            background: preview.bg,
            color: preview.fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 12px",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {preview.title}
        </div>
        {preview.cleanW > 0 && (
          <div
            style={{
              width: Math.max(8, preview.cleanW),
              height: preview.h,
              background: "#1068ff",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 10px",
              fontWeight: 800,
              whiteSpace: "nowrap",
              opacity: 0.95,
            }}
          >
            清潔
          </div>
        )}
      </div>
    </div>,
    portal
  );
}

/* =========================
 * Time helpers
 * ========================= */
const hhmmToMin = (hhmm) => {
  if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if ([h, m].some(Number.isNaN)) return null;
  if (h === 24 && m === 0) return 0;
  if (h < 0 || h > 23) return null;
  if (m < 0 || m > 59) return null;
  return h * 60 + m;
};

const minToHHmm = (absMin) => {
  if (absMin == null || Number.isNaN(absMin)) return "--:--";
  const dayRel = ((absMin % 1440) + 1440) % 1440;
  const h = Math.floor(dayRel / 60);
  const m = dayRel % 60;
  if (dayRel === 0 && absMin > 0) return "24:00";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// 以「手術開始」為日基準(跨日 +1440)
const toAbsMin = (hhmm, dayStartMin) => {
  const m = hhmmToMin(hhmm);
  if (m == null) return null;
  return m < dayStartMin ? m + 1440 : m;
};

const getDurationMin = (s) => {
  const sMin = hhmmToMin(s?.startTime);
  const eMin = hhmmToMin(s?.endTime);
  if (sMin == null || eMin == null) return 0;
  return eMin >= sMin ? eMin - sMin : 1440 - sMin + eMin;
};

function clampStep(absMin, stepMin) {
  const step = Math.max(1, Number(stepMin) || 15);
  return Math.round(absMin / step) * step;
}

function getEndAbs(s, dayStartMin) {
  const sAbs = toAbsMin(s?.startTime, dayStartMin);
  const eAbsRaw = toAbsMin(s?.endTime, dayStartMin);
  if (sAbs == null || eAbsRaw == null) return { sAbs: null, eAbs: null };
  const eAbs = eAbsRaw < sAbs ? eAbsRaw + 1440 : eAbsRaw;
  return { sAbs, eAbs };
}

/**
 * 插入並重算(插入模式固定啟用)：
 * - surgeries: 目標手術室當天的手術(已按 start 排序，且已移除被拖動的手術)
 * - insertIndex: 插入位置(介於兩台之間)
 * - moved: 被插入的手術(保留 duration)
 * - desiredStartAbs: 使用者 drop 的時間點(已做 step 對齊)
 */
function insertAndRecalc({ surgeries, insertIndex, moved, dayStartMin, cleaningMin, desiredStartAbs }) {
  const list = surgeries.map((s) => ({ ...s }));
  const movedCopy = { ...moved };

  const dur = Math.max(0, getDurationMin(movedCopy));

  // 插入前 cursor = 前一台 end + cleaning(或 dayStart)
  let cursorAbs = dayStartMin;
  if (insertIndex > 0 && list[insertIndex - 1]) {
    const prev = list[insertIndex - 1];
    const { sAbs: prevS, eAbs: prevE } = getEndAbs(prev, dayStartMin);
    if (prevS != null && prevE != null) cursorAbs = prevE + cleaningMin;
  }

  const movedStartAbs = Math.max(cursorAbs, desiredStartAbs, dayStartMin);
  const movedEndAbs = movedStartAbs + dur;

  movedCopy.startTime = minToHHmm(movedStartAbs);
  movedCopy.endTime = minToHHmm(movedEndAbs);

  list.splice(insertIndex, 0, movedCopy);

  // 從插入點後開始重算(把後面往後推)，且後台只能在「清潔結束」後接上
  let rollingCursor = movedEndAbs + cleaningMin;

  for (let i = insertIndex + 1; i < list.length; i++) {
    const s = list[i];
    const d = Math.max(0, getDurationMin(s));

    const { sAbs: origS } = getEndAbs(s, dayStartMin);
    const nextStartAbs = Math.max(rollingCursor, origS ?? rollingCursor);
    const nextEndAbs = nextStartAbs + d;

    s.startTime = minToHHmm(nextStartAbs);
    s.endTime = minToHHmm(nextEndAbs);

    rollingCursor = nextEndAbs + cleaningMin;
  }

  return list;
}

export default function SchedulePreviewGantt({
  scheduleData,
  selectedDate,
  filterRoom,
  dateRange,
  timeScaleRef,
  ganttScrollRef,
  onSurgeryUpdate,
  allRooms,
  csvDefaults,
  onSettingsChange,
  initialSettings,
}) {
  const scrollContainerRef = useRef(null);
  const syncingRef = useRef(false);
  const appliedCsvDefaultsKeyRef = useRef("");
  const prevStartMinRef = useRef(null);

  // ✅ 使用者輸入的參數(含清潔時間 + 時間格)
const DEFAULT_CLEANING_MIN = 45; // ⬅️ 你系統的保底值

const settings = useMemo(() => {
  return {
    surgeryStart: csvDefaults?.surgeryStart ?? "08:30",
    normalEnd: csvDefaults?.normalEnd ?? "17:30",
    overtimeEnd: csvDefaults?.overtimeEnd ?? "20:00",
    cleaningMin: Number(
      csvDefaults?.cleaningMin ?? DEFAULT_CLEANING_MIN
    ),
    timeStepMin: 15,
    _loading: !csvDefaults,
  };
}, [csvDefaults]);


  useEffect(() => {
    if (onSettingsChange) onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  // ✅ 時間軸密度：每 1 個 tick(=timeStepMin) 幾 px
  const [pxPerTick, setPxPerTick] = useState(32);
  const uiScale = Math.min(1.4, Math.max(0.85, pxPerTick / 32));

  // ✅ 橫向卷軸(slider)
  const [sliderVal, setSliderVal] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  // ✅ 插入模式：固定啟用(不再勾選)
  const insertMode = true;

  // ✅ 拖放狀態
  const [dragged, setDragged] = useState(null);
  const [dropHint, setDropHint] = useState(null); // { room, absStart, insertIndex }
  const [dragPreview, setDragPreview] = useState(null);
  const dragMoveListenerRef = useRef(null);
  const dragEndListenerRef = useRef(null);

  /* =========================
   * Scroll sync (雙向)
   * ========================= */
  useEffect(() => {
    const bodyEl = scrollContainerRef.current;
    const headEl = timeScaleRef?.current;
    if (!bodyEl || !headEl) return;

    const sync = (src, dst) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      dst.scrollLeft = src.scrollLeft;
      setSliderVal(Math.min(src.scrollLeft, maxScroll));
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    };

    const onBodyScroll = () => sync(bodyEl, headEl);
    const onHeadScroll = () => sync(headEl, bodyEl);

    bodyEl.addEventListener("scroll", onBodyScroll, { passive: true });
    headEl.addEventListener("scroll", onHeadScroll, { passive: true });

    return () => {
      bodyEl.removeEventListener("scroll", onBodyScroll);
      headEl.removeEventListener("scroll", onHeadScroll);
    };
  }, [timeScaleRef, maxScroll]);

  useEffect(() => {
    if (ganttScrollRef) ganttScrollRef.current = scrollContainerRef.current;
  }, [ganttScrollRef]);

  const syncScroll = useCallback(
    (val) => {
      const bodyEl = scrollContainerRef.current;
      const headEl = timeScaleRef?.current;
      if (!bodyEl || !headEl) return;
      if (bodyEl.scrollLeft !== val) bodyEl.scrollLeft = val;
      if (headEl.scrollLeft !== val) headEl.scrollLeft = val;
    },
    [timeScaleRef]
  );

  const recalcMaxScroll = useCallback(() => {
    const bodyEl = scrollContainerRef.current;
    const headEl = timeScaleRef?.current;
    if (!bodyEl || !headEl) return;

    const bodyMax = Math.max(0, bodyEl.scrollWidth - bodyEl.clientWidth);
    const headMax = Math.max(0, headEl.scrollWidth - headEl.clientWidth);
    const nextMax = Math.min(bodyMax, headMax);

    setMaxScroll(nextMax);
    setSliderVal((prev) => {
      const clamped = Math.min(prev, nextMax);
      syncScroll(clamped);
      return clamped;
    });
  }, [timeScaleRef, syncScroll]);

  useLayoutEffect(() => {
    recalcMaxScroll();
  }, [recalcMaxScroll]);

  useEffect(() => {
    const onResize = () => recalcMaxScroll();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [recalcMaxScroll]);

  const handleSliderChange = (e) => {
    const val = Math.min(Number(e.target.value), maxScroll);
    setSliderVal(val);
    syncScroll(val);
  };

  /* =========================
   * Derived settings
   * ========================= */
  const PX_PER_TICK = pxPerTick;

  const startMin = useMemo(() => hhmmToMin(settings.surgeryStart) ?? 510, [settings.surgeryStart]);
  const normalEndMin = useMemo(() => hhmmToMin(settings.normalEnd) ?? 1050, [settings.normalEnd]);
  const overtimeEndMin = useMemo(() => hhmmToMin(settings.overtimeEnd) ?? 1200, [settings.overtimeEnd]);

  const cleaningMin = useMemo(() => {
    const v = Number(settings.cleaningMin);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [settings.cleaningMin]);

  const timeStepMin = useMemo(() => {
    const v = Number(settings.timeStepMin);
    return Number.isFinite(v) && v >= 1 ? v : 15;
  }, [settings.timeStepMin]);

  const pxPerMin = useMemo(() => PX_PER_TICK / timeStepMin, [PX_PER_TICK, timeStepMin]);

  const formatTickLabel = (absMin) => {
    const dayRel = absMin % 1440;
    const h = Math.floor(dayRel / 60);
    const m = dayRel % 60;
    if (dayRel === 0 && absMin > 0) return "24:00";
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  /* =========================
   * Filter data
   * ========================= */
  const filteredData = useMemo(() => {
    if (!Array.isArray(scheduleData)) return [];
    let out = scheduleData;
    if (filterRoom !== "all") out = out.filter((r) => r.room === filterRoom);
    if (selectedDate) {
      out = out
        .map((room) => ({
          ...room,
          surgeries: Array.isArray(room.surgeries)
            ? room.surgeries.filter((s) => s.date === selectedDate)
            : [],
        }))
        .filter((room) => room.surgeries.length > 0);
    }
    return out;
  }, [scheduleData, filterRoom, selectedDate]);

  /* =========================
   * ✅ 開始時間變動 => 該日期全部手術重算(含清潔)
   * ========================= */
  useEffect(() => {
    if (!onSurgeryUpdate) return;
    if (!selectedDate) return;
    if (!Array.isArray(filteredData) || filteredData.length === 0) return;

    if (prevStartMinRef.current == null) {
      prevStartMinRef.current = startMin;
      return;
    }
    if (prevStartMinRef.current === startMin) return;
    prevStartMinRef.current = startMin;

    const updates = [];

    filteredData.forEach((roomData) => {
      const list = (roomData.surgeries || [])
        .filter((s) => s.date === selectedDate)
        .slice()
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

      let cursor = startMin;

      for (const s of list) {
        const dur = Math.max(0, getDurationMin(s));
        const newStartAbs = cursor;
        const newEndAbs = newStartAbs + dur;

        updates.push({
          uid: s._uid,
          oldRoom: roomData.room,
          newRoom: roomData.room,
          newDate: selectedDate,
          newStartTime: minToHHmm(newStartAbs),
          newEndTime: minToHHmm(newEndAbs),
        });

        cursor = newEndAbs + cleaningMin;
      }
    });

    if (updates.length > 0) onSurgeryUpdate(updates);
  }, [startMin, cleaningMin, selectedDate, filteredData, onSurgeryUpdate]);

  /* =========================
   * Timeline end (extend, 含清潔)
   * ========================= */
  const endAbs = useMemo(() => {
    const nAbs = normalEndMin < startMin ? normalEndMin + 1440 : normalEndMin;
    const oAbs = overtimeEndMin < startMin ? overtimeEndMin + 1440 : overtimeEndMin;
    let maxAbs = Math.max(oAbs, startMin);

    filteredData.forEach((room) => {
      (room.surgeries || []).forEach((s) => {
        const { sAbs, eAbs } = getEndAbs(s, startMin);
        if (sAbs == null || eAbs == null) return;
        const cleanEnd = eAbs + cleaningMin;
        if (cleanEnd > maxAbs) maxAbs = cleanEnd;
      });
    });

    return Math.ceil(maxAbs / timeStepMin) * timeStepMin;
  }, [filteredData, overtimeEndMin, normalEndMin, startMin, cleaningMin, timeStepMin]);

  const timelineWidth = useMemo(() => {
    const tickCount = Math.floor((endAbs - startMin) / timeStepMin) + 1;
    return tickCount * PX_PER_TICK;
  }, [endAbs, startMin, PX_PER_TICK, timeStepMin]);

  useEffect(() => {
    recalcMaxScroll();
  }, [timelineWidth, recalcMaxScroll, filteredData.length]);

  /* =========================
   * Markers
   * ========================= */
  const markerLines = useMemo(() => {
    const sAbs = startMin;
    const nAbs = normalEndMin < startMin ? normalEndMin + 1440 : normalEndMin;
    const oAbs = overtimeEndMin < startMin ? overtimeEndMin + 1440 : overtimeEndMin;

    return [
      { key: "start", abs: sAbs, color: "#2563eb", text: `開始 ${formatTickLabel(sAbs)}` },
      { key: "normal", abs: nAbs, color: "#f59e0b", text: `一般結束 ${formatTickLabel(nAbs)}` },
      { key: "overtime", abs: oAbs, color: "#ef4444", text: `超時結束 ${formatTickLabel(oAbs)}` },
    ].map((m) => ({ ...m, leftPx: (m.abs - startMin) * pxPerMin }));
  }, [startMin, normalEndMin, overtimeEndMin, pxPerMin]);

  /* =========================
   * Color rule
   * ========================= */
  const getSurgeryColor = (eAbs) => {
    const nAbs = normalEndMin < startMin ? normalEndMin + 1440 : normalEndMin;
    const oAbs = overtimeEndMin < startMin ? overtimeEndMin + 1440 : overtimeEndMin;
    if (eAbs <= nAbs) return { bg: "#00E676", fg: "#000000" };
    if (eAbs <= oAbs) return { bg: "#FFD600", fg: "#000000" };
    return { bg: "#FF1744", fg: "#FFFFFF" };
  };

  /* =========================
   * Layout constants
   * ========================= */
  const ROOM_COL_W = 200 * uiScale;
  const ROW_HEIGHT = 104 * uiScale;
  const ROW_GAP = 12 * uiScale;

  /* =========================
   * ✅ 插入 index：以「手術+清潔」區塊判斷
   * - drop 在手術或清潔區塊內：一律視為插在該台清潔後(i+1)
   * ========================= */
  const calcInsertIndex = useCallback(
    (surgeryListWithoutDragged, desiredAbsStart) => {
      const list = surgeryListWithoutDragged
        .slice()
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

      for (let i = 0; i < list.length; i++) {
        const { sAbs, eAbs } = getEndAbs(list[i], startMin);
        if (sAbs == null || eAbs == null) continue;

        const blockEnd = eAbs + cleaningMin;

        if (desiredAbsStart < sAbs) return i;
        if (desiredAbsStart >= sAbs && desiredAbsStart < blockEnd) return i + 1;
        if (desiredAbsStart === blockEnd) return i + 1;
      }
      return list.length;
    },
    [startMin, cleaningMin]
  );

  /* =========================
   * Drag handlers (HTML5 + custom preview near cursor)
   * ========================= */
  const handleDragStart = (e, room, surgery, previewMeta) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", surgery?._uid || "");

    // ✅ 隱藏瀏覽器預設 drag ghost(避免你說的離很遠)
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="; // 1x1 transparent
    e.dataTransfer.setDragImage(img, 0, 0);

    setDragged({
      uid: surgery?._uid,
      fromRoom: room,
      surgery: { ...surgery },
    });

    // ✅ 啟動自訂 preview，位置跟著滑鼠
    const h = previewMeta?.h ?? (ROW_HEIGHT - 20);
    setDragPreview({
      x: e.clientX,
      y: e.clientY,
      h,
      surgeryW: previewMeta?.surgeryW ?? 140,
      cleanW: previewMeta?.cleanW ?? (cleaningMin * pxPerMin),
      bg: previewMeta?.bg ?? "#00E676",
      fg: previewMeta?.fg ?? "#000",
      title: previewMeta?.title ?? (surgery?.doctor || "手術"),
    });

    const onMove = (ev) => {
      setDragPreview((p) => (p ? { ...p, x: ev.clientX, y: ev.clientY } : p));
    };
    const onEnd = () => {
      setDragPreview(null);
      cleanupDragListeners();
    };

    cleanupDragListeners();
    document.addEventListener("dragover", onMove, { passive: true });
    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("dragend", onEnd, { passive: true });
    dragMoveListenerRef.current = onMove;
    dragEndListenerRef.current = onEnd;
  };

  const cleanupDragListeners = () => {
    const mv = dragMoveListenerRef.current;
    const ed = dragEndListenerRef.current;
    if (mv) {
      document.removeEventListener("dragover", mv);
      document.removeEventListener("mousemove", mv);
      dragMoveListenerRef.current = null;
    }
    if (ed) {
      document.removeEventListener("dragend", ed);
      dragEndListenerRef.current = null;
    }
  };

  const handleDragEnd = () => {
    setDragged(null);
    setDropHint(null);
    setDragPreview(null);
    cleanupDragListeners();
  };

  const handleDragOverLane = (e, roomData) => {
    e.preventDefault();
    if (!dragged) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const rawAbsStart = startMin + x / pxPerMin;
    const absStart = clampStep(rawAbsStart, timeStepMin);

    const listWithoutDragged = (roomData.surgeries || []).filter((s) => s._uid !== dragged.uid);
    const insertIndex = calcInsertIndex(listWithoutDragged, absStart);

    setDropHint({
      room: roomData.room,
      absStart,
      insertIndex,
    });

    e.dataTransfer.dropEffect = "move";
  };

  const handleDropLane = (e, roomData) => {
    e.preventDefault();
    if (!dragged || !dropHint || !onSurgeryUpdate) return;

    const targetRoom = roomData.room;
    const sourceRoom = dragged.fromRoom;

    const targetList = (roomData.surgeries || [])
      .slice()
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

    const moved = { ...dragged.surgery };
    const movedUid = moved._uid;

    const targetListWithoutSelf = targetList.filter((s) => s._uid !== movedUid);

    // ✅ 用「清潔後」規則重算一次 insertIndex(避免基準不一致)
    const finalInsertIndex = calcInsertIndex(targetListWithoutSelf, dropHint.absStart);

    // ✅ 插入模式固定啟用
    const newTargetList = insertAndRecalc({
      surgeries: targetListWithoutSelf,
      insertIndex: finalInsertIndex,
      moved,
      desiredStartAbs: dropHint.absStart,
      dayStartMin: startMin,
      cleaningMin,
    });

    const updates = [];

    // A) 目標 room：整串寫回
    newTargetList.forEach((s) => {
      updates.push({
        uid: s._uid,
        oldRoom: targetRoom,
        newRoom: targetRoom,
        newDate: selectedDate,
        newStartTime: s.startTime,
        newEndTime: s.endTime,
      });
    });

    // B) 若跨 room：來源 room 也要重排(含清潔)
    if (sourceRoom !== targetRoom) {
      updates.unshift({
        uid: movedUid,
        oldRoom: sourceRoom,
        newRoom: targetRoom,
        newDate: selectedDate,
        newStartTime: moved.startTime,
        newEndTime: moved.endTime,
      });

      const srcRoomData = filteredData.find((r) => r.room === sourceRoom);
      if (srcRoomData) {
        const srcList = (srcRoomData.surgeries || [])
          .filter((s) => s._uid !== movedUid)
          .slice()
          .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

        let cursor = startMin;
        const srcRecalc = srcList.map((s) => ({ ...s }));

        for (let i = 0; i < srcRecalc.length; i++) {
          const d = Math.max(0, getDurationMin(srcRecalc[i]));
          const nextStartAbs = cursor;
          const nextEndAbs = nextStartAbs + d;

          srcRecalc[i].startTime = minToHHmm(nextStartAbs);
          srcRecalc[i].endTime = minToHHmm(nextEndAbs);

          cursor = nextEndAbs + cleaningMin;
        }

        srcRecalc.forEach((s) => {
          updates.push({
            uid: s._uid,
            oldRoom: sourceRoom,
            newRoom: sourceRoom,
            newDate: selectedDate,
            newStartTime: s.startTime,
            newEndTime: s.endTime,
          });
        });
      }
    }

    onSurgeryUpdate(updates);
    setDragged(null);
    setDropHint(null);
    setDragPreview(null);
    cleanupDragListeners();
  };

  /* =========================
   * Handlers
   * ========================= */
  const onChangeTime = (key) => (e) => setSettings((p) => ({ ...p, [key]: e.target.value }));
  const onChangeCleaning = (e) => setSettings((p) => ({ ...p, cleaningMin: e.target.value }));
  const onChangeTimeStep = (e) => setSettings((p) => ({ ...p, timeStepMin: e.target.value }));

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* ✅ drag preview */}
      <DragPreview preview={dragPreview} />

      {/* ===== Header ===== */}
      <div className="p-6 border-b border-gray-200 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-800">
            手術排程甘特圖{selectedDate ? ` - ${new Date(selectedDate).toLocaleDateString("zh-TW")}` : ""}
          </h2>

          <div className="flex flex-wrap gap-3 items-end">
            <FieldTime
              label="手術開始"
              value={settings.surgeryStart}
              onChange={onChangeTime("surgeryStart")}
              color="blue"
              placeholder="例如 08:15"
            />
            <FieldTime
              label="一般結束"
              value={settings.normalEnd}
              onChange={onChangeTime("normalEnd")}
              color="amber"
              placeholder="例如 17:30"
            />
            <FieldTime
              label="超時結束"
              value={settings.overtimeEnd}
              onChange={onChangeTime("overtimeEnd")}
              color="red"
              placeholder="例如 20:00"
            />

            <FieldNumber
              label="清潔時間(分)"
              value={settings.cleaningMin}
              onChange={onChangeCleaning}
              color="blue"
              placeholder="例如 45"
              min={0}
              step={1}
            />

            <FieldNumber
              label="時間格(分)"
              value={settings.timeStepMin}
              onChange={onChangeTimeStep}
              color="amber"
              placeholder="預設 15"
              min={1}
              step={1}
            />

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-700">時間軸密度</span>
              <input
                type="range"
                min={20}
                max={60}
                step={1}
                value={pxPerTick}
                onChange={(e) => setPxPerTick(Number(e.target.value))}
                className="w-48"
              />
              <span className="text-[11px] text-gray-500">
                {pxPerTick}px / {timeStepMin} 分
              </span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-gray-700">
          <Legend swatch="#00E676" text="正常手術(綠)" />
          <Legend swatch="#FFD600" text="加班手術(黃)" />
          <Legend swatch="#FF1744" text="超時手術(紅)" />
          <Legend swatch="#1068ff" text="清潔時間(藍)" />

          <div className="ml-auto text-sm text-gray-600 font-semibold">

          </div>
        </div>
      </div>

      {/* ===== Time scale ===== */}
      <div
        ref={timeScaleRef}
        className="overflow-x-auto border-b-2 border-gray-200 bg-gray-50 gantt-time-scale"
        style={{ overflowY: "hidden" }}
      >
        <div className="flex" style={{ width: ROOM_COL_W + timelineWidth }}>
          <div
            className="flex-shrink-0 px-4 py-3 font-semibold text-gray-700 bg-gray-100 sticky left-0 z-20"
            style={{ width: ROOM_COL_W }}
          >
            手術室
          </div>

          <div className="relative" style={{ width: timelineWidth, height: 52 }}>
            {Array.from({ length: Math.floor((endAbs - startMin) / timeStepMin) + 1 }, (_, i) => {
              const abs = startMin + i * timeStepMin;
              const isHour = abs % 60 === 0;
              return (
                <div
                  key={abs}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: i * PX_PER_TICK,
                    width: PX_PER_TICK,
                    borderLeft: "1px solid rgba(0,0,0,0.10)",
                  }}
                >
                  {isHour && (
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 0,
                        transform: "translateX(-50%)",
                        fontSize: 12,
                        color: "#374151",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatTickLabel(abs)}
                    </div>
                  )}
                </div>
              );
            })}

            {markerLines.map((m) => (
              <div key={m.key} style={{ position: "absolute", left: m.leftPx, top: 0, bottom: 0, width: 0 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 2,
                    transform: "translateX(-50%)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: m.color,
                    background: "rgba(255,255,255,0.90)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    padding: "1px 6px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.text}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: m.color,
                    opacity: 0.9,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ 橫向卷軸 */}
      <div className="gantt-slider-bar">
        <input
          type="range"
          className="gantt-slider"
          min={0}
          max={Math.max(0, maxScroll)}
          step={1}
          value={sliderVal}
          onChange={handleSliderChange}
          style={{
            width: "100%",
            "--percent": maxScroll ? `${(sliderVal / maxScroll) * 100}%` : "0%",
          }}
        />
      </div>

      {/* ===== Gantt body ===== */}
      <div ref={scrollContainerRef} className="overflow-auto gantt-scroll-container" style={{ maxHeight: "72vh" }}>
        <div style={{ width: ROOM_COL_W + timelineWidth }}>
          <div className="py-2" style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
            {filteredData.map((roomData, idx) => (
              <div
                key={`${roomData.room}-${idx}`}
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 10px 22px rgba(0,0,0,0.08)",
                  background: "#ffffff",
                }}
              >
                <div
                  className="flex-shrink-0 sticky left-0 z-10"
                  style={{
                    width: ROOM_COL_W,
                    borderRight: "1px solid rgba(0,0,0,0.10)",
                    padding: "14px 12px",
                    background: "#ffffff",
                  }}
                >
                  <div className="font-bold text-gray-800 text-lg">{roomData.room}</div>
                  <div className="text-sm text-gray-500">{roomData.surgeries.length} 台手術</div>
                </div>

                <div
                  className="relative"
                  style={{
                    width: timelineWidth,
                    height: ROW_HEIGHT,
                    background: "linear-gradient(to bottom, rgba(0,0,0,0.02), rgba(0,0,0,0.00))",
                  }}
                  onDragOver={(e) => handleDragOverLane(e, roomData)}
                  onDrop={(e) => handleDropLane(e, roomData)}
                  onDragLeave={() => setDropHint(null)}
                >
                  {/* Grid lines */}
                  {Array.from({ length: Math.floor((endAbs - startMin) / timeStepMin) + 1 }, (_, i) => {
                    const abs = startMin + i * timeStepMin;
                    const isHour = abs % 60 === 0;
                    return (
                      <div
                        key={abs}
                        style={{
                          position: "absolute",
                          left: i * PX_PER_TICK,
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: isHour ? "rgba(0,0,0,0.14)" : "rgba(0,0,0,0.06)",
                        }}
                      />
                    );
                  })}

                  {/* Marker lines */}
                  {markerLines.map((m) => (
                    <div
                      key={m.key}
                      style={{
                        position: "absolute",
                        left: m.leftPx,
                        top: 0,
                        bottom: 0,
                        width: 2,
                        background: m.color,
                        opacity: 0.25,
                      }}
                    />
                  ))}

                  {/* Surgery blocks */}
                  {(roomData.surgeries || []).map((s, sIdx) => {
                    const { sAbs, eAbs } = getEndAbs(s, startMin);
                    if (sAbs == null || eAbs == null) return null;

                    const surgeryLeftPx = (sAbs - startMin) * pxPerMin;
                    const surgeryWidthPx = (eAbs - sAbs) * pxPerMin;

                    const cleanStartAbs = eAbs;
                    const cleanEndAbs = eAbs + cleaningMin;
                    const cleanWidthPx = (cleanEndAbs - cleanStartAbs) * pxPerMin;
                    const cleaningLeftPx = surgeryLeftPx + surgeryWidthPx;

                    const { bg, fg } = getSurgeryColor(eAbs);

                    const top = 10;
                    const h = ROW_HEIGHT - 20;

                    const doctor = s.doctor || "醫師未填";
                    const timeStr = `${s.startTime || "--:--"} - ${s.endTime || "--:--"}`;
                    const isDragging = dragged?.uid === s._uid;

                    const canShowFull = surgeryWidthPx >= 120;
                    const canShowMedium = surgeryWidthPx >= 60;
                    const canShowSmall = surgeryWidthPx >= 30;

                    // ✅ 拖曳時，preview 會把「手術+清潔」一起顯示
                    const previewMeta = {
                      h,
                      surgeryW: surgeryWidthPx,
                      cleanW: cleaningMin > 0 ? cleanWidthPx : 0,
                      bg,
                      fg,
                      title: canShowFull ? doctor : `${doctor.substring(0, 2)}`,
                    };

                    return (
                      <div key={`${roomData.room}-${s._uid || sIdx}`}>
                        {/* Surgery */}
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, roomData.room, s, previewMeta)}
                          onDragEnd={handleDragEnd}
                          title={`${doctor}\n${timeStr}\n\n拖動後會依清潔時間自動重排`}
                          style={{
                            position: "absolute",
                            left: surgeryLeftPx,
                            top,
                            height: h,
                            width: Math.max(surgeryWidthPx, 8),
                            background: bg,
                            color: fg,
                            borderRadius: surgeryWidthPx < 20 ? 4 : 14,
                            padding: canShowFull ? "8px 12px" : canShowSmall ? "4px 6px" : "2px",
                            border: isDragging ? "3px dashed #2563eb" : "1px solid rgba(0,0,0,0.10)",
                            boxShadow: isDragging
                              ? "0 15px 30px rgba(37,99,235,0.4)"
                              : "0 10px 22px rgba(0,0,0,0.14)",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                            textAlign: "center",
                            overflow: "hidden",
                            cursor: "grab",
                            opacity: isDragging ? 0.55 : 1,
                          }}
                        >
                          {canShowFull ? (
                            <>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 14,
                                  lineHeight: 1.1,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "100%",
                                }}
                              >
                                {doctor}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  opacity: 0.95,
                                  marginTop: 4,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "100%",
                                }}
                              >
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.95, marginTop: 2, whiteSpace: "nowrap" }}>
                                {timeStr}
                              </div>
                            </>
                          ) : canShowMedium ? (
                            <>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 12,
                                  lineHeight: 1.1,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "100%",
                                }}
                              >
                                {doctor}
                              </div>
                              <div style={{ fontSize: 10, opacity: 0.95, marginTop: 2, whiteSpace: "nowrap" }}>
                                {s.startTime}
                              </div>
                            </>
                          ) : canShowSmall ? (
                            <div style={{ fontWeight: 800, fontSize: 10, lineHeight: 1.1 }}>
                              {doctor.substring(0, 2)}
                            </div>
                          ) : null}
                        </div>

                        {/* Cleaning */}
                        {cleaningMin > 0 && cleanWidthPx > 2 && (
                          <div
                            title={`清潔時間\n${minToHHmm(cleanStartAbs)} - ${minToHHmm(cleanEndAbs)}`}
                            style={{
                              position: "absolute",
                              left: cleaningLeftPx,
                              top,
                              height: h,
                              width: Math.max(cleanWidthPx, 4),
                              background: "#1068ff",
                              color: "#FFFFFF",
                              borderRadius: cleanWidthPx < 20 ? 4 : 14,
                              padding: cleanWidthPx >= 30 ? "8px 10px" : "2px",
                              border: "1px solid rgba(0,0,0,0.10)",
                              boxShadow: "0 10px 22px rgba(0,0,0,0.10)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              alignItems: "center",
                              textAlign: "center",
                              overflow: "hidden",
                            }}
                          >
                            {cleanWidthPx >= 30 ? (
                              <>
                                <div style={{ fontWeight: 800, fontSize: 11, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                                  清潔
                                </div>
                                <div style={{ fontSize: 9, opacity: 0.95, marginTop: 2, whiteSpace: "nowrap" }}>
                                  {cleaningMin}分
                                </div>
                              </>
                            ) : cleanWidthPx >= 12 ? (
                              <div style={{ fontWeight: 800, fontSize: 9, lineHeight: 1.1 }}>清</div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Drop hint line */}
                  {dropHint && dropHint.room === roomData.room && (
                    <div
                      style={{
                        position: "absolute",
                        left: (dropHint.absStart - startMin) * pxPerMin,
                        top: 10,
                        height: ROW_HEIGHT - 20,
                        width: 4,
                        background: "#22c55e",
                        opacity: 0.85,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: -30,
                          left: -28,
                          background: "#22c55e",
                          color: "white",
                          padding: "4px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                        }}
                      >
                        插入(第{dropHint.insertIndex + 1}個位置，清潔後才成立)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredData.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p>該日期無手術排程</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
 * Small components
 * ========================= */
function Legend({ swatch, text }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          background: swatch,
          border: "1px solid rgba(0,0,0,0.12)",
        }}
      />
      <span>{text}</span>
    </span>
  );
}

function FieldTime({ label, value, onChange, color = "blue", placeholder }) {
  const theme =
    {
      blue: { ring: "focus:ring-blue-500", border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700" },
      amber: { ring: "focus:ring-amber-500", border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-700" },
      red: { ring: "focus:ring-red-500", border: "border-red-200", bg: "bg-red-50", text: "text-red-700" },
    }[color] || { ring: "focus:ring-blue-500", border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700" };

  return (
    <label className="flex flex-col gap-1">
      <span className={`text-xs font-semibold ${theme.text}`}>{label}</span>
      <input
        type="time"
        value={value}
        onChange={onChange}
        title={placeholder}
        className={`px-3 py-2 rounded-lg border ${theme.border} ${theme.bg} text-sm focus:outline-none focus:ring-2 ${theme.ring}`}
      />
      <span className="text-[11px] text-gray-500">{placeholder}</span>
    </label>
  );
}

function FieldNumber({ label, value, onChange, color = "blue", placeholder, min = 0, step = 1 }) {
  const theme =
    {
      blue: { ring: "focus:ring-blue-500", border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700" },
      amber: { ring: "focus:ring-amber-500", border: "border-amber-200", bg: "bg-amber-50", text: "text-amber-700" },
      red: { ring: "focus:ring-red-500", border: "border-red-200", bg: "bg-red-50", text: "text-red-700" },
    }[color] || { ring: "focus:ring-blue-500", border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700" };

  return (
    <label className="flex flex-col gap-1">
      <span className={`text-xs font-semibold ${theme.text}`}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        step={step}
        title={placeholder}
        className={`px-3 py-2 rounded-lg border ${theme.border} ${theme.bg} text-sm focus:outline-none focus:ring-2 ${theme.ring} w-28`}
      />
      <span className="text-[11px] text-gray-500">{placeholder}</span>
    </label>
  );
}
