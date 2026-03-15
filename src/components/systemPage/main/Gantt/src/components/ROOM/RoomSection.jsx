import React, { useEffect, useState } from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import RoomItem from "./RoomItem";
import DroppableContainer from "../DragDrop/DroppableContainer";
import { createGroup, ungroup } from "./GroupOperations";
import axios from "axios";
import { BASE_URL } from "../../../../../../../config";

function RoomSection({ room, roomIndex, onPinStatusChange, readOnly = false, onSurgeryClick, onGroupOperation, isMainPage = false }) {
  const [isPinned, setIsPinned] = useState(room.isPinned || false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [isUngroupMode, setIsUngroupMode] = useState(false);
  const [groupOptions, setGroupOptions] = useState(false);
  const [selectedSurgeries, setSelectedSurgeries] = useState([]);

  // 從 localStorage 讀取釘選狀態
  useEffect(() => {
    try {
      const pinnedRoomsStr = localStorage.getItem('pinnedRooms');
      if (pinnedRoomsStr) {
        const pinnedRooms = JSON.parse(pinnedRoomsStr);
        if (pinnedRooms[room.roomId] !== undefined) {
          setIsPinned(pinnedRooms[room.roomId]);
          
          // 通知父組件釘選狀態已從 localStorage 恢復
          if (onPinStatusChange) {
            onPinStatusChange(roomIndex, pinnedRooms[room.roomId]);
          }
        }
      }
    } catch (error) {
      console.error('解析釘選手術房出錯:', error);
    }
  }, [room.roomId]);

  // 處理釘選按鈕點擊
  const handlePinClick = async (e) => {
    e.stopPropagation();
    const newPinnedStatus = !isPinned;
    try {
      await axios.post(`${BASE_URL}/api/system/algorithm/pin`, {
        roomId: room.roomId,
        pinned: newPinnedStatus,
      });
      setIsPinned(newPinnedStatus);

      // 將釘選狀態保存到 localStorage
      try {
        const pinnedRoomsStr = localStorage.getItem('pinnedRooms');
        let pinnedRooms = {};
        if (pinnedRoomsStr) {
          pinnedRooms = JSON.parse(pinnedRoomsStr);
        }
        pinnedRooms[room.roomId] = newPinnedStatus;
        localStorage.setItem('pinnedRooms', JSON.stringify(pinnedRooms));
      } catch (error) {
        console.error('保存釘選狀態出錯:', error);
      }
    } catch (error) {
      console.error("Error updating pin status:", error);
      alert("更新釘選狀態失敗，請稍後再試。");
    }

    // 通知父組件釘選狀態已更改
    if (onPinStatusChange) {
      onPinStatusChange(roomIndex, newPinnedStatus);
    }
  };

  // 處理群組按鈕點擊
  const handleGroupClick = (e) => {
    e.stopPropagation();
    setGroupOptions(!groupOptions);
    if (!groupOptions) {
      // 重置選中的手術
      setSelectedSurgeries([]);
    }
  };

  // 處理選擇手術
  const handleSurgerySelect = (surgery) => {
    if (isUngroupMode) {
      if (surgery.isGroup) {
        handleUngroupItem(surgery);
      }
      return;
    }

    if (!isGroupMode) return;

    // 忽略銜接時間項目
    if (surgery.isCleaningTime) {
      return;
    }

    // 檢查手術是否已經被選中
    const index = selectedSurgeries.findIndex(s => s.id === surgery.id);

    if (index === -1) {
      // 如果未選中，添加到選中列表
      setSelectedSurgeries([...selectedSurgeries, surgery]);
    } else {
      // 如果已選中，從選中列表中移除
      const newSelected = [...selectedSurgeries];
      newSelected.splice(index, 1);
      setSelectedSurgeries(newSelected);
    }
  };

  // 處理建立群組
  const handleCreateGroup = () => {
    if (selectedSurgeries.length < 2) {
      alert('請至少選擇兩個手術以創建群組');
      return;
    }

    // 調用父組件的群組操作函數
    if (onGroupOperation) {
      onGroupOperation(roomIndex, selectedSurgeries, 'create');
    }

    // 重置狀態
    setSelectedSurgeries([]);
    setIsGroupMode(false);
    setGroupOptions(false);
  };

  // 處理解除群組
  const handleUngroup = () => {
    setIsUngroupMode(true);
    setIsGroupMode(false);
    setGroupOptions(false);
  };

  // 新增：處理群組項目點擊解除
  const handleUngroupItem = (surgery) => {
    if (!isUngroupMode) return;

    // 調用父組件的群組操作函數
    if (onGroupOperation) {
      onGroupOperation(roomIndex, [surgery], 'ungroup');
    }

    // 重置狀態
    setIsUngroupMode(false);
  };

  // 啟用群組模式
  const enableGroupMode = () => {
    setIsGroupMode(true);
    setGroupOptions(false);
  };

  return (
    <div className="room-section">
      <h3 className="room-title">
        <span>{room.room}</span>
        {/* 群組按鈕和選項 - 只在非只讀模式且非首頁時顯示 */}
        {!readOnly && !isMainPage && (
          <div className="room-actions" style={{ display: 'flex', alignItems: 'center' }}>
            {/* 釘選按鈕 */}
            <span
              className="room-pin-button"
              onClick={handlePinClick}
              title={isPinned ? "取消釘選" : "釘選此手術房"}
              style={{ marginRight: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              {isPinned ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="pin-icon pin-icon-active">
                    <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                  </svg>
                  <span className="pin-text pin-text-active">已釘選</span>
                </>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="pin-icon">
                  <path d="M14 4v5c0 1.12.37 2.16 1 3H9c.65-.86 1-1.9 1-3V4h4m3-2H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3V4h1c.55 0 1-.45 1-1s-.45-1-1-1z" />
                </svg>
              )}
            </span>

            {/* 群組按鈕 */}
            <span
              className="room-group-button"
              onClick={handleGroupClick}
              title="群組操作"
              style={{
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                color: isGroupMode || isUngroupMode ? '#3B82F6' : 'currentColor'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </span>

            {/* 群組選項 - 當點擊群組按鈕後顯示 */}
            {groupOptions && (
              <div className="room-group-options" style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f3f4f6',
                padding: '2px 8px',
                borderRadius: '4px',
                marginRight: '8px',
                fontWeight: 'bold',
              }}>
                <button
                  onClick={enableGroupMode}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5px 3px',
                    color: '#3B82F6',
                    marginRight: '8px',
                    fontWeight: 'bold',
                    fontSize: '15.8px',
                  }}
                >
                  建立
                </button>
                <button
                  onClick={handleUngroup}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5px 3px',
                    color: '#EF4444',
                    marginRight: '8px',
                    fontWeight: 'bold',
                    fontSize: '15.8px',
                  }}
                >
                  解除
                </button>
              </div>
            )}

            {/* 群組模式下選定後的操作按鈕 */}
            {isGroupMode && selectedSurgeries.length > 0 && (
              <div className="room-group-options"
                style={{
                  alignItems: 'center',
                  background: '#f3f4f6',
                  padding: '0 8px',
                  borderRadius: '4px',
                  marginRight: '8px',
                  fontWeight: 'bold',
                }}
              >
                <span>{`已選擇 ${selectedSurgeries.length} 個項目`}</span>
                <button
                  onClick={handleCreateGroup}
                  style={{
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 8px',
                    borderRadius: '4px',
                    color: 'white',
                    marginLeft: '8px',
                    background: '#3B82F6',
                  }}
                >
                  群組
                </button>
                <button
                  onClick={() => {
                    setSelectedSurgeries([]);
                    setIsGroupMode(false);
                  }}
                  style={{
                    background: '#EF4444',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 8px',
                    borderRadius: '4px',
                    color: 'white',
                    marginLeft: '4px',
                  }}
                >
                  取消
                </button>
              </div>
            )}

            {/* 解除模式提示 */}
            {isUngroupMode && (
              <div className="room-ungroup-hint"
                style={{
                  alignItems: 'center',
                  background: '#f3f4f6',
                  padding: '0 8px',
                  borderRadius: '4px',
                  marginLeft: '8px',
                  fontWeight: 'bold',
                }}
              >
                <span style={{ color: '#EF4444' }}>點擊群組項目進行解除</span>
                <button
                  onClick={() => setIsUngroupMode(false)}
                  style={{
                    background: '#EF4444',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 8px',
                    borderRadius: '4px',
                    color: 'white',
                    marginLeft: '4px'
                  }}
                >
                  取消
                </button>
              </div>
            )}
          </div>
        )}
      </h3>
      <div className="room-content">
        <DroppableContainer
          room={room}
          roomIndex={roomIndex}
          isPinned={isPinned}
          roomName={room.room}
          readOnly={readOnly}
          onSurgeryClick={isGroupMode ? handleSurgerySelect : (isUngroupMode ? handleUngroupItem : onSurgeryClick)}
          isGroupMode={isGroupMode}
          isUngroupMode={isUngroupMode}
          selectedSurgeries={selectedSurgeries}
          isMainPage={isMainPage}
        />
      </div>
    </div>
  );
}

export default RoomSection;
