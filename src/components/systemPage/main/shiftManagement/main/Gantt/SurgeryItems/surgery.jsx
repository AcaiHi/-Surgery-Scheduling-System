import { Draggable } from "@hello-pangea/dnd";

function Surgery({
  surgery,
  index,
  timeSettings,
  isSelecting = false,
  selected = false,
  onClick,
  draggableId: externalDraggableId,
  dragDisabled = false,
}) {
  const baseId = String(surgery?.applicationId ?? surgery?.id);
  const dateTag = surgery?.date ?? surgery?.surgeryDate ?? surgery?.operatingDate ?? "";
  const dragId = externalDraggableId || (dateTag ? `${baseId}@${dateTag}` : baseId);

  // 是否為群組主手術（只留下主手術渲染）
  const isGroupMain =
    Array.isArray(surgery?.groupApplicationIds) &&
    surgery.groupApplicationIds.length > 0 &&
    String(surgery.groupApplicationIds[0]) === String(surgery.applicationId ?? surgery.id);

  // 轉時間用：分鐘 -> HH:mm
  const toHHmm = (minsAbs) => {
    if (minsAbs == null || Number.isNaN(minsAbs)) return "--:--";
    const v = Math.max(0, Math.floor(minsAbs));
    const h = Math.floor(v / 60) % 24;
    const m = v % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // 顯示資訊
  const chiefName =
    surgery?.chiefSurgeon?.name ??
    surgery?.chiefSurgeonName ??
    surgery?.chief_surgeon_name ??
    "";
  const sName =
    surgery?.surgeryName ??
    surgery?.name ??
    surgery?.operationName ??
    "";
  const patient =
    surgery?.patientName ??
    surgery?.patient?.name ??
    "";

  // 時間（手術本體）
  const startTime = surgery?.startTime || toHHmm(surgery?.startMinAbs);
  const endTime   = surgery?.endTime   || toHHmm(surgery?.endMinAbs);

  // 時間（銜接/整理區塊）
  const PX_PER_MIN     = 100 / 60;
  const surgeryMins    = Number(surgery?.estimatedSurgeryTime || 0);
  const cleaningMins   = Number(timeSettings?.cleaningTime || 0);
  const surgeryWidthPx = surgeryMins * PX_PER_MIN;
  const cleaningWidthPx = cleaningMins * PX_PER_MIN;

  const cleanStart = surgery?.endMinAbs ?? null;
  const cleanEnd   = cleanStart != null ? cleanStart + cleaningMins : null;
  const cleanRange = `${toHHmm(cleanStart)} - ${toHHmm(cleanEnd)}`;

  const status =
    surgery?.status === "overlimit"
      ? "overlimit"
      : surgery?.status === "overtime"
      ? "overtime"
      : "normal";

  const dimmed = surgery?.__dim === true;

  const getItemStyle = (style) => ({
    ...style,
    width: `${surgeryWidthPx + cleaningWidthPx}px`,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "stretch",
    flexShrink: 0,
    cursor: isSelecting ? "pointer" : (dragDisabled ? "not-allowed" : "grab"),
    opacity: dimmed ? 0.28 : 1,
    filter: dimmed ? "grayscale(0.25)" : "none",
    zIndex: 1,
  });

  // 內文模板
  const renderSurgeryInfo = () => {
    if (isGroupMain) {
      const count = surgery?.groupApplicationIds?.length ?? 1;
      return (
        <>
          <div className="line-1">{`${count} 個手術`}</div>
          <div className="line-2">群組手術</div>
          <div className="line-3">{`${startTime} - ${endTime}`}</div>
        </>
      );
    }
    return (
      <>
        <div className="line-1">{chiefName || "主治醫師未填"}</div>
        <div className="line-2">
          {sName || "手術名稱未填"}{patient ? `（${patient}）` : ""}
        </div>
        <div className="line-3">{`${startTime} - ${endTime}`}</div>
      </>
    );
  };

  return (
    <Draggable
      draggableId={dragId}
      index={index}
      isDragDisabled={isSelecting || dragDisabled}
    >
      {(drag) => (
        <div
          ref={drag.innerRef}
          {...drag.draggableProps}
          {...(!isSelecting && !dragDisabled ? drag.dragHandleProps : {})}
          onClick={onClick}
          className={`gantt-surgery-item surgery-item${selected ? " selected" : ""}${isGroupMain ? " is-group" : ""}`}
          style={getItemStyle(drag.draggableProps.style || {})}
          title={dragDisabled ? "此手術房已釘選，禁止移動" : undefined}
        >
          {/* 手術區塊 */}
          <div className={`surgery-time ${status}`} style={{ width: `${surgeryWidthPx}px` }}>
            <div className="surgery-info">
              {renderSurgeryInfo()}
            </div>
          </div>

          {/* 銜接/整理區塊 */}
          <div className="cleaning-time" style={{ width: `${cleaningWidthPx}px` }}>
            <div className="line-1">銜接時間</div>
            <div className="line-2">整理中</div>
            <div className="line-3">{cleanRange}</div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default Surgery;
