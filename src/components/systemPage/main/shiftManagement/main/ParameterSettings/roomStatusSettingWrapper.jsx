// roomStatusSettingWrapper.jsx
import { useMemo, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../../../../../config";
import "./roomStatusSettingWrapper.css";

/** 顯示用的正規化（只用於 render，不回傳給父層） */
function normalizeRoom(r) {
  return {
    id: r?.id ?? r?.operatingRoomId ?? r?.operating_room_id ?? "",
    name: r?.operatingRoomName ?? r?.name ?? r?.operating_room_name ?? "",
    status:
      r?.status ?? r?.operatingRoomStatus ?? r?.operating_room_status ?? 0,
    type: r?.roomType ?? r?.operatingRoomType ?? r?.operating_room_type ?? "",
    _raw: r, // 保留原始物件指標，等等合併時用
  };
}

/** 開/關房間圖示（inline SVG） */
function RoomIcon({ on = false, size = 28 }) {
  const stroke = "currentColor";
  const fill = "currentColor";
  return on ? (
    <svg width={size} height={size} viewBox="0 0 32 28" aria-label="room-on" className="room-icon">
      <rect x="2" y="2" width="28" height="20" rx="4" ry="4" fill="none" stroke={stroke} strokeWidth="2" />
      <path d="M20 6 L26 10 L20 14 Z" fill={fill} />
      <line x1="20" y1="6" x2="20" y2="18" stroke={stroke} strokeWidth="2" />
      <line x1="4" y1="22" x2="28" y2="22" stroke={stroke} strokeWidth="2" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 32 28" aria-label="room-off" className="room-icon">
      <rect x="2" y="2" width="28" height="20" rx="4" ry="4" fill="none" stroke={stroke} strokeWidth="2" />
      <rect x="22" y="6" width="6" height="12" fill={fill} rx="1" />
      <circle cx="23.5" cy="12" r="0.9" fill="#fff" />
      <line x1="4" y1="22" x2="28" y2="22" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}

function StatusBadge({ status }) {
  const text = status === 1 ? "開啟" : "關閉";
  return <span className={`rs-badge ${status === 1 ? "on" : "off"}`}>{text}</span>;
}

function RoomCard({ room, onClick, disabled }) {
  const on = Number(room.status) === 1;
  const colorClass = on ? "rs-on" : "rs-off";
  const title = `${room.name || room.id}（${on ? "開啟" : "關閉"}）${room.type ? `｜${room.type}` : ""}`;

  return (
    <button
      type="button"
      className={`rs-card ${colorClass}`}
      title={title}
      onClick={() => !disabled && onClick?.(room)}
      disabled={disabled}
      style={{ textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1 }}
    >
      <div className="rs-icon-wrap">
        <RoomIcon on={on} />
      </div>
      <div className="rs-info">
        <div className="rs-name" title={room.name || room.id}>
          {room.name || room.id}
        </div>
        <div className="rs-meta">
          {room.type ? <span className="rs-type">{room.type}</span> : null}
          <StatusBadge status={on ? 1 : 0} />
        </div>
      </div>
    </button>
  );
}

/** 子層只用 props.rooms 來 render；更新時透過 onRoomsChange 回寫父層（保持原本 shape） */
function RoomStatusSettingWrapper({ rooms: inputRooms = [], onRoomsChange }) {
  // 正規化僅供顯示，保留 _raw 指向原物件
  const rooms = useMemo(
    () => (Array.isArray(inputRooms) ? inputRooms.map(normalizeRoom) : []),
    [inputRooms]
  );
  const [pendingId, setPendingId] = useState(null);
  const [msg, setMsg] = useState(null); // 顯示後端回來的提示或錯誤

  const handleToggle = async (normRoom) => {
    const id = normRoom?.id;
    if (!id) return;

    setMsg(null);
    setPendingId(id);

    try {
      // 交給後端判斷是否允許切換（若有手術會回 409 + 純字串）
      const { data } = await axios.patch(
        `${BASE_URL}/api/system/operating-room/${id}/toggle-status`
      );

      // 從回應中抓到新的 status（回應可能只有 status，其他欄位不一定有）
      const returnedStatus =
        data?.status ?? data?.operatingRoomStatus ?? data?.operating_room_status;

      // 以「父層原始 shape」為基準更新：只改 status，不動其他欄位（避免被清空）
      const nextRooms = inputRooms.map((item) => {
        const itemId = item?.id ?? item?.operatingRoomId ?? item?.operating_room_id;
        if (String(itemId) !== String(id)) return item;

        const hasCamel = Object.prototype.hasOwnProperty.call(item, "operatingRoomStatus");
        const hasFlat = Object.prototype.hasOwnProperty.call(item, "status");
        const nextStatus =
          returnedStatus !== undefined ? returnedStatus : (Number(normRoom.status) === 1 ? 0 : 1);

        if (hasCamel) {
          return { ...item, operatingRoomStatus: nextStatus };
        } else if (hasFlat) {
          return { ...item, status: nextStatus };
        } else {
          // 若原物件兩種鍵都沒有，新增一個慣用鍵名
          return { ...item, operatingRoomStatus: nextStatus };
        }
      });

      onRoomsChange?.(nextRooms);
    } catch (e) {
      // 後端已保證錯誤 body 是純字串（例如 409：該手術房仍有手術，無法關閉）
      setMsg(e?.response?.data || e?.message || "切換失敗，請稍後再試");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="rs-wrap">
      <header className="rs-header">
        <h3 className="rs-title">手術房狀態</h3>

        <div className="rs-legend">
          <div className="rs-legend-item">
            <span className="rs-dot on" />
            <span>開啟</span>
          </div>
          <div className="rs-legend-item">
            <span className="rs-dot off" />
            <span>關閉</span>
          </div>
        </div>
      </header>
      <div className="param-state3">
        <ul
          style={{
            marginTop: "1px",
            marginBottom: 0,
            paddingLeft: "28px",
            listStyle: "disc",
            fontSize: "16px",
            // backgroundColor: "#c1d7ffff",
          }}
        >
          <li style={{ color: "#6b7280" }}>
            <strong>手術房狀態區塊：</strong>每個手術房均顯示其開啟/關閉狀態、手術房名稱與手術房類型，供使用者清楚辨識。
          </li>


          <li style={{ color: "#6b7280" }}>
            <strong>控制手術房啟閉：</strong>點擊未開啟的手術房區塊可開啟該手術房；點擊已開啟的手術房區塊可將其關閉。
          </li>

          <li style={{ color: "#6b7280" }}>
            <strong>關閉限制：</strong>若手術房內已有既排手術，則該手術房不得被關閉。
          </li>



        </ul >
      </div >
      {
        msg && <div className="rs-error">⚠ {msg}</div>
      }

      {
        rooms.length === 0 ? (
          <div className="rs-empty">目前沒有手術房資料</div>
        ) : (
          <div className="rs-grid">
            {rooms.map((r) => (
              <RoomCard
                key={r.id || r.name}
                room={r}
                onClick={handleToggle}
                disabled={pendingId === r.id}
              />
            ))}
          </div>
        )
      }
    </section >
  );
}

export default RoomStatusSettingWrapper;
