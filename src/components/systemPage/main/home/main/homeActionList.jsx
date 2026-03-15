// src/features/home/components/homeActionList.jsx
function HomeActionList({ room }) {
  return (
    <div
      className="action-list"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 4,
      }}
    >
      <div style={{ fontWeight: 600 }}>
        {room?.operatingRoomName || room?.name || "未命名手術房"}
      </div>
    </div>
  );
}

export default HomeActionList;
