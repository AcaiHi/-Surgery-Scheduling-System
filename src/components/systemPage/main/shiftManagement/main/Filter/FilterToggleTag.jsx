// components/filters/FilterToggleTag.jsx
/* eslint-disable react/prop-types */
export default function FilterToggleTag({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="開啟篩選器"
      className="
        absolute top-18.5 left-0  /* 這兩個才是定位 */
        z-[70]
        rounded-r-lg rounded-l-none
        border border-blue-500 bg-white text-blue-600
        px-3 py-2 shadow hover:bg-blue-50
        flex items-center gap-1 select-none
      "
    >
      {/* 小漏斗圖示 */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M3 4h18l-7 8v6l-4 2v-8L3 4z"></path>
      </svg>
      <span className="font-semibold">篩選</span>
    </button>
  );
}
