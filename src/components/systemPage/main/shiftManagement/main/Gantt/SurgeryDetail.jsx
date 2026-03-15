/* eslint-disable react/prop-types */
import { useEffect } from "react";
import { createPortal } from "react-dom";

function SurgeryDetail({ onClose, surgery }) {
  // ESC 關閉
  useEffect(() => {
    const onKeyDown = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // 鎖定背景卷動（不動寬度，補償捲軸寬度）
  useEffect(() => {
    const body = document.body;
    const scrollY = window.scrollY;

    const prev = {
      position: body.style.position,
      top: body.style.top,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    };

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const chiefSurgeonName =
    surgery.chiefSurgeonName ||
    surgery.chiefSurgeon?.name ||
    surgery.chief_surgeon_name ||
    "未指定";

  const operatingRoomName =
    surgery.operatingRoomName ||
    surgery.operatingRoom?.name ||
    surgery.operating_room_name ||
    "未指定";

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-[10000]"   // 只加圖層/定位
      onClick={onClose}
    >
      <div
        className="modal-content relative z-[10001]"       // 內容層再高一階
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>手術詳細資訊</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="info-group blue flex flex-col items-start text-left">
            <h3>基本資訊</h3>
            <p><strong>申請編號：</strong> {surgery.applicationId || "未指定"}</p>
            <p><strong>病歷號碼：</strong> {surgery.medicalRecordNumber || "未指定"}</p>
            <p><strong>病患姓名：</strong> {surgery.patientName || "未指定"}</p>
            <p><strong>手術日期：</strong> {surgery.date || "未指定"}</p>
          </div>

          <div className="info-group green" style={{ textAlign: "left", alignItems: "flex-start", display: "flex", flexDirection: "column" }}>
            <h3>手術資訊</h3>
            <p><strong>手術名稱：</strong> {surgery.surgeryName || "未指定"}</p>
            <p><strong>主刀醫師：</strong> {chiefSurgeonName}</p>
            <p><strong>手術房：</strong> {operatingRoomName}</p>
            <p><strong>特殊房需求：</strong> {surgery.req || "N"}</p>
            <p><strong>預估時間：</strong> {surgery.estimatedSurgeryTime || "未指定"}{surgery.estimatedSurgeryTime ? " 分鐘" : ""}</p>
            <p><strong>開始時間：</strong> {surgery.startTime || "未指定"}</p>
            <p><strong>結束時間：</strong> {surgery.endTime || "未指定"}</p>
            <p><strong>麻醉方式：</strong> {surgery.anesthesiaMethod || "未指定"}</p>
            <p><strong>手術原因：</strong> {surgery.surgeryReason || "未指定"}</p>
          </div>

          <div className="info-group pink" style={{ textAlign: "left", alignItems: "flex-start", display: "flex", flexDirection: "column" }}>
            <h3>其他資訊</h3>
            <p><strong>特殊需求：</strong> {surgery.specialOrRequirements || "無"}</p>
            <p><strong>申請人：</strong> {surgery.user?.name || "未指定"}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SurgeryDetail;
