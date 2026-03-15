import React, { useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import RoomItem from './RoomItem';

// 群組手術組件 - 簡化為單一手術生成模式
function Group({ group, roomIndex, fixedHeight, isDragging, isPinned, roomName, readOnly = false, onSurgeryClick, isUngroupMode = false }) {
  // 安全檢查，確保 surgeries 存在且為數組
  if (!group.surgeries || !Array.isArray(group.surgeries) || group.surgeries.length === 0) {
    console.error('群組缺少有效的 surgeries 陣列');
    return null;
  }
  
  // 計算群組包含的手術（不含銜接時間）
  const actualSurgeries = group.surgeries.filter(s => !s.isCleaningTime);
  
  // 創建群組的展示資料
  const groupItem = {
    id: group.id,
    doctor: `${actualSurgeries.length} 個手術`,
    surgery: '群組手術',
    startTime: group.startTime,
    endTime: group.endTime,
    color: group.color || 'orange', // 使用傳入的顏色，或默認橘色
    isGroup: true,
    surgeries: group.surgeries,
    isCleaningTime: false,
    // 確保拖曳時保留這些資訊
    applicationId: group.applicationId || actualSurgeries[0]?.applicationId,
    roomId: group.roomId || actualSurgeries[0]?.roomId || roomIndex,
    operatingRoomName: roomName || group.operatingRoomName,
    roomIndex: roomIndex || group.roomIndex,
    // 確保群組 ID 可用於解除操作
    groupApplicationIds: group.groupApplicationIds || []
  };
  
  return (
    <div className="group-container" style={{ position: 'relative' }}>
      {/* 顯示群組的主要資訊 */}
      <RoomItem
        item={groupItem}
        itemIndex={group.index}
        roomIndex={roomIndex}
        fixedHeight={fixedHeight}
        isDragging={isDragging}
        isPinned={isPinned}
        roomName={roomName}
        readOnly={readOnly}
        onSurgeryClick={onSurgeryClick}
        isUngroupMode={isUngroupMode}
      />
      
      {/* 群組標記 - 在群組框的左上角顯示群組圖標 */}
      <div className="absolute top-1 left-1 text-white">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      </div>
      
      {/* 添加包含手術數量的標記 */}
      <div className="absolute bottom-1 left-1 text-white text-xs">
        <span className="bg-blue-600 text-white px-1 py-0.5 rounded">
          {actualSurgeries.length} 個手術
        </span>
      </div>
      
      {/* 如果是解除模式，添加提示 */}
      {isUngroupMode && (
        <div className="absolute top-1 right-1 text-red-500 flex items-center">
          <span className="mr-1 text-xs font-bold">點擊解除</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default Group; 