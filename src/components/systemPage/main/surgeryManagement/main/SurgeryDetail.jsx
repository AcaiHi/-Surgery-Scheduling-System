/* eslint-disable react/prop-types */
import { faPenSquare, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import EditableDetail from "./EditableDetail";

function SurgeryDetail({ user, onClose, surgery, operatingRooms, handleSave, handleDelete }) {
    const [editingSurgery, setEditingSurgery] = useState(null);

    const handleEdit = (surgery) => {
        setEditingSurgery(surgery);
    };
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflowY = "scroll"; // 保留 scrollbar 占位
    document.body.style.width = "100%";

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>手術詳細資訊</h2>
                    <button className="close-button" onClick={onClose}>
                        &times;
                    </button>
                </div>

                <div className="modal-body">
                    {/* <div className="info-group" style={{ textAlign: "left", alignItems: "flex-start", display: "flex", flexDirection: "column" }}> */}
                    {editingSurgery ? (<EditableDetail surgery={surgery} setEditingSurgery={setEditingSurgery} operatingRooms={operatingRooms} handleSave={handleSave} />) : (
                        <>
                            {/* {(user.role === "3") || (user.username === surgery.user.username) &&
                                <div className="info-group action-group">
                                    <div className="action-container">
                                        <button onClick={() => handleEdit(surgery)} className="action-button edit-button">
                                            <FontAwesomeIcon icon={faPenSquare} className="action-icon" />
                                        </button>
                                        <span className="action-label">修改</span>
                                    </div>
                                    <div className="action-container">
                                        <button onClick={() => handleDelete(surgery.surgeryName, surgery.applicationId)} className="action-button delete-button">
                                            <FontAwesomeIcon icon={faTrash} className="action-icon" />
                                        </button>
                                        <span className="action-label">刪除</span>
                                    </div>
                                </div>
                            } */}
                            {(user.role === "3") || (user.username === surgery.user.username) &&
                                <div className="info-group action-group">
                                    <div className="action-container">
                                        <button onClick={() => handleEdit(surgery)} className="action-button edit-button">
                                            <FontAwesomeIcon icon={faPenSquare} className="action-icon" />
                                        </button>
                                        <span className="action-label">修改</span>
                                    </div>
                                    <div className="action-container">
                                        <button onClick={() => handleDelete(surgery.surgeryName, surgery.applicationId)} className="action-button delete-button">
                                            <FontAwesomeIcon icon={faTrash} className="action-icon" />
                                        </button>
                                        <span className="action-label">刪除</span>
                                    </div>
                                </div>
                            }

                            <div className="info-group blue flex flex-col items-start text-left">
                                <h3>基本資訊</h3>
                                <p>
                                    <strong>申請編號：</strong> {surgery.applicationId || '未指定'}
                                </p>
                                <p>
                                    <strong>病歷號碼：</strong> {surgery.medicalRecordNumber || '未指定'}
                                </p>
                                <p>
                                    <strong>病患姓名：</strong> {surgery.patientName || '未指定'}
                                </p>
                                <p>
                                    <strong>手術日期：</strong> {surgery.date || '未指定'}
                                </p>
                            </div>

                            <div className="info-group green" style={{ textAlign: "left", alignItems: "flex-start", display: "flex", flexDirection: "column" }}>
                                <h3>手術資訊</h3>
                                <p>
                                    <strong>手術名稱：</strong> {surgery.surgeryName || '未指定'}
                                </p>
                                <p>
                                    <strong>主刀醫師：</strong> {surgery.chiefSurgeonName || '未指定'}
                                </p>
                                <p>
                                    <strong>手術房：</strong> {surgery.operatingRoomName || '未指定'}
                                </p>
                                <p>
                                    <strong>特殊房需求：</strong> {surgery.req || "N"}
                                </p>
                                <p>
                                    <strong>預估時間：</strong> {surgery.estimatedSurgeryTime || '未指定'} {surgery.estimatedSurgeryTime ? '分鐘' : ''}
                                </p>
                                <p>
                                    <strong>開始時間：</strong> {surgery.startTime}
                                </p>
                                <p>
                                    <strong>結束時間：</strong> {surgery.endTime}
                                </p>
                                <p>
                                    <strong>麻醉方式：</strong> {surgery.anesthesiaMethod || '未指定'}
                                </p>
                                <p>
                                    <strong>手術原因：</strong> {surgery.surgeryReason || '未指定'}
                                </p>
                            </div>

                            <div className="info-group pink" style={{ textAlign: "left", alignItems: "flex-start", display: "flex", flexDirection: "column" }}>
                                <h3>其他資訊</h3>
                                <p>
                                    <strong>特殊需求：</strong>{" "}
                                    {surgery.specialOrRequirements || "無"}
                                </p>
                                <p>
                                    <strong>申請人：</strong> {surgery.user?.name || "未指定"}
                                </p>
                            </div>
                        </>)}

                </div>
            </div>
        </div>
    )
}

export default SurgeryDetail;