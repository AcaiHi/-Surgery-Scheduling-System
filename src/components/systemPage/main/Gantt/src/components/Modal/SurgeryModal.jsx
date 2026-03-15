import React, { useEffect, useState } from "react";
import "./SurgeryModal.css";
import axios from "axios";
import { BASE_URL } from "/src/config";
import { isTimeAfterNextDay8AM } from "../Time/timeUtils";

function SurgeryModal({ surgery, onClose, error: initialError }) {
  if (!surgery) return null;

  // 添加狀態來追蹤當前顯示的群組手術索引
  const [currentSurgeryIndex, setCurrentSurgeryIndex] = useState(0);
  // 添加狀態用於存儲獲取的群組手術詳情
  const [groupSurgeries, setGroupSurgeries] = useState([]);
  // 添加狀態用於顯示加載錯誤
  const [error, setError] = useState(initialError);
  // 添加狀態標記是否正在加載群組手術資料
  const [isLoading, setIsLoading] = useState(false);

  // 添加調試輸出，檢查傳入的手術對象
  console.log('SurgeryModal接收到的手術數據:', surgery);

  // 檢查是否為群組手術 - 更新判斷條件，確保能識別從API獲取的群組手術
  const isGroupSurgery = 
    (surgery.isGroup && surgery.groupApplicationIds && surgery.groupApplicationIds.length > 0) || 
    (Array.isArray(surgery.groupApplicationIds) && surgery.groupApplicationIds.length > 0);
  
  console.log('是否為群組手術:', isGroupSurgery);
  console.log('群組手術IDs:', surgery.groupApplicationIds);

  // 在組件掛載或surgery變更時獲取群組手術詳情
  useEffect(() => {
    // 如果是群組手術，且有groupApplicationIds，則獲取所有群組成員的詳細資訊
    if (isGroupSurgery && Array.isArray(surgery.groupApplicationIds) && surgery.groupApplicationIds.length > 0) {
      setIsLoading(true);
      setError(null);
      
      const fetchGroupSurgeries = async () => {
        try {
          console.log('開始獲取群組手術成員詳情:', surgery.groupApplicationIds);
          
          // 對每個群組成員ID發起請求
          const surgeryPromises = surgery.groupApplicationIds.map(async (id) => {
            try {
              const response = await axios.get(`${BASE_URL}/api/surgeries/${id}`);
              
              // 合併API返回的數據和其他必要資訊
              return {
                ...response.data,
                applicationId: id,
                operatingRoomName: surgery.operatingRoomName,
                isCleaningTime: false,
                // 如果手術是從甘特圖中點擊的，保留時間資訊
                startTime: surgery.startTime,
                endTime: surgery.endTime
              };
            } catch (fetchError) {
              console.error(`獲取手術 ${id} 詳細資料失敗:`, fetchError);
              return null;
            }
          });
          
          // 等待所有請求完成
          const results = await Promise.all(surgeryPromises);
          const validResults = results.filter(result => result !== null);
          
          if (validResults.length > 0) {
            console.log('成功獲取群組手術成員，數量:', validResults.length);
            setGroupSurgeries(validResults);
            // 確保索引在有效範圍內
            setCurrentSurgeryIndex(prev => Math.min(prev, validResults.length - 1));
          } else {
            console.error('未能獲取任何有效的群組手術詳細資訊');
            setError('未能獲取群組手術資訊，請稍後再試');
          }
        } catch (error) {
          console.error('獲取群組手術詳細資訊失敗:', error);
          setError(`獲取群組手術資訊失敗: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchGroupSurgeries();
    }
  }, [surgery, isGroupSurgery]);

  // 獲取非清潔時間的手術
  const totalSurgeries = groupSurgeries.length || 0;
  console.log('群組中的實際手術數量:', totalSurgeries);

  // 確定要顯示的手術資訊
  // 如果是群組手術且已經獲取到有效的群組成員，則顯示特定成員；否則直接顯示傳入的手術
  const displaySurgery = isGroupSurgery && totalSurgeries > 0
    ? groupSurgeries[currentSurgeryIndex] || surgery
    : surgery;

  console.log('當前顯示的手術詳情:', displaySurgery);

  // 確定是否顯示釘選狀態
  // 從顯示的手術或父群組獲取釘選狀態
  const isPinned = displaySurgery.isPinned || surgery.isPinned;

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // 儲存當前滾動位置
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflowY = "scroll"; // 保留 scrollbar 占位
    document.body.style.width = "100%";

    window.addEventListener("keydown", handleEscKey);

    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflowY = "";
      document.body.style.width = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1); // 回到原本位置

      window.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  const formatDate = (dateValue) => {
    if (!dateValue) return '未指定';

    try {
      if (typeof dateValue === 'string') {
        return dateValue;
      } else {
        return new Date(dateValue).toLocaleDateString();
      }
    } catch (error) {
      console.error('日期格式化錯誤:', error);
      return '日期格式錯誤';
    }
  };

  const formatTime = (time) => {
    if (!time) return '未指定';

    try {
      const [hours, minutes] = time.split(":").map(Number);
      if (hours >= 24) {
        const adjustedHours = hours - 24;
        return `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      return time;
    } catch (error) {
      console.error('時間格式化錯誤:', error);
      return time;
    }
  };

  const getOperatingRoomName = () => {
    return displaySurgery.operatingRoomName || surgery.operatingRoomName || '未指定';
  };

  // 導航到上一個手術
  const goToPreviousSurgery = () => {
    if (isGroupSurgery && totalSurgeries > 0) {
      setCurrentSurgeryIndex(prev => {
        const newIndex = (prev - 1 + totalSurgeries) % totalSurgeries;
        console.log('導航到上一個手術:', newIndex);
        return newIndex;
      });
    }
  };

  // 導航到下一個手術
  const goToNextSurgery = () => {
    if (isGroupSurgery && totalSurgeries > 0) {
      setCurrentSurgeryIndex(prev => {
        const newIndex = (prev + 1) % totalSurgeries;
        console.log('導航到下一個手術:', newIndex);
        return newIndex;
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>手術詳細資訊</h2>

          {/* 顯示群組手術導航控制項 */}
          {isGroupSurgery && totalSurgeries > 1 && (
            <div className="group-navigation">
              <button onClick={goToPreviousSurgery} className="nav-button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="nav-indicator">{`${currentSurgeryIndex + 1}/${totalSurgeries}`}</span>
              <button onClick={goToNextSurgery} className="nav-button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}

          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <p>顯示的可能是部分資料或舊資料</p>
          </div>
        )}

        {isLoading && isGroupSurgery && (
          <div className="info-banner bg-yellow-50 border-l-4 border-yellow-500 p-3 mx-4 mt-4">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-2 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-yellow-700">正在獲取群組手術資訊...</p>
            </div>
          </div>
        )}

        {isGroupSurgery && (
          <div className="info-banner bg-blue-50 border-l-4 border-blue-500 p-3 mx-4 mt-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" width="20" height="20" className="text-blue-600 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              <p className="text-sm text-blue-700">此為群組手術，使用右上角箭頭查看各個手術詳細資訊</p>
            </div>
          </div>
        )}

        {isPinned && (
          <div className="info-banner bg-red-50 border-l-4 border-red-500 p-3 mx-4 mt-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className="text-red-600 mr-2">
                <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
              </svg>
              <p className="text-sm text-red-700">此手術房已被釘選，手術排程無法移動</p>
            </div>
          </div>
        )}

        <div className="modal-body">
          <div className="info-group blue">
            <h3 className="text-blue-600">基本資訊</h3>
            <p>
              <strong>申請編號：</strong> {displaySurgery.applicationId || '未指定'}
            </p>
            <p>
              <strong>病歷號碼：</strong> {displaySurgery.medicalRecordNumber || '未指定'}
            </p>
            <p>
              <strong>病患姓名：</strong> {displaySurgery.patientName || '未指定'}
            </p>
            <p>
              <strong>手術日期：</strong> {formatDate(displaySurgery.date)}
            </p>
          </div>

          <div className="info-group green">
            <h3>手術資訊</h3>
            <p>
              <strong>科別：</strong> {displaySurgery.departmentName || '未指定'}
            </p>
            <p>
              <strong>手術名稱：</strong> {displaySurgery.surgeryName || '未指定'}
            </p>
            <p>
              <strong>主刀醫師：</strong> {displaySurgery.chiefSurgeonName || displaySurgery.doctor || '未指定'}
            </p>
            <p>
              <strong>手術室：</strong> {getOperatingRoomName()}
            </p>
            <p>
              <strong>預估時間：</strong> {displaySurgery.estimatedSurgeryTime || displaySurgery.duration || '未指定'} {(displaySurgery.estimatedSurgeryTime || displaySurgery.duration) ? '分鐘' : ''}
            </p>
            {displaySurgery.startTime && (
              <p>
                <strong>開始時間：</strong> {formatTime(displaySurgery.startTime)}
              </p>
            )}
            {displaySurgery.endTime && (
              <div>
                <p>
                  <strong>結束時間：</strong> {formatTime(displaySurgery.endTime)}
                  {isTimeAfterNextDay8AM(displaySurgery.endTime) && (
                    <span className="text-red-600 font-bold ml-2">⚠️ 超過隔天早上8點</span>
                  )}
                </p>
                {isTimeAfterNextDay8AM(displaySurgery.endTime) && (
                  <p className="text-red-600 text-sm mt-1">
                    注意：此手術結束時間超過隔天早上8點，請調整排程。
                  </p>
                )}
              </div>
            )}
            <p>
              <strong>麻醉方式：</strong> {displaySurgery.anesthesiaMethod || '未指定'}
            </p>
            <p>
              <strong>手術原因：</strong> {displaySurgery.surgeryReason || '未指定'}
            </p>
          </div>
          <div className="info-group pink">
            <h3>其他資訊</h3>
            <p>
              <strong>特殊需求：</strong>{" "}
              {displaySurgery.specialOrRequirements || "無"}
            </p>
            <p>
              <strong>申請人：</strong> {displaySurgery.user?.name || "未指定"}
            </p>
            
            {/* 顯示群組信息 */}
            {isGroupSurgery && (
              <div className="group-info mt-3 pt-3 border-t border-pink-200">
                <p>
                  <strong>群組手術：</strong> 第 {currentSurgeryIndex + 1} 台，共 {totalSurgeries} 台
                </p>
                {Array.isArray(surgery.groupApplicationIds) && (
                  <p>
                    <strong>群組ID列表：</strong> {surgery.groupApplicationIds.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SurgeryModal;
