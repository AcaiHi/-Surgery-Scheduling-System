import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import ShiftHeaderWrapper from "./header/shiftHeaderWrapper";
import ShiftGanttWrapper from "./main/shiftGanttWrapper";
import "./shiftMgr.css";
import { BASE_URL } from "../../../../config"; // ← 確認路徑

function ShiftMgrWrapper() {
  const [timeSettings, setTimeSettings] = useState(null);
  const [operatingRooms, setOperatingRooms] = useState(null); // null = 尚未載入
  const [error, setError] = useState(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetchData = useCallback(() => {
    setFetchTrigger((t) => t + 1);
  }, []);

  // 由最上層(GET)抓資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [timeRes, roomRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/system/algorithm/time-settings`),
          axios.get(`${BASE_URL}/api/system/operating-rooms`),
        ]);
        setTimeSettings(timeRes.data);
        setOperatingRooms(roomRes.data ?? []);
      } catch (err) {
        console.error("ShiftMgrWrapper fetch error:", err);
        setError(err);
      }
    };
    fetchData();
  }, [fetchTrigger]);

  // 在最上層計算關閉的手術房 id 清單（status==0 視為關閉）
  const closedRoomIds = useMemo(
    () =>
      (operatingRooms || [])
        .filter((r) => r?.status == 0) // 用 == 容忍 "0"/0
        .map((r) => r.id),
    [operatingRooms]
  );

  // 除錯用
  useEffect(() => {
    if (closedRoomIds) console.log("closedRoomIds:", closedRoomIds);
  }, [closedRoomIds]);

  return (
    <div className="shift-mgr-wrapper">
      <ShiftHeaderWrapper
        timeSettings={timeSettings}
        operatingRooms={operatingRooms}
        closedRoomIds={closedRoomIds}
        onAlgorithmComplete={refetchData}
      />
      <ShiftGanttWrapper
        timeSettings={timeSettings}
        operatingRooms={operatingRooms}
        closedRoomIds={closedRoomIds}
        ganttRefetchKey={fetchTrigger}
      />
    </div>
  );
}

export default ShiftMgrWrapper;
