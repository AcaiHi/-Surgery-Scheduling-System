// src/features/home/components/homeConfirmScheduleButton.jsx
function HomeConfirmScheduleButton({ onClick }) {
  return (
    <button
      type="button"
      aria-label="更新首頁"
      className="confirm-schedule-button"
      title="更新首頁"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#f9fafb",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 mr-1"
        viewBox="0 0 30 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        width="20"
        height="20"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
      更新首頁
    </button>
  );
}

export default HomeConfirmScheduleButton;
