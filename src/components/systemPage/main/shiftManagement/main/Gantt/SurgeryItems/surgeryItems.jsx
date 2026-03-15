import { Droppable } from "@hello-pangea/dnd";
import Surgery from "./surgery";

const makeDragKey = (s) => {
  const base = String(s?.applicationId ?? s?.id);
  const dateTag = s?.date ?? s?.surgeryDate ?? s?.operatingDate ?? "";
  return dateTag ? `${base}@${dateTag}` : base;
};

const isGroupMain = (s) =>
  Array.isArray(s?.groupApplicationIds) &&
  s.groupApplicationIds.length > 0 &&
  String(s.groupApplicationIds[0]) === String(s?.applicationId ?? s?.id);

function SurgeryItems({
  roomID,
  surgeries,
  timeSettings,
  isSelecting = false,
  isUngroupSelecting = false,
  selectedRange = null,
  onItemClick,
  onOpenDetail,
  lockDrag = false,
}) {
  const hasSelectedRange = !!selectedRange;
  const isIndexSelected = (idx) =>
    hasSelectedRange &&
    idx >= Math.min(selectedRange.start, selectedRange.end) &&
    idx <= Math.max(selectedRange.start, selectedRange.end);

  const handlePick = (surgery, index) => {
    if (!isSelecting) return;
    const main = isGroupMain(surgery);
    if (isUngroupSelecting) {
      if (!main) { alert("這不是群組手術，無法解除。"); return; }
      onItemClick?.(index);
    } else {
      if (main) { alert("此為群組手術（主），不能在群組模式中選取。"); return; }
      onItemClick?.(index);
    }
  };

    const renderClone = (provided, snapshot, rubric) => {
    const s = surgeries[rubric.source.index];
    if (!s) return null;

    const PX_PER_MIN = 100 / 60;
    const surgeryMins = Number(s?.estimatedSurgeryTime || 0);
    const cleaningMins = Number(timeSettings?.cleaningTime || 0);
    const surgeryWidthPx = surgeryMins * PX_PER_MIN;
    const cleaningWidthPx = cleaningMins * PX_PER_MIN;

    const status = s?.status === "overlimit" ? "overlimit" : s?.status === "overtime" ? "overtime" : "normal";
    const isMain =
      Array.isArray(s?.groupApplicationIds) &&
      s.groupApplicationIds.length > 0 &&
      String(s.groupApplicationIds[0]) === String(s?.applicationId ?? s?.id);

    const toHHmm = (minsAbs) => {
      if (minsAbs == null || Number.isNaN(minsAbs)) return "--:--";
      const v = Math.max(0, Math.floor(minsAbs));
      const h = Math.floor(v / 60) % 24;
      const m = v % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    const startTime = s?.startTime || toHHmm(s?.startMinAbs);
    const endTime   = s?.endTime   || toHHmm(s?.endMinAbs);
    const cleanRange = `${toHHmm(s?.endMinAbs)} - ${toHHmm((s?.endMinAbs ?? 0) + cleaningMins)}`;

    const chiefName =
      s?.chiefSurgeon?.name ??
      s?.chiefSurgeonName ??
      s?.chief_surgeon_name ??
      "";
    const sName =
      s?.surgeryName ??
      s?.name ??
      s?.operationName ??
      "";
    const patient = s?.patientName ?? s?.patient?.name ?? "";

    return (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        className={`gantt-surgery-item surgery-item${isMain ? " is-group" : ""}`}
        style={{
          ...(provided.draggableProps.style || {}),
          zIndex: 9999,
          width: `${surgeryWidthPx + cleaningWidthPx}px`,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "stretch",
          flexShrink: 0,
          cursor: "grabbing",
          willChange: "transform",
          opacity: s?.__dim ? 0.28 : 1,
          filter: s?.__dim ? "grayscale(0.25)" : "none",
        }}
      >
        <div className={`surgery-time ${status}`} style={{ width: `${surgeryWidthPx}px` }}>
          <div className="surgery-info">
            {isMain ? (
              <>
                <div className="line-1">{`${(s?.groupApplicationIds?.length ?? 1)} 個手術`}</div>
                <div className="line-2">群組手術</div>
                <div className="line-3">{`${startTime} - ${endTime}`}</div>
              </>
            ) : (
              <>
                <div className="line-1">{chiefName || "主治醫師未填"}</div>
                <div className="line-2">
                  {sName || "手術名稱未填"}{patient ? `（${patient}）` : ""}
                </div>
                <div className="line-3">{`${startTime} - ${endTime}`}</div>
              </>
            )}
          </div>
        </div>
        <div className="cleaning-time" style={{ width: `${cleaningWidthPx}px` }}>
          <div className="line-1">銜接時間</div>
          <div className="line-2">整理中</div>
          <div className="line-3">{cleanRange}</div>
        </div>
      </div>
    );
  };

  return (
    <Droppable
      droppableId={`room-${roomID}`}
      direction="horizontal"
      type="SURGERY"
      renderClone={renderClone}
      isCombineEnabled={false}
      isDropDisabled={lockDrag}
    >
      {(drop) => (
        <div ref={drop.innerRef} {...drop.droppableProps} className="surgery-items">
          {surgeries.map((surgery, index) => {
            const keyId = makeDragKey(surgery);
            const clickHandler = isSelecting
              ? () => handlePick(surgery, index)
              : () => onOpenDetail?.(surgery);

            return (
              <Surgery
                key={keyId}
                draggableId={keyId}
                surgery={surgery}
                index={index}
                timeSettings={timeSettings}
                isSelecting={isSelecting}
                selected={isIndexSelected(index)}
                onClick={clickHandler}
                dragDisabled={lockDrag}
              />
            );
          })}
          {drop.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default SurgeryItems;
