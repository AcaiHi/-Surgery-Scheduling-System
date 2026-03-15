// src/features/home/main/homeGanttTable.jsx
import HomeSurgeryItems from "./homeSurgeryItems";
import HomeActionList from "./homeActionList";

function HomeGanttTable({
  timeSettings,
  operatingRooms,
  surgeriesByRoom,
  scrollRef,
  onHostScroll,
  dndEnabled = false,
  onSurgeryClick,
  pxPerMin,                 // ⬅️ 新增
}) {
  const rooms = operatingRooms || [];
  const byRoom = surgeriesByRoom || {};

  return (
    <div className="gantt-scroll" ref={scrollRef} onScroll={onHostScroll}>
      <div className="gantt-track" style={{ width: "var(--timeline-width)" }}>
        <div className="gantt-table">
          {rooms.map((room) => {
            if (room?.status == 0) return null;
            const list = byRoom[String(room.id)] || [];

            return (
              <div className="gantt-row" key={room.id} style={{ display: "flex", flexDirection: "column" }}>
                <HomeActionList room={room} />
                <HomeSurgeryItems
                  roomID={String(room.id)}
                  surgeries={list}
                  timeSettings={timeSettings}
                  dndEnabled={dndEnabled}
                  onSurgeryClick={onSurgeryClick}
                  pxPerMin={pxPerMin}           // ⬅️ 傳入
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default HomeGanttTable;
