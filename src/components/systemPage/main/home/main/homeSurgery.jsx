// src/features/home/main/homeSurgery.jsx
import { useRef } from "react";

function HomeSurgery({ surgery, timeSettings, onClick, pxPerMin = (100 / 60) }) {
  // 原本：const PX_PER_MIN = 100 / 60;  // ⬅️ 移除
  const surgeryMins = Number(surgery?.estimatedSurgeryTime || 0);
  const cleaningMins = Number(timeSettings?.cleaningTime || 0);

  const surgeryWidthPx = surgeryMins * pxPerMin;
  const cleaningWidthPx = cleaningMins * pxPerMin;

  const status =
    surgery?.status === "overlimit" ? "overlimit" :
      surgery?.status === "overtime" ? "overtime" : "normal";

  const dimmed = surgery?.__dim === true;
  const style = {
    width: `${surgeryWidthPx + cleaningWidthPx}px`,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "stretch",
    flexShrink: 0,
    opacity: dimmed ? 0.45 : 1,
    filter: "none",
    cursor: "pointer",
  };

  const toHHmm = (minsAbs) => {
    if (minsAbs == null || Number.isNaN(minsAbs)) return "--:--";
    const v = Math.max(0, Math.floor(minsAbs));
    const h = Math.floor(v / 60) % 24;
    const m = v % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const startTime = surgery?.startTime || toHHmm(surgery?.startMinAbs);
  const endTime = surgery?.endTime || toHHmm(surgery?.endMinAbs);

  const cleanStart = surgery?.endMinAbs ?? null;
  const cleanEnd = cleanStart != null ? cleanStart + cleaningMins : null;
  const cleanRange = `${toHHmm(cleanStart)} - ${toHHmm(cleanEnd)}`;

  const isGroupMain =
    Array.isArray(surgery?.groupApplicationIds) &&
    surgery.groupApplicationIds.length > 0 &&
    String(surgery.groupApplicationIds[0]) === String(surgery?.applicationId ?? surgery?.id);

  const chiefName =
    surgery?.chiefSurgeon?.name ??
    surgery?.chiefSurgeonName ??
    surgery?.chief_surgeon_name ?? "";

  const sName =
    surgery?.surgeryName ??
    surgery?.name ??
    surgery?.operationName ?? "";

  const patient =
    surgery?.patientName ??
    surgery?.patient?.name ?? "";

  const renderMainInfo = () => {
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

  // 輕量防誤觸
  const downRef = useRef({ x: 0, y: 0, moved: false });
  const onMouseDown = (e) => { downRef.current = { x: e.clientX, y: e.clientY, moved: false }; };
  const onMouseMove = (e) => {
    const dx = Math.abs(e.clientX - downRef.current.x);
    const dy = Math.abs(e.clientY - downRef.current.y);
    if (dx > 5 || dy > 5) downRef.current.moved = true;
  };
  const onMouseUp = () => { if (!downRef.current.moved) onClick?.(surgery); };
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(surgery);
    }
  };

  return (
    <div
      className="gantt-surgery-item surgery-item"
      style={style}
      title={`${surgery?.applicationId || ""}`}
      role="button"
      tabIndex={0}
      onKeyDown={onKey}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      <div className={`surgery-time ${status}`} style={{ width: `${surgeryWidthPx}px` }}>
        {renderMainInfo()}
      </div>

      <div className="cleaning-time" style={{ width: `${cleaningWidthPx}px` }}>
        <div className="line-1">銜接時間</div>
        <div className="line-2">整理中</div>
        <div className="line-3">{cleanRange}</div>
      </div>
    </div>
  );
}

export default HomeSurgery;
