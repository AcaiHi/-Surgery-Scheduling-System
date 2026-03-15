// src/features/home/main/homeSurgeryItems.jsx
import { Droppable, Draggable } from "@hello-pangea/dnd";
import ReactDOM from "react-dom";
import HomeSurgery from "./homeSurgery";

/**
 * 產生 / 取得拖曳用的 Portal 容器
 * 讓正在 drag 的卡片被 render 到 body 最上層，不會被下面那排的手術房蓋住
 */
let dragPortal = null;

function getDragPortal() {
  if (typeof document === "undefined") return null;
  if (dragPortal) return dragPortal;

  const existing = document.getElementById("drag-portal");
  if (existing) {
    dragPortal = existing;
    return dragPortal;
  }

  const div = document.createElement("div");
  div.id = "drag-portal";
  div.style.position = "fixed";
  div.style.inset = "0";
  div.style.zIndex = "9999";
  div.style.pointerEvents = "none"; // 由裡面的卡片自己接事件
  document.body.appendChild(div);

  dragPortal = div;
  return dragPortal;
}

/**
 * Portal-aware Draggable：
 *  - 一般狀態：正常在原本的 DOM 裡
 *  - 拖曳中：使用 createPortal() 把卡片丟到 body 上的 #drag-portal
 */
function PortalAwareDraggable({ children, ...props }) {
  return (
    <Draggable {...props}>
      {(provided, snapshot) => {
        const child = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...(provided.draggableProps.style || {}),
              display: "inline-flex",
            }}
          >
            {children(provided, snapshot)}
          </div>
        );

        if (!snapshot.isDragging) {
          // 沒在拖曳：正常渲染在原來的位置
          return child;
        }

        const portal = getDragPortal();
        if (!portal) {
          // 非瀏覽器環境（SSR）或沒 portal：退回一般渲染
          return child;
        }

        // 拖曳中：渲染到 body 的 portal，並重新開啟 pointer-events
        return ReactDOM.createPortal(
          <div style={{ pointerEvents: "auto" }}>{child}</div>,
          portal
        );
      }}
    </Draggable>
  );
}

const makeKey = (s) => {
  const base = String(s?.applicationId ?? s?.id ?? "");
  const dateTag = s?.date ?? s?.surgeryDate ?? s?.operatingDate ?? "";
  return dateTag ? `${base}@${dateTag}` : base;
};

const laneStyle = {
  width: "var(--timeline-width)",
  justifyContent: "flex-start",
};

function HomeSurgeryItems({
  roomID,
  surgeries,
  timeSettings,
  dndEnabled = false,
  onSurgeryClick,
  pxPerMin, // ⬅️ 外部傳入的每分鐘像素
}) {
  if (!dndEnabled) {
    return (
      <div className="surgery-items" data-room={roomID} style={laneStyle}>
        {surgeries.map((s, index) => (
          <HomeSurgery
            key={makeKey(s) || `${roomID}-${index}`}
            surgery={s}
            timeSettings={timeSettings}
            onClick={() => onSurgeryClick?.(s)}
            pxPerMin={pxPerMin}
          />
        ))}
      </div>
    );
  }

  return (
    <Droppable
      droppableId={`room-${roomID}`}
      direction="horizontal"
      type="SURGERY"
      isCombineEnabled={false}
    >
      {(drop) => (
        <div
          ref={drop.innerRef}
          {...drop.droppableProps}
          className="surgery-items"
          data-room={roomID}
          style={laneStyle}
        >
          {surgeries.map((s, index) => {
            const keyId = makeKey(s) || `${roomID}-${index}`;

            return (
              <PortalAwareDraggable
                key={keyId}
                draggableId={keyId}
                index={index}
                isDragDisabled={!dndEnabled}
              >
                {() => (
                  <HomeSurgery
                    surgery={s}
                    timeSettings={timeSettings}
                    onClick={() => onSurgeryClick?.(s)}
                    pxPerMin={pxPerMin}
                  />
                )}
              </PortalAwareDraggable>
            );
          })}
          {drop.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default HomeSurgeryItems;
