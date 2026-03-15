import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import "../styles.css";
import { getCleaningDuration } from './ROOM/GroupOperations';

// 從外部引入銜接時間顏色
export const getCleaningColor = () => "blue";

const GanttFilter = ({ originalRows, onFilteredDataChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  // 修改篩選條件順序，將科別移到最前面
  const filterOptions = [
    { value: "departmentName", label: "科別" },
    { value: "surgeryName", label: "手術名稱" },
    { value: "chiefSurgeonName", label: "主刀醫師" },
    { value: "operatingRoomName", label: "手術室" },
    { value: "estimatedSurgeryTime", label: "預估時間" },
    { value: "anesthesiaMethod", label: "麻醉方式" },
    { value: "surgeryReason", label: "手術原因" },
    { value: "specialOrRequirements", label: "特殊需求" },
    { value: "userName", label: "申請人" },
  ];

  const [selectedFilters, setSelectedFilters] = useState([]);
  const [filterValues, setFilterValues] = useState({});
  // 新增預估時間範圍的狀態
  const [timeRange, setTimeRange] = useState({ min: "", max: "" });
  const filterRef = useRef(null);

  // 1) 攤平原始資料，過濾掉已標記 isCleaningTime 的項目（避免重複）
  // 修改處：若手術資料中未指定手術室，則嘗試使用 row.name 或 row.room，再無則預設「未指定手術室」
  const flattenedRows = Array.isArray(originalRows)
    ? originalRows.flatMap((row) => {
      if (row.data && Array.isArray(row.data)) {
        return row.data
          .filter((surgery) => !surgery.isCleaningTime)
          .map((surgery) => ({
            ...surgery,
            operatingRoomName:
              surgery.operatingRoomName || row.name || row.room || "未指定手術室",
          }));
      }
      return row.isCleaningTime ? [] : row;
    })
    : [];

  // 2) 動態蒐集各欄位可供選擇的值，並按照字母順序 (A→Z) 排序
  const availableSurgeryNames = Array.from(
    new Set(flattenedRows.map((s) => s.surgeryName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const availableChiefSurgeonNames = Array.from(
    new Set(flattenedRows.map((s) => s.chiefSurgeonName || s.doctor).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const availableOperatingRoomNames = Array.from(
    new Set(flattenedRows.map((s) => s.operatingRoomName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // 獲取預估時間的最小值和最大值，用於範圍選擇器
  const estimatedTimes = flattenedRows
    .map((s) => s.estimatedSurgeryTime)
    .filter(Boolean)
    .map(Number);

  const minEstimatedTime = estimatedTimes.length > 0 ? Math.min(...estimatedTimes) : 0;
  const maxEstimatedTime = estimatedTimes.length > 0 ? Math.max(...estimatedTimes) : 100;

  const availableAnesthesiaMethods = Array.from(
    new Set(flattenedRows.map((s) => s.anesthesiaMethod).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const availableSurgeryReasons = Array.from(
    new Set(flattenedRows.map((s) => s.surgeryReason).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const availableSpecialOrRequirements = Array.from(
    new Set(flattenedRows.map((s) => s.specialOrRequirements).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const availableUserNames = Array.from(
    new Set(flattenedRows.map((s) => s.user?.name).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // 新增科別，同樣按照字母順序排
  const availableSpecialties = Array.from(
    new Set(flattenedRows.map((s) => s.departmentName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // 3) 每次 originalRows、filterValues 或 timeRange 改變時，執行篩選（但不移除，只標記）
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterValues, originalRows, timeRange]);

  // 4) 點擊篩選器外部時關閉抽屜
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        // setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 計算銜接時間時間的輔助函式
  // const calculateCleaningEndTime = (
  //   surgeryEndTime,
  //   cleaningDurationMinutes = 65
  // ) => {
  //   if (!surgeryEndTime) return "10:00";
  //   const [hours, minutes] = surgeryEndTime.split(":").map(Number);
  //   // const endTimeDate = new Date();
  //   // endTimeDate.setHours(hours, minutes + cleaningDurationMinutes, 0, 0);
  //   const startTime = new Date();
  //   startTime.setHours(hours);
  //   startTime.setMinutes(minutes);
  //   const endTimeDate = new Date(startTime.getTime() + cleaningDurationMinutes * 60 * 1000);


  //   return `${String(endTimeDate.getHours()).padStart(2, "0")}:${String(
  //     endTimeDate.getMinutes()
  //   ).padStart(2, "0")}`;
  // };

  // const calculateCleaningEndTime = (surgeryEndTime) => {
  //   if (!surgeryEndTime) return "10:00";

  //   const cleaningDurationMinutes = getCleaningDuration(true); // ✅ 改為統一讀取設定值

  //   const [hours, minutes] = surgeryEndTime.split(":").map(Number);
  //   const startTime = new Date();
  //   startTime.setHours(hours);
  //   startTime.setMinutes(minutes);
  //   const endTimeDate = new Date(startTime.getTime() + cleaningDurationMinutes * 60 * 1000);

  //   return `${String(endTimeDate.getHours()).padStart(2, "0")}:${String(
  //     endTimeDate.getMinutes()
  //   ).padStart(2, "0")}`;
  // };
  // 將時間字串轉為分鐘數
  const timeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 將分鐘數轉回時間字串（支援 >24:00）
  const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  // 改寫 calculateCleaningEndTime 為分鐘制版本
  const calculateCleaningEndTime = (surgeryEndTime) => {
    const cleaningDurationMinutes = getCleaningDuration(true);
    const endTimeMinutes = timeToMinutes(surgeryEndTime);
    return minutesToTime(endTimeMinutes + cleaningDurationMinutes);
  };



  // 依手術室分組，並為每個手術添加銜接時間
  const groupByRoom = (surgeries) => {
    const roomGroups = {};
    const result = [];

    // 建立房間名稱清單，並排序（A → Z）
    // const roomNames = Array.isArray(originalRows)
    //   ? Array.from(
    //     new Set(
    //       originalRows.map((row) => row.room || row.name || "未指定手術室")
    //     )
    //   ).sort((a, b) => a.localeCompare(b))
    // : [];
    const sortedRoomRows = Array.isArray(originalRows)
      ? [...originalRows].sort((a, b) =>
        String(a.id).localeCompare(String(b.id), undefined, { numeric: true })
      )
      : [];

    const roomNames = sortedRoomRows.map((row) => row.room || row.name || "未指定手術室");



    // 初始化每個房間區塊
    roomNames.forEach((roomName) => {
      roomGroups[roomName] = {
        id: `room-${roomName}`,
        name: roomName,
        room: roomName,
        data: [],
      };
    });

    // 排序手術資料（先依房間名，再依時間）
    const sortedSurgeries = [...surgeries].sort((a, b) => {
      const roomCompare = (a.operatingRoomName || "").localeCompare(
        b.operatingRoomName || ""
      );
      if (roomCompare !== 0) return roomCompare;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

    // 填入手術資料與銜接時間
    sortedSurgeries.forEach((surgery) => {
      const roomName = surgery.operatingRoomName || "未指定手術室";

      const surgeryColor = surgery.isFilteredOut
        ? "rgba(0, 128, 0, 0.5)"
        : surgery.color || "green";

      const surgeryData = {
        ...surgery,
        surgery: surgery.surgeryName
          ? `${surgery.surgeryName} (${surgery.patientName || "未知病患"})`
          : surgery.surgery || "未指定手術",
        doctor: surgery.chiefSurgeonName || surgery.doctor || "未指定醫生",
        patientName: surgery.patientName || "未知病患",
        operatingRoomName: roomName,
        color: surgeryColor,
        startTime: surgery.startTime || "08:00",
        endTime: surgery.endTime || "09:00",
        applicationId:
          surgery.applicationId ||
          `temp-${Math.random().toString(36).substr(2, 9)}`,
      };

      roomGroups[roomName]?.data.push(surgeryData);

      const cleaningColor = surgery.isFilteredOut
        ? "rgba(0, 0, 255, 0.3)"
        : getCleaningColor();

      const cleaningData = {
        id: `cleaning-${surgeryData.applicationId}`,
        doctor: "銜接時間",
        surgery: "整理中",
        duration: 45,
        isCleaningTime: true,
        operatingRoomName: roomName,
        color: cleaningColor,
        startTime: surgeryData.endTime,
        endTime: calculateCleaningEndTime(surgeryData.endTime),
        associatedSurgeryId: surgeryData.applicationId,
        applicationId: `cleaning-${surgeryData.applicationId}`,
      };

      roomGroups[roomName]?.data.push(cleaningData);
    });

    // 將房間按排序好的名稱加入結果
    roomNames.forEach((roomName) => {
      result.push(roomGroups[roomName]);
    });

    return result;
  };

  // 5) 篩選邏輯：不刪除手術，而是標記 isFilteredOut
  const applyFilters = () => {
    if (!flattenedRows || flattenedRows.length === 0) {
      onFilteredDataChange([]);
      return;
    }

    // 檢查是否有篩選條件被應用
    const hasActiveFilters = (
      Object.values(filterValues).some(values => values && values.length > 0) ||
      timeRange.min !== "" || 
      timeRange.max !== ""
    );
    
    console.log("GanttFilter: 篩選條件檢查:", { 
      filterValues, 
      timeRange, 
      hasActiveFilters 
    });

    // 對所有手術進行標記
    flattenedRows.forEach((s) => {
      let meetsFilter = true;
      if (
        filterValues.surgeryName?.length > 0 &&
        !filterValues.surgeryName.includes(s.surgeryName)
      ) {
        meetsFilter = false;
      }
      if (
        filterValues.chiefSurgeonName?.length > 0 &&
        !filterValues.chiefSurgeonName.includes(s.chiefSurgeonName) &&
        !filterValues.chiefSurgeonName.includes(s.doctor)
      ) {
        meetsFilter = false;
      }
      if (
        filterValues.operatingRoomName?.length > 0 &&
        !filterValues.operatingRoomName.includes(s.operatingRoomName)
      ) {
        meetsFilter = false;
      }

      // 使用預估時間範圍進行篩選，而不是多選值
      if (
        (timeRange.min !== "" || timeRange.max !== "") &&
        s.estimatedSurgeryTime !== undefined
      ) {
        const estimatedTime = Number(s.estimatedSurgeryTime);
        if (
          (timeRange.min !== "" && estimatedTime < Number(timeRange.min)) ||
          (timeRange.max !== "" && estimatedTime > Number(timeRange.max))
        ) {
          meetsFilter = false;
        }
      }

      if (
        filterValues.anesthesiaMethod?.length > 0 &&
        !filterValues.anesthesiaMethod.includes(s.anesthesiaMethod)
      ) {
        meetsFilter = false;
      }
      if (
        filterValues.surgeryReason?.length > 0 &&
        !filterValues.surgeryReason.includes(s.surgeryReason)
      ) {
        meetsFilter = false;
      }
      if (
        filterValues.specialOrRequirements?.length > 0 &&
        !filterValues.specialOrRequirements.includes(s.specialOrRequirements)
      ) {
        meetsFilter = false;
      }
      if (
        filterValues.userName?.length > 0 &&
        !filterValues.userName.includes(s.user?.name)
      ) {
        meetsFilter = false;
      }
      // 新增科別的篩選
      if (
        filterValues.departmentName?.length > 0 &&
        !filterValues.departmentName.includes(s.departmentName)
      ) {
        meetsFilter = false;
      }

      s.isFilteredOut = !meetsFilter;
    });

    const groupedData = groupByRoom(flattenedRows);
    
    // 向父組件傳遞篩選後的數據和篩選狀態
    onFilteredDataChange(groupedData, hasActiveFilters);
  };

  // 6) 新增篩選條件
  const handleAddFilter = (selected) => {
    if (selected && !selectedFilters.find((f) => f.value === selected.value)) {
      setSelectedFilters([...selectedFilters, selected]);

      // 如果選擇了預估時間，初始化時間範圍
      if (selected.value === "estimatedSurgeryTime") {
        setTimeRange({ min: String(minEstimatedTime), max: String(maxEstimatedTime) });
      } else {
        setFilterValues({ ...filterValues, [selected.value]: [] });
      }
    }
  };

  // 7) 多選下拉改變時更新 filterValues
  const handleFilterChange = (filterKey, selectedOptions) => {
    setFilterValues({
      ...filterValues,
      [filterKey]: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
    });
  };

  // 處理時間範圍變更
  const handleTimeRangeChange = (type, value) => {
    setTimeRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // 8) 移除某個篩選條件
  const handleRemoveFilter = (filterKey) => {
    setSelectedFilters(selectedFilters.filter((f) => f.value !== filterKey));
    const updatedValues = { ...filterValues };
    delete updatedValues[filterKey];
    setFilterValues(updatedValues);

    // 如果移除的是預估時間，重置時間範圍
    if (filterKey === "estimatedSurgeryTime") {
      setTimeRange({ min: "", max: "" });
    }
  };

  // 9) 清除所有篩選條件
  const handleClearAllFilters = () => {
    setSelectedFilters([]);
    setFilterValues({});
    setTimeRange({ min: "", max: "" });
  };
  return (
    // <div className="h-full w-full bg-white border-r border-gray-200 flex flex-col overflow-auto p-4">
    <div className="flex h-full min-h-full w-full transition-all duration-500 ease-in-out">


      {/* 篩選器區塊 */}
      {isOpen && (
        <div className="w-75 shrink-0 transition-all duration-500 ease-in-out pt-4 pb-1">
          <div
            ref={filterRef}
            className="h-full w-72 bg-white/90 backdrop-blur-md border-2 border-blue-500 rounded-r-2xl shadow-xl p-6 overflow-auto flex flex-col"
          >
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-semibold text-blue-800">篩選條件</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-blue-500 hover:text-red-500 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <Select
                options={filterOptions}
                onChange={handleAddFilter}
                placeholder="新增篩選條件..."
              />

              {selectedFilters.map((filter) => (
                <div key={filter.value} className="filter-item">
                  <div className="filter-item-header flex justify-between items-center">
                    <span className="font-semibold text-gray-700">{filter.label}</span>
                    <button
                      onClick={() => handleRemoveFilter(filter.value)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>

                  {filter.value === "estimatedSurgeryTime" && (
                    <div className="range-selector mt-2">
                      <label className="text-sm">最小值(分):</label>
                      <input
                        type="number"
                        value={timeRange.min}
                        onChange={(e) => handleTimeRangeChange("min", e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        min={minEstimatedTime}
                        max={maxEstimatedTime}
                      />

                      <label className="text-sm mt-2">最大值(分):</label>
                      <input
                        type="number"
                        value={timeRange.max}
                        onChange={(e) => handleTimeRangeChange("max", e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        min={minEstimatedTime}
                        max={maxEstimatedTime}
                      />

                      <div className="mt-2">
                        <input
                          type="range"
                          min={minEstimatedTime}
                          max={maxEstimatedTime}
                          value={timeRange.min}
                          onChange={(e) => handleTimeRangeChange("min", e.target.value)}
                          className="w-full"
                        />
                        <input
                          type="range"
                          min={minEstimatedTime}
                          max={maxEstimatedTime}
                          value={timeRange.max}
                          onChange={(e) => handleTimeRangeChange("max", e.target.value)}
                          className="w-full mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {filter.value !== "estimatedSurgeryTime" && (
                    <Select
                      isMulti
                      options={(filter.value === "departmentName" ? availableSpecialties
                        : filter.value === "surgeryName" ? availableSurgeryNames
                          : filter.value === "chiefSurgeonName" ? availableChiefSurgeonNames
                            : filter.value === "operatingRoomName" ? availableOperatingRoomNames
                              : filter.value === "anesthesiaMethod" ? availableAnesthesiaMethods
                                : filter.value === "surgeryReason" ? availableSurgeryReasons
                                  : filter.value === "specialOrRequirements" ? availableSpecialOrRequirements
                                    : filter.value === "userName" ? availableUserNames
                                      : []
                      ).map((v) => ({ value: v, label: v }))}
                      onChange={(selected) => handleFilterChange(filter.value, selected)}
                      placeholder={`選擇${filter.label}...`}
                    />
                  )}
                </div>
              ))}

              {selectedFilters.length > 0 && (
                <button
                  onClick={handleClearAllFilters}
                  className="bg-blue-500 text-white px-4 py-2 rounded mt-2 font-semibold"
                >
                  清除所有篩選條件
                </button>
              )}
            </div>
          </div>
        </div>
      )
      }

      {/* 篩選按鈕與內容區塊 */}
      {/* 在這裡 render 甘特圖內容（由父層包住） */}
      <div className="flex-1 transition-all duration-500 ease-in-out relative">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed top-[360px] left-0 z-600 bg-blue-600 text-white px-3 py-4 rounded-md shadow-md hover:bg-blue-700"
          >
            篩選
          </button>
        )}

      </div>
    </div >
  );
};

export default GanttFilter;