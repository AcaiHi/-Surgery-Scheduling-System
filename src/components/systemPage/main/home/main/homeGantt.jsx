// src/features/home/main/homeGantt.jsx
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { BASE_URL } from "../../../../../config";
import HomeTimeScale from "./homeTimeScale";
import HomeGanttTable from "./homeGanttTable";
import { DragDropContext } from "@hello-pangea/dnd";
import SurgeryDetail from "../surgeryDetail";

export default function HomeGantt({
  snapshot,
  dndEnabled = false,
  filters = {},
  // ⬇️ 支援由外部傳入的 ref（Header 上的按鈕要用）
  timeScaleRef: externalTimeScaleRef,
  ganttScrollRef: externalGanttRef,
}) {
  const timeSettings = snapshot?.timeSettings || {};
  const operatingRooms = snapshot?.operatingRooms || [];
  const startMin = Number(timeSettings?.surgeryStartTime || 510);

  // 若外部沒給，就用內建的
  const ownTimeScaleRef = useRef(null);
  const ownGanttScrollRef = useRef(null);
  const timeScaleRef = externalTimeScaleRef || ownTimeScaleRef;
  const ganttScrollRef = externalGanttRef || ownGanttScrollRef;

  const ceilTo15 = (mins) => Math.ceil(mins / 15) * 15;

  // listsByRoom（支援 DnD）
  const [listsByRoom, setListsByRoom] = useState({});
  useEffect(() => {
    console.log("[HomeGantt] Updating listsByRoom from snapshot");
    const map = {};
    (operatingRooms || []).forEach((r) => {
      const key = String(r.id);
      const surgeries = snapshot?.surgeriesByRoom?.[key] || [];
      
      // 深拷貝，確保每次都是全新的物件
      map[key] = surgeries.map((x) => ({ ...x }));
      
      console.log(`[HomeGantt] Room ${key}: ${surgeries.length} surgeries`, 
        surgeries.map(s => ({
          id: s.applicationId,
          status: s.status,
          startTime: s.startTime,
          endTime: s.endTime
        }))
      );
    });
    setListsByRoom(map);
  }, [snapshot, operatingRooms]);

  // 寬度：至少到隔天 08:00
  const contentMaxAbsEnd = Number(snapshot?.contentMaxAbsEnd || startMin);
  const baseDay = Math.floor(startMin / 1440);
  const minEndAbsByRule = (baseDay + 1) * 1440 + 480; // 隔天 08:00
  const defaultEndAbs = Math.max(contentMaxAbsEnd, minEndAbsByRule);
  const endAbs = useMemo(() => ceilTo15(defaultEndAbs), [defaultEndAbs]);

  // 時間軸寬度（15 分鐘一格）
  const PX_PER_TICK = 25;
  const tickCount = Math.floor((endAbs - startMin) / 15) + 1;
  const timelineWidth = tickCount * PX_PER_TICK;
  const pxPerMin = PX_PER_TICK / 15; // 每分鐘寬度，傳給 HomeSurgery

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
  }, [sliderVal, timeScaleRef, ganttScrollRef]);

  useLayoutEffect(() => {
    recalcMaxScroll();
  }, [recalcMaxScroll, endAbs, operatingRooms, timelineWidth]);

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

  // 透明化篩選
  const roomLookup = useMemo(() => {
    const m = new Map();
    (operatingRooms || []).forEach((r) => {
      const id = String(r?.id);
      const name = r?.operatingRoomName ?? r?.name ?? "";
      const deptName =
        r?.department?.name ??
        r?.departmentName ??
        r?.department?.Name ??
        "";
      m.set(id, { id, name, deptName, raw: r });
    });
    return m;
  }, [operatingRooms]);

  const inListOrPass = (value, list) => {
    if (!list || !Array.isArray(list) || list.length === 0) return true;
    const v = String(value ?? "");
    return list.includes(v);
  };

  const matchByFilters = (surgery, roomInfo) => {
    const deptName = roomInfo?.deptName ?? "";
    const roomName = roomInfo?.name ?? "";
    const sName = surgery?.surgeryName ?? "";
    const surgeonName =
      surgery?.chiefSurgeon?.name ?? surgery?.chiefSurgeonName ?? "";
    const anesthesia = surgery?.anesthesiaMethod ?? "";
    const reason = surgery?.surgeryReason ?? "";
    const est = Number(
      surgery?.estimatedSurgeryTime ??
        surgery?.estimated_time ??
        surgery?.estimatedTime ??
        0
    );

    if (!inListOrPass(deptName, filters?.department)) return false;
    if (!inListOrPass(roomName, filters?.operatingRoom)) return false;
    if (!inListOrPass(sName, filters?.surgeryName)) return false;
    if (!inListOrPass(surgeonName, filters?.chiefSurgeon)) return false;
    if (!inListOrPass(anesthesia, filters?.anesthesiaMethod)) return false;
    if (!inListOrPass(reason, filters?.surgeryReason)) return false;

    if (
      Array.isArray(filters?.estimatedTimeRange) &&
      filters.estimatedTimeRange.length === 2
    ) {
      const [mn, mx] = filters.estimatedTimeRange.map((x) => Number(x) || 0);
      if (!(est >= mn && est <= mx)) return false;
    }
    return true;
  };

  const displayByRoom = useMemo(() => {
    const out = {};
    Object.entries(listsByRoom || {}).forEach(([roomId, list]) => {
      const roomInfo = roomLookup.get(String(roomId));
      out[roomId] = (list || []).map((s) => {
        const ok = matchByFilters(s, roomInfo);
        return ok ? { ...s, __dim: false } : { ...s, __dim: true };
      });
    });
    return out;
  }, [listsByRoom, roomLookup, filters]);

  /**
   * ✅ 把目前 listsByRoom 的狀態同步到後端 JSON，並在成功後重新載入頁面
   */
  const syncDragUpdate = useCallback(
    (nextListsByRoom) => {
      if (!snapshot) return;
      const dateStr = snapshot._resolvedDate || snapshot.date;
      if (!dateStr) return;

      const roomOrders = Object.entries(nextListsByRoom || {}).map(
        ([roomId, list]) => ({
          roomId,
          applicationIds: (list || [])
            .map((s) => String(s.applicationId ?? s.id ?? ""))
            .filter((id) => id !== ""),
        })
      );

      console.log("[HomeGantt] ===== DRAG UPDATE START =====");
      console.log("[HomeGantt] Date:", dateStr);
      console.log("[HomeGantt] Room orders:", roomOrders);

      axios
        .post(`${BASE_URL}/api/system/schedule/snapshot/drag-update`, {
          date: dateStr,
          roomOrders,
        })
        .then((res) => {
          console.log("[HomeGantt] ===== DRAG UPDATE SUCCESS =====");
          console.log("[HomeGantt] Response:", res.data);
          
          // 檢查後端是否有返回更新後的 snapshot
          if (res.data?.snapshot) {
            console.log("[HomeGantt] Updated snapshot received:");
            Object.entries(res.data.snapshot.surgeriesByRoom || {}).forEach(([roomId, surgeries]) => {
              console.log(`  Room ${roomId}:`);
              surgeries.forEach((s, idx) => {
                console.log(`    ${idx+1}. ${s.applicationId} - status: ${s.status}, time: ${s.startTime}-${s.endTime}`);
              });
            });
          }
          
          // ✅ 清除快取
          try {
            localStorage.removeItem("shiftRows");
            localStorage.removeItem("homeSnapshot");
            localStorage.removeItem("scheduleData");
            localStorage.removeItem(`snapshot-${dateStr}`);
            sessionStorage.clear();
            console.log("[HomeGantt] Cache cleared");
          } catch (e) {
            console.warn("Failed to clear storage:", e);
          }
          
          // ✅ 延遲 200ms 後重新載入，確保後端檔案已完全寫入
          // 保留當前的 schedule 選擇（從 localStorage 讀取）
          console.log("[HomeGantt] Waiting 200ms for file write...");
          setTimeout(() => {
            console.log("[HomeGantt] Reloading page...");
            
            // 保留當前選擇的日期（today/tomorrow）
            const currentSchedule = localStorage.getItem("home:schedule") || "today";
            const url = new URL(window.location.href);
            url.searchParams.set("_t", Date.now().toString());
            url.searchParams.set("schedule", currentSchedule);
            
            window.location.href = url.toString();
          }, 200);
        })
        .catch((err) => {
          console.error("[HomeGantt] ===== DRAG UPDATE FAILED =====");
          console.error("[HomeGantt] Error:", err);
          console.error("[HomeGantt] Error response:", err.response?.data);
          alert("拖曳更新失敗：" + (err.response?.data?.message || err.message));
        });
    },
    [snapshot]
  );

  const onDragEnd = ({ source, destination }) => {
    if (!destination) return;
    const getRoomKey = (droppableId) =>
      String(droppableId).replace(/^room-/, "");
    const srcRoom = getRoomKey(source.droppableId);
    const dstRoom = getRoomKey(destination.droppableId);

    setListsByRoom((prev) => {
      const next = { ...prev };
      const src = Array.from(next[srcRoom] || []);
      if (!src[source.index]) return prev;

      const [moved] = src.splice(source.index, 1);
      
      // ✅ 清除舊的時間和狀態資訊，避免顯示錯誤的顏色
      // 這些值會在後端重新計算後更新
      delete moved.startMinAbs;
      delete moved.endMinAbs;
      delete moved.startTime;
      delete moved.endTime;
      delete moved.status;
      delete moved.orderInRoom;
      
      if (srcRoom === dstRoom) {
        src.splice(destination.index, 0, moved);
        next[srcRoom] = src;
      } else {
        const dst = Array.from(next[dstRoom] || []);
        dst.splice(destination.index, 0, moved);
        next[srcRoom] = src;
        next[dstRoom] = dst;
      }

      // ✅ 更新完 state 之後，同步到後端 JSON
      syncDragUpdate(next);
      return next;
    });
  };

  const [detailSurgery, setDetailSurgery] = useState(null);
  const openDetail = (s) => setDetailSurgery(s);
  const closeDetail = () => setDetailSurgery(null);

  const content = (
    <>
      <HomeTimeScale
        timeSettings={timeSettings}
        scrollRef={timeScaleRef}
        onHostScroll={handleTimeScaleScroll}
        endAbs={endAbs}
      />

      <div className="gantt-slider-bar" style={{ padding: "6px 10px" }}>
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
            "--percent": maxScroll
              ? `${(sliderVal / maxScroll) * 100}%`
              : "0%",
          }}
        />
      </div>

      <HomeGanttTable
        timeSettings={timeSettings}
        operatingRooms={operatingRooms}
        surgeriesByRoom={displayByRoom}
        scrollRef={ganttScrollRef}
        onHostScroll={handleGanttScroll}
        dndEnabled={dndEnabled}
        onSurgeryClick={openDetail}
        pxPerMin={pxPerMin}
      />
    </>
  );

  return (
    <div
      className="gantt-wrapper"
      style={{ "--timeline-width": `${timelineWidth}px` }}
    >
      {dndEnabled ? (
        <DragDropContext onDragEnd={onDragEnd}>{content}</DragDropContext>
      ) : (
        content
      )}
      {detailSurgery && (
        <SurgeryDetail surgery={detailSurgery} onClose={closeDetail} />
      )}
    </div>
  );
}