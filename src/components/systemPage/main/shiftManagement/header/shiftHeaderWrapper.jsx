import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import "./shiftHeader.css";
import { BASE_URL } from "../../../../../config";
import ConfirmScheduleButton from "./ConfirmScheduleButton";

function getTomorrowYMD() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tomorrow);
}

/** 改：多接收 totalRoomCount，用來判斷是否可執行；不再以 closedRoomIds 是否為空來禁按 */
function RunAlgorithmButton({ closedRoomIds, totalRoomCount = 0, isInitializing = false, onAlgorithmComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showResultButton, setShowResultButton] = useState(false);

  const handleRunAlgorithm = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setShowResultButton(false);
    try {
      const [response] = await Promise.all([
        axios.post(`${BASE_URL}/api/system/algorithm/run`, {
          // 後端目前收 List<String>，這裡確保轉字串；允許空陣列表示「全部開放」
          closedRoomIds: (closedRoomIds ?? []).map((id) => String(id)),
        }),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
      const result = response.data;
      if (typeof result === "string" && result.includes("<html")) {
        alert("⚠️ 錯誤：後端可能回傳了錯誤頁，請檢查是否 .bat 檔執行失敗");
        console.warn("返回 HTML：", result);
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setShowResultButton(true);
        // 排程完成後立即重新抓取資料，不需要重新整理頁面
        try { localStorage.removeItem("shiftRows"); } catch {}
        onAlgorithmComplete?.();
      }
    } catch (error) {
      console.error("執行錯誤：", error);
      alert("錯誤：" + (error?.response?.data || error.message));
      setIsLoading(false);
    }
  };

  const handleCloseResultButton = () => {
    setShowResultButton(false);
  };

  useEffect(() => {
    if (isLoading) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflowY = "scroll";
      document.body.style.width = "100%";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflowY = "";
      document.body.style.width = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
  }, [isLoading]);

  // ✅ 執行中 / 初始載入中 / 根本沒有任何手術房時禁按
  const disabled = isLoading || isInitializing || (totalRoomCount ?? 0) === 0;

  return (
    <>
      <button
        type="button"
        className="gantt-buttons flex items-center bg-purple-500 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-300"
        onClick={handleRunAlgorithm}
        disabled={disabled}
        title={disabled ? (isLoading ? "正在執行中" : isInitializing ? "資料載入中..." : "沒有可排程的手術房") : "開始排程"}
      >
        <svg
          className="h-6 w-6 mr-1"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
        {isLoading ? "執行中..." : "開始排程"}
      </button>

      {isLoading && (
        <div className="modal-overlay">
          <div className="spin-wrapper">
            <div className="spinner"></div>
            <div className="loading-text">排程中...</div>
          </div>
        </div>
      )}

      {showResultButton && !isLoading && (
        <div className="modal-overlay">
          <div className="spin-wrapper flex flex-col items-center space-y-4">
            <div className="text-xl font-semibold text-gray-700">排程完成！</div>
            <div className="checkmark w-16 h-16">
              <svg viewBox="0 0 52 52" className="w-full h-full">
                <path
                  d="M14 27 L22 35 L38 19"
                  fill="none"
                  stroke="green"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <button
              className="gantt-buttons flex items-center bg-purple-500 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-300"
              onClick={handleCloseResultButton}
            >
              確認
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ShiftHeaderWrapper({ timeSettings, operatingRooms, closedRoomIds, onAlgorithmComplete }) {
  const tomorrowYMD = getTomorrowYMD();
  const isInitializing = operatingRooms === null;
  const roomCount = operatingRooms?.length ?? 0;
  const closedCount = closedRoomIds?.length ?? 0;

  const openCount = useMemo(
    () => roomCount - closedCount,
    [roomCount, closedCount]
  );

  return (
    <div className="header">
      <div className="title">
        <h1>{tomorrowYMD} 手術排程甘特圖</h1>
        <p>顯示所有手術室的排程安排</p>
      </div>

      <div className="actions">
        <div className="room-count">
          <svg
            className="h-5 w-5 mr-1"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>
            共 {roomCount} 間手術房（開放 {openCount} / 休 {closedCount}）
          </p>
        </div>

        <div className="action-buttons">
          <ConfirmScheduleButton />
          {/* ✅ 多傳 totalRoomCount，讓按鈕邏輯正確運作 */}
          <RunAlgorithmButton
            closedRoomIds={closedRoomIds}
            totalRoomCount={roomCount}
            isInitializing={isInitializing}
            onAlgorithmComplete={onAlgorithmComplete}
          />
        </div>
      </div>
    </div>
  );
}

export default ShiftHeaderWrapper;
