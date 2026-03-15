import axios from 'axios';
import { BASE_URL } from "/src/config";

// 簡化後的群組拖曳處理函數
export const handleGroupDragEnd = async (result, rows, setRows, setFilteredRows) => {
  const { draggableId, destination, source } = result;
  const sourceIndex = source.droppableId.split('-')[1];
  const destIndex = destination.droppableId.split('-')[1];

  const sourceRoom = rows[parseInt(sourceIndex)];
  const draggedItem = sourceRoom.data.find(item => `surgery-${sourceIndex}-${item.id}` === draggableId);

  if (!draggedItem || !draggedItem.isGroup) return false;

  // 獲取目標房間ID
  const sourceRoomId = sourceRoom.roomId;
  const destRoomId = rows[parseInt(destIndex)].roomId;

  // 計算新的序號位置
  const destRoomData = rows[parseInt(destIndex)].data;
  const nonCleaningItems = destRoomData.filter(item => !item.isCleaningTime);
  
  // 安全檢查：確保有應用程式ID可用於API呼叫
  if (!draggedItem.applicationId) {
    console.error('找不到拖曳群組的應用程式ID');
    return false;
  }

  // 計算目標位置序號
  let targetOrder = 1;
  if (destination.index > 0) {
    // 找出目標位置前面的項目數量（非銜接時間）
    const itemsBeforeTarget = destRoomData
      .slice(0, destination.index)
      .filter(item => !item.isCleaningTime);
    targetOrder = itemsBeforeTarget.length + 1;
  }

  try {
    // 調用 API 更新房間
    await axios.put(`${BASE_URL}/api/system/surgery/${draggedItem.applicationId}/${destRoomId}`);
    
    // 調用 API 更新序號
    await axios.put(`${BASE_URL}/api/system/surgery/${draggedItem.applicationId}/order-in-room`, {
      orderInRoom: targetOrder
    });
    
    console.log(`✅ 將群組 ${draggedItem.applicationId} 移至房間 ${destRoomId} 順序 ${targetOrder}`);
    
    // 刷新頁面顯示最新狀態
    setTimeout(() => {
      window.location.reload();
    }, 300);
    
    return true;
  } catch (error) {
    console.error('更新群組位置失敗：', error);
    // 仍然刷新頁面以顯示正確狀態
    setTimeout(() => {
      window.location.reload();
    }, 300);
    return false;
  }
};

// 簡化的顏色更新函數
export const updateGroupColors = (roomData) => {
  if (!roomData || roomData.length === 0) return;
  
  roomData.forEach(item => {
    if (item.isGroup) {
      // 為群組設定固定顏色
      item.color = "group";
    }
  });
}; 