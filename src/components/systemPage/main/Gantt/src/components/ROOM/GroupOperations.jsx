import axios from 'axios';
import { getTimeSettings } from '../Time/timeUtils';
import { getColorByEndTime, COLORS, getCleaningColor } from './colorUtils';
import { BASE_URL } from '../../../../../../../config';
import { useEffect } from 'react';

// 輔助函數：將時間轉換為分鐘數
export const timeToMinutes = (timeString) => {
  if (!timeString) return 0;

  // 處理 24:00 和超過24小時的特殊情況
  if (timeString === "24:00") return 24 * 60;

  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

// 輔助函數：將分鐘數轉換為時間字符串
export const minutesToTime = (minutes) => {
  if (minutes === 24 * 60) return "24:00";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// 輔助函數：計算銜接時間長度（分鐘）
export const getCleaningDuration = (useTempSettings = false) => {
  const timeSettings = getTimeSettings(useTempSettings);
  return timeSettings.cleaningTime || 45; // 預設45分鐘銜接時間
};

// 建立唯一ID
export const generateUniqueId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// 創建銜接時間項目
export const createCleaningTimeItem = (startTime, endTime, roomName, id) => {
  return {
    id: id || generateUniqueId('cleaning'),
    doctor: '銜接時間',
    surgery: '整理中',
    startTime,
    endTime,
    isCleaningTime: true,
    operatingRoomName: roomName,
    color: 'blue'
  };
};

// 檢查項目之間的時間一致性
export const checkTimeContinuity = (items) => {
  if (!items || items.length < 2) return true;

  // 按開始時間排序項目
  const sortedItems = [...items].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // 檢查每對相鄰項目的時間是否連續
  for (let i = 0; i < sortedItems.length - 1; i++) {
    if (sortedItems[i].endTime !== sortedItems[i + 1].startTime) {
      return false;
    }
  }

  return true;
};

// 檢查項目是否連續（包含銜接時間）
export const checkConsecutiveItems = (items, roomData) => {
  if (!items || items.length < 2) return false;

  // 獲取所選項目的索引
  const selectedIndices = items.map(item =>
    roomData.findIndex(data => data.id === item.id)
  ).filter(index => index !== -1).sort();

  // 檢查索引是否連續
  for (let i = 1; i < selectedIndices.length; i++) {
    const diff = selectedIndices[i] - selectedIndices[i - 1];

    // 不連續且不是中間隔了銜接時間的情況
    if (diff !== 1 && diff !== 2) {
      return false;
    }

    // 如果索引差距為2，檢查中間是否為銜接時間
    if (diff === 2 && !roomData[selectedIndices[i - 1] + 1].isCleaningTime) {
      return false;
    }
  }

  return true;
};

// 獲取選擇範圍內的所有項目（包括中間可能未選中的項目）
export const getRangeItems = (selectedItems, roomData) => {
  if (!selectedItems || selectedItems.length === 0 || !roomData || roomData.length === 0) {
    return [];
  }

  // 排序選中的項目，按開始時間排序
  const sortedItems = [...selectedItems].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // 找出第一個和最後一個項目的索引
  const firstIndex = roomData.findIndex(item => item.id === sortedItems[0].id);
  const lastIndex = roomData.findIndex(item => item.id === sortedItems[sortedItems.length - 1].id);

  if (firstIndex === -1 || lastIndex === -1) {
    console.error('找不到選中項目在房間資料中的位置');
    return [];
  }

  // 獲取範圍內的所有項目（包括中間的銜接時間）
  // 確保最後一個手術後的銜接時間也被包含
  let endIndex = lastIndex;
  if (lastIndex < roomData.length - 1 && roomData[lastIndex + 1].isCleaningTime) {
    endIndex = lastIndex + 1;
  }

  return roomData.slice(firstIndex, endIndex + 1);
};

// 創建群組 - 更新為單一手術生成邏輯
export const createGroup = (selectedItems, roomData, roomIndex, roomName) => {
  // 提取所選手術的 ID
  const ids = selectedItems.filter(item => !item.isCleaningTime).map(s => s.applicationId);
  console.log('正在創建手術群組，包含手術 ID:', ids);

  if (!selectedItems || selectedItems.length < 2) {
    console.error('選擇的項目數量不足以創建群組');
    return { success: false, message: '請至少選擇兩個手術項目' };
  }

  // 過濾出非銜接時間的項目
  const nonCleaningItems = selectedItems.filter(item => !item.isCleaningTime);

  if (nonCleaningItems.length < 2) {
    return { success: false, message: '請至少選擇兩個非銜接時間的手術項目' };
  }

  // 檢查是否連續
  if (!checkConsecutiveItems(selectedItems, roomData)) {
    return { success: false, message: '只能將連續的手術進行群組（可以包含中間的銜接時間）' };
  }

  // 排序選中的手術，按開始時間排序
  const sortedItems = [...nonCleaningItems].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // 創建群組項目
  const groupId = generateUniqueId('group');
  
  // 確保時間連續性：使用第一個項目的開始時間和最後一個項目的結束時間
  const firstItem = sortedItems[0];
  const lastItem = sortedItems[sortedItems.length - 1];
  
  // 呼叫後端 API 創建手術群組
  axios.post(`${BASE_URL}/api/system/surgeries/group`, ids)
  .then(response => {
    console.log('群組創建成功', response.data);
    // 刷新頁面顯示新的群組狀態
    setTimeout(() => {
      window.location.reload();
    }, 300);
  })
  .catch(error => {
    console.error('創建群組時發生錯誤:', error);
    return { success: false, message: '創建群組時發生錯誤' };
  });

  return {
    success: true,
    message: '群組創建請求已發送'
  };
};

// 解除群組 - 簡化為單一 API 調用
export const ungroup = (groupItem, roomData, roomName) => {
  console.log('正在解除群組，手術 ID:', groupItem.applicationId);
  
  if (!groupItem.applicationId || !groupItem.groupApplicationIds || groupItem.groupApplicationIds.length === 0) {
    return { success: false, message: '選擇的項目不是群組' };
  }

  // 呼叫後端 API 解除群組
  axios.post(`${BASE_URL}/api/system/surgeries/group/clear`, groupItem.applicationId)
  .then(response => {
    console.log('群組解除成功', response.data);
    // 刷新頁面顯示更新後的狀態
    setTimeout(() => {
      window.location.reload();
    }, 300);
  })
  .catch(error => {
    console.error('解除群組時發生錯誤:', error);
    return { success: false, message: '解除群組時發生錯誤' };
  });

  return {
    success: true,
    message: '群組解除請求已發送'
  };
};

// 確保解除群組後，前後項目的時間銜接正確
export const ensureTimeConsistency = (roomData, startIndex, roomName) => {
  // 檢查項目是否為空
  if (!roomData || roomData.length === 0) return roomData;

  // 獲取清潔時間設置
  const cleaningDuration = getCleaningDuration(true);

  // 遍歷所有項目，確保時間連續性
  for (let i = startIndex; i < roomData.length - 1; i++) {
    const currentItem = roomData[i];
    const nextItem = roomData[i + 1];

    // 如果當前項目不是銜接時間且下一個項目不是銜接時間，則需要添加銜接時間
    if (!currentItem.isCleaningTime && !nextItem.isCleaningTime) {
      // 創建銜接時間項目
      const cleaningItem = {
        id: generateUniqueId('cleaning'),
        doctor: '銜接時間',
        surgery: '整理中',
        startTime: currentItem.endTime,
        endTime: minutesToTime(timeToMinutes(currentItem.endTime) + cleaningDuration),
        isCleaningTime: true,
        operatingRoomName: roomName,
        color: "blue",
        duration: cleaningDuration
      };

      // 插入銜接時間
      roomData.splice(i + 1, 0, cleaningItem);
      
      // 更新下一個手術的開始時間
      if (i + 2 < roomData.length) {
        roomData[i + 2].startTime = cleaningItem.endTime;
      }
      
      i++; // 跳過新插入的銜接時間
    }
    // 如果當前項目是銜接時間且下一個項目也是銜接時間，合併它們
    else if (currentItem.isCleaningTime && nextItem.isCleaningTime) {
      currentItem.endTime = nextItem.endTime;
      currentItem.duration = timeToMinutes(currentItem.endTime) - timeToMinutes(currentItem.startTime);
      currentItem.color = "blue";
      roomData.splice(i + 1, 1); // 移除下一個項目
      i--; // 重新檢查當前項目
    }
    // 如果時間不連續，調整銜接時間
    else if (currentItem.isCleaningTime) {
      // 確保銜接時間使用正確的顏色和持續時間
      currentItem.color = "blue";
      currentItem.duration = cleaningDuration;
      
      // 確保銜接時間與下一個項目相連
      if (currentItem.endTime !== nextItem.startTime) {
        currentItem.endTime = nextItem.startTime;
      }
    }
    // 如果普通項目時間不連續，插入銜接時間
    else if (currentItem.endTime !== nextItem.startTime) {
      // 創建銜接時間項目
      const cleaningItem = {
        id: generateUniqueId('cleaning'),
        doctor: '銜接時間',
        surgery: '整理中',
        startTime: currentItem.endTime,
        endTime: nextItem.startTime,
        isCleaningTime: true,
        operatingRoomName: roomName,
        color: "blue",
        duration: timeToMinutes(nextItem.startTime) - timeToMinutes(currentItem.endTime)
      };

      // 插入銜接時間
      roomData.splice(i + 1, 0, cleaningItem);
      i++; // 跳過新插入的銜接時間
    }
  }

  return roomData;
};

// 當群組被拖曳到新位置時，更新時間
export const updateGroupTimes = (groupItem, prevItem, nextItem, roomName) => {
  if (!groupItem || !groupItem.isGroup) return groupItem;

  // 如果沒有前後項目，則不需要更新時間
  if (!prevItem && !nextItem) return groupItem;

  const updatedGroup = { ...groupItem };
  let startTimeChanged = false;
  let endTimeChanged = false;

  // 獲取群組的原始時間量（分鐘）
  const originalGroupDuration = timeToMinutes(updatedGroup.endTime) - timeToMinutes(updatedGroup.startTime);
  
  // 更新群組開始時間（如果有前一個項目）
  if (prevItem) {
    const newStartTime = prevItem.isCleaningTime
      ? prevItem.endTime  // 如果前一個是銜接時間，使用其結束時間
      : minutesToTime(timeToMinutes(prevItem.endTime) + getCleaningDuration(true)); // 否則加上銜接時間

    if (newStartTime !== updatedGroup.startTime) {
      updatedGroup.startTime = newStartTime;
      startTimeChanged = true;
    }
  }

  // 如果開始時間變化了，根據原始持續時間來設置結束時間，保持時間量不變
  if (startTimeChanged) {
    const newEndTime = minutesToTime(timeToMinutes(updatedGroup.startTime) + originalGroupDuration);
    updatedGroup.endTime = newEndTime;
    endTimeChanged = true;
  } 
  // 如果開始時間沒變，但有後一個項目且需要調整結束時間
  else if (nextItem) {
    // 檢查是否需要調整結束時間
    const currentEndTime = updatedGroup.endTime;
    const maxEndTime = nextItem.isCleaningTime
      ? nextItem.startTime  // 如果後一個是銜接時間，最大到其開始時間
      : minutesToTime(timeToMinutes(nextItem.startTime) - getCleaningDuration(true)); // 否則減去銜接時間
      
    // 如果當前結束時間超過了允許的最大結束時間，則需要調整
    if (timeToMinutes(currentEndTime) > timeToMinutes(maxEndTime)) {
      updatedGroup.endTime = maxEndTime;
      endTimeChanged = true;
      
      // 由於結束時間變化了，我們也需要調整開始時間以保持原始持續時間
      updatedGroup.startTime = minutesToTime(timeToMinutes(maxEndTime) - originalGroupDuration);
      startTimeChanged = true;
    }
  }

  // 如果時間有變化，更新群組內部時間
  if (startTimeChanged || endTimeChanged) {
    // 獲取原始群組內每個項目的持續時間
    const originalItemDurations = [];
    
    if (updatedGroup.surgeries && updatedGroup.surgeries.length > 0) {
      // 獲取所有項目（包括清潔時間）的原始持續時間
      for (const item of updatedGroup.surgeries) {
        const itemDuration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
        originalItemDurations.push({
          id: item.id,
          duration: itemDuration,
          isCleaningTime: item.isCleaningTime
        });
      }
      
      // 重新分配時間，保持每個項目的原始持續時間
      let currentTime = timeToMinutes(updatedGroup.startTime);
      
      for (let i = 0; i < updatedGroup.surgeries.length; i++) {
        const item = updatedGroup.surgeries[i];
        const originalDuration = originalItemDurations.find(d => d.id === item.id)?.duration || 0;
        
        // 設置項目的開始時間
        item.startTime = minutesToTime(currentTime);
        
        // 設置項目的結束時間，保持原始持續時間
        currentTime += originalDuration;
        item.endTime = minutesToTime(currentTime);
        
        // 更新顏色（僅對非銜接時間項目）
        if (!item.isCleaningTime) {
          item.color = getColorByEndTime(item.endTime, false, true);
        }
      }
      
      // 確保最後一個項目的結束時間與群組結束時間一致
      // 由於我們保持了原始持續時間，這應該已經是自動的
      // 但為了安全起見，我們仍進行一次檢查
      const lastItem = updatedGroup.surgeries[updatedGroup.surgeries.length - 1];
      if (lastItem.endTime !== updatedGroup.endTime) {
        // 如果不一致，輕微調整最後一個項目的持續時間
        lastItem.endTime = updatedGroup.endTime;
      }
      
      // 更新群組顏色基於最後一個非銜接時間項目
      const nonCleaningItems = updatedGroup.surgeries.filter(item => !item.isCleaningTime);
      if (nonCleaningItems.length > 0) {
        const lastNonCleaningItem = [...nonCleaningItems].sort((a, b) => {
          return timeToMinutes(b.endTime) - timeToMinutes(a.endTime);
        })[0];
        
        updatedGroup.color = getColorByEndTime(lastNonCleaningItem.endTime, false, true);
      }
    }
  }

  return updatedGroup;
};

// 更新群組後的所有手術時間
export const updateFollowingItemsTime = (roomData, startIndex, roomName) => {
  if (!roomData || roomData.length <= startIndex) return;
  
  // 獲取清潔時間設置
  const cleaningDuration = getCleaningDuration(true);
  let currentTime = null;
  
  // 獲取前一個項目的結束時間作為起點
  if (startIndex > 0) {
    currentTime = roomData[startIndex - 1].endTime;
  } else {
    // 如果沒有前一個項目，使用默認起始時間
    const timeSettings = getTimeSettings(true);
    const startHour = Math.floor(timeSettings.surgeryStartTime / 60);
    const startMinute = timeSettings.surgeryStartTime % 60;
    currentTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
  }
  
  // 收集需要更新時間的手術ID和時間信息
  const surgeriesNeedUpdate = [];
  
  // 依序更新每個項目的時間
  for (let i = startIndex; i < roomData.length; i++) {
    const item = roomData[i];
    
    // 更新項目的開始時間
    item.startTime = currentTime;
    
    // 計算或維持項目的持續時間
    let duration;
    if (item.duration) {
      duration = item.duration;
    } else if (item.isCleaningTime) {
      duration = cleaningDuration;
    } else {
      // 維持原有手術的時間長度
      duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
    }
    
    // 更新結束時間
    item.endTime = minutesToTime(timeToMinutes(currentTime) + duration);
    
    // 如果是正常手術項目（非銜接時間且非群組），添加到需要更新的列表
    if (!item.isCleaningTime && !item.isGroup && item.applicationId) {
      surgeriesNeedUpdate.push({
        id: item.applicationId,
        startTime: item.startTime,
        endTime: item.endTime
      });
    }
    
    // 更新下一個項目的開始時間基準
    currentTime = item.endTime;
    
    // 如果是群組，確保群組內部時間也更新
    if (item.isGroup && item.surgeries && item.surgeries.length > 0) {
      let groupCurrentTime = item.startTime;
      for (let j = 0; j < item.surgeries.length; j++) {
        const surgery = item.surgeries[j];
        surgery.startTime = groupCurrentTime;
        
        // 計算持續時間
        let surgeryDuration;
        if (surgery.duration) {
          surgeryDuration = surgery.duration;
        } else if (surgery.isCleaningTime) {
          surgeryDuration = cleaningDuration;
        } else {
          surgeryDuration = timeToMinutes(surgery.endTime) - timeToMinutes(surgery.startTime);
        }
        
        // 更新結束時間
        surgery.endTime = minutesToTime(timeToMinutes(groupCurrentTime) + surgeryDuration);
        groupCurrentTime = surgery.endTime;
        
        // 如果是非銜接時間項目且有applicationId，添加到需要更新的列表
        if (!surgery.isCleaningTime && surgery.applicationId) {
          surgeriesNeedUpdate.push({
            id: surgery.applicationId,
            startTime: surgery.startTime,
            endTime: surgery.endTime
          });
        }
      }
    }
  }
  
  // 更新後方的手術時間到後端資料庫
  if (surgeriesNeedUpdate.length > 0) {
    console.log("🔄 更新後方手術時間到資料庫:", surgeriesNeedUpdate);
    
    // 批量更新手術時間，使用Promise.all處理並行請求
    Promise.all(surgeriesNeedUpdate.map(surgery => 
      axios.put(`${BASE_URL}/api/system/surgery/${surgery.id}/time`, {
        startTime: surgery.startTime,
        endTime: surgery.endTime
      })
      .then(response => {
        console.log(`✅ 成功更新手術 ${surgery.id} 時間`, response.data);
        return { success: true, id: surgery.id };
      })
      .catch(error => {
        console.error(`❌ 更新手術 ${surgery.id} 時間失敗:`, error);
        return { success: false, id: surgery.id, error: error.message };
      })
    ))
    .then(results => {
      const successful = results.filter(r => r.success).length;
      console.log(`🏁 完成時間更新: ${successful} 成功, ${results.length - successful} 失敗`);
      
      // 如果有更新失敗的，可以在這裡添加重試邏輯或通知用戶
      if (successful < results.length) {
        console.warn("⚠️ 有些手術時間更新失敗，頁面切換後可能顯示不正確");
      }
    });
  }
  
  return roomData;
}; 
