import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import { DragDropContext } from "@hello-pangea/dnd";
import SurgeryItems from "./SurgeryItems/surgeryItems";
import { BASE_URL } from "../../../../../../config";
import ActionList from "./actionList";
import SurgeryDetail from "./SurgeryDetail";

const DEBUG_DND = true;

const collapseGroups = (list) => {
  const seen = new Set();
  return (list || []).filter((s) => {
    const g = s?.groupApplicationIds;
    if (Array.isArray(g) && g.length > 0) {
      const main = String(g[0]);
      const self = String(s?.applicationId ?? s?.id);
      if (self !== main) return false;
      if (seen.has(main)) return false;
      seen.add(main);
      return true;
    }
    return true;
  });
};

function GanttTable({ timeSettings, operatingRooms, scrollRef, onHostScroll, onContentMaxAbsEnd, filters = {}, ganttRefetchKey }) {
  const [byId, setById] = useState({});
  const [lists, setLists] = useState({});
  const [pinnedMap, setPinnedMap] = useState({});  // roomKey:boolean

  const [selectingRoom, setSelectingRoom] = useState(null);
  const [selectStart, setSelectStart] = useState(null);
  const [selectEnd,   setSelectEnd]   = useState(null);
  const [selectMode,  setSelectMode]  = useState(null);

  const [detailSurgery, setDetailSurgery] = useState(null);
  const openDetail = useCallback((surgery) => setDetailSurgery(surgery), []);
  const closeDetail = useCallback(() => setDetailSurgery(null), []);

  const txnRef = useRef(0);

  // 用 ref 持有最新的 reportMaxAbsEnd，避免將它加入 useEffect deps 而導致頻繁重新 fetch
  const reportMaxAbsEndRef = useRef(null);

  // 用 ref 持有最新 byId / lists，讓 strictRefetchRooms 永遠以最新 state 為基底
  // （避免 stale closure 導致 cross-room 移動後的彈跳）
  const byIdRef = useRef({});
  const listsRef = useRef({});

  const dayStart    = Number(timeSettings?.surgeryStartTime || 510);
  const cleaning    = Number(timeSettings?.cleaningTime || 45);
  const regularEnd  = dayStart + Number(timeSettings?.regularEndTime || 540);
  const overtimeEnd = regularEnd + Number(timeSettings?.overtimeEndTime || 150);

  const formatTime = (minutes) => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // ===== 預估時間條件 =====
  const timeRange = Array.isArray(filters?.estimatedTimeRange) ? filters.estimatedTimeRange : null;
  const timeRangeActive = !!(timeRange && timeRange.length === 2);
  const [timeMin, timeMax] = timeRangeActive ? timeRange.map(Number) : [null, null];
  const getEstMinutes = (s) => Number(s?.estimatedSurgeryTime ?? s?.estimated_time ?? s?.estimatedTime ?? 0);

  // ===== 是否有任何篩選（包含預估時間）=====
  const hasAnyFilter = useMemo(() => {
    if (!filters) return false;
    return Object.entries(filters).some(([k, v]) => {
      if (k === "estimatedTimeRange") return Array.isArray(v) && v.length === 2;
      return Array.isArray(v) && v.length > 0;
    });
  }, [filters]);

  // ===== 類別型條件（時間另外算）=====
  const isMatchCategory = useCallback((s) => {
    const dept =
      s?.department?.name ||
      s?.departmentName ||
      s?.operatingRoom?.department?.name ||
      "";

    const roomName =
      s?.operatingRoomName ||
      s?.operatingRoom?.operatingRoomName ||
      s?.operatingRoom?.name ||
      "";

    const surgeon = s?.chiefSurgeon?.name || s?.chiefSurgeonName || "";

    const checks = [];

    if (Array.isArray(filters.department) && filters.department.length) {
      checks.push(filters.department.includes(dept));
    }
    if (Array.isArray(filters.operatingRoom) && filters.operatingRoom.length) {
      checks.push(filters.operatingRoom.includes(roomName));
    }
    if (Array.isArray(filters.surgeryName) && filters.surgeryName.length) {
      checks.push(filters.surgeryName.includes(s?.surgeryName || ""));
    }
    if (Array.isArray(filters.chiefSurgeon) && filters.chiefSurgeon.length) {
      checks.push(filters.chiefSurgeon.includes(surgeon));
    }
    if (Array.isArray(filters.anesthesiaMethod) && filters.anesthesiaMethod.length) {
      checks.push(filters.anesthesiaMethod.includes(s?.anesthesiaMethod || ""));
    }
    if (Array.isArray(filters.surgeryReason) && filters.surgeryReason.length) {
      checks.push(filters.surgeryReason.includes(s?.surgeryReason || ""));
    }
    return checks.every(Boolean);
  }, [filters]);

  const roomSnapshot = useCallback((roomKey, snapLists, snapById) => {
    const ids = snapLists[roomKey] || [];
    return ids.map((sid, idx) => {
      const s = snapById[sid] || {};
      return {
        idx,
        keyId: sid,
        applicationId: String(s.applicationId ?? s.id ?? ""),
        orderInRoom: s.orderInRoom,
        startTime: s.startTime ?? "",
        endTime: s.endTime ?? "",
        status: s.status ?? "",
      };
    });
  }, []);

  const logRooms = useCallback((label, roomA, roomB, snapLists, snapById) => {
    if (!DEBUG_DND) return;
    console.groupCollapsed(label);
    try {
      if (roomA) {
        console.groupCollapsed(`Room ${roomA}`);
        console.table(roomSnapshot(roomA, snapLists, snapById));
        console.groupEnd();
      }
      if (roomB && roomB !== roomA) {
        console.groupCollapsed(`Room ${roomB}`);
        console.table(roomSnapshot(roomB, snapLists, snapById));
        console.groupEnd();
      }
    } finally { console.groupEnd(); }
  }, [roomSnapshot]);

  const recalcRoom = useCallback((roomKey, nextById, nextLists) => {
    const ids = nextLists[roomKey] || [];
    let cursor = dayStart;
    for (let i = 0; i < ids.length; i++) {
      const sid = ids[i];
      const s = nextById[sid];
      if (!s) continue;
      const dur = Number(s?.estimatedSurgeryTime || 0);
      const end = cursor + dur;
      const status = end <= regularEnd ? "normal" : end <= overtimeEnd ? "overtime" : "overlimit";
      nextById[sid] = {
        ...s,
        startMinAbs: cursor,
        endMinAbs: end,
        startTime: formatTime(cursor),
        endTime: formatTime(end),
        status,
        orderInRoom: i,
      };
      cursor = end + cleaning;
    }
  }, [dayStart, regularEnd, overtimeEnd, cleaning]);

  const reportMaxAbsEnd = useCallback((snapshotLists, snapshotById) => {
    let maxAbsEnd = dayStart;
    for (const key in snapshotLists) {
      const arr = snapshotLists[key];
      if (!arr?.length) continue;
      const last = snapshotById[arr[arr.length - 1]];
      if (!last) continue;
      const roomEndAbs = (last.endMinAbs ?? dayStart) + cleaning;
      if (roomEndAbs > maxAbsEnd) maxAbsEnd = roomEndAbs;
    }
    onContentMaxAbsEnd?.(maxAbsEnd);
  }, [cleaning, dayStart, onContentMaxAbsEnd]);

  // 同步最新的 reportMaxAbsEnd 到 ref，讓主 useEffect 不需依賴它
  useEffect(() => {
    reportMaxAbsEndRef.current = reportMaxAbsEnd;
  }, [reportMaxAbsEnd]);

  useEffect(() => {
    byIdRef.current = byId;
    listsRef.current = lists;
  }, [byId, lists]);

  const ingestRoom = useCallback((roomKey, rawList, prevById, prevLists) => {
    const filtered = collapseGroups(rawList);
    const sorted = [...filtered].sort((a, b) => (a.orderInRoom ?? 0) - (b.orderInRoom ?? 0));
    const nextById = { ...prevById };
    const idList = [];
    for (const s of sorted) {
      const base = String(s?.applicationId ?? s?.id);
      const dateTag = s?.date ?? s?.surgeryDate ?? s?.operatingDate ?? "";
      const keyId = dateTag ? `${base}@${dateTag}` : base;
      idList.push(keyId);
      nextById[keyId] = { ...s, keyId, operatingRoomId: String(roomKey) };
    }
    const nextLists = { ...prevLists, [roomKey]: idList };
    recalcRoom(roomKey, nextById, nextLists);
    return { nextById, nextLists };
  }, [recalcRoom]);

  useEffect(() => {
    let cancelled = false;
    // 排程完成觸發 operatingRooms / ganttRefetchKey 更新時，讓所有舊的 DnD strictRefetchRooms 都失效
    txnRef.current += 1;

    (async () => {
      let tmpById = {};
      let tmpLists = {};
      for (const room of operatingRooms) {
        const roomKey = String(room.id);
        try {
          const { data } = await axios.get(`${BASE_URL}/api/system/operating-rooms/${room.id}/surgery`, { params: { _t: Date.now() } });
          const ing = ingestRoom(roomKey, data, tmpById, tmpLists);
          tmpById = ing.nextById;
          tmpLists = ing.nextLists;
        } catch (e) {
          console.error("Fetch surgeries failed for room:", room.id, e);
          tmpLists[roomKey] = [];
        }
      }

      if (!cancelled) {
        setById(tmpById);
        setLists(tmpLists);
        reportMaxAbsEndRef.current?.(tmpLists, tmpById);
        if (DEBUG_DND) {
          console.groupCollapsed("[Init] rooms snapshot");
          for (const r of operatingRooms) {
            const roomKey = String(r.id);
            console.groupCollapsed(`Room ${roomKey}`);
            console.table(roomSnapshot(roomKey, tmpLists, tmpById));
            console.groupEnd();
          }
          console.groupEnd();
        }
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatingRooms, ganttRefetchKey]);

  const roomIdSet = useMemo(
    () => new Set(operatingRooms.map((r) => String(r.id))),
    [operatingRooms]
  );

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const strictRefetchRooms = useCallback(
    async ({ roomKeys, movedKey = null, expectedRoom = null, tries = 5, delayMs = 150 }) => {
      const myTxn = txnRef.current;
      let finalBy = byIdRef.current;
      let finalLs = listsRef.current;

      for (let t = 1; t <= tries; t++) {
        const dataMap = {};
        await Promise.all(
          roomKeys.map(async (rk) => {
            try {
              const { data } = await axios.get(`${BASE_URL}/api/system/operating-rooms/${rk}/surgery`, { params: { _t: Date.now() } });
              dataMap[rk] = data;
            } catch (e) {
              console.error(`[Refetch] room=${rk} failed:`, e);
              dataMap[rk] = [];
            }
          })
        );

        let nb = { ...byIdRef.current };
        let nl = { ...listsRef.current };
        for (const rk of roomKeys) {
          const ing = ingestRoom(rk, dataMap[rk], nb, nl);
          nb = ing.nextById;
          nl = ing.nextLists;
        }
        finalBy = nb;
        finalLs = nl;

        if (movedKey && expectedRoom) {
          const appearIn = roomKeys.filter((rk) => (finalLs[rk] || []).includes(movedKey));
          const ok = appearIn.length === 1 && appearIn[0] === expectedRoom;
          if (ok) break;
        } else {
          break;
        }
        if (t < tries) await sleep(delayMs);
      }

      if (myTxn === txnRef.current) {
        setById(finalBy);
        setLists(finalLs);
        reportMaxAbsEnd(finalLs, finalBy);
        if (DEBUG_DND) logRooms("[Refetch Applied]", roomKeys[0], roomKeys[1], finalLs, finalBy);
      }
    },
    [ingestRoom, reportMaxAbsEnd, logRooms]
  );

  const beginSelect = useCallback((roomKey, mode = "group") => {
    setSelectingRoom(roomKey);
    setSelectStart(null);
    setSelectEnd(null);
    setSelectMode(mode);
  }, []);
  const clearSelect = useCallback(() => {
    setSelectingRoom(null);
    setSelectStart(null);
    setSelectEnd(null);
    setSelectMode(null);
  }, []);
  const handlePinChange = useCallback((roomKey, pinned) => {
    setPinnedMap((prev) => ({ ...prev, [roomKey]: pinned }));
  }, []);

  const ungroupByMainId = useCallback(async (roomKey, mainId) => {
    await axios.get(`${BASE_URL}/api/system/surgeries/group/clear/${encodeURIComponent(mainId)}`);
    await strictRefetchRooms({ roomKeys: [roomKey] });
  }, [strictRefetchRooms]);

  const handleClickItem = useCallback(async (roomKey, index) => {
    if (selectingRoom !== roomKey) return;
    const ids = lists[roomKey] || [];
    const sid = ids[index];
    if (!sid) return;
    const item = byId[sid];
    if (!item) return;

    const isGroupMain =
      Array.isArray(item.groupApplicationIds) &&
      item.groupApplicationIds.length > 0 &&
      String(item.groupApplicationIds[0]) === String(item.applicationId ?? item.id);

    if (selectMode === "ungroup") {
      if (!isGroupMain) { alert("這不是群組手術，無法解除。"); return; }
      try { await ungroupByMainId(roomKey, String(item.groupApplicationIds[0])); }
      catch (e) { console.error("群組解除失敗：", e); alert("群組解除失敗，請稍後再試。"); }
      return;
    }

    if (selectStart == null || selectEnd == null) { setSelectStart(index); setSelectEnd(index); return; }
    const start = Math.min(selectStart, selectEnd);
    const end   = Math.max(selectStart, selectEnd);
    if (index < start) { setSelectStart(index); return; }
    if (index > end)   { setSelectEnd(index);   return; }
    if (start === end) { setSelectStart(null); setSelectEnd(null); return; }
    if (index === start) { const ns = start + 1; if (ns > end) { setSelectStart(null); setSelectEnd(null); } else { setSelectStart(ns); } return; }
    if (index === end)   { const ne = end - 1;   if (start > ne) { setSelectStart(null); setSelectEnd(null); } else { setSelectEnd(ne); } return; }
  }, [byId, lists, selectingRoom, selectMode, selectStart, selectEnd, ungroupByMainId]);

  const handleConfirmSelect = useCallback(async (roomKey) => {
    try {
      if (selectMode !== "group") return;
      const ids = lists[roomKey] || [];
      if (selectStart == null || selectEnd == null) return;

      const start = Math.min(selectStart, selectEnd);
      const end   = Math.max(selectStart, selectEnd);
      const picked = ids.slice(start, end + 1).map((sid) => byId[sid]).filter(Boolean);
      picked.sort((a, b) => (a.orderInRoom ?? 0) - (b.orderInRoom ?? 0));

      const applicationIds = picked.map(s => s?.applicationId ?? s?.id).filter(Boolean).map(String);
      if (applicationIds.length < 2) { clearSelect(); return; }

      await axios.post(`${BASE_URL}/api/system/surgeries/group`, applicationIds);
      await strictRefetchRooms({ roomKeys: [roomKey] });
    } catch (err) {
      console.error("群組建立失敗：", err);
      alert("群組建立失敗，請稍後再試。");
    } finally {
      clearSelect();
    }
  }, [byId, lists, selectMode, selectStart, selectEnd, strictRefetchRooms, clearSelect]);

  const onDragStart = useCallback((start) => {
    if (!DEBUG_DND) return;
    const getRoomKey = (droppableId) => String(droppableId).replace(/^room-/, "");
    const srcRoomKey = getRoomKey(start.source.droppableId);
    const srcIdx = start.source.index;
    const srcId = (lists[srcRoomKey] || [])[srcIdx];
    const item = srcId ? byId[srcId] : null;
    console.groupCollapsed(
      `[DnD] Start: ${srcRoomKey}[${srcIdx}] key=${srcId ?? "?"} app=${item ? (item.applicationId ?? item.id) : "?"}`
    );
    console.table(roomSnapshot(srcRoomKey, lists, byId));
    console.groupEnd();
  }, [byId, lists, roomSnapshot]);

  const onDragUpdate = useCallback((update) => {
    if (!DEBUG_DND) return;
    if (!update.destination) return;
    const getRoomKey = (droppableId) => String(droppableId).replace(/^room-/, "");
    const srcRoomKey = getRoomKey(update.source.droppableId);
    const dstRoomKey = getRoomKey(update.destination.droppableId);
    console.log(`[DnD] Hover: ${srcRoomKey}[${update.source.index}] → ${dstRoomKey}[${update.destination.index}]`);
  }, []);

  const onDragEnd = useCallback(({ source, destination }) => {
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (selectingRoom) return;

    const getRoomKey = (droppableId) => String(droppableId).replace(/^room-/, "");
    const srcRoomKey = getRoomKey(source.droppableId);
    const dstRoomKey = getRoomKey(destination.droppableId);
    if (!roomIdSet.has(srcRoomKey) || !roomIdSet.has(dstRoomKey)) return;

    // ✅ 釘選規則：來源或目的任何一邊是釘選，都禁止
    const srcPinned = !!pinnedMap[srcRoomKey];
    const dstPinned = !!pinnedMap[dstRoomKey];
    if (srcPinned || dstPinned) {
      if (DEBUG_DND) {
        console.warn(`[DnD] Blocked due to pinned rooms. srcPinned=${srcPinned}, dstPinned=${dstPinned}`);
      }
      // 不送 API，讓 RBD 自動還原
      return;
    }

    const srcIds = lists[srcRoomKey] || [];
    const movedKey = srcIds[source.index];
    if (!movedKey) return;

    const pureId = (byId[movedKey]?.applicationId ?? byId[movedKey]?.id ?? movedKey) + "";

    if (DEBUG_DND) {
      console.groupCollapsed(
        `[DnD] Drop (strict fetch): ${srcRoomKey}[${source.index}] → ${dstRoomKey}[${destination.index}]`
      );
      logRooms("Before drop snapshot", srcRoomKey, dstRoomKey, lists, byId);
      console.groupEnd();
    }

    txnRef.current += 1;

    // ✅ 立刻更新 lists 順序 + byId 時間，防止 DnD 釋放後閃回 / 時間彈跳
    {
      const newSrcIds = [...srcIds];
      newSrcIds.splice(source.index, 1);

      const nextById = { ...byId };
      if (srcRoomKey !== dstRoomKey) {
        nextById[movedKey] = { ...nextById[movedKey], operatingRoomId: dstRoomKey };
      }

      let nextLists;
      if (srcRoomKey === dstRoomKey) {
        newSrcIds.splice(destination.index, 0, movedKey);
        nextLists = { ...lists, [srcRoomKey]: newSrcIds };
      } else {
        const newDstIds = [...(lists[dstRoomKey] || [])];
        newDstIds.splice(destination.index, 0, movedKey);
        nextLists = { ...lists, [srcRoomKey]: newSrcIds, [dstRoomKey]: newDstIds };
      }

      recalcRoom(srcRoomKey, nextById, nextLists);
      if (srcRoomKey !== dstRoomKey) recalcRoom(dstRoomKey, nextById, nextLists);

      setLists(nextLists);
      setById(nextById);
    }

    const url = `${BASE_URL}/api/system/surgery/${encodeURIComponent(pureId)}/order-in-room`;
    const body = {
      orderInRoom: destination.index,
      operatingRoomId: dstRoomKey,
      sourceOperatingRoomId: srcRoomKey,
    };

    axios.put(url, body).then(async () => {
      await strictRefetchRooms({
        roomKeys: srcRoomKey === dstRoomKey ? [srcRoomKey] : [srcRoomKey, dstRoomKey],
        movedKey,
        expectedRoom: dstRoomKey,
        tries: 5,
        delayMs: 150,
      });
    }).catch(async (err) => {
      console.error("[API] ❌ Persist failed:", err);
      await strictRefetchRooms({
        roomKeys: srcRoomKey === dstRoomKey ? [srcRoomKey] : [srcRoomKey, dstRoomKey],
        tries: 1,
      });
    });
  }, [lists, byId, roomIdSet, selectingRoom, strictRefetchRooms, logRooms, pinnedMap]); // ✅ 加上 pinnedMap 依賴

  return (
    <DragDropContext onDragStart={onDragStart} onDragUpdate={onDragUpdate} onDragEnd={onDragEnd}>
      <div className="gantt-scroll" ref={scrollRef} onScroll={onHostScroll}>
        <div className="gantt-track">
          <div className="gantt-table">
            {operatingRooms.map((room) => {
              const roomKey = String(room.id);
              if (room.status == 0) return null;

              const isPinned = Boolean(pinnedMap[roomKey]); // ✅ 釘選狀態
              const ids = lists[roomKey] || [];
              const items = ids
                .map((sid) => byId[sid])
                .filter(Boolean)
                .map((s) => {
                  const catHit = isMatchCategory(s);
                  const timeHit = timeRangeActive ? (getEstMinutes(s) >= timeMin && getEstMinutes(s) <= timeMax) : true;
                  const overallHit = catHit && timeHit;
                  return {
                    ...s,
                    __dim: hasAnyFilter ? !overallHit : false,   // ✅ 透明化處理：不符合就變淡
                  };
                });

              const isThisRowSelecting = selectingRoom === roomKey;
              const selectedRange =
                isThisRowSelecting && selectStart != null && selectEnd != null
                  ? { start: Math.min(selectStart, selectEnd), end: Math.max(selectStart, selectEnd) }
                  : null;

              return (
                <div className={`gantt-row ${isPinned ? "pinned" : ""}`} key={roomKey}>
                  <ActionList
                    room={room}
                    defaultPinned={!!room.isPinned}
                    onPinChange={(pinned) => handlePinChange(roomKey, pinned)}
                    onGroupClick={() => beginSelect(roomKey, "group")}
                    onUngroupClick={() => beginSelect(roomKey, "ungroup")}
                    onCancelSelect={() => clearSelect()}
                    onConfirmSelect={() => handleConfirmSelect(roomKey)}
                    isRowSelecting={isThisRowSelecting}
                    currentSelectMode={isThisRowSelecting ? selectMode : null}
                  />
                  <SurgeryItems
                    roomID={roomKey}
                    surgeries={items}
                    timeSettings={timeSettings}
                    isSelecting={isThisRowSelecting}
                    isUngroupSelecting={isThisRowSelecting && selectMode === "ungroup"}
                    selectedRange={selectedRange}
                    onItemClick={(idx) => handleClickItem(roomKey, idx)}
                    onOpenDetail={openDetail}
                    lockDrag={isPinned}             // ✅ 釘選房鎖拖放
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {detailSurgery && (
        <SurgeryDetail surgery={detailSurgery} onClose={closeDetail} />
      )}
    </DragDropContext>
  );
}

export default GanttTable;
