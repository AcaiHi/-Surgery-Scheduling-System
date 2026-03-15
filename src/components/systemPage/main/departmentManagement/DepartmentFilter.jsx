import { useEffect, useState, useRef } from "react";
import Select from "react-select";

function DepartmentFilter({ isOpen, onClose, departments, filterDepartment, setFilterDepartment }) {
  // const [isOpen, setIsOpen] = useState(false);
  const filterRef = useRef(null);

  const handleChange = (e) => {
    setFilterDepartment(prevState => ({
      ...prevState,
      [e.target.name]: e.target.value
    }));
  };

  // 清除所有篩選條件
  const clearFilters = () => {
    setFilterDepartment({ id: "", name: "" });
  };

  // 檢查是否有任何篩選條件
  const hasFilters = filterDepartment.id !== "" || filterDepartment.name !== "";

  const handleNameChange = (selectedOption) => {
    setFilterDepartment((prevState) => ({
      ...prevState,
      name: selectedOption ? selectedOption.label : "",
    }));
  };

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (filterRef.current && !filterRef.current.contains(event.target)) {
  //       // setIsOpen(false);
  //     }
  //   };
  //   document.removeEventListener("mousedown", handleClickOutside);

  //   return () => document.removeEventListener("mousedown", handleClickOutside);
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
  //           placeholder="請輸入科別編號..."
  //           value={filterDepartment.id}
  //           onChange={handleChange}
  //         />
  //       </div>
  //       <div className="filter-content">
  //         <Select
  //           className="filter-select"
  //           options={departments.map((department) => ({
  //             value: department.name,
  //             label: department.name
  //           }))}
  //           value={departments.find((department) => department.name === filterDepartment.name)
  //             ? { value: filterDepartment.name, label: filterDepartment.name }
  //             : null}
  //           onChange={handleNameChange}
  //           placeholder="請選擇科別名稱..."
  //           isClearable={true}
  //         />
  //       </div>
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
        <button onClick={onClose} className="text-blue-500 hover:text-red-500 text-xl font-bold">
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <input
          type="text"
          name="id"
          className="filter-input"
          placeholder="請輸入科別編號..."
          value={filterDepartment.id}
          onChange={handleChange}
        />
      <Select
        className="flex flex-col gap-4"
        options={departments.map((department) => ({
          value: department.name,
          label: department.name
        }))}
        value={
          filterDepartment.name
            ? { value: filterDepartment.name, label: filterDepartment.name }
            : null
        }
        onChange={handleNameChange}
        placeholder="請選擇科別名稱..."
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

export default DepartmentFilter;
