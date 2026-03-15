import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../../../../../config";

/**
 * Props
 * - room
 * - defaultPinned
 * - onPinChange(pinned)
 * - onGroupClick(room)        // 進入群組選取模式
 * - onUngroupClick(room)      // 進入解除選取模式
 * - onConfirmSelect(room)     // 群組模式按下完成
 * - onCancelSelect(room)      // 兩種模式都用的取消
 * - isRowSelecting?: boolean  // <<< 新增：此列是否為目前選取列
 * - currentSelectMode?: 'group' | 'ungroup' | null // <<< 新增：父層目前模式
 */
function ActionList({
  room,
  defaultPinned = false,
  onPinChange,
  onGroupClick,
  onUngroupClick,
  onConfirmSelect,
  onCancelSelect,
  isRowSelecting = false,       // <<< 新增
  currentSelectMode = null,     // <<< 新增
}) {
  const [isPinned, setIsPinned] = useState(!!defaultPinned);
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupPanel, setGroupPanel] = useState(false);     // 群組模式面板（有 完成/取消）
  const [ungroupPanel, setUngroupPanel] = useState(false); // 解除模式面板（只有 取消）

  const containerRef = useRef(null);

  // 本地釘選初始化
  useEffect(() => {
    if (!room?.id) return;
    const s = localStorage.getItem("pinnedRooms");
    const map = s ? JSON.parse(s) : {};
    const val = map[room.id] ?? !!defaultPinned;
    setIsPinned(!!val);
    map[room.id] = !!val;
    localStorage.setItem("pinnedRooms", JSON.stringify(map));
    onPinChange?.(!!val);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // 點外側或 ESC 關閉下拉
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onEsc = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keyup", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keyup", onEsc);
    };
  }, [menuOpen]);

  // 與父層的選取狀態同步：切列或切模式時自動開/關對應面板
  useEffect(() => {
    if (!isRowSelecting) {
      setGroupPanel(false);
      setUngroupPanel(false);
      return;
    }
    if (currentSelectMode === "group") {
      setGroupPanel(true);
      setUngroupPanel(false);
    } else if (currentSelectMode === "ungroup") {
      setGroupPanel(false);
      setUngroupPanel(true);
    } else {
      setGroupPanel(false);
      setUngroupPanel(false);
    }
  }, [isRowSelecting, currentSelectMode]);

  const togglePin = async (e) => {
    e.stopPropagation();
    if (!room?.id) return;
    const next = !isPinned;
    try {
      await axios.post(`${BASE_URL}/api/system/algorithm/pin`, {
        roomId: room.id,
        pinned: next,
      });
      setIsPinned(next);
      const s = localStorage.getItem("pinnedRooms");
      const map = s ? JSON.parse(s) : {};
      map[room.id] = next;
      localStorage.setItem("pinnedRooms", JSON.stringify(map));
      onPinChange?.(next);
    } catch (err) {
      console.error("更新釘選狀態失敗：", err);
      alert("更新釘選狀態失敗，請稍後再試。");
    }
  };

  const handleConfirm = (e) => {
    e.stopPropagation();
    onConfirmSelect?.(room);  // 群組模式用
    setGroupPanel(false);
  };
  const handleCancel = (e) => {
    e.stopPropagation();
    onCancelSelect?.(room);   // 兩種模式都可用來退出
    setGroupPanel(false);
    setUngroupPanel(false);
  };

  // 面板渲染：群組（完成/取消）或 解除（只有取消）
  if (groupPanel || ungroupPanel) {
    return (
      <div
        ref={containerRef}
        className="action-list"
        style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: 4 }}
      >
        <div style={{ fontWeight: 600 }}>{room?.operatingRoomName ?? "未命名手術房"}</div>
        <div style={{ display: "flex", gap: 8, marginLeft: 4 }}>
          {groupPanel && (
            <button
              type="button"
              onClick={handleConfirm}
              style={{ border: "1px solid #10b981", background: "#ecfdf5", color: "#065f46", padding: "0.9px 10px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              完成選取
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            style={{ border: "1px solid #d1d5db", background: "#f9fafb", padding: "0.9px 10px", borderRadius: 8, cursor: "pointer" }}
          >
            取消選取
          </button>
        </div>
      </div>
    );
  }

  // 一般模式（顯示群組/解除選單＋釘選）
  return (
    <div
      ref={containerRef}
      className="action-list"
      style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, padding: 4 }}
    >
      <div style={{ fontWeight: 600 }}>{room?.operatingRoomName ?? "未命名手術房"}</div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        title="群組操作"
        className="room-group-button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          cursor: "pointer",
          border: "none",
          background: "transparent",
          padding: 4,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="18" height="18">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      </button>

      {menuOpen && (
        <div
          role="menu"
          style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, padding: 6, display: "flex", gap: 8, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,0.08)", zIndex: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setGroupPanel(true);
              setUngroupPanel(false);
              onGroupClick?.(room);
            }}
            style={{ border: "1px solid #d1d5db", background: "#f9fafb", padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}
          >
            群組
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setGroupPanel(false);
              setUngroupPanel(true);     // 解除模式顯示「取消選取」
              onUngroupClick?.(room);     // 父層切到解除模式（點即解除）
            }}
            style={{ border: "1px solid #d1d5db", background: "#f9fafb", padding: "6px 10px", borderRadius: 8, cursor: "pointer" }}
          >
            解除
          </button>
        </div>
      )}

      {room?.id && (
        <button
          type="button"
          onClick={togglePin}
          className={isPinned ? "pin-icon-active" : "pin-icon"}
          title={isPinned ? "取消釘選" : "釘選此手術房"}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
        >
          {isPinned ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
              </svg>
              <span className="pin-text pin-text-active">已釘選</span>
            </>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M14 4v5c0 1.12.37 2.16 1 3H9c.65-.86 1-1.9 1-3V4h4m3-2H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3V4h1c.55 0 1-.45 1-1s-.45-1-1-1z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

export default ActionList;
