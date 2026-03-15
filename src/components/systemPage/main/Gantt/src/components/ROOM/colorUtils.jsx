// 定義顏色常數
export const COLORS = {
  GREEN: "#19ec9f",   // 對應 CSS 中的 .item.green
  YELLOW: "#ebeb0a",  // 對應 CSS 中的 .item.yellow
  RED: "#e63030",     // 對應 CSS 中的 .item.red
  BLUE: "#362de9",    // 對應 CSS 中的 .item.blue
  GROUP: "#ffa500" // 群組顏色
};

// 從時間設定獲取設定，如果不存在則使用預設值
import { getTimeSettings } from '../Time/timeUtils';

// 根據手術結束時間判斷顏色
export const getColorByEndTime = (endTime, isCleaningTime, useTempSettings = false, isGroup = false) => {
  if (isCleaningTime) {
    return "blue";
  }

  // 獲取當前的時間設定，指定是否使用臨時設定
  const timeSettings = getTimeSettings(useTempSettings);

  const [hours, minutes] = endTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;

  // 手術開始時間（例如：8:30 = 510分鐘）
  const surgeryStartTime = timeSettings.surgeryStartTime;
  
  // 注意: timeSettings.regularEndTime 實際上是當天的分鐘數，不是持續時間
  // 例如常規結束時間為 15:30，則 regularEndTime = 15*60 + 30 = 930
  const regularEndTimeMinutes = timeSettings.regularEndTime;
  
  // 注意: timeSettings.overtimeEndTime 實際上是當天的分鐘數，不是持續時間
  // 例如加班結束時間為 19:00，則 overtimeEndTime = 19*60 + 0 = 1140
  const overtimeEndTimeMinutes = timeSettings.overtimeEndTime;

  // console.log(`DEBUG - 時間設定: 開始時間=${surgeryStartTime}分鐘, 正常結束=${regularEndTimeMinutes}分鐘, 加班結束=${overtimeEndTimeMinutes}分鐘`);
  // console.log(`DEBUG - 手術時間: 結束時間=${totalMinutes}分鐘`);

  // 比較總分鐘數，確定顏色
  if (isGroup) {
    return "group"; // 群組顏色
  } else if (totalMinutes <= regularEndTimeMinutes) {
    return "green";
  } else if (totalMinutes <= overtimeEndTimeMinutes) {
    return "yellow";
  } else {
    return "red";
  }
};

// 獲取銜接時間的顏色
export const getCleaningColor = () => "blue";

// 獲取群組顏色
export const getGroupColor = (isCleaningTime, endTime, useTempSettings = false) => {
  // 如果是銜接時間，返回藍色
  if (isCleaningTime) return "blue";

  // 群組專用顏色
  return "group";
};

// 根據顏色名稱獲取實際的色碼值
export const getColorCode = (colorName) => {
  switch (colorName) {
    case "green":
      return COLORS.GREEN;
    case "yellow":
      return COLORS.YELLOW;
    case "red":
      return COLORS.RED;
    case "blue":
      return COLORS.BLUE;
    case "group":
      return COLORS.GROUP;
    default:
      return "#999999"; // 預設灰色
  }
};