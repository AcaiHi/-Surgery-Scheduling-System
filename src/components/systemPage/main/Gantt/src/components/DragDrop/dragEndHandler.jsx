import axios from 'axios';
import { calculateDuration, addMinutesToTime, getTimeSettings, isTimeAfterNextDay8AM } from '../Time/timeUtils';
import { getColorByEndTime, getCleaningColor } from '../ROOM/colorUtils';
import { BASE_URL } from "/src/config";
import {
  timeToMinutes,
  minutesToTime,
  updateGroupTimes,
  createCleaningTimeItem
} from '../ROOM/GroupOperations';
import { use, useEffect } from 'react';

// 修改：處理拖曳結束，增加對群組的處理
export const handleDragEnd = async (result, rows, setRows) => {
  console.log("開始處理拖曳結束事件");
  console.log("拖曳結果:", result);
  const { source, destination } = result;
  if (!destination) return null;

  const sourceRoomIndex = parseInt(source.droppableId.split("-")[1], 10);
  const destinationRoomIndex = parseInt(destination.droppableId.split("-")[1], 10);

  console.log(`從手術室 ${sourceRoomIndex} 拖曳到手術室 ${destinationRoomIndex}`);

  const sourceIndex = source.index * 2;
  const destinationIndex = destination.index * 2;

  const newRows = [...rows];

  // 檢查是否為群組拖曳
  const draggedId = result.draggableId;
  const isGroupDrag = draggedId.includes('draggable-group-');
  const isContainerDrag = draggedId.includes('draggable-container-');

  if (isGroupDrag) {
    console.log("群組拖曳操作");
    handleGroupDrag(newRows, sourceRoomIndex, destinationRoomIndex, sourceIndex, destinationIndex);
  } else if (isContainerDrag) {
    console.log("多選容器拖曳操作");
    // 多選拖曳在 Gantt.jsx 中的 handleMultiItemDragEnd 函數中處理
    // 這裡不需要額外處理
  } else if (sourceRoomIndex === destinationRoomIndex) {
    console.log("同一手術室內的拖曳操作");
    handleSameRoomDrag(newRows, sourceRoomIndex, sourceIndex, destinationIndex);
  } else {
    console.log("跨手術室的拖曳操作");
    handleCrossRoomDrag(result, newRows, sourceRoomIndex, destinationRoomIndex, sourceIndex, destinationIndex);
  }

  // 檢查是否有手術時間超過隔天早上8點
  // let hasOverNextDay = false;
  // let overTimeRoom = null;

  // for (let i = 0; i < newRows.length; i++) {
  //   const roomData = newRows[i].data;
  //   if (!roomData) continue;

  //   for (let j = 0; j < roomData.length; j++) {
  //     const item = roomData[j];
  //     if (item.isCleaningTime) continue; // 跳過銜接時間

  //     if (isTimeAfterNextDay8AM(item.endTime)) {
  //       hasOverNextDay = true;
  //       overTimeRoom = newRows[i].room || `手術室 ${i+1}`;
  //       break;
  //     }

  //     // 檢查群組內的手術
  //     if (item.isGroup && item.surgeries) {
  //       for (let k = 0; k < item.surgeries.length; k++) {
  //         const surgery = item.surgeries[k];
  //         if (surgery.isCleaningTime) continue;

  //         if (isTimeAfterNextDay8AM(surgery.endTime)) {
  //           hasOverNextDay = true;
  //           overTimeRoom = newRows[i].room || `手術室 ${i+1}`;
  //           break;
  //         }
  //       }
  //     }

  //     if (hasOverNextDay) break;
  //   }

  //   if (hasOverNextDay) break;
  // }

  // // 如果有手術時間超過隔天早上8點，顯示警告訊息
  // if (hasOverNextDay) {
  //   alert(`警告：${overTimeRoom}中有手術排程超過隔天早上8點，請調整排程時間！`);
  // }

  // 只更新前端界面，不發送後端請求
  setRows(newRows);
  console.log("前端界面更新完成，標記有未保存的變更");

  // 觸發自定義事件，通知TimeWrapper組件重新渲染
  window.dispatchEvent(new CustomEvent('ganttDragEnd'));

  // 返回更新後的行數據和變更狀態
  return {
    updatedRows: newRows,
    hasChanges: true  // 確保每次拖曳操作都會設置 hasChanges
  };
};

// 處理群組拖曳
const handleGroupDrag = (newRows, sourceRoomIndex, destinationRoomIndex, sourceIndex, destinationIndex) => {
  const sourceRoomData = newRows[sourceRoomIndex].data;
  const destRoomData = newRows[destinationRoomIndex].data;
  const roomName = newRows[destinationRoomIndex].room || '手術室';
  const destRoomId = newRows[destinationRoomIndex].roomId;
  const sourceRoomId = newRows[sourceRoomIndex].roomId;

  // 查找被拖曳的群組
  // 直接找出符合群組屬性的項目，而不使用 result 變數
  const groupItemIndex = sourceRoomData.findIndex(item =>
    item.isGroup && sourceIndex === sourceRoomData.indexOf(item) * 2
  );

  if (groupItemIndex === -1) {
    console.error('找不到被拖曳的群組項');
    return;
  }

  // 獲取群組項
  const groupItem = sourceRoomData[groupItemIndex];

  // 檢查群組後面是否有銜接時間，如果有也需要移除
  let itemsToRemove = 1;
  if (groupItemIndex < sourceRoomData.length - 1 && sourceRoomData[groupItemIndex + 1].isCleaningTime) {
    itemsToRemove = 2; // 同時移除群組和後續的銜接時間
  }

  // 從源房間移除群組項和相關銜接時間
  sourceRoomData.splice(groupItemIndex, itemsToRemove);

  // 更新源房間的時間，使用true參數避免自動添加尾部銜接時間
  if (sourceRoomData.length > 0) {
    updateRoomTimes(sourceRoomData, true);
  }

  // 插入到目標房間
  // 檢查插入位置是否有效
  let insertIndex = destinationIndex;
  if (insertIndex > destRoomData.length) {
    insertIndex = destRoomData.length;
  }

  // 獲取前後項目，用於調整群組時間
  const prevItem = insertIndex > 0 ? destRoomData[insertIndex - 1] : null;
  const nextItem = insertIndex < destRoomData.length ? destRoomData[insertIndex] : null;

  // 調整群組時間以匹配插入位置
  const updatedGroup = updateGroupTimes(groupItem, prevItem, nextItem, roomName);

  // 更新群組內容
  updatedGroup.operatingRoomName = roomName;
  updatedGroup.roomId = destRoomId;

  // 取得所有群組內的手術IDs (不包含銜接時間)
  const groupSurgeryIds = updatedGroup.surgeries
    .filter(surgery => !surgery.isCleaningTime)
    .map(surgery => surgery.applicationId);

  // 更新群組內部手術的手術室名稱
  if (updatedGroup.surgeries && updatedGroup.surgeries.length > 0) {
    updatedGroup.surgeries = updatedGroup.surgeries.map(surgery => ({
      ...surgery,
      operatingRoomName: roomName
    }));
  }

  // 插入更新後的群組
  destRoomData.splice(insertIndex, 0, updatedGroup);

  // 確保時間連續性
  if (sourceRoomIndex !== destinationRoomIndex) {
    // 如果是跨房間拖曳，需要插入銜接時間
    // 檢查前面是否需要插入銜接時間
    if (insertIndex > 0 && !destRoomData[insertIndex - 1].isCleaningTime && !updatedGroup.isCleaningTime) {
      const prevSurgery = destRoomData[insertIndex - 1];
      const cleaningItem = createCleaningTimeItem(
        prevSurgery.endTime,
        updatedGroup.startTime,
        roomName
      );
      destRoomData.splice(insertIndex, 0, cleaningItem);
      insertIndex++;
    }

    // 檢查後面是否需要插入銜接時間
    const afterIndex = insertIndex + 1;
    if (afterIndex < destRoomData.length && !destRoomData[afterIndex].isCleaningTime && !updatedGroup.isCleaningTime) {
      const cleaningItem = createCleaningTimeItem(
        updatedGroup.endTime,
        destRoomData[afterIndex].startTime,
        roomName
      );
      destRoomData.splice(afterIndex, 0, cleaningItem);
    }
  }

  // 重新計算目標房間的時間
  updateRoomTimes(destRoomData);

  // 更新手術順序 (只需要更新非群組手術的順序)
  if (sourceRoomIndex !== destinationRoomIndex) {
    // 只有非群組手術才需要更新 orderInRoom
    const regularSurgeries = sourceRoomData.filter(item => !item.isCleaningTime && !item.isGroup);
    regularSurgeries.forEach((surgery, index) => {
      const newOrder = index + 1;
      surgery.orderInRoom = newOrder;

      axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/order-in-room`, {
        orderInRoom: newOrder,
        operatingRoomId: sourceRoomId
      }).then(() => {
        console.log(`✅ 已更新 ${surgery.applicationId} 的 orderInRoom 為 ${newOrder}`);
      }).catch((err) => {
        console.error(`❌ 更新 ${surgery.applicationId} 的順序失敗`, err);
      });
    });

    // 目標房間裡的常規手術更新
    const destRegularSurgeries = destRoomData.filter(item => !item.isCleaningTime && !item.isGroup);
    destRegularSurgeries.forEach((surgery, index) => {
      const newOrder = index + 1;
      surgery.orderInRoom = newOrder;

      axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/order-in-room`, {
        orderInRoom: newOrder,
        operatingRoomId: destRoomId
      }).then(() => {
        console.log(`✅ 已更新 ${surgery.applicationId} 的 orderInRoom 為 ${newOrder}`);
      }).catch((err) => {
        console.error(`❌ 更新 ${surgery.applicationId} 的順序失敗`, err);
      });
    });

    // 更新群組主手術的手術室和順序
    const mainGroupSurgeryId = groupSurgeryIds[0]; // 主手術 ID

    // 更新主手術的順序和房間ID
    const groupIndex = destRegularSurgeries.findIndex(s => s.isGroup);
    const groupOrder = groupIndex !== -1 ? groupIndex + 1 : 1;

    // 更新主手術的房間和順序
    // 首先更新手術室ID
    axios.put(`${BASE_URL}/api/system/surgery/${mainGroupSurgeryId}/${destRoomId}`)
      .then(response => {
        console.log(`✅ 已更新群組主手術 ${mainGroupSurgeryId} 的手術室 ID 為 ${destRoomId}`);

        // 然後再更新順序
        axios.put(`${BASE_URL}/api/system/surgery/${mainGroupSurgeryId}/order-in-room`, {
          orderInRoom: groupOrder
        }).then(() => {
          console.log(`✅ 已更新群組主手術 ${mainGroupSurgeryId} 的 orderInRoom 為 ${groupOrder}`);
        }).catch(err => {
          console.error(`❌ 更新群組主手術 ${mainGroupSurgeryId} 的順序失敗`, err);
        });
      })
      .catch(error => {
        console.error(`❌ 更新群組主手術 ${mainGroupSurgeryId} 的手術室失敗:`, error);
      });

    // 更新所有群組成員的手術室資訊（無需設置orderInRoom）
    for (let i = 1; i < groupSurgeryIds.length; i++) {
      const surgeryId = groupSurgeryIds[i];

      // 先更新手術室ID
      axios.put(`${BASE_URL}/api/system/surgery/${surgeryId}/${destRoomId}`)
        .then(response => {
          console.log(`✅ 已更新群組附屬手術 ${surgeryId} 的手術室 ID`);

          // 再設置 orderInRoom 為 null
          axios.put(`${BASE_URL}/api/system/surgery/${surgeryId}/order-in-room`, {
            orderInRoom: null
          }).then(() => {
            console.log(`✅ 已更新群組附屬手術 ${surgeryId} 的 orderInRoom 為 null`);
          }).catch(err => {
            console.error(`❌ 更新群組附屬手術 ${surgeryId} 的順序失敗`, err);
          });
        })
        .catch(error => {
          console.error(`❌ 更新群組附屬手術 ${surgeryId} 的手術室失敗:`, error);
        });
    }
  } else {
    // 同一房間內移動，只需要更新順序
    const surgeriesOnly = destRoomData.filter(item => !item.isCleaningTime);

    // 當是同一房間時，更新所有手術的順序，但群組附屬手術設為 null
    surgeriesOnly.forEach((surgery, index) => {
      // 如果是群組，直接跳過，之後單獨處理
      if (surgery.isGroup) return;

      // 如果是附屬手術（在群組中但不是主手術）
      const isInGroup = Array.isArray(surgery.groupApplicationIds) &&
        surgery.groupApplicationIds.length > 0 &&
        surgery.applicationId !== surgery.groupApplicationIds[0];

      const newOrder = isInGroup ? null : index + 1;
      surgery.orderInRoom = newOrder;

      axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/order-in-room`, {
        orderInRoom: newOrder
      }).then(() => {
        console.log(`✅ 已更新 ${surgery.applicationId} 的 orderInRoom 為 ${newOrder}`);
      }).catch((err) => {
        console.error(`❌ 更新 ${surgery.applicationId} 的順序失敗`, err);
      });
    });

    // 更新群組主手術的順序
    const mainGroupSurgeryId = groupSurgeryIds[0];
    const groupIndex = surgeriesOnly.findIndex(s => s.isGroup);
    const groupOrder = groupIndex !== -1 ? groupIndex + 1 : 1;

    axios.put(`${BASE_URL}/api/system/surgery/${mainGroupSurgeryId}/order-in-room`, {
      orderInRoom: groupOrder
    }).then(() => {
      console.log(`✅ 已更新群組主手術 ${mainGroupSurgeryId} 的 orderInRoom 為 ${groupOrder}`);
    }).catch((err) => {
      console.error(`❌ 更新群組主手術 ${mainGroupSurgeryId} 的順序失敗`, err);
    });
  }
};

// 這個函數現在僅供 ConfirmScheduleButton 組件使用
// 修改函數只接受 rows 參數，並遍歷所有房間更新資料庫
export const updateSurgeryInDatabase = async (rows) => {
  console.log("開始更新資料庫...");
  try {
    // 儲存所有更新的房間，用於最後回傳結果
    const updatedRooms = [];
    let errorCount = 0;

    // 遍歷所有房間，更新每個房間的手術時間
    for (let roomIndex = 0; roomIndex < rows.length; roomIndex++) {
      const room = rows[roomIndex];

      if (!room.data || room.data.length === 0) {
        console.log(`跳過空房間: ${room.room || roomIndex}`);
        continue;
      }

      console.log(`處理手術室 ${room.room || roomIndex} 的資料`);

      // 過濾出實際手術（非銜接時間）
      const surgeries = room.data.filter(item => !item.isCleaningTime);
      console.log(`該手術室有 ${surgeries.length} 個手術需要更新`);

      // 手術室ID
      const operatingRoomId = room.roomId || room.room;

      // 初始化開始時間為08:30
      let currentTime = "08:30";

      // 遍歷該房間的所有手術，按顯示順序更新
      for (let i = 0; i < surgeries.length; i++) {
        const surgery = surgeries[i];

        // 計算實際時間
        const surgeryStartTime = currentTime;
        const surgeryEndTime = addMinutesToTime(currentTime, surgery.duration);

        // 準備更新資料 - 加入優先順序資訊但不強制排序
        const updateData = {
          operatingRoomId: operatingRoomId,
          estimatedSurgeryTime: surgery.duration,
          operatingRoomName: room.room,
          prioritySequence: i + 1
        };

        console.log(`準備更新手術 ${surgery.applicationId}，房間: ${room.room}，順序: ${i + 1}`);
        console.log("更新數據:", JSON.stringify(updateData));

        // 發送更新請求
        try {
          // 確認 API 路徑是否正確
          const apiUrl = `${BASE_URL}/api/surgeries/${surgery.applicationId}`;
          console.log("API 請求地址:", apiUrl);

          const response = await axios.put(apiUrl, updateData);

          if (response.data) {
            console.log(`手術 ${surgery.applicationId} 更新成功，服務器響應:`, response.data);
            // 確保本地資料與後端同步
            surgery.operatingRoomName = room.room;
            surgery.prioritySequence = i + 1;
            updatedRooms.push({
              applicationId: surgery.applicationId,
              roomId: operatingRoomId,
              prioritySequence: i + 1
            });
          } else {
            console.error(`手術 ${surgery.applicationId} 返回空響應`);
            errorCount++;
          }
        } catch (error) {
          console.error(`更新手術 ${surgery.applicationId} 時出錯:`, error);
          console.error('錯誤詳情:', error.response?.data || error.message);
          errorCount++;
        }

        currentTime = addMinutesToTime(surgeryEndTime, 45);
      }
    }

    console.log(`資料庫更新完成，成功: ${updatedRooms.length} 個，失敗: ${errorCount} 個`);
    return updatedRooms;
  } catch (error) {
    console.error('更新手術資訊到資料庫時發生錯誤:', error);
    throw error;
  }
};

const handleSameRoomDrag = (newRows, roomIndex, sourceIndex, destinationIndex) => {
  const roomData = newRows[roomIndex].data;

  // 檢查被拖曳的項目是否為銜接時間
  const isDraggingCleaningTime = roomData[sourceIndex]?.isCleaningTime;
  if (isDraggingCleaningTime) {
    console.log("禁止直接拖曳銜接時間");
    return;
  }

  // 如果目標位置是銜接時間，調整到相鄰的手術位置
  if (destinationIndex < roomData.length && roomData[destinationIndex]?.isCleaningTime) {
    destinationIndex = destinationIndex % 2 === 0 ? destinationIndex + 1 : destinationIndex - 1;
  }

  // 移除拖曳手術（含其銜接時間）
  const itemsToMove = roomData[sourceIndex + 1]?.isCleaningTime
    ? roomData.splice(sourceIndex, 2)
    : roomData.splice(sourceIndex, 1);

  let targetIndex = destinationIndex;
  if (targetIndex > roomData.length) {
    targetIndex = roomData.length;
  }

  // 插入拖曳項目
  roomData.splice(targetIndex, 0, ...itemsToMove);

  console.log(`拖曳至相同房間：從 ${sourceIndex} 到 ${destinationIndex}`);

  // 重新排序並更新 orderInRoom
  const surgeriesOnly = roomData.filter(item => !item.isCleaningTime);

  surgeriesOnly.forEach((surgery, index) => {
    // 判斷是否為附屬手術（在群組中但不是主手術）
    const isSubsidiarySurgery = Array.isArray(surgery.groupApplicationIds) &&
      surgery.groupApplicationIds.length > 0 &&
      surgery.applicationId !== surgery.groupApplicationIds[0];

    // 如果是附屬手術，不設置 orderInRoom (設為null)
    const newOrder = isSubsidiarySurgery ? null : index + 1;

    console.log(`手術：${surgery.applicationId}，新順序：${newOrder}`);
    if (surgery.orderInRoom !== newOrder) {
      surgery.orderInRoom = newOrder;

      // 發送更新到後端
      axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/order-in-room`,
        { orderInRoom: newOrder }
      )
        .then(() => {
          console.log(`✅ 已更新 ${surgery.applicationId} 的 orderInRoom 為 ${newOrder}`);
        }).catch((err) => {
          console.error(`❌ 更新 ${surgery.applicationId} 的順序失敗`, err);
        });
    }
  });

  // 最後更新時間顯示
  updateRoomTimes(roomData);
};


const handleCrossRoomDrag = (result, newRows, sourceRoomIndex, destRoomIndex, sourceIndex, destinationIndex) => {
  const sourceRoomData = newRows[sourceRoomIndex].data;
  const destRoomData = newRows[destRoomIndex].data;
  const roomName = newRows[destRoomIndex].room || '手術室';

  console.log("🔁 跨手術房拖曳操作");

  const isDraggingCleaningTime = sourceRoomData[sourceIndex]?.isCleaningTime;
  if (isDraggingCleaningTime) {
    console.log("❌ 禁止拖曳銜接時間");
    return;
  }

  // ✅ Step 1: 取出 surgery + 可能存在的 cleaningTime
  const itemsToMove = [];
  const surgery = sourceRoomData[sourceIndex];
  itemsToMove.push(surgery);

  if (sourceRoomData[sourceIndex + 1]?.isCleaningTime) {
    itemsToMove.push(sourceRoomData[sourceIndex + 1]);
  }

  sourceRoomData.splice(sourceIndex, itemsToMove.length);

  let targetIndex = destinationIndex;
  if (targetIndex > destRoomData.length) targetIndex = destRoomData.length;

  // 如果插入點是 cleaningTime，調整到附近的手術
  if (destRoomData[targetIndex]?.isCleaningTime) {
    targetIndex = targetIndex % 2 === 0 ? targetIndex + 1 : targetIndex - 1;
  }

  surgery.operatingRoomName = roomName;

  // ✅ Step 2: 直接插入 surgery + 已有的 cleaningTime
  destRoomData.splice(targetIndex, 0, ...itemsToMove);

  // ✅ Step 3: 更新時間（不再插銜接時間了！）
  updateRoomTimes(sourceRoomData, true);
  updateRoomTimes(destRoomData);

  // 判斷當前手術是否為群組的一部分
  const isInGroup = Array.isArray(surgery.groupApplicationIds) &&
    surgery.groupApplicationIds.length > 0;

  if (isInGroup) {
    // 如果是群組內的手術，需要更新整個群組所有成員的手術室
    const groupIds = surgery.groupApplicationIds;
    console.log(`群組手術拖曳：手術 ${result.draggableId} 是群組 ${groupIds.join(',')} 的一部分`);

    // 取得主手術ID和附屬手術ID
    const mainSurgeryId = groupIds[0];
    const otherSurgeryIds = groupIds.slice(1);

    // 更新主手術的手術室ID及順序
    axios.put(`${BASE_URL}/api/system/surgery/${mainSurgeryId}/${newRows[destRoomIndex].roomId}`)
      .then(response => {
        console.log(`✅ 已更新群組主手術 ${mainSurgeryId} 的手術室 ID`);

        // 主手術需要設定orderInRoom
        const surgeriesOnly = destRoomData.filter(item => !item.isCleaningTime && !item.isGroup);
        const newOrder = surgeriesOnly.findIndex(s => s.applicationId === mainSurgeryId) + 1;

        axios.put(`${BASE_URL}/api/system/surgery/${mainSurgeryId}/order-in-room`, {
          orderInRoom: newOrder
        }).then(() => {
          console.log(`✅ 已更新群組主手術 ${mainSurgeryId} 的 orderInRoom 為 ${newOrder}`);
        }).catch(err => {
          console.error(`❌ 更新群組主手術 ${mainSurgeryId} 的順序失敗`, err);
        });
      })
      .catch(error => {
        console.error(`❌ 更新群組主手術 ${mainSurgeryId} 的手術室失敗:`, error);
      });

    // 更新附屬手術的手術室ID，但orderInRoom設為null
    for (const surgeryId of otherSurgeryIds) {
      axios.put(`${BASE_URL}/api/system/surgery/${surgeryId}/${newRows[destRoomIndex].roomId}`)
        .then(response => {
          console.log(`✅ 已更新群組附屬手術 ${surgeryId} 的手術室 ID`);

          // 附屬手術設置orderInRoom為null
          axios.put(`${BASE_URL}/api/system/surgery/${surgeryId}/order-in-room`, {
            orderInRoom: null
          }).then(() => {
            console.log(`✅ 已更新群組附屬手術 ${surgeryId} 的 orderInRoom 為 null`);
          }).catch(err => {
            console.error(`❌ 更新群組附屬手術 ${surgeryId} 的順序失敗`, err);
          });
        })
        .catch(error => {
          console.error(`❌ 更新群組附屬手術 ${surgeryId} 的手術室失敗:`, error);
        });
    }

    // 更新源房間的非群組手術順序
    const sourceNonGroupSurgeries = sourceRoomData.filter(item =>
      !item.isCleaningTime &&
      !item.isGroup &&
      !(Array.isArray(item.groupApplicationIds) && item.groupApplicationIds.length > 0)
    );

    sourceNonGroupSurgeries.forEach((surgery, index) => {
      const newOrder = index + 1;
      axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/${newRows[sourceRoomIndex].roomId}`)
        .then(response => {
          console.log(`✅ 已確認源房間手術 ${surgery.applicationId} 的手術室 ID`);

          axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/order-in-room`, {
            orderInRoom: newOrder
          }).then(() => {
            console.log(`✅ 已更新源房間手術 ${surgery.applicationId} 的 orderInRoom 為 ${newOrder}`);
          }).catch(err => {
            console.error(`❌ 更新源房間手術 ${surgery.applicationId} 的順序失敗`, err);
          });
        })
        .catch(error => {
          console.error(`❌ 更新源房間手術 ${surgery.applicationId} 的手術室確認失敗:`, error);
        });
    });

    // 更新目標房間的非群組手術順序
    const destNonGroupSurgeries = destRoomData.filter(item =>
      !item.isCleaningTime &&
      !item.isGroup &&
      !(Array.isArray(item.groupApplicationIds) && item.groupApplicationIds.length > 0)
    );

    destNonGroupSurgeries.forEach((surgery, index) => {
      const newOrder = index + 1;
      axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/${newRows[destRoomIndex].roomId}`)
        .then(response => {
          console.log(`✅ 已確認目標房間手術 ${surgery.applicationId} 的手術室 ID`);

          axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/order-in-room`, {
            orderInRoom: newOrder
          }).then(() => {
            console.log(`✅ 已更新目標房間手術 ${surgery.applicationId} 的 orderInRoom 為 ${newOrder}`);
          }).catch(err => {
            console.error(`❌ 更新目標房間手術 ${surgery.applicationId} 的順序失敗`, err);
          });
        })
        .catch(error => {
          console.error(`❌ 更新目標房間手術 ${surgery.applicationId} 的手術室確認失敗:`, error);
        });
    });
  } else {
    // 如果是單個手術，只更新這一個手術的手術室
    axios.put(`${BASE_URL}/api/system/surgery/${result.draggableId}/${newRows[destRoomIndex].roomId}`)
      .then(response => {
        console.log("手術室更新成功:", response.data);
      })
      .catch(error => {
        console.error("手術室更新失敗:", error);
      });

    // 更新源房間和目標房間的非群組手術順序
    const sourceNonGroupSurgeries = sourceRoomData.filter(item =>
      !item.isCleaningTime && !item.isGroup
    );
    const destNonGroupSurgeries = destRoomData.filter(item =>
      !item.isCleaningTime && !item.isGroup
    );

    // 更新源房間非群組手術順序
    sourceNonGroupSurgeries.forEach((surgery, index) => {
      const newOrder = index + 1;
      axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/${newRows[sourceRoomIndex].roomId}`)
        .then(response => {
          console.log(`✅ 已確認源房間手術 ${surgery.applicationId} 的手術室 ID`);

          axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/order-in-room`, {
            orderInRoom: newOrder
          }).then(() => {
            console.log(`✅ 已更新源房間手術 ${surgery.applicationId} 的 orderInRoom 為 ${newOrder}`);
          }).catch(err => {
            console.error(`❌ 更新源房間手術 ${surgery.applicationId} 的順序失敗`, err);
          });
        })
        .catch(error => {
          console.error(`❌ 更新源房間手術 ${surgery.applicationId} 的手術室確認失敗:`, error);
        });
    });

    // 更新目標房間非群組手術順序
    destNonGroupSurgeries.forEach((surgery, index) => {
      const newOrder = index + 1;
      axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/${newRows[destRoomIndex].roomId}`)
        .then(response => {
          console.log(`✅ 已確認目標房間手術 ${surgery.applicationId} 的手術室 ID`);

          axios.put(`${BASE_URL}/api/system/surgery/${surgery.applicationId}/order-in-room`, {
            orderInRoom: newOrder
          }).then(() => {
            console.log(`✅ 已更新目標房間手術 ${surgery.applicationId} 的 orderInRoom 為 ${newOrder}`);
          }).catch(err => {
            console.error(`❌ 更新目標房間手術 ${surgery.applicationId} 的順序失敗`, err);
          });
        })
        .catch(error => {
          console.error(`❌ 更新目標房間手術 ${surgery.applicationId} 的手術室確認失敗:`, error);
        });
    });
  }
};

const updateRoomTimes = (roomData, skipAddLastCleaningTime = false) => {
  if (!roomData || roomData.length === 0) return;

  // 從時間設定中獲取起始時間和銜接時間
  const timeSettings = getTimeSettings(true);
  const startHour = Math.floor(timeSettings.surgeryStartTime / 60);
  const startMinute = timeSettings.surgeryStartTime % 60;
  const initialTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

  let currentTime = initialTime;

  for (let i = 0; i < roomData.length; i++) {
    const item = roomData[i];

    // 跳過已經處理過的群組內部項目
    if (item._processedInGroup) continue;

    if (item.isGroup) {
      // 處理群組項目
      item.startTime = currentTime;
      const groupDuration = calculateGroupDuration(item);
      item.endTime = addMinutesToTime(currentTime, groupDuration);

      // 將時間傳遞到群組內部項目
      if (item.surgeries && item.surgeries.length > 0) {
        let groupItemTime = currentTime;
        for (let j = 0; j < item.surgeries.length; j++) {
          const surgery = item.surgeries[j];
          surgery.startTime = groupItemTime;

          if (surgery.isCleaningTime) {
            // 銜接時間固定
            surgery.endTime = addMinutesToTime(groupItemTime, timeSettings.cleaningTime);
            surgery.color = getCleaningColor();
          } else {
            // 手術時間按比例縮放
            const surgeryDuration = calculateDuration(surgery.startTime, surgery.endTime);
            surgery.endTime = addMinutesToTime(groupItemTime, surgeryDuration);
            surgery.color = getColorByEndTime(surgery.endTime, false, false, surgery.isGroup);

            // 如果是最後一個手術且不是銜接時間，需要添加銜接時間
            if (j === item.surgeries.length - 1 && !surgery.isCleaningTime) {
              const cleaningTime = {
                isCleaningTime: true,
                startTime: surgery.endTime,
                endTime: addMinutesToTime(surgery.endTime, timeSettings.cleaningTime),
                color: getCleaningColor(),
                operatingRoomName: surgery.operatingRoomName,
                _processedInGroup: true
              };
              item.surgeries.push(cleaningTime);
            }
          }

          groupItemTime = surgery.endTime;
          surgery._processedInGroup = true;
        }

        // 確保最後一個項目的結束時間與群組結束時間一致
        if (item.surgeries.length > 0) {
          item.surgeries[item.surgeries.length - 1].endTime = item.endTime;
        }
      }

      // 群組結束後，更新當前時間
      currentTime = item.endTime;
    } else if (i + 1 < roomData.length && roomData[i + 1].isCleaningTime) {
      // 處理普通手術，且後面有銜接時間
      const surgery = item;
      const cleaning = roomData[i + 1];

      surgery.startTime = currentTime;
      const surgeryDuration = surgery.duration || calculateDuration(surgery.startTime, surgery.endTime);
      surgery.endTime = addMinutesToTime(currentTime, surgeryDuration);
      surgery.color = getColorByEndTime(surgery.endTime, false, false, surgery.groupApplicationIds.length > 0);

      cleaning.startTime = surgery.endTime;
      cleaning.endTime = addMinutesToTime(surgery.endTime, timeSettings.cleaningTime);
      cleaning.color = getCleaningColor();

      currentTime = cleaning.endTime;
      i++; // 跳過已處理的銜接時間
    } else if (item.isCleaningTime) {
      // 單獨的銜接時間
      item.startTime = currentTime;
      item.endTime = addMinutesToTime(currentTime, timeSettings.cleaningTime);
      item.color = getCleaningColor();

      currentTime = item.endTime;
    } else {
      // 普通手術，後面沒有銜接時間
      item.startTime = currentTime;
      const surgeryDuration = item.duration || calculateDuration(item.startTime, item.endTime);
      item.endTime = addMinutesToTime(currentTime, surgeryDuration);
      item.color = getColorByEndTime(surgery.endTime, false, false, surgery.isGroup);

      // 如果是最後一個項目且不是銜接時間，添加銜接時間
      if (!skipAddLastCleaningTime && i === roomData.length - 1 && !item.isCleaningTime) {
        const cleaningTime = {
          isCleaningTime: true,
          startTime: item.endTime,
          endTime: addMinutesToTime(item.endTime, timeSettings.cleaningTime),
          color: getCleaningColor(),
          operatingRoomName: item.operatingRoomName
        };
        roomData.push(cleaningTime);
      }

      currentTime = item.endTime;
    }
  }

  // 清除處理標記
  for (let i = 0; i < roomData.length; i++) {
    if (roomData[i]._processedInGroup) {
      delete roomData[i]._processedInGroup;
    }

    if (roomData[i].surgeries) {
      for (let j = 0; j < roomData[i].surgeries.length; j++) {
        if (roomData[i].surgeries[j]._processedInGroup) {
          delete roomData[i].surgeries[j]._processedInGroup;
        }
      }
    }
  }
};

// 計算群組的總持續時間
const calculateGroupDuration = (group) => {
  if (!group.surgeries || group.surgeries.length === 0) {
    return 60; // 預設1小時
  }

  // 使用原始持續時間總和
  let totalMinutes = 0;
  for (let i = 0; i < group.surgeries.length; i++) {
    const item = group.surgeries[i];
    if (item.isCleaningTime) {
      // 銜接時間使用固定值
      totalMinutes += getTimeSettings(true).cleaningTime || 45;
    } else {
      // 手術時間使用原始設定或計算值
      const duration = item.duration || calculateDuration(item.startTime, item.endTime);
      totalMinutes += duration;
    }
  }

  return totalMinutes;
};