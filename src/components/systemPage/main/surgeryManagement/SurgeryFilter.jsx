import { useState, useEffect, useRef, useMemo } from "react";
import Select from "react-select";
function SurgeryFilter({ isOpen, onClose, users, operatingRooms, filterOperatingRoom, setFilterOperatingRoom }) {
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
    setFilterOperatingRoom({ id: "", operatingRoomName: "", department: "", roomType: "" });
  };

  // 從現有資料中取得唯一的所屬科別選項
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
  }, [onClose]);
  // 從現有資料中取得唯一的狀態選項（字串形式）
  const statusOptions = useMemo(() => {
    const setOptions = new Set();
    operatingRooms.forEach(or => {
      if (or.status !== undefined && or.status !== null) {
        setOptions.add(or.status.toString());
      }
    });
    return Array.from(setOptions);
  }, [operatingRooms]);

  // return (
  //   <div ref={filterRef} className={`filter-panel-container ${isOpen ? "filter-panel-open" : "filter-panel-closed"}`}>
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
  //           placeholder="請輸入手術房編號..."
  //           value={filterOperatingRoom.id}
  //           onChange={handleChange}
  //         />
  //       </div>
  //       <div className="filter-content">
  //         <input
  //           type="text"
  //           name="name"
  //           className="filter-input"
  //           placeholder="請輸入手術房名稱..."
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
  //       {/* 清除按鈕永遠顯示 */}
  //       <div className="filter-content">
  //         <button
  //           onClick={clearFilters}
  //           className="clear-filters-btn"
  //           style={{
  //             backgroundColor: "#3b82f6",
  //             color: "white",
  //             padding: "8px 16px",
  //             border: "none",
  //             borderRadius: "4px",
  //             cursor: "pointer",
  //             marginTop: "12px",
  //             fontWeight: "500",
  //             width: "100%",
  //           }}
  //         >
  //           清除所有篩選條件
  //         </button>
  //       </div>
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
        <button onClick={onClose} className="text-blue-500 hover:text-red-500 text-xl font-bold ">✕</button>
      </div>

      <div className="flex flex-col gap-4">
        <input
          type="text"
          name="id"
          className="filter-input"
          placeholder="請輸入手術房編號..."
          value={filterOperatingRoom.id}
          onChange={handleChange}
        />
        <input
          type="text"
          name="operatingRoomName"
          className="filter-input"
          placeholder="請輸入手術房名稱..."
          value={filterOperatingRoom.operatingRoomName}
          onChange={handleChange}
        />
        <Select
          className="text-gray-700"
          styles={{
            control: (base, state) => ({
              ...base,
              borderColor: state.isFocused ? '#60a5fa' : '#93c5fd', // 藍色
              boxShadow: state.isFocused ? '0 0 0 2px #bfdbfe' : 'none',
              '&:hover': {
                borderColor: '#60a5fa',
              },
            }),
            placeholder: (base) => ({
              ...base,
              color: '#9ca3af', // 灰色 placeholder
            }),
          }}
          options={[{ value: '', label: '全部科別' }, ...departmentOptions.map(dep => ({ value: dep, label: dep }))]}
          onChange={(selected) =>
            handleChange({ target: { name: "department", value: selected?.value || "" } })
          }
          value={
            filterOperatingRoom.department
              ? { value: filterOperatingRoom.department, label: filterOperatingRoom.department }
              : null
          }
          placeholder="選擇科別..."
          isClearable
        />
        <Select
          className="text-gray-700"
          styles={{
            control: (base, state) => ({
              ...base,
              borderColor: state.isFocused ? '#60a5fa' : '#93c5fd',
              boxShadow: state.isFocused ? '0 0 0 2px #bfdbfe' : 'none',
              '&:hover': {
                borderColor: '#60a5fa',
              },
            }),
            placeholder: (base) => ({
              ...base,
              color: '#9ca3af',
            }),
          }}
          options={[{ value: '', label: '全部手術房種類' }, ...roomTypeOptions.map(rt => ({ value: rt, label: rt }))]}
          onChange={(selected) =>
            handleChange({ target: { name: "roomType", value: selected?.value || "" } })
          }
          value={
            filterOperatingRoom.roomType
              ? { value: filterOperatingRoom.roomType, label: filterOperatingRoom.roomType }
              : null
          }
          placeholder="選擇房間種類..."
          isClearable
        />
        <Select
          className="text-gray-700"
          styles={{
            control: (base, state) => ({
              ...base,
              borderColor: state.isFocused ? '#60a5fa' : '#93c5fd',
              boxShadow: state.isFocused ? '0 0 0 2px #bfdbfe' : 'none',
              '&:hover': {
                borderColor: '#60a5fa',
              },
            }),
            placeholder: (base) => ({
              ...base,
              color: '#9ca3af',
            }),
          }}
          options={[
            { value: '', label: '全部狀態' },
            { value: '1', label: '開啟' },
            { value: '0', label: '關閉' },
          ]}
          onChange={(selected) =>
            handleChange({ target: { name: "status", value: selected?.value || "" } })
          }
          value={
            filterOperatingRoom.status
              ? {
                value: filterOperatingRoom.status,
                label: filterOperatingRoom.status === "1" ? "開啟" : "關閉",
              }
              : null
          }

          placeholder="選擇狀態..."
          isClearable
        />
        <button
          onClick={clearFilters}
          className="bg-blue-500 text-white px-4 py-2 rounded-md mt-2 font-semibold"
        >
          清除所有篩選條件
        </button>
      </div>
    </div>
  );

}

export default SurgeryFilter;
