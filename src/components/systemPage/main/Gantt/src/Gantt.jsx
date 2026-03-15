import React, { useRef, useEffect, useState } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import RoomSection from "./components/ROOM/RoomSection";
import TimeWrapper from "./components/Time/timeWrapper";
import ConfirmScheduleButton from "./components/Time/ConfirmScheduleButton";
import ParametricSettings from "./components/Time/parametricSettings";
import { fetchSurgeryData, formatRoomData } from "./components/Data/ganttData";
import "./styles.css";
import GanttFilter from "./components/GanttFilter";
import { handleDragEnd } from "./components/DragDrop/dragEndHandler";
import { handleGroupDragEnd } from "./components/DragDrop/groupDragHandler";
import SurgeryModal from "./components/Modal/SurgeryModal";
import axios from "axios";
import { BASE_URL } from "/src/config";
import { clearTempTimeSettings, isTimeAfterNextDay8AM } from "./components/Time/timeUtils";
import ORSMButton from "./components/Time/ORSMButton";
import GanttHeader from "./header/GanttHeader";

// 引入群組操作函數
import {
  createGroup,
  ungroup
} from "./components/ROOM/GroupOperations";

// 排程管理專用的甘特圖組件
function Gantt({ reservedRooms, setReservedRooms, rows, setRows, initialTimeSettings, setInitialTimeSettings }) {
  const ganttChartRef = useRef(null);
  const timeScaleRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [filteredRows, setFilteredRows] = useState(rows);
  const [timeScaleWidth, setTimeScaleWidth] = useState("100%");
  const [isInitialized, setIsInitialized] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('gantt'); // 新增頁籤狀態，預設顯示甘特圖
  const [selectedSurgery, setSelectedSurgery] = useState(null); // 選中的手術
  const [modalError, setModalError] = useState(null); // 模態視窗錯誤
  const [tipsCollapsed, setTipsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // 選中的關閉手術房 ID 列表
  const [selectedClosedRooms, setSelectedClosedRooms] = useState([]);
  // 新增：追蹤是否有篩選條件
  const [isFiltered, setIsFiltered] = useState(false);
  // 初始化數據
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await fetchSurgeryData(setRows, setLoading, setError);
        setIsInitialized(true);
      } catch (error) {
        console.error("初始化數據失敗:", error);
        setError("初始化數據失敗");
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    //console.log("手術室資料:", rows);
    //console.log("篩選後的手術室資料:", filteredRows);
  }, [rows, filteredRows]);

  // 當rows更新時，更新filteredRows
  useEffect(() => {
    if (rows && rows.length > 0) {
      setFilteredRows(rows);
      setIsInitialized(true);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [rows]);

  useEffect(() => {
    const handleScroll = () => {
      if (timeScaleRef.current && scrollContainerRef.current) {
        timeScaleRef.current.scrollLeft = scrollContainerRef.current.scrollLeft;
      }
    };

    const scrollEl = scrollContainerRef.current;
    scrollEl?.addEventListener('scroll', handleScroll);

    return () => {
      scrollEl?.removeEventListener('scroll', handleScroll);
    };
  }, []);


  //  處理滾動事件，確保時間刻度和內容區域同步
  const handleDragStart = () => {
    const scrollEl = scrollContainerRef.current;
    if (scrollEl) scrollEl.style.overflowY = "auto";
  };
  const handleDragEndWrapper = async (result) => {
    document.body.style.overflowY = "auto"; // 拖曳結束後恢復滾動

    if (!result.destination) return;

    console.log("排程管理甘特圖拖曳結束，更新界面", result);

    if (!result.draggableId) {
      console.error("拖曳操作缺少draggableId，無法處理");
      return;
    }

    const isGroupDrag = await handleGroupDragEnd(result, filteredRows, setRows, setFilteredRows);

    if (!isGroupDrag) {
      await handleDragEnd(setLoading, setError, result, filteredRows, setFilteredRows);
    }

    fetchSurgeryData(setRows, setLoading, setError, false);

    setRows([...filteredRows]);

    window.dispatchEvent(new CustomEvent('ganttDragEnd'));
    setTimeout(() => {
      setFilteredRows([...filteredRows]);
    }, 100);
  };


  // 處理滾輪事件，確保垂直滾動時時間刻度保持在頂部，同時保持水平滾動同步
  useEffect(() => {
    const handleGanttTimeScaleScroll = (e) => {
      const { scrollLeft } = e.detail;
      // 同步內容區域的水平滾動
      const chartScrollArea = document.querySelector('.gantt-chart-scroll-area');
      if (chartScrollArea) {
        chartScrollArea.scrollLeft = scrollLeft;
      }
    };

    const handleGanttContentScroll = (e) => {
      const { scrollLeft } = e.detail;
      // 同步時間刻度的水平滾動
      const timeScaleContainer = timeScaleRef.current?.querySelector('.scrollable-container');
      if (timeScaleContainer) {
        timeScaleContainer.scrollLeft = scrollLeft;
      }
    };

    // 監聽滾動事件，確保水平滾動同步
    const handleContentScroll = (e) => {
      if (e.target.classList.contains('gantt-chart-scroll-area') ||
        e.target.classList.contains('scrollable-container')) {
        const scrollLeft = e.target.scrollLeft;

        // 通知時間刻度和內容區域
        window.dispatchEvent(new CustomEvent('ganttMainScroll', {
          detail: { scrollLeft }
        }));
      }
    };
  }, []);





  const handleResize = () => {
    if (timeScaleRef.current) {
      setTimeScaleWidth(`${timeScaleRef.current.scrollWidth}px`);
    }
    if (scrollContainerRef.current) {
      setContainerWidth(scrollContainerRef.current.clientWidth);
    }


  };

  // 處理手術房釘選狀態變更
  const handleRoomPinStatusChange = (roomIndex, isPinned) => {
    const updatedRows = [...filteredRows];
    updatedRows[roomIndex] = {
      ...updatedRows[roomIndex],
      isPinned: isPinned
    };
    setFilteredRows(updatedRows);

    // 同時更新原始數據
    const originalRoomIndex = rows.findIndex(r =>
      r.roomId === updatedRows[roomIndex].roomId ||
      r.room === updatedRows[roomIndex].room
    );

    if (originalRoomIndex !== -1) {
      const newRows = [...rows];
      newRows[originalRoomIndex] = {
        ...newRows[originalRoomIndex],
        isPinned: isPinned
      };
      setRows(newRows);
    }
  };

  // 處理群組操作
  const handleGroupOperation = (roomIndex, selectedSurgeries, operation) => {
    if (readOnly) return; // 唯讀模式下不允許群組操作

    const updatedRows = [...filteredRows];
    const roomData = [...updatedRows[roomIndex].data];
    const roomName = updatedRows[roomIndex].room || updatedRows[roomIndex].name || '手術室';

    if (operation === 'create') {
      // 使用新的創建群組函數
      const result = createGroup(selectedSurgeries, roomData, roomIndex, roomName);

      if (!result.success) {
        alert(result.message || '創建群組失敗');
        return;
      }

      // 更新手術室資料
      updatedRows[roomIndex] = {
        ...updatedRows[roomIndex],
        data: result.newRoomData
      };

      // 同時更新原始數據
      const originalRoomIndex = rows.findIndex(r =>
        r.roomId === updatedRows[roomIndex].roomId ||
        r.room === updatedRows[roomIndex].room
      );

      if (originalRoomIndex !== -1) {
        const newRows = [...rows];
        newRows[originalRoomIndex] = {
          ...newRows[originalRoomIndex],
          data: result.newRoomData
        };
        setRows(newRows);
      }

      // 強制更新 UI
      setFilteredRows([]);
      setTimeout(() => {
        setFilteredRows(updatedRows);
      }, 10);
    } else if (operation === 'ungroup') {
      // 使用新的解除群組函數
      const group = selectedSurgeries[0];
      // if (!group.isGroup) {
      //   alert('選擇的項目不是群組');
      //   return;
      // }

      const result = ungroup(group, roomData, roomName);

      if (!result.success) {
        alert(result.message || '解除群組失敗');
        return;
      }

      // 更新手術室資料
      updatedRows[roomIndex] = {
        ...updatedRows[roomIndex],
        data: result.newRoomData
      };

      // 同時更新原始數據
      const originalRoomIndex = rows.findIndex(r =>
        r.roomId === updatedRows[roomIndex].roomId ||
        r.room === updatedRows[roomIndex].room
      );

      if (originalRoomIndex !== -1) {
        const newRows = [...rows];
        newRows[originalRoomIndex] = {
          ...newRows[originalRoomIndex],
          data: result.newRoomData
        };
        setRows(newRows);
      }

      // 強制更新 UI
      setFilteredRows([]);
      setTimeout(() => {
        setFilteredRows(updatedRows);
      }, 10);

      // 成功解除群組後，稍後重新整理頁面以確保狀態完全更新
      setTimeout(() => {
        window.location.reload();
      }, 100); // 延遲0.1秒後重新載入頁面
    }

    // 觸發 DOM 更新
    window.dispatchEvent(new CustomEvent('ganttDataUpdated'));
  };

  // 處理手術點擊事件，顯示詳細資訊
  const handleSurgeryClick = async (surgery) => {
    setModalError(null);

    console.log('點擊的手術:', surgery);
    console.log('釘選狀態:', surgery.isPinned);

    // 確保保留群組資訊
    if (surgery.isGroup) {
      console.log('這是一個群組手術，開始獲取群組中所有手術的詳細資訊');

      try {
        // 如果是群組手術且有groupApplicationIds
        if (surgery.groupApplicationIds && surgery.groupApplicationIds.length > 0) {
          console.log('群組手術IDs:', surgery.groupApplicationIds);

          // 獲取群組中所有手術的詳細資訊
          const surgeryPromises = surgery.groupApplicationIds.map(async (id) => {
            try {
              const response = await axios.get(`${BASE_URL}/api/surgeries/${id}`);

              // 合併後端數據和甘特圖時間信息
              const groupMember = surgery.surgeries?.find(s => s.applicationId === id) || {};
              return {
                ...response.data,
                startTime: groupMember.startTime || surgery.startTime,
                endTime: groupMember.endTime || surgery.endTime,
                doctor: response.data.chiefSurgeonName || groupMember.doctor,
                color: groupMember.color || surgery.color,
                operatingRoomName: surgery.operatingRoomName,
                applicationId: id
              };
            } catch (error) {
              console.error(`獲取手術 ${id} 詳細資料失敗:`, error);
              return null;
            }
          });

          // 等待所有請求完成
          const surgeryDetails = await Promise.all(surgeryPromises);
          const validSurgeryDetails = surgeryDetails.filter(s => s !== null);

          if (validSurgeryDetails.length > 0) {
            // 將獲取的詳細資訊設置為群組手術的surgeries屬性
            const updatedGroupSurgery = {
              ...surgery,
              surgeries: validSurgeryDetails
            };

            console.log('更新後的群組手術資訊:', updatedGroupSurgery);
            setSelectedSurgery(updatedGroupSurgery);
          } else {
            console.log('未能獲取任何有效的群組手術詳細資訊，顯示原始群組資訊');
            setSelectedSurgery(surgery);
          }
        } else {
          console.log('群組手術但無有效的群組ID，顯示原始資訊');
          setSelectedSurgery(surgery);
        }
      } catch (error) {
        console.error('處理群組手術資訊時發生錯誤:', error);
        setModalError(`獲取群組手術詳細資料失敗: ${error.message}`);
        setSelectedSurgery(surgery);
      }
      return;
    }

    try {
      // 從後端獲取最新的手術詳細資料
      const response = await axios.get(`${BASE_URL}/api/surgeries/${surgery.applicationId}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data) {
        // 合併後端資料和甘特圖中的時間資訊
        const mergedData = {
          ...response.data,
          // 保留甘特圖中的開始和結束時間
          startTime: surgery.startTime,
          endTime: surgery.endTime,
          // 如果後端沒有這些欄位，則使用甘特圖中的資料
          doctor: response.data.chiefSurgeonName || surgery.doctor,
          surgery: response.data.surgeryName ? `${response.data.surgeryName} (${response.data.patientName || '未知病患'})` : surgery.surgery,
          color: surgery.color,
          // 使用從父組件傳入的手術室名稱
          operatingRoomName: surgery.operatingRoomName,
          // 保留釘選狀態
          isPinned: surgery.isPinned,
          // 保留群組信息
          groupApplicationIds: surgery.groupApplicationIds
        };
        console.log('設置單個手術詳情:', mergedData);
        setSelectedSurgery(mergedData);
      } else {
        setSelectedSurgery(surgery);
      }
    } catch (error) {
      console.error('獲取手術詳細資料時發生錯誤:', error);
      setModalError(`獲取手術詳細資料失敗: ${error.message}`);
      setSelectedSurgery(surgery);
    }
  };

  // 處理篩選結果
  const handleFilterChange = (filteredData, hasActiveFilters) => {
    setFilteredRows(filteredData);

    // 判斷篩選狀態：優先使用 GanttFilter 傳來的篩選狀態
    let hasFilters = false;

    // 如果收到明確的篩選狀態標記，直接使用
    if (hasActiveFilters !== undefined) {
      console.log("使用 GanttFilter 傳來的篩選狀態:", hasActiveFilters);
      hasFilters = hasActiveFilters;
    } else {
      // 備用方案：比較原始數據和篩選後的數據
      // 檢查行數是否不同
      if (rows.length !== filteredData.length) {
        hasFilters = true;
      } else {
        // 檢查每個手術室的手術數量是否不同
        for (let i = 0; i < rows.length; i++) {
          const originalRoom = rows[i];
          const filteredRoom = filteredData[i];

          // 如果找不到對應的房間，認為有篩選
          if (!originalRoom || !filteredRoom) {
            hasFilters = true;
            break;
          }

          // 比較手術數量
          const originalSurgeries = originalRoom.data?.filter(s => !s.isCleaningTime) || [];
          const filteredSurgeries = filteredRoom.data?.filter(s => !s.isCleaningTime) || [];

          if (originalSurgeries.length !== filteredSurgeries.length) {
            hasFilters = true;
            break;
          }
        }
      }
    }

    console.log("篩選狀態檢測結果:", hasFilters);
    setIsFiltered(hasFilters);
  };

  // 處理拖拽結束事件，確保UI更新
  const onDragEndHandler = async (result) => {
    // 如果有篩選條件，不允許拖曳
    if (!result.destination || isFiltered) return;

    console.log("排程管理甘特圖拖曳結束，更新界面", result);

    // 檢查是否有ID相關問題
    if (!result.draggableId) {
      console.error("拖曳操作缺少draggableId，無法處理");
      return;
    }

    // 首先嘗試處理群組拖曳
    const isGroupDrag = await handleGroupDragEnd(result, filteredRows, setRows, setFilteredRows);

    // 如果不是群組拖曳，則按一般手術拖曳處理
    if (!isGroupDrag) {
      await handleDragEnd(result, filteredRows, setRows);
    }

    // 檢查是否有手術時間超過隔天早上8點
    // let hasOverNextDay = false;
    // let overTimeRoom = null;

    // for (let i = 0; i < filteredRows.length; i++) {
    //   const roomData = filteredRows[i].data;
    //   if (!roomData) continue;

    //   for (let j = 0; j < roomData.length; j++) {
    //     const item = roomData[j];
    //     if (item.isCleaningTime) continue; // 跳過銜接時間

    //     if (isTimeAfterNextDay8AM(item.endTime)) {
    //       hasOverNextDay = true;
    //       overTimeRoom = filteredRows[i].room || `手術室 ${i+1}`;
    //       break;
    //     }

    //     // 檢查群組內的手術
    //     if (item.isGroup && item.surgeries) {
    //       for (let k = 0; k < item.surgeries.length; k++) {
    //         const surgery = item.surgeries[k];
    //         if (surgery.isCleaningTime) continue;

    //         if (isTimeAfterNextDay8AM(surgery.endTime)) {
    //           hasOverNextDay = true;
    //           overTimeRoom = filteredRows[i].room || `手術室 ${i+1}`;
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

    // 確保UI更新
    window.dispatchEvent(new CustomEvent('ganttDragEnd'));

    // 延遲後再次更新以確保UI一致性
    setTimeout(() => {
      setFilteredRows([...filteredRows]);
    }, 100);
  };

  // 處理頁籤切換
  const handleTabChange = (tab) => {
    setActiveTab(tab);

    // 如果切換到甘特圖頁籤，觸發重新加載
    if (tab === 'gantt') {
      // 讓甘特圖組件重新加載數據
      console.log('切換到甘特圖頁籤，重新加載數據');
      window.dispatchEvent(new CustomEvent('ganttTabActive'));
    }
  };

  // 關閉模態視窗
  const handleCloseModal = () => {
    setSelectedSurgery(null);
  };

  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // 加一天變成明天的日期

    const formattedDate = today.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    setCurrentDate(formattedDate);
  }, []);

  // 初始化甘特圖
  useEffect(() => {
    const initializeGantt = async () => {
      if (!rows || rows.length === 0) {
        await fetchSurgeryData(setRows, setLoading, setError);
      }
      setIsInitialized(true);
    };

    initializeGantt();
  }, [rows]);

  // 監聽ganttTabActive事件
  useEffect(() => {
    const handleGanttTabActive = async () => {
      console.log('接收到ganttTabActive事件，重新加載甘特圖數據');
      setLoading(true);
      try {
        await fetchSurgeryData(setRows, setLoading, setError);
      } catch (error) {
        console.error('重新加載甘特圖數據失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('ganttTabActive', handleGanttTabActive);
    return () => {
      window.removeEventListener('ganttTabActive', handleGanttTabActive);
    };
  }, []);

  // 初始化時讀取提示收合狀態
  useEffect(() => {
    const savedTipsState = localStorage.getItem('ganttTipsCollapsed');
    if (savedTipsState) {
      setTipsCollapsed(savedTipsState === 'true');
    }
  }, []);

  // 處理提示收合狀態變更
  const toggleTips = () => {
    const newState = !tipsCollapsed;
    setTipsCollapsed(newState);
    localStorage.setItem('ganttTipsCollapsed', newState.toString());
  };

  // 如果數據尚未初始化，顯示載入中
  if (!isInitialized && loading) {
    return (
      <div className="gantt-main-container">
        <div className="loading">
          <p>載入中，請稍候...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-main-container">
      <GanttHeader
        reservedRooms={reservedRooms}
        selectedClosedRooms={selectedClosedRooms}
        currentDate={currentDate}
        filteredRows={filteredRows}
        setRows={setRows}
      />

      {/* ✅ 頁籤切換區 */}
      <div className="gantt-tabs">
        <ul className="gantt-tab-list">
          <li className={`gantt-tab ${activeTab === 'gantt' ? 'gantt-tab-active' : ''}`} onClick={() => handleTabChange('gantt')}>
            手術排程甘特圖
          </li>
          <li className={`gantt-tab ${activeTab === 'timeSettings' ? 'gantt-tab-active' : ''}`} onClick={() => handleTabChange('timeSettings')}>
            參數設定
          </li>
        </ul>
      </div>

      {/* ✅ 甘特圖頁籤內容 */}
      <div className={`gantt-tab-panel ${activeTab !== 'gantt' ? 'gantt-tab-panel-hidden' : ''}`}>
        {/* 使用提示 */}
        <div className={`gantt-tips ${tipsCollapsed ? 'tips-collapsed' : ''}`}>
          <svg className="gantt-tips-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="#3B82F6" />
            <circle cx="12" cy="7" r="1.5" fill="white" />
            <rect x="11" y="9.5" width="2" height="6" rx="1" fill="white" />
          </svg>
          <div className="gantt-tips-content">
            <div className="tips-header">
              <p className="gantt-tips-title">使用提示</p>
              <button className="tips-toggle-button" onClick={toggleTips}>
                {tipsCollapsed ? "展開" : "收合"}
              </button>
            </div>
            {!tipsCollapsed && (
              <ul className="gantt-tips-list">
                <li>可橫向滾動查看時間</li>
                <li>可拖曳修改手術時間與群組</li>
                <li>點擊手術查看詳細資訊</li>
                <li>點擊圖釘按鈕可進行釘選手術房，使該手術房不進入排程演算法</li>
                <li>點擊群組按鈕可進行群組或取消，使被群組之手術進入演算法時不被分散</li>
              </ul>
            )}
          </div>
        </div>

        {/* ✅ 主內容區 */}
        <div className="gantt-main-layout flex w-full h-full">
          {/* ✅ 篩選器側欄 */}
          <div className={`${isFilterOpen ? 'open' : 'closed'}`}>
            <GanttFilter
              originalRows={rows}
              onFilteredDataChange={handleFilterChange}
            />
            <button
              className="filter-toggle-button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              aria-label={isFilterOpen ? "收合篩選器" : "展開篩選器"}
            />
          </div>

          {/* ✅ 甘特圖右側主體 */}
          <div className="gantt-chart-wrapper flex-1 relative transition-all duration-500 ease-in-out">
            {!loading && !error && filteredRows.length > 0 && (
              <div className="gantt-content">
                {isFiltered ? (
                  // 如果有篩選，不使用 DragDropContext，禁用所有拖曳功能
                  <div className="gantt-chart-scroll-area unified-scroll" ref={scrollContainerRef}>
                    <TimeWrapper containerWidth={containerWidth} timeScaleOnly={false}>
                      {/* 篩選模式警告提示 */}
                      <div className="filtered-mode-warning">
                        已啟用篩選模式，拖曳功能暫時禁用，避免篩選結果受影響
                      </div>
                      {/* 甘特內容 */}
                      <div ref={ganttChartRef} className="gantt-chart-container filtered-mode-active">
                        <div className="gantt-chart">
                          {filteredRows.map((room, roomIndex) => {
                            // 直接使用 room.data，省略排序選擇邏輯，因為在 ganttData.jsx 中已經處理過了
                            const sortedData = room.data || [];

                            return (
                              <div
                                key={room.room || roomIndex}
                                className={`row ${roomIndex % 2 === 0 ? 'row-even' : 'row-odd'} ${room.isPinned ? 'row-pinned' : ''}`}
                              >
                                <RoomSection
                                  room={{ ...room, data: sortedData }}
                                  roomIndex={roomIndex}
                                  readOnly={true} // 強制只讀
                                  onSurgeryClick={handleSurgeryClick}
                                  onGroupOperation={handleGroupOperation}
                                  onPinStatusChange={handleRoomPinStatusChange}
                                  isFiltered={true}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </TimeWrapper>
                  </div>
                ) : (
                  // 如果沒有篩選，使用正常的 DragDropContext
                  <DragDropContext onDragStart={handleDragStart} onDragEnd={onDragEndHandler}>
                    {/* ✅ 單一滾動容器中包住時間刻度與甘特內容 */}
                    <div className="gantt-chart-scroll-area unified-scroll" ref={scrollContainerRef}>
                      <TimeWrapper containerWidth={containerWidth} timeScaleOnly={false}>
                        {/* 甘特內容 */}
                        <div ref={ganttChartRef} className="gantt-chart-container">
                          <div className="gantt-chart">
                            {filteredRows.map((room, roomIndex) => {
                              // 直接使用 room.data，省略排序選擇邏輯，因為在 ganttData.jsx 中已經處理過了
                              const sortedData = room.data || [];

                              return (
                                <div
                                  key={room.room || roomIndex}
                                  className={`row ${roomIndex % 2 === 0 ? 'row-even' : 'row-odd'} ${room.isPinned ? 'row-pinned' : ''}`}
                                >
                                  <RoomSection
                                    room={{ ...room, data: sortedData }}
                                    roomIndex={roomIndex}
                                    readOnly={readOnly}
                                    onSurgeryClick={handleSurgeryClick}
                                    onGroupOperation={handleGroupOperation}
                                    onPinStatusChange={handleRoomPinStatusChange}
                                    isFiltered={false}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </TimeWrapper>
                    </div>
                  </DragDropContext>
                )}
              </div>
            )}

            {/* 無資料時提示 */}
            {!loading && !error && filteredRows.length === 0 && (
              <div className="no-data">
                <p className="no-data-title">尚無符合條件的排程資料</p>
                <p className="no-data-subtitle">請更改篩選條件或稍後再試</p>
              </div>
            )}
          </div>
        </div>

        {/* 模態視窗 */}
        {selectedSurgery && (
          <SurgeryModal
            surgery={selectedSurgery}
            onClose={handleCloseModal}
            error={modalError}
          />
        )}
      </div>

      {/* ✅ 參數設定頁籤內容 */}
      <div className={`gantt-tab-panel ${activeTab !== 'timeSettings' ? 'gantt-tab-panel-hidden' : ''}`}>
        <ParametricSettings
          reservedRooms={reservedRooms}
          setReservedRooms={setReservedRooms}
          selectedClosedRooms={selectedClosedRooms}
          setSelectedClosedRooms={setSelectedClosedRooms}
          rows={rows}
          onTimeSettingsChange={(newSettings, isPreview) => {
            // 格式化數據時明確傳入 useTempSettings=true 參數
            const updatedRows = formatRoomData([...rows].map(r => ({
              ...r,
              data: r.data ? [...r.data] : []
            })), true, false);

            setRows([]);
            setTimeout(() => {
              setRows(updatedRows);
              setFilteredRows(updatedRows);
            }, 0);
            setActiveTab('gantt');
          }}
          initialTimeSettings={initialTimeSettings}
          setInitialTimeSettings={setInitialTimeSettings}
        />
      </div>
    </div>
  );


}
export default Gantt;
