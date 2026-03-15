import { useState, useEffect, useRef, useMemo } from "react";
import Select from "react-select";

function ORFilter({ isOpen, onClose, operatingRooms, filterOperatingRoom, setFilterOperatingRoom }) {
  // const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef(null);

  const handleChange = (e) => {
    setFilterOperatingRoom(prevState => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
  };

  // 清除所有篩選條件
  const clearFilters = () => {
    setFilterOperatingRoom({ id: "", operatingRoomName: "", department: "", roomType: "", status: "" });
  };

  const hasFilters =
    filterOperatingRoom.id !== "" ||
    filterOperatingRoom.operatingRoomName !== "" ||
    filterOperatingRoom.department !== "" ||
    filterOperatingRoom.roomType !== "" ||
    filterOperatingRoom.status !== "";

  // 從現有資料中取得唯一的科別選項
  const departmentOptions = useMemo(() => {
    const setOptions = new Set();
    operatingRooms.forEach(or => {
      if (or.department && or.department.name) {
        setOptions.add(or.department.name);
      }
    });
    return Array.from(setOptions);
  }, [operatingRooms]);

  // 從現有資料中取得唯一的手術房種類選項
  const roomTypeOptions = useMemo(() => {
    const setOptions = new Set();
    operatingRooms.forEach(or => {
      if (or.roomType) {
        setOptions.add(or.roomType);
      }
    });
    return Array.from(setOptions);
  }, [operatingRooms]);

  // 從現有資料中取得唯一的狀態選項（以字串呈現）
  const statusOptions = useMemo(() => {
    const setOptions = new Set();
    operatingRooms.forEach(or => {
      if (or.status !== undefined && or.status !== null) {
        setOptions.add(or.status.toString());
      }
    });
    return Array.from(setOptions);
  }, [operatingRooms]);

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (filterRef.current && !filterRef.current.contains(event.target)) {
  //       setIsOpen(false);
  //     }
  //   };

  //   if (isOpen) {
  //     document.addEventListener("mousedown", handleClickOutside);
  //   } else {
  //     document.removeEventListener("mousedown", handleClickOutside);
  //   }

  //   return () => {
  //     document.removeEventListener("mousedown", handleClickOutside);
  //   };
  // }, [isOpen]);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        // onClose(); 
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]); // ✅ 正確寫法

  // return (
  //   <div
  //     ref={filterRef}
  //     className={`filter-panel-container ${isOpen ? "filter-panel-open" : "filter-panel-closed"}`}
  //   >
  //     <div className="filter-panel">
  //       <div className="filter-header">
  //         <h3 className="filter-title">篩選條件</h3>
  //         <button onClick={() => setIsOpen(false)} className="filter-close-btn">
  //           ✕
  //         </button>
  //       </div>
  //       <div className="filter-content">
  //         <input
  //           type="text"
  //           name="id"
  //           className="filter-input"
  //           placeholder="請輸入房間編號..."
  //           value={filterOperatingRoom.id}
  //           onChange={handleChange}
  //         />
  //       </div>
  //       <div className="filter-content">
  //         <input
  //           type="text"
  //           name="name"
  //           className="filter-input"
  //           placeholder="請輸入房間名稱..."
  //           value={filterOperatingRoom.name}
  //           onChange={handleChange}
  //         />
  //       </div>
  //       <div className="filter-content">
  //         <select
  //           name="department"
  //           className="filter-input"
  //           value={filterOperatingRoom.department}
  //           onChange={handleChange}
  //         >
  //           <option value="">全部科別</option>
  //           {departmentOptions.map(dep => (
  //             <option key={dep} value={dep}>{dep}</option>
  //           ))}
  //         </select>
  //       </div>
  //       <div className="filter-content">
  //         <select
  //           name="roomType"
  //           className="filter-input"
  //           value={filterOperatingRoom.roomType}
  //           onChange={handleChange}
  //         >
  //           <option value="">全部手術房種類</option>
  //           {roomTypeOptions.map(rt => (
  //             <option key={rt} value={rt}>{rt}</option>
  //           ))}
  //         </select>
  //       </div>
  //       {/* <div className="filter-content">
  //         <select
  //           name="status"
  //           className="filter-input"
  //           value={filterOperatingRoom.status}
  //           onChange={handleChange}
  //         >
  //           <option value="">全部狀態</option>
  //           {statusOptions.map(st => (
  //             <option key={st} value={st}>
  //               {st === "1" ? "開啟" : st === "0" ? "關閉" : st}
  //             </option>
  //           ))}
  //         </select>
  //       </div> */}
  //       <div className="filter-content flex items-center gap-2">
  //         {/* 狀態圖示 */}
  //         <svg
  //           xmlns="http://www.w3.org/2000/svg"
  //           viewBox="0 0 24 24"
  //           fill={
  //             filterOperatingRoom.status === "1"
  //               ? "#facc15" // 開啟 -> 黃色
  //               : filterOperatingRoom.status === "0"
  //                 ? "#9ca3af" // 關閉 -> 灰色
  //                 : "#d1d5db" // 全部或空值 -> 更淡灰色
  //           }
  //           className="w-6 h-6 transition duration-200"
  //         >
  //           <path d="M12 .75a8.25 8.25 0 0 0-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 0 0 .577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 0 1-.937-.171.75.75 0 1 1 .374-1.453 5.261 5.261 0 0 0 2.626 0 .75.75 0 1 1 .374 1.452 6.712 6.712 0 0 1-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 0 0 .577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0 0 12 .75Z" />
  //           <path
  //             fillRule="evenodd"
  //             d="M9.013 19.9a.75.75 0 0 1 .877-.597 11.319 11.319 0 0 0 4.22 0 .75.75 0 1 1 .28 1.473 12.819 12.819 0 0 1-4.78 0 .75.75 0 0 1-.597-.876ZM9.754 22.344a.75.75 0 0 1 .824-.668 13.682 13.682 0 0 0 2.844 0 .75.75 0 1 1 .156 1.492 15.156 15.156 0 0 1-3.156 0 .75.75 0 0 1-.668-.824Z"
  //             clipRule="evenodd"
  //           />
  //         </svg>

  //         {/* 狀態篩選選單 */}
  //         <select
  //           name="status"
  //           className="filter-input"
  //           value={filterOperatingRoom.status}
  //           onChange={handleChange}
  //         >
  //           <option value="">全部狀態</option>
  //           {statusOptions.map((st) => (
  //             <option key={st} value={st}>
  //               {st === "1" ? "開啟" : st === "0" ? "關閉" : st}
  //             </option>
  //           ))}
  //         </select>
  //       </div>

  //       {hasFilters && (
  //         <div className="filter-content">
  //           <button
  //             onClick={clearFilters}
  //             className="clear-filters-btn"
  //             style={{
  //               backgroundColor: "#3b82f6",
  //               color: "white",
  //               padding: "8px 16px",
  //               border: "none",
  //               borderRadius: "4px",
  //               cursor: "pointer",
  //               marginTop: "12px",
  //               fontWeight: "500",
  //               width: "100%",
  //             }}
  //           >
  //             清除所有篩選條件
  //           </button>
  //         </div>
  //       )}
  //     </div>
  //     <button className="filter-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
  //       篩選
  //     </button>
  //   </div>
  // );

  return (
    <div
      ref={filterRef}
      className={`h-full w-72 bg-white/90 backdrop-blur-md border-2 border-blue-500 rounded-r-2xl shadow-xl p-6 overflow-auto flex flex-col 
        ${isOpen ? "animate-slide-in-from-left" : "animate-slide-out-to-left"}`}
    >
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-xl font-semibold text-blue-800">篩選條件</h3>
        <button onClick={onClose} className="text-blue-500 hover:text-red-500 text-xl font-bold">
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <input
          type="text"
          name="id"
          className="filter-input"
          placeholder="請輸入房間編號..."
          value={filterOperatingRoom.id}
          onChange={handleChange}
        />

        <input
          type="text"
          name="operatingRoomName"
          className="filter-input"
          placeholder="請輸入房間名稱..."
          value={filterOperatingRoom.operatingRoomName}
          onChange={handleChange}
        />
        <Select
          className="flex flex-col gap-4"
          options={[
            { value: "", label: "全部科別" },
            ...departmentOptions.map((dep) => ({ value: dep, label: dep })),
          ]}
          onChange={(selected) =>
            handleChange({
              target: { name: "department", value: selected?.value || "" },
            })
          }
          placeholder="選擇科別..."

          value={
            filterOperatingRoom.department
              ? { value: filterOperatingRoom.department, label: filterOperatingRoom.department }
              : null
          }
          isClearable
        />

        <Select
          className="flex flex-col gap-4"
          options={[
            { value: "", label: "全部手術房種類" },
            ...roomTypeOptions.map((rt) => ({ value: rt, label: rt })),
          ]}
          onChange={(selected) =>
            handleChange({
              target: { name: "roomType", value: selected?.value || "" },
            })
          }
          placeholder="選擇房間種類..."
          value={
            filterOperatingRoom.roomType
              ? { value: filterOperatingRoom.roomType, label: filterOperatingRoom.roomType }
              : null
          }
          isClearable
        />

        <Select
          className="flex flex-col gap-4"
          options={[
            { value: "", label: "全部狀態" },
            { value: "1", label: "開啟" },
            { value: "0", label: "關閉" },
          ]}
          onChange={(selected) =>
            handleChange({
              target: { name: "status", value: selected?.value || "" },
            })
          }
          placeholder="選擇狀態..."
          value={
            filterOperatingRoom.status
              ? {
                value: filterOperatingRoom.status,
                label: filterOperatingRoom.status === "1" ? "開啟" : "關閉",
              }
              : null
          }
          isClearable
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="bg-blue-500 text-white px-4 py-2 rounded-md mt-2 font-semibold"
          >
            清除所有篩選條件
          </button>
        )}
      </div>
    </div>
  );
}

export default ORFilter;
