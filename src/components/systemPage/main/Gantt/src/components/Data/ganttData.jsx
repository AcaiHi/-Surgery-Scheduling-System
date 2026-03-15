import axios from 'axios';
import { addMinutesToTime, getTimeSettings } from '../Time/timeUtils';
import { getColorByEndTime, getCleaningColor } from '../ROOM/colorUtils';
import { BASE_URL } from "/src/config";

export const fetchSurgeryData = async (setRows, setLoading, setError, isMainPage = false) => {
  setLoading(true);
  setError(null);
  try {
    const operatingRoomsResponse = await axios.get(`${BASE_URL}/api/system/operating-rooms`, {
      headers: { 'Content-Type': 'application/json' }
    });

    const allRoomsWithSurgeries = [];

    const openRooms = operatingRoomsResponse.data.filter(room => room.status !== 0);
    const closedRooms = operatingRoomsResponse.data.filter(room => room.status === 0);

    let reservedClosedRooms = [];
    if (!isMainPage) {
      try {
        const reservedRoomsStr = localStorage.getItem('reservedClosedRooms');
        if (reservedRoomsStr) {
          reservedClosedRooms = JSON.parse(reservedRoomsStr);
        }
      } catch (error) {
        console.error('解析保留手術房出錯:', error);
      }
    }

    // 從 localStorage 讀取釘選狀態
    let pinnedRooms = {};
    try {
      const pinnedRoomsStr = localStorage.getItem('pinnedRooms');
      if (pinnedRoomsStr) {
        pinnedRooms = JSON.parse(pinnedRoomsStr);
      }
    } catch (error) {
      console.error('解析釘選手術房狀態出錯:', error);
    }

    const filteredOperatingRooms = isMainPage ? openRooms : [...openRooms, ...reservedClosedRooms];

    for (const room of filteredOperatingRooms) {
      try {
        const surgeriesResponse = await axios.get(`${BASE_URL}/api/system/operating-rooms/${room.id}/surgery`, {
          headers: { 'Content-Type': 'application/json' }
        });

        const roomWithSurgeries = {
          roomId: room.id,
          room: room.operatingRoomName,
          isPinned: pinnedRooms[room.id] === true, // 從 localStorage 讀取釘選狀態
          data: []
        };

        // 將釘選狀態同步到後端
        if (roomWithSurgeries.isPinned) {
          try {
            await axios.post(`${BASE_URL}/api/system/algorithm/pin`, {
              roomId: room.id,
              pinned: true,
            });
          } catch (error) {
            console.error("同步釘選狀態到後端失敗:", error);
          }
        }

        const sortedSurgeries = [...surgeriesResponse.data].sort((a, b) => {
          if (a.prioritySequence && b.prioritySequence) return a.prioritySequence - b.prioritySequence;
          if (a.prioritySequence) return -1;
          if (b.prioritySequence) return 1;
          return 0;
        });

        sortedSurgeries.forEach(surgery => {
          // ✅ 如果是群組副手術，就跳過
          if (
            surgery.groupApplicationIds &&
            surgery.groupApplicationIds.length > 0 &&
            surgery.applicationId !== surgery.groupApplicationIds[0]
          ) {
            return;
          }

          const surgeryItem = {
            id: surgery.applicationId,
            doctor: surgery.chiefSurgeonName || '未指定醫師',
            surgery: `${surgery.surgeryName || '未命名手術'} (${surgery.patientName || '未知病患'})`,
            startTime: "08:30",
            duration: surgery.estimatedSurgeryTime || 60,
            isCleaningTime: false,
            applicationId: surgery.applicationId,
            medicalRecordNumber: surgery.medicalRecordNumber,
            patientName: surgery.patientName,
            date: surgery.date,
            surgeryName: surgery.surgeryName,
            chiefSurgeonName: surgery.chiefSurgeonName,
            operatingRoomName: room.operatingRoomName || room.name,
            estimatedSurgeryTime: surgery.estimatedSurgeryTime,
            anesthesiaMethod: surgery.anesthesiaMethod,
            surgeryReason: surgery.surgeryReason,
            specialOrRequirements: surgery.specialOrRequirements,
            req: surgery.req,
            user: surgery.user,
            departmentName: surgery.departmentName || (room.department ? room.department.name : "未指定科別"),
            prioritySequence: surgery.prioritySequence || 99999,
            orderInRoom: surgery.orderInRoom ?? null,
            groupApplicationIds: surgery.groupApplicationIds || [],
            isInGroup: surgery.groupApplicationIds?.length > 0,
            isMainPageGroupMember: isMainPage && surgery.groupApplicationIds?.length > 0
          };

          const cleaningItem = {
            id: `cleaning-${surgery.applicationId}`,
            doctor: '銜接時間',
            surgery: '整理中',
            duration: getTimeSettings(true).cleaningTime,
            isCleaningTime: true,
            operatingRoomName: room.name
          };

          roomWithSurgeries.data.push(surgeryItem, cleaningItem);
        });

        allRoomsWithSurgeries.push(roomWithSurgeries);

      } catch (roomError) {
        console.error(`處理手術房 ${room.id} 出錯:`, roomError);
        allRoomsWithSurgeries.push({
          roomId: room.id,
          room: room.name,
          data: []
        });
      }
    }

    // ❌ 不傳 groupMap → 不觸發群組邏輯
    const formattedData = formatRoomData(allRoomsWithSurgeries, true, isMainPage, null);
    setRows(formattedData);
    setLoading(false);
    return formattedData;

  } catch (error) {
    console.error('獲取資料錯誤:', error);
    setError(`獲取資料失敗: ${error.message}`);
    setLoading(false);
    throw error;
  }
};


// 格式化手術房數據，計算時間和顏色
export const formatRoomData = (roomsWithSurgeries, useTempSettings = false, isMainPage = false, groupMap = null) => {
  try {
    // 從時間設定中獲取起始時間和銜接時間，指定是否使用臨時設定
    const timeSettings = getTimeSettings(useTempSettings);
    const startHour = Math.floor(timeSettings.surgeryStartTime / 60);
    const startMinute = timeSettings.surgeryStartTime % 60;
    const initialTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

    // 處理群組手術
    if (!isMainPage && groupMap) {
      // 遍歷每個手術房
      roomsWithSurgeries.forEach(room => {
        if (!room.data || room.data.length === 0) return;

        // 尋找需要組成群組的手術
        const groupedSurgeries = room.data.filter(item =>
          !item.isCleaningTime && item.isInGroup &&
          item.groupApplicationIds && item.groupApplicationIds.length > 0
        );

        // 按群組ID進行分組
        const groupsInRoom = {};
        groupedSurgeries.forEach(surgery => {
          const groupId = surgery.groupApplicationIds.join('-');
          if (!groupsInRoom[groupId]) {
            groupsInRoom[groupId] = [];
          }
          groupsInRoom[groupId].push(surgery);
        });

        // 處理每個群組
        Object.keys(groupsInRoom).forEach(groupId => {
          const surgeries = groupsInRoom[groupId];
          // 如果群組中只有一個手術，則不進行群組處理
          if (surgeries.length < 2) return;

          // 收集群組中所有手術的ID及相關銜接時間ID
          const allRelatedIds = new Set();
          const groupSurgeryIds = surgeries.map(s => s.id);

          groupSurgeryIds.forEach(id => {
            allRelatedIds.add(id);
            // 添加每個手術後的銜接時間ID
            allRelatedIds.add(`cleaning-${id.replace('cleaning-', '')}`);
          });

          // 從room.data中過濾出所有相關項目
          const allRelatedItems = room.data.filter(item => allRelatedIds.has(item.id));

          // 按開始時間排序
          allRelatedItems.sort((a, b) => {
            if (!a.startTime || !b.startTime) return 0;
            return new Date('1970/01/01 ' + a.startTime) - new Date('1970/01/01 ' + b.startTime);
          });

          // 如果沒有相關項目，則跳過
          if (allRelatedItems.length === 0) return;

          // 創建群組項目
          const firstItem = allRelatedItems[0];
          const lastItem = allRelatedItems[allRelatedItems.length - 1];

          // 獲取時間設定（使用臨時設定）
          const timeSettings = getTimeSettings(true);

          // 查找所有有 orderInRoom 值的手術（不僅限於 orderInRoom = 1）
          const orderedSurgeries = surgeries.filter(surgery => surgery.orderInRoom != null);

          // 如果找到有 orderInRoom 值的手術
          let groupDuration = 0;
          let groupEndTime = lastItem.endTime;

          let groupOrderInRoom = null;
          let groupSurgeries = [...allRelatedItems]; // 預設保留所有手術

          if (orderedSurgeries.length > 0) {
            // 按照 orderInRoom 排序
            orderedSurgeries.sort((a, b) => a.orderInRoom - b.orderInRoom);

            // 計算所有有序手術的總時間加上銜接時間
            groupDuration = orderedSurgeries.reduce((total, surgery) => total + surgery.duration, 0) +
              (orderedSurgeries.length * timeSettings.cleaningTime);

            // 重新計算結束時間
            groupEndTime = addMinutesToTime(firstItem.startTime, groupDuration);
            console.log(`群組使用 ${orderedSurgeries.length} 個有序手術的總時間 + 銜接時間`);

            // 使用第一個有序手術的 orderInRoom 作為群組的 orderInRoom
            groupOrderInRoom = orderedSurgeries[0].orderInRoom;

            // 保留所有有序手術及其銜接時間
            groupSurgeries = [];
            orderedSurgeries.forEach(surgery => {
              groupSurgeries.push(surgery);
              // 尋找對應的銜接時間項目
              const cleaningItem = allRelatedItems.find(s => s.id === `cleaning-${surgery.applicationId}`);
              if (cleaningItem) {
                groupSurgeries.push(cleaningItem);
              }
            });
          } else {
            // 如果沒有找到任何有 orderInRoom 值的手術，維持原來的總時間計算
            groupDuration = allRelatedItems.reduce((total, surgeryItem) => total + (surgeryItem.duration || 0), 0);
            console.log(`找不到任何有 orderInRoom 值的手術，使用所有手術的總時間: ${groupDuration}`);
            // 所有手術都要保留 - 不需要額外操作
          }

          const mainSurgery = surgeries.reduce((prev, curr) => {
            if (prev.orderInRoom == null) return curr;
            if (curr.orderInRoom == null) return prev;
            return prev.orderInRoom < curr.orderInRoom ? prev : curr;
          }, surgeries[0]);

          const groupItem = {
            id: `group-${groupId}`,
            doctor: `${surgeries.length} 個手術`,
            surgery: '群組手術',
            startTime: firstItem.startTime,
            endTime: groupEndTime,
            duration: groupDuration,
            color: "group",
            isGroup: true,
            surgeries: groupSurgeries, // 使用根據 orderInRoom 過濾後的手術列表
            allSurgeries: allRelatedItems, // 完整保存所有手術的原始資訊
            originalEndTime: lastItem.endTime, // 保存原始結束時間
            isCleaningTime: false,
            operatingRoomName: room.room,
            applicationId: mainSurgery.applicationId,
            groupApplicationIds: surgeries[0].groupApplicationIds,
            orderInRoom: groupOrderInRoom
          };

          // 從room.data中移除所有相關項目
          room.data = room.data.filter(item => !allRelatedIds.has(item.id));

          // 在第一個項目的位置插入群組項目
          const insertIndex = room.data.findIndex(item =>
            item.startTime && new Date('1970/01/01 ' + item.startTime) > new Date('1970/01/01 ' + firstItem.startTime)
          );

          if (insertIndex === -1) {
            // 如果沒有找到合適的位置，則添加到末尾
            room.data.push(groupItem);
          } else {
            // 在找到的位置插入
            room.data.splice(insertIndex, 0, groupItem);
          }
        });
      });
    }

    // 計算時間和顏色
    roomsWithSurgeries.forEach(room => {
      if (room.data && room.data.length > 0) {
        // 🔧 在計算時間前先根據 orderInRoom 排序（只排序手術，不動清潔時間）
        const surgeriesOnly = room.data.filter(item => !item.isCleaningTime && item.orderInRoom != null);
        const sortedSurgeries = [...surgeriesOnly].sort((a, b) => a.orderInRoom - b.orderInRoom);

        // 🔁 重新組合 room.data
        room.data = sortedSurgeries.flatMap(surgery => {
          const cleaningItem = room.data.find(item => item.id === `cleaning-${surgery.applicationId}`);
          return cleaningItem ? [surgery, cleaningItem] : [surgery];
        });

        let currentTime = initialTime;

        room.data.forEach((item) => {
          item.startTime = currentTime;

          // 如果是群組，使用已計算的持續時間
          if (item.isGroup && item.duration) {
            item.endTime = addMinutesToTime(currentTime, item.duration);

            // 處理所有有 orderInRoom 的手術
            let innerCurrentTime = currentTime;

            // 尋找所有有 orderInRoom 值的手術
            const surgeryItems = item.surgeries.filter(s => !s.isCleaningTime);
            const orderedSurgeryItems = surgeryItems.filter(s => s.orderInRoom != null);

            // 按照 orderInRoom 排序
            orderedSurgeryItems.sort((a, b) => a.orderInRoom - b.orderInRoom);

            if (orderedSurgeryItems.length > 0) {
              console.log(`群組內部計算 ${orderedSurgeryItems.length} 個有序手術和銜接時間`);

              // 用於存儲已處理的手術和銜接時間
              const processedItems = new Set();

              // 設置每個有序手術的時間
              for (const surgeryItem of orderedSurgeryItems) {
                surgeryItem.startTime = innerCurrentTime;
                surgeryItem.endTime = addMinutesToTime(innerCurrentTime, surgeryItem.duration);
                innerCurrentTime = surgeryItem.endTime;
                processedItems.add(surgeryItem);

                // 設置它的銜接時間
                const cleaningItem = item.surgeries.find(s => s.id === `cleaning-${surgeryItem.applicationId}`);
                if (cleaningItem) {
                  cleaningItem.startTime = innerCurrentTime;
                  cleaningItem.duration = timeSettings.cleaningTime;
                  cleaningItem.endTime = addMinutesToTime(innerCurrentTime, timeSettings.cleaningTime);
                  innerCurrentTime = cleaningItem.endTime;
                  processedItems.add(cleaningItem);
                }
              }

              // 為其他手術設置時間，但不顯示
              item.surgeries.forEach(surgery => {
                if (!processedItems.has(surgery)) {
                  // 設置有效的時間但標記為不渲染
                  if (!surgery.startTime) surgery.startTime = orderedSurgeryItems[0].startTime;
                  if (!surgery.endTime) surgery.endTime = orderedSurgeryItems[0].endTime;
                  surgery.displayRender = false; // 使用自定義屬性代替 hidden
                }
              });
            } else {
              // 如果沒有任何有 orderInRoom 值的手術，顯示所有手術
              console.log(`群組內沒有任何有 orderInRoom 值的手術，顯示所有手術`);
              item.surgeries.forEach(surgery => {
                surgery.startTime = innerCurrentTime;
                surgery.endTime = addMinutesToTime(innerCurrentTime, surgery.duration);
                innerCurrentTime = surgery.endTime;
                surgery.hidden = false;
              });
            }
          } else {
            item.endTime = addMinutesToTime(currentTime, item.duration);
          }

          // 計算項目顯示顏色
          if (item.isCleaningTime) {
            // 銜接時間都顯示藍色
            item.color = getCleaningColor();
          } else if (item.isGroup) {
            // 如果是群組，顯示群組顏色（橘色）
            item.color = "group";
          } else if (item.isMainPageGroupMember) {
            // 首頁上的群組成員手術顯示為橘色
            item.color = "group";
            // 加入標記讓其可以在前端顯示群組標記
            item.isGroupMember = true;
          } else if (item.groupApplicationIds.length > 0) {
            item.color = "group";
          } else {
            // 一般手術根據結束時間計算顏色
            item.color = getColorByEndTime(item.endTime, false, useTempSettings);
          }

          // 使用設定中的銜接時間
          if (item.isCleaningTime) {
            item.duration = timeSettings.cleaningTime;
            item.endTime = addMinutesToTime(item.startTime, timeSettings.cleaningTime);
          }

          currentTime = item.endTime;
        });
      }
    });

    // 觸發自定義事件，通知TimeWrapper組件重新渲染
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('cleaningTimeChange'));
    }, 0);

    return roomsWithSurgeries;
  } catch (error) {
    console.error('數據格式化錯誤:', error);
    return [];
  }
};
