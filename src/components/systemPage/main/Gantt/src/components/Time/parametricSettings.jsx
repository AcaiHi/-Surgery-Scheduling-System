/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import { setTempTimeSettings } from "./timeUtils";
import axios from "axios";
import { BASE_URL } from "../../../../../../../config";
import "../../styles.css"

const ParametricSettings = ({ reservedRooms, setReservedRooms, selectedClosedRooms, setSelectedClosedRooms, onTimeSettingsChange, initialTimeSettings, setInitialTimeSettings, rows }) => {
  // 使用 initialTimeSettings 作為初始值
  const [timeSettings, setTimeSettings] = useState(initialTimeSettings);
  // 關閉的手術房列表
  const [closedRooms, setClosedRooms] = useState([]);
  // 選中的已保留手術房 ID 列表
  const [selectedReservedRooms, setSelectedReservedRooms] = useState([]);
  // 加載狀態
  const [loading, setLoading] = useState(false);
  // 使用提示的折疊狀態
  const [tipsCollapsed, setTipsCollapsed] = useState(false);

  useEffect(() => {
    console.log("closedRooms:", closedRooms);
    console.log("selectedClosedRooms:", selectedClosedRooms);
    console.log("reservedRooms:", reservedRooms);
  }, [closedRooms, reservedRooms, selectedClosedRooms]);

  useEffect(() => {
    // 獲取所有關閉的手術房
    fetchClosedRooms();

    // 從localStorage讀取提示收合狀態
    const savedTipsState = localStorage.getItem('parameterTipsCollapsed');
    if (savedTipsState) {
      setTipsCollapsed(savedTipsState === 'true');
    }

    const savedReservedRooms = localStorage.getItem("reservedClosedRooms");
    if (savedReservedRooms) {
      try {
        const parsed = JSON.parse(savedReservedRooms);
        if (Array.isArray(parsed)) {
          setReservedRooms(parsed);
        }
      } catch (e) {
        console.error("讀取 reservedClosedRooms 發生錯誤", e);
      }
    }
  }, []);

  useEffect(() => {
    console.log("initialTimeSettings", initialTimeSettings);
    console.log("timeSettings", timeSettings);
  }, [initialTimeSettings, timeSettings]);

  // 當 initialTimeSettings 變更時，同步更新 timeSettings（確保 UI 顯示正確）
  useEffect(() => {
    setTimeSettings(initialTimeSettings);
  }, [initialTimeSettings]);

  // 獲取所有關閉的手術房
  const fetchClosedRooms = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/system/operating-rooms`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data && response.data.length > 0) {
        // 過濾出狀態為關閉的手術房
        const closed = response.data.filter(room => room.status === 0);
        setClosedRooms(closed);
        console.log('關閉的手術房:', closed);
      }
    } catch (error) {
      console.error('獲取關閉手術房失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 處理手術房勾選
  const handleRoomSelect = (roomId) => {
    setSelectedClosedRooms(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      } else {
        return [...prev, roomId];
      }
    });
  };

  // 處理已保留手術房勾選
  const handleReservedRoomSelect = (roomId) => {
    setSelectedReservedRooms(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      } else {
        return [...prev, roomId];
      }
    });
  };

  // 轉換分鐘為時間格式 (HH:MM)
  const minutesToTimeString = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  // 時間字串轉換為分鐘數
  const timeStringToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 更新時間設定
  const handleTimeChange = (key, value) => {
    try {
      const minutes = timeStringToMinutes(value);
      const newSettings = { ...timeSettings, [key]: minutes };

      // 驗證時間邏輯
      if (
        newSettings.surgeryStartTime > newSettings.regularEndTime ||
        newSettings.surgeryStartTime > newSettings.overtimeEndTime ||
        newSettings.regularEndTime > newSettings.overtimeEndTime
      ) {
        alert("時間設定錯誤：請確認「手術起始時間」 ≤ 「常規結束時間」 ≤ 「加班結束時間」");
        return;
      }
      setTimeSettings(newSettings);
    } catch (error) {
      console.error("轉換時間時出錯：", error);
    }
  };

  // 處理銜接時間變更
  const handleCleaningTimeChange = (minutes) => {
    const updatedSettings = { ...timeSettings, cleaningTime: minutes };
    setTimeSettings(updatedSettings);
  };

  // 確認添加選中的關閉手術房
  const confirmSelectedRooms = async () => {
    if (selectedClosedRooms.length === 0) {
      alert("請至少選擇一個關閉的手術房");
      return;
    }

    // 從closedRooms中找出被選中的手術房完整信息
    const selectedRooms = closedRooms.filter(room => selectedClosedRooms.includes(room.id));

    // 將選中的關閉手術房信息和原有的保留手術房合併
    const newReservedRooms = [...reservedRooms, ...selectedRooms];
    const uniqueRooms = newReservedRooms.filter((room, index, self) =>
      index === self.findIndex(r => r.id === room.id)
    );

    // 更新保留手術房列表
    setReservedRooms(uniqueRooms);

    // 將選中的關閉手術房信息存儲到localStorage，供ganttData.jsx使用
    localStorage.setItem("reservedClosedRooms", JSON.stringify(uniqueRooms));

    alert(`已選擇 ${selectedRooms.length} 個關閉手術房加入本次排程`);

    // 清空選中列表
    setSelectedClosedRooms([]);

    // 通知父組件更新
    if (onTimeSettingsChange) {
      onTimeSettingsChange(timeSettings, true);
    }
  };

  // 移除選中的已保留手術房
  const removeSelectedReservedRooms = () => {
    if (selectedReservedRooms.length === 0) {
      alert("請至少選擇一個要移除的保留手術房");
      return;
    }

    if (!rows || !Array.isArray(rows)) {
      alert("目前無法取得手術資料，請稍後再試");
      return;
    }

    // 注意：roomId 是字串，要確保型別一致
    const roomsWithSurgeries = selectedReservedRooms.filter(roomId => {
      const roomData = rows.find(r => r.roomId === String(roomId));
      return roomData && Array.isArray(roomData.data) && roomData.data.length > 0;
    });

    if (roomsWithSurgeries.length > 0) {
      const msg = roomsWithSurgeries.map(id => `ID ${id} 仍有手術`).join("\n");
      alert(`無法移除以下保留手術房，仍有手術存在：\n${msg}`);
      return;
    }

    const updatedReservedRooms = reservedRooms.filter(room => !selectedReservedRooms.includes(room.id));
    setReservedRooms(updatedReservedRooms);
    localStorage.setItem("reservedClosedRooms", JSON.stringify(updatedReservedRooms));
    alert(`已移除 ${selectedReservedRooms.length} 個保留手術房`);
    setSelectedReservedRooms([]);

    if (onTimeSettingsChange) {
      onTimeSettingsChange(timeSettings, true);
    }
  };




  // 僅更新時間設定
  const applyTimeSettings = async (event) => {
    if (event) event.preventDefault();
    setTempTimeSettings(timeSettings);
    setInitialTimeSettings(timeSettings);
    localStorage.setItem("ganttTimeSettings", JSON.stringify(timeSettings)); // 儲存設定
    if (onTimeSettingsChange) {
      onTimeSettingsChange(timeSettings, true);
    }

    try {
      const getMinutesDiff = (later, earlier) => {
        let diff = later - earlier;
        if (diff < 0) diff += 1440; // 若為負，表示跨過午夜
        return diff;
      };

      const payload = {
        surgeryStartTime: timeSettings.surgeryStartTime,
        regularEndTime: getMinutesDiff(timeSettings.regularEndTime, timeSettings.surgeryStartTime),
        overtimeEndTime: getMinutesDiff(timeSettings.overtimeEndTime, timeSettings.regularEndTime),
        cleaningTime: timeSettings.cleaningTime
      };

      const response = await axios.post(`${BASE_URL}/api/system/algorithm/time-settings/export`, payload);
      console.log("CSV 產生結果：", response.data);
      alert("參數設定已更新，您可以在甘特圖中預覽變更。");
    } catch (error) {
      console.error("生成 CSV 失敗：", error);
      alert("生成 CSV 失敗，請稍後再試。");
    }
  };


  // 處理提示收合狀態變更
  const toggleTips = () => {
    const newState = !tipsCollapsed;
    setTipsCollapsed(newState);
    localStorage.setItem('parameterTipsCollapsed', newState.toString());
  };

  return (
    <div className="time-settings-container">
      {/* <h3 className="time-settings-title">參數設定</h3> */}

      {/* 使用提示區域 - 添加收合功能 */}
      <div className={`parameter-tips ${tipsCollapsed ? 'tips-collapsed' : ''}`}>
        <svg
          className="parameter-tips-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="currentColor"
        >
          <circle cx="12" cy="12" r="10" fill="#3B82F6" />
          <circle cx="12" cy="7" r="1.5" fill="white" />
          <rect x="11" y="9.5" width="2" height="6" rx="1" fill="white" />
        </svg>

        <div className="parameter-tips-content">
          <div className="tips-header">
            <p className="parameter-tips-title">參數設定使用說明</p>
            <button
              className="tips-toggle-button"
              onClick={toggleTips}
              aria-label={tipsCollapsed ? "展開說明" : "收合說明"}
            >
              {tipsCollapsed ? "展開" : "收合"}
            </button>
          </div>

          {!tipsCollapsed && (
            <ul className="parameter-tips-list">
              <li><strong>時間設定區域</strong>：調整手術起始時間、常規與加班結束時間，以及手術間銜接所需時間</li>
              <li><strong>保留手術房區域</strong>：您可以選擇將目前關閉的手術房暫時加入排程，但不會更改手術房管理中的狀態</li>
              <li><strong>確認加入選中的手術房</strong>：將勾選的關閉狀態手術房加入甘特圖排程</li>
              <li><strong>確認時間設定</strong>：僅將時間參數設定應用到甘特圖中</li>
              <li><strong>移除選中的保留手術房</strong>：從甘特圖中移除已加入的關閉手術房</li>
            </ul>
          )}
        </div>
      </div>

      {/* 左右兩欄佈局容器 */}
      <div className="parameters-layout">
        {/* 左側：時間設定部分 */}
        <div className="parameters-column">
          <div className="settings-section">
            <h4 className="settings-section-title">時間設定</h4>
            <div className="time-settings-form">
              <div className="time-settings-item">
                <label className="surgery-label">手術開始時間：</label>
                <div className="time-select-container">
                  <select
                    className="time-select hour-select"
                    value={Math.floor(timeSettings.surgeryStartTime / 60)}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value);
                      const minutes = timeSettings.surgeryStartTime % 60;
                      const newTime = hours * 60 + minutes;
                      handleTimeChange("surgeryStartTime", `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
                    }}
                  >
                    {[...Array(24)].map((_, i) => (
                      <option key={`hour-${i}`} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                  <span className="time-separator">:</span>
                  <select
                    className="time-select minute-select"
                    value={timeSettings.surgeryStartTime % 60}
                    onChange={(e) => {
                      const hours = Math.floor(timeSettings.surgeryStartTime / 60);
                      const minutes = parseInt(e.target.value);
                      const newTime = hours * 60 + minutes;
                      handleTimeChange("surgeryStartTime", `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
                    }}
                  >
                    {[...Array(60)].map((_, i) => (
                      <option key={`minute-${i}`} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="time-settings-item">
                <label className="surgery-label">常規結束時間：</label>
                <div className="time-select-container">
                  <select
                    className="time-select hour-select"
                    value={Math.floor(timeSettings.regularEndTime / 60)}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value);
                      const minutes = timeSettings.regularEndTime % 60;
                      const newTime = hours * 60 + minutes;
                      handleTimeChange("regularEndTime", `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
                    }}
                  >
                    {[...Array(24)].map((_, i) => (
                      <option key={`hour-${i}`} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                  <span className="time-separator">:</span>
                  <select
                    className="time-select minute-select"
                    value={timeSettings.regularEndTime % 60}
                    onChange={(e) => {
                      const hours = Math.floor(timeSettings.regularEndTime / 60);
                      const minutes = parseInt(e.target.value);
                      const newTime = hours * 60 + minutes;
                      handleTimeChange("regularEndTime", `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
                    }}
                  >
                    {[...Array(60)].map((_, i) => (
                      <option key={`minute-${i}`} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="time-settings-item">
                <label className="surgery-label">加班結束時間：</label>
                <div className="time-select-container">
                  <select
                    className="time-select hour-select"
                    value={Math.floor(timeSettings.overtimeEndTime / 60)}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value);
                      const minutes = timeSettings.overtimeEndTime % 60;
                      const newTime = hours * 60 + minutes;
                      handleTimeChange("overtimeEndTime", `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
                    }}
                  >
                    {[...Array(24)].map((_, i) => (
                      <option key={`hour-${i}`} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                  <span className="time-separator">:</span>
                  <select
                    className="time-select minute-select"
                    value={timeSettings.overtimeEndTime % 60}
                    onChange={(e) => {
                      const hours = Math.floor(timeSettings.overtimeEndTime / 60);
                      const minutes = parseInt(e.target.value);
                      const newTime = hours * 60 + minutes;
                      handleTimeChange("overtimeEndTime", `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
                    }}
                  >
                    {[...Array(60)].map((_, i) => (
                      <option key={`minute-${i}`} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="time-settings-item">
                <label className="surgery-label">銜接時間 (分鐘)：</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={timeSettings.cleaningTime}
                  onChange={(e) => handleCleaningTimeChange(parseInt(e.target.value))}
                  className="number-input"
                />
              </div>

              {/* 將確認按鈕移到時間設定區域內 */}
              <div className="time-settings-button-container">
                <button
                  onClick={applyTimeSettings}
                  className="time-settings-button"
                  type="button"
                >
                  確認時間設定
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：保留手術房部分 */}
        <div className="parameters-column">
          <div className="settings-section">
            <h4 className="settings-section-title">保留手術房</h4>
            <p className="settings-description">可選擇將目前關閉的手術房加入本次排程（不會改變手術房管理中的狀態）</p>

            {/* 整合的手術房列表區域 */}
            <div className="operating-rooms-container">
              {/* 已保留的手術房列表 */}
              {reservedRooms.length > 0 && (
                <div className="reserved-rooms-section">
                  <h5 className="rooms-section-title">已加入排程的關閉手術房</h5>
                  <div className="rooms-list">
                    {reservedRooms.map(room => (
                      <div key={`reserved-${room.id}`} className="room-item">
                        <input
                          type="checkbox"
                          id={`reserved-room-${room.id}`}
                          checked={selectedReservedRooms.includes(room.id)}
                          onChange={() => handleReservedRoomSelect(room.id)}
                        />
                        <label className="label-room-info" htmlFor={`reserved-room-${room.id}`}>
                          {room.operatingRoomName} (ID: {room.id}) - {room.department?.name || '未指定科別'} - {room.roomType}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 可選擇的關閉手術房列表 */}
              {loading ? (
                <div className="loading-rooms">正在載入關閉的手術房...</div>
              ) : closedRooms.length === 0 ? (
                <div className="no-closed-rooms">目前沒有處於關閉狀態的手術房</div>
              ) : (
                <div className="closed-rooms-section">
                  <h5 className="rooms-section-title">可選擇的關閉手術房</h5>
                  <div className="rooms-list">
                    {closedRooms.filter(room => !reservedRooms.some(r => r.id === room.id)).map(room => (
                      <div key={room.id} className="room-item">
                        <input
                          type="checkbox"
                          id={`room-${room.id}`}
                          checked={selectedClosedRooms.includes(room.id)}
                          onChange={() => handleRoomSelect(room.id)}
                        />
                        <label className="label-room-info" htmlFor={`room-${room.id}`}>
                          {room.operatingRoomName} (ID: {room.id}) - {room.department?.name || '未指定科別'} - {room.roomType}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 整合的按鈕區域 */}
              <div className="rooms-buttons-container">
                <button
                  onClick={confirmSelectedRooms}
                  className="confirm-rooms-button"
                  disabled={selectedClosedRooms.length === 0}
                >
                  確認加入選中的手術房
                </button>

                {reservedRooms.length > 0 && (
                  <button
                    onClick={removeSelectedReservedRooms}
                    className="remove-rooms-button"
                    disabled={selectedReservedRooms.length === 0}
                  >
                    移除選中的保留手術房
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default ParametricSettings;
