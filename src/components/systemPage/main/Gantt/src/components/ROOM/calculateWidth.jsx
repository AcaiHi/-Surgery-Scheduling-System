import { getTimeSettings } from '../Time/timeUtils';

export const calculateWidth = (startTime, endTime, useTempSettings = false) => {
  // 檢查是否有有效的時間參數
  if (!startTime || !endTime) {
    console.warn('calculateWidth: startTime 或 endTime 未提供，使用預設值');
    // 返回最小寬度和預設位置
    return {
      width: '25px',
      left: '0px',
    };
  }

  // 從時間設定中獲取起始時間，指定是否使用臨時設定
  const timeSettings = getTimeSettings(useTempSettings);
  const baseTime = timeSettings.surgeryStartTime; // 使用設定中的起始時間
  
  // Helper function to convert time to minutes
  const timeToMinutes = (timeStr) => {
    try {
      const [hours, minutes] = timeStr.split(":").map(Number);
      return hours * 60 + minutes;
    } catch (error) {
      console.error('解析時間字串時出錯:', error, timeStr);
      return 0;
    }
  };

  // Handle special case for end time "24:00"
  const startMinutes = timeToMinutes(startTime);
  const endMinutes =
    endTime === "24:00"
      ? 24 * 60 // Special case for midnight
      : timeToMinutes(endTime);

  // Calculate relative position to base time
  const relativeStart = startMinutes - baseTime;
  const duration = endMinutes - startMinutes;

  // Calculate width - 25px per 15 minutes (5/3 px per minute)
  const pixelsPerMinute = 25 / 15; // 1.67 px per minute
  
  // 確保寬度計算與時間刻度一致
  const width = Math.max(duration * pixelsPerMinute, 25); // Ensure minimum width of 25px

  // 計算左側位置，確保手術塊與時間刻度對齊
  const left = relativeStart * pixelsPerMinute;

  return {
    width: `${width}px`,
    left: `${left}px`,
  };
}; 