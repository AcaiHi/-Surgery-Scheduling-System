/* eslint-disable react/prop-types */
import axios from "axios";
import { useEffect, useState } from "react";
import SurgeryItems from "./SurgeryItems";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import AddSurgery from "./AddSurgery";
import { BASE_URL } from "../../../../../config";
import "../../Mgr.css";

/* =========================
   前端時間模型（和 SurgeryItems 一致）
========================= */
function formatTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 可用時間 = 最後一台手術的結束時間
 * 規則：
 * - 起始 08:30（510）
 * - 依 orderInRoom 排序
 * - 每台手術 estimatedSurgeryTime
 * - 每台之間固定 gap = 45
 */
function calcLastEndTime(surgeries, startMinute = 510, gap = 45) {
  if (!surgeries || surgeries.length === 0) {
    return formatTime(startMinute);
  }

  const sorted = [...surgeries].sort(
    (a, b) => a.orderInRoom - b.orderInRoom
  );

  let current = startMinute;

  sorted.forEach((s) => {
    current += Number(s.estimatedSurgeryTime || 0);
    current += gap;
  });

  return formatTime(current - gap); // 最後一台不加 gap
}

/* =========================
   Component
========================= */
function SurgerListWrapper({
  user,
  operatingRooms,
  filterOperatingRoom,
  setReloadKey,
  nowUsername,
}) {
  const [addingSurgery, setAddingSurgery] = useState(null);
  const [filteredOperatingRooms, setFilteredOperatingRooms] = useState([]);
  const [roomSurgeries, setRoomSurgeries] = useState({});

  /* =========================
     手術房篩選
  ========================= */
  useEffect(() => {
    const filtered = operatingRooms.filter((or) => {
      const matchId = filterOperatingRoom.id
        ? or.id.toLowerCase().includes(filterOperatingRoom.id.toLowerCase())
        : true;
      const matchName = filterOperatingRoom.operatingRoomName
        ? or.operatingRoomName
            .toLowerCase()
            .includes(filterOperatingRoom.operatingRoomName.toLowerCase())
        : true;
      const matchDepartment = filterOperatingRoom.department
        ? or.department.name === filterOperatingRoom.department
        : true;
      const matchRoomType = filterOperatingRoom.roomType
        ? or.roomType === filterOperatingRoom.roomType
        : true;

      return matchId && matchName && matchDepartment && matchRoomType;
    });

    setFilteredOperatingRooms(filtered);
  }, [operatingRooms, filterOperatingRoom]);

  /* =========================
     抓每間手術房的手術
  ========================= */
  useEffect(() => {
    if (operatingRooms.length === 0) return;

    const fetchAllSurgeries = async () => {
      try {
        const results = await Promise.all(
          operatingRooms.map((or) =>
            axios.get(
              `${BASE_URL}/api/system/operating-rooms/${or.id}/surgery`
            )
          )
        );

        const map = {};
        operatingRooms.forEach((or, idx) => {
          map[or.id] = results[idx].data || [];
        });

        setRoomSurgeries(map);
      } catch (error) {
        console.error("Error fetching surgeries:", error);
      }
    };

    fetchAllSurgeries();
  }, [operatingRooms, setReloadKey]);

  /* =========================
     Render
  ========================= */
  return (
    <div className="mgr-list">
      <table className="system-table table-surgeries">
        <thead>
          <tr>
            <th>編號</th>
            <th>手術房名稱</th>
            <th>種類</th>
            <th>科別</th>
            <th>可用時間點</th>
            <th>手術房預約狀況</th>
            <th>動作</th>
          </tr>
        </thead>
        <tbody>
          {filteredOperatingRooms.map((operatingRoom) => {
            const surgeries = roomSurgeries[operatingRoom.id];

            return (
              <tr key={operatingRoom.id}>
                <td>{operatingRoom.id}</td>
                <td>{operatingRoom.operatingRoomName}</td>
                <td>{operatingRoom.roomType}</td>
                <td>{operatingRoom.department.name}</td>

                {/* 可用時間點（完全前端算） */}
                <td>
                  {surgeries
                    ? calcLastEndTime(surgeries)
                    : "載入中..."}
                </td>

                {/* 手術列表 */}
                <td>
                  <SurgeryItems
                    user={user}
                    operatingRoom={operatingRoom}
                    operatingRooms={operatingRooms}
                    setReloadKey={setReloadKey}
                  />
                </td>

                {/* 新增 */}
                <td>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <button
                      className="action-button add-button"
                      onClick={() =>
                        setAddingSurgery(operatingRoom.id)
                      }
                    >
                      <FontAwesomeIcon
                        icon={faPlus}
                        className="action-icon"
                      />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {addingSurgery && (
        <AddSurgery
          onClose={() => setAddingSurgery(null)}
          operatingRooms={operatingRooms}
          nowUsername={nowUsername}
          addingSurgery={addingSurgery}
          setReloadKey={setReloadKey}
        />
      )}
    </div>
  );
}

export default SurgerListWrapper;
