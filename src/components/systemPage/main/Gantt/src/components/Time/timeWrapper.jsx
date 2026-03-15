import React, { useRef, useCallback, useEffect, useState } from "react";
import { getTimeSettings } from './timeUtils';
import axios from "axios";
import { BASE_URL } from "../../../../../../../config";

const TimeWrapper = ({ children, containerWidth, useTempSettings = true, timeScaleOnly = false, contentOnly = false }) => {
  // 新增時間設定狀態
  const [timeSettings, setTimeSettings] = useState({
    surgeryStartTime: 510, // 預設值 510 分鐘 = 8:30 AM (從00:00開始計算)
    regularEndTime: 1050,  // 預設值 1050 分鐘 = 17:30 PM (從00:00開始計算)
    overtimeEndTime: 1200, // 預設值 1200 分鐘 = 20:00 PM (從00:00開始計算)
    cleaningTime: 45,      // 預設值 45 分鐘
  });

  // 為了解決拖曳後甘特圖顯示偏差問題，新增一個key來強制重新渲染
  const [renderKey, setRenderKey] = useState(0);

  // 從時間設定中獲取設定，並支援使用臨時設定
  const updateTimeSettings = useCallback(async () => {
    if (useTempSettings) {
      // 使用getTimeSettings獲取可能的臨時設定
      const tempSettings = getTimeSettings(true);
      if (tempSettings) {
        console.log('使用臨時時間設定:', tempSettings);
        setTimeSettings(tempSettings);
        return;
      }
    }

    // 從後端獲取時間設定
    const settings = await fetchTimeSettings();

    if (settings) {
      setTimeSettings(settings);  // 更新 timeSettings 為後端資料
    } else {
      // 如果後端獲取失敗，使用預設值
      setTimeSettings({
        surgeryStartTime: 510,
        regularEndTime: 1050,
        overtimeEndTime: 1200,
        cleaningTime: 45,
      });
    }
  }, [useTempSettings]);

  // 初始化時載入設定
  useEffect(() => {
    updateTimeSettings();
  }, [updateTimeSettings]);

  const fetchTimeSettings = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/system/algorithm/time-settings`);  // 修改為你的 API 地址
      console.log('API 回應內容:', response.data);  // 輸出回應數據查看
      return response.data;  // 返回後端回應的數據
    } catch (error) {
      console.error('獲取時間設定失敗:', error);
      return null;  // 如果獲取失敗，返回 null
    }
  };

  // 監聽 localStorage 變更
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "ganttTimeSettings") {
        updateTimeSettings();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // 新增：額外監聽拖曳和銜接時間變更的自定義事件
    const handleDragOrCleaningChange = () => {
      console.log('收到拖曳或銜接時間變更事件，重新獲取時間設定');
      updateTimeSettings();
      // 強制重新渲染以確保UI正確顯示
      setRenderKey(prev => prev + 1);
    };

    window.addEventListener('ganttDragEnd', handleDragOrCleaningChange);
    window.addEventListener('cleaningTimeChange', handleDragOrCleaningChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ganttDragEnd', handleDragOrCleaningChange);
      window.removeEventListener('cleaningTimeChange', handleDragOrCleaningChange);
    };
  }, [updateTimeSettings]);

  // 將時間設定轉換為分鐘
  const startTime = timeSettings.surgeryStartTime; // 手術開始時間
  const endTime = 32 * 60; // 擴展到凌晨8:00 (24:00 + 8:00)，保留不變

  const wrapperRef = useRef(null);
  const timeScaleRef = useRef(null);
  const contentRef = useRef(null);

  // 每15分鐘對應25px
  const pixelsPer15Minutes = 25;

  // 同步滾動處理
  const syncScroll = useCallback((event) => {
    const scrollLeft = event.target.scrollLeft;

    // 確保同步左右滾動
    if (!timeScaleOnly && !contentOnly) {
      // 標準模式 - 同步兩個容器
      if (timeScaleRef.current?.parentElement) {
        timeScaleRef.current.parentElement.scrollLeft = scrollLeft;
      }

      if (contentRef.current) {
        contentRef.current.scrollLeft = scrollLeft;
      }
    } else if (timeScaleOnly) {
      // 分離模式 - 通知父容器
      window.dispatchEvent(new CustomEvent('ganttTimeScaleScroll', { detail: { scrollLeft } }));
    } else if (contentOnly) {
      // 分離模式 - 通知父容器
      window.dispatchEvent(new CustomEvent('ganttContentScroll', { detail: { scrollLeft } }));
    }
  }, [timeScaleOnly, contentOnly]);

  const handleScroll = (event) => {
    syncScroll(event);
  };

  useEffect(() => {
    const timeScaleContainer = timeScaleRef.current?.parentElement;
    const contentContainer = contentRef.current;

    if (timeScaleContainer && contentContainer) {
      timeScaleContainer.addEventListener('scroll', handleScroll);
      contentContainer.addEventListener('scroll', handleScroll);

      return () => {
        timeScaleContainer.removeEventListener('scroll', handleScroll);
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  // 處理滾動事件
  // const handleScroll = useCallback((event) => {
  //   const { scrollLeft } = event.target;
  //   syncScroll(scrollLeft);
  // }, [syncScroll]);

  // 處理滾輪事件
  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const scrollAmount = event.deltaY;

    if (timeScaleRef.current) {
      const currentScroll = timeScaleRef.current.parentElement.scrollLeft;
      const newScrollLeft = currentScroll + scrollAmount;
      syncScroll(newScrollLeft);
    }
  }, [syncScroll]);

  // 添加滾動事件監聽
  useEffect(() => {
    const timeScaleContainer = timeScaleRef.current?.parentElement;
    const content = contentRef.current;
    const wrapper = wrapperRef.current;

    if (timeScaleContainer && content && wrapper) {
      timeScaleContainer.addEventListener('scroll', handleScroll);
      content.addEventListener('scroll', handleScroll);
      wrapper.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        timeScaleContainer.removeEventListener('scroll', handleScroll);
        content.removeEventListener('scroll', handleScroll);
        wrapper.removeEventListener('wheel', handleWheel);
      };
    }
  }, [handleScroll, handleWheel]);

  // 監聽滾動事件，同步時間刻度和內容部分
  useEffect(() => {
    const handleTimeScaleScroll = (e) => {
      if (contentOnly && contentRef.current) {
        contentRef.current.scrollLeft = e.detail.scrollLeft;
      }
    };

    const handleContentScroll = (e) => {
      if (timeScaleOnly && timeScaleRef.current?.parentElement) {
        timeScaleRef.current.parentElement.scrollLeft = e.detail.scrollLeft;
      }
    };

    const handleMainScroll = (e) => {
      const { scrollLeft } = e.detail;

      // 同步兩個組件的滾動
      if (timeScaleOnly && timeScaleRef.current?.parentElement) {
        timeScaleRef.current.parentElement.scrollLeft = scrollLeft;
      }

      if (contentOnly && contentRef.current) {
        contentRef.current.scrollLeft = scrollLeft;
      }
    };

    // 特別處理垂直滾動時保持時間刻度可見
    const handleVerticalScroll = () => {
      // 此處不需要特別處理，因為使用了CSS的position:sticky來固定時間刻度
      // 只需確保在任何情況下水平滾動都能同步
    };

    window.addEventListener('ganttTimeScaleScroll', handleTimeScaleScroll);
    window.addEventListener('ganttContentScroll', handleContentScroll);
    window.addEventListener('ganttMainScroll', handleMainScroll);
    document.addEventListener('scroll', handleVerticalScroll, true);

    return () => {
      window.removeEventListener('ganttTimeScaleScroll', handleTimeScaleScroll);
      window.removeEventListener('ganttContentScroll', handleContentScroll);
      window.removeEventListener('ganttMainScroll', handleMainScroll);
      document.removeEventListener('scroll', handleVerticalScroll, true);
    };
  }, [timeScaleOnly, contentOnly]);

  // 時間格式化函數
  const formatTime = useCallback((hour, minute) => {
    if (hour === 24 && minute === 0) {
      return "24:00";
    }

    if (hour >= 24) {
      hour = hour - 24;
    }

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }, []);

  // 生成時間間隔
  const timeIntervals = [];
  const totalIntervals = (endTime - startTime) / 15;

  for (let i = 0; i <= totalIntervals; i++) {
    const totalMinutes = startTime + i * 15;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;

    timeIntervals.push({
      time: formatTime(hour, minute),
      type: minute === 0 ? "hour" : minute === 30 ? "half" : "quarter",
      // isStartTime: i === 0,
      is24Hour: hour === 24 && minute === 0,
      position: i * pixelsPer15Minutes,
    });
  }

  // 計算時間軸的總寬度
  const totalWidth = totalIntervals * pixelsPer15Minutes;

  // 僅渲染時間刻度
  if (timeScaleOnly) {
    return (
      <div className="time-wrapper-container time-scale-only" ref={wrapperRef} key={renderKey}>
        <div className="time-scale-header">
          <div className="scrollable-container">
            <div
              className="time-scale-ruler"
              ref={timeScaleRef}
              style={{ width: `${totalWidth}px` }}
            >
              {timeIntervals.map((interval, index) => (
                <div
                  key={index}
                  className={`time-mark ${interval.type}-mark ${interval.is24Hour ? "time-mark-24hour" : ""}`}
                  style={{ left: `${interval.position}px` }}
                >
                  {(interval.type === "hour" || interval.isStartTime || interval.is24Hour) && (
                    <div
                      className={`time-mark-label ${interval.isStartTime
                        ? "time-mark-start"
                        : interval.is24Hour
                          ? "time-mark-24hour-label"
                          : ""
                        }`}
                      style={{ left: interval.isStartTime ? "0" : "50%" }}
                    >
                      {interval.time}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 僅渲染內容
  if (contentOnly) {
    return (
      <div className="time-wrapper-container content-only" ref={wrapperRef} key={renderKey}>
        <div className="time-wrapper-content">
          <div className="scrollable-container" ref={contentRef}>
            <div style={{ width: `${totalWidth}px`, minHeight: "100%" }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 標準模式（兩者都渲染）
  return (
    <div className="time-wrapper-container" ref={wrapperRef} key={renderKey}>
      <div className="time-scale-header">
        <div className="scrollable-container">
          <div
            className="time-scale-ruler"
            ref={timeScaleRef}
            style={{ width: `${totalWidth}px` }}
          >
            {timeIntervals.map((interval, index) => (
              <div
                key={index}
                className={`time-mark ${interval.type}-mark ${interval.is24Hour ? "time-mark-24hour" : ""}`}
                style={{ left: `${interval.position}px` }}
              >
                {(interval.type === "hour" || interval.isStartTime || interval.is24Hour) && (
                  <div
                    className={`time-mark-label ${interval.isStartTime
                      ? "time-mark-start"
                      : interval.is24Hour
                        ? "time-mark-24hour-label"
                        : ""
                      }`}
                    style={{ left: interval.isStartTime ? "0" : "50%" }}
                  >
                    {interval.time}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="time-wrapper-content">
        <div className="scrollable-container" ref={contentRef}>
          <div style={{ width: `${totalWidth}px`, minHeight: "100%" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeWrapper;
