import React from "react";
import axios from "axios";
import { BASE_URL } from "/src/config";
import { updateSurgeryInDatabase } from "../DragDrop/dragEndHandler";
import { getTimeSettings, clearTempTimeSettings } from "./timeUtils";

const ConfirmScheduleButton = ({ rows }) => {
  const confirmChanges = async () => {
    try {
      // 開始確認修改
      console.log('開始確認修改排程...');

      const updatePromises = [];

      // 遍歷每個手術房
      for (const roomIndex in rows) {
        const room = rows[roomIndex];
        if (room.data && room.data.length > 0) {
          // 使用 updateSurgeryInDatabase 函數更新每個手術房的數據
          // 參數傳遞: rows, sourceRoomIndex, destinationRoomIndex, sourceIndex, destinationIndex
          // 因為是確認操作，這裡源和目標都是同一個房間
          const updatePromise = updateSurgeryInDatabase(
            rows,
            parseInt(roomIndex),
            parseInt(roomIndex),
            0,
            0
          );

          updatePromises.push(updatePromise);
        }
      }

      // 等待所有更新完成
      await Promise.all(updatePromises);

      // 如果有臨時時間設定，則將其保存到 localStorage
      const tempSettings = getTimeSettings(true);
      if (tempSettings) {
        // 保存到 localStorage
        localStorage.setItem("ganttTimeSettings", JSON.stringify(tempSettings));
        // 清除臨時設定
        clearTempTimeSettings();
      }

      // 通知用戶更新成功
      alert('排程已成功更新！');

      // 清除暫存的排程資料並重新載入頁面
      try {
        localStorage.removeItem("shiftRows");
      } catch {
        // ignore
      }
      window.location.reload();
    } catch (error) {
      console.error('確認修改排程時發生錯誤:', error);
      alert(`確認修改失敗: ${error.message}`);
    }
  };

  return (
    <button
      onClick={confirmChanges}
      className="gantt-buttons confirm-schedule-button"
    >
      <svg xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 30 24"
        strokeWidth={1.5}
        stroke="currentColor"
        //  className="size-5"
        className="h-6 w-6 mr-1"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
      更新首頁
    </button>
  );
};

export default ConfirmScheduleButton; 