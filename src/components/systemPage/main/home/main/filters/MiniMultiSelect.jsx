/* eslint-disable react/prop-types */
import Select from "react-select";
import { useMemo } from "react";

export default function MiniMultiSelect({
  options = [],
  values = [],
  onChange,
  placeholder = "選擇…",
}) {
  // 把字串陣列轉成 react-select 的 {value,label}
  const optList = useMemo(
    () => (options || []).filter(Boolean).map((v) => ({ value: v, label: v })),
    [options]
  );
  const valueList = useMemo(
    () => (values || []).filter(Boolean).map((v) => ({ value: v, label: v })),
    [values]
  );

  return (
    <Select
      isMulti
      options={optList}
      value={valueList}
      placeholder={placeholder}
      onChange={(items) => onChange?.((items || []).map((i) => i.value))}
      // 讓下拉顯示在最上層，不會被抽屜或其他元素蓋住
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      // UX：選了不關閉、已選仍顯示、可清除
      closeMenuOnSelect={false}
      hideSelectedOptions={false}
      isClearable
      // 樣式（接近你圖中的樣子）
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: 42,
          borderRadius: 8,
          borderColor: state.isFocused ? "#60a5fa" : "#d1d5db",
          boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,.35)" : "none",
          "&:hover": { borderColor: state.isFocused ? "#60a5fa" : "#9ca3af" },
        }),
        multiValue: (base) => ({
          ...base,
          backgroundColor: "#f3f4f6",        // 灰底
          border: "1px solid #e5e7eb",
          borderRadius: 6,
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: "#111827",
          fontWeight: 500,
        }),
        multiValueRemove: (base) => ({
          ...base,
          color: "#111827",
          ":hover": { backgroundColor: "#e5e7eb", color: "#111827" },
        }),
        menuPortal: (base) => ({ ...base, zIndex: 10050 }),
        menu: (base) => ({ ...base, zIndex: 10050 }),
        clearIndicator: (base) => ({ ...base, cursor: "pointer" }),
        dropdownIndicator: (base) => ({ ...base, cursor: "pointer" }),
        indicatorSeparator: (base) => ({ ...base, marginLeft: 6, marginRight: 6 }),
      }}
      noOptionsMessage={() => "沒有可新增的項目"}
    />
  );
}
