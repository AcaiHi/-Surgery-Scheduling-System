import { useEffect, useRef } from "react";
import Select from "react-select";

function AccountFilter({ isOpen, users, filterUser, setFilterUser, onClose }) {
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        // onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleChange = (e) => {
    setFilterUser((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const handleUnitChange = (selectedOption) => {
    setFilterUser((prevState) => ({
      ...prevState,
      unit: selectedOption ? selectedOption.value : "",
    }));
  };

  const handleRoleChange = (selectedOption) => {
    setFilterUser((prevState) => ({
      ...prevState,
      role: selectedOption ? selectedOption.value : "",
    }));
  };

  const clearFilters = () => {
    setFilterUser({
      username: "",
      name: "",
      unit: "",
      role: "",
    });
  };

  const roleOptions = [
    { value: "3", label: "管理者" },
    { value: "2", label: "編輯者" },
    { value: "1", label: "查看者" },
  ];

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
          name="username"
          className="filter-input"
          placeholder="請輸入帳號..."
          value={filterUser.username}
          onChange={handleChange}
        />
        <input
          type="text"
          name="name"
          className="filter-input"
          placeholder="請輸入姓名..."
          value={filterUser.name}
          onChange={handleChange}
        />
        <Select
          className="flex flex-col gap-4"
          options={[...new Set(users.map(u => u.unit))].map(unit => ({ value: unit, label: unit }))}
          onChange={handleUnitChange}
          placeholder="選擇單位..."
          value={filterUser.unit ? { value: filterUser.unit, label: filterUser.unit } : null}
          isClearable
        />
        <Select
          className="flex flex-col gap-4"
          options={roleOptions}
          onChange={handleRoleChange}
          placeholder="選擇權限..."
          value={
            filterUser.role
              ? {
                value: filterUser.role,
                label: roleOptions.find((option) => option.value === filterUser.role)?.label,
              }
              : null
          }
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

export default AccountFilter;
