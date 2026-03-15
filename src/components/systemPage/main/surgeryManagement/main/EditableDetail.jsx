/* eslint-disable react/prop-types */
import { faFloppyDisk, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import Select from "react-select";
import { BASE_URL } from "../../../../../config";
import axios from "axios";

function EditableDetail({ surgery, setEditingSurgery, operatingRooms, handleSave }) {
    const [editedSurgery, setEditedSurgery] = useState({
        applicationId: surgery.applicationId,
        medicalRecordNumber: surgery.medicalRecordNumber,
        patientName: surgery.patientName,
        date: surgery.date,
        surgeryName: surgery.surgeryName,
        estimatedSurgeryTime: surgery.estimatedSurgeryTime,
        anesthesiaMethod: surgery.anesthesiaMethod,
        surgeryReason: surgery.surgeryReason,
        specialOrRequirements: surgery.specialOrRequirements,
        req: surgery.req || 'N', // 預設為 'N'
        operatingRoomId: surgery.operatingRoom.id,
        chiefSurgeonId: surgery.chiefSurgeon.id
    })
    const [error, setError] = useState(null);
    const [chiefSurgeons, setChiefSurgeons] = useState([]);

    useEffect(() => {
        //console.log("編輯中的手術",editedSurgery);
        console.log("編輯中的手術詳情", surgery);
        console.log("此科別的主刀醫師", chiefSurgeons);
    }, [chiefSurgeons, editedSurgery, surgery])

    const handleChange = (e) => {
        setEditedSurgery({
            ...editedSurgery,
            [e.target.name]: e.target.value
        });
    };

    const handleOperatingRoomsChange = (selectedOption) => {
        setEditedSurgery({
            ...editedSurgery,
            operatingRoomId: selectedOption ? selectedOption.value : null
        });
    };

    const handleChiefSurgeonChange = (selectedOption) => {
        setEditedSurgery({
            ...editedSurgery,
            chiefSurgeonId: selectedOption ? selectedOption.value : null
        });
    };

    useEffect(() => {
        const fetchChiefSurgeons = async () => {
            if (!editedSurgery.operatingRoomId) return;

            const selectedDepartmentId = operatingRooms.find(room => room.id === editedSurgery.operatingRoomId)?.department.id;

            if (!selectedDepartmentId) return;

            try {
                const response = await axios.get(`${BASE_URL}/api/system/department/${selectedDepartmentId}/chief-surgeons`);
                setChiefSurgeons(response.data);
            } catch (error) {
                console.error("Error fetching chief surgeons: ", error);
            }
        };

        fetchChiefSurgeons();
    }, [editedSurgery.operatingRoomId, operatingRooms]);

    const handleSaveClick = () => {
        if (!editedSurgery.applicationId.trim()) {
            setError("申請編號不能為空");
        } else {
            setError(null);
            setEditingSurgery(null);
            handleSave(editedSurgery);
        }
    };

    return (
        <>
            <div className="info-group action-group">
                <div className="action-container">
                    <button
                        className="action-button edit-button"
                        onClick={handleSaveClick}>
                        <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
                    </button>
                    <span className="action-label">儲存</span>
                </div>
                <div className="action-container">
                    <button
                        className="action-button delete-button"
                        onClick={() => {
                            setError(null);
                            setEditingSurgery(null);
                        }}
                    >
                        <FontAwesomeIcon icon={faTimes} className="action-icon" />
                    </button>
                    <span className="action-label">取消</span>
                </div>
            </div>

            <div className="info-group blue flex flex-col items-start text-left">
                <h3>基本資訊</h3>
                <p>
                    <strong>申請編號：</strong> {surgery.applicationId || '未指定'}
                </p>
                <p>
                    <strong>病歷號碼：</strong>
                    <input type="text" name="medicalRecordNumber" value={editedSurgery.medicalRecordNumber}
                        onChange={handleChange} />
                </p>
                <p>
                    <strong>病患姓名：</strong>
                    <input type="text" name="patientName" value={editedSurgery.patientName}
                        onChange={handleChange} />
                </p>
                <p>
                    <strong>手術日期：</strong>
                    <input type="text" name="date" value={editedSurgery.date}
                        onChange={handleChange} />
                </p>
            </div>

            <div className="info-group green" style={{ textAlign: "left", alignItems: "flex-start", display: "flex", flexDirection: "column" }}>
                <h3>手術資訊</h3>
                <p>
                    <strong>手術名稱：</strong>
                    <input type="text" name="surgeryName" value={editedSurgery.surgeryName}
                        onChange={handleChange} />
                </p>
                <p>
                    <strong>主刀醫師：</strong>
                    <Select
                        className=""
                        options={chiefSurgeons.map((chiefSurgeon) => ({ value: chiefSurgeon.id, label: chiefSurgeon.name }))}
                        onChange={handleChiefSurgeonChange}
                        defaultValue={chiefSurgeons.find(chiefSurgeon => chiefSurgeon.id === surgery.chiefSurgeon.id) ?
                            { value: surgery.chiefSurgeon.id, label: surgery.chiefSurgeon.name } : null}
                    />
                </p>
                <p>
                    <strong>手術房：</strong>
                    <Select
                        className=""
                        options={operatingRooms.map((operatingRoom) => ({ value: operatingRoom.id, label: operatingRoom.operatingRoomName }))}
                        onChange={handleOperatingRoomsChange}
                        defaultValue={operatingRooms.find(room => room.id === surgery.operatingRoom.id) ?
                            { value: surgery.operatingRoom.id, label: surgery.operatingRoom.operatingRoomName } : null}
                    />
                </p>
                <p>
                    <strong>特殊房需求：</strong>
                    <select name="req" value={editedSurgery.req} onChange={handleChange}>
                        <option value="N">N</option>
                        <option value="Y">Y</option>
                    </select>
                </p>
                <p>
                    <strong>預估時間：</strong>
                    <input type="text" name="estimatedSurgeryTime" value={editedSurgery.estimatedSurgeryTime}
                        onChange={handleChange} />
                    {editedSurgery.estimatedSurgeryTime ? '分鐘' : ''}
                </p>
                <p>
                    <strong>開始時間：</strong> null
                </p>
                <p>
                    <strong>結束時間：</strong> null
                </p>
                <p>
                    <strong>麻醉方式：</strong>
                    <input type="text" name="anesthesiaMethod" value={editedSurgery.anesthesiaMethod}
                        onChange={handleChange} />
                </p>
                <p>
                    <strong>手術原因：</strong>
                    <textarea
                        className="surgery-reason"
                        name="surgeryReason"
                        value={editedSurgery.surgeryReason}
                        onChange={handleChange}
                        rows="4"
                        cols="50"
                    />
                </p>
            </div>

            <div className="info-group pink" style={{ textAlign: "left", alignItems: "flex-start", display: "flex", flexDirection: "column" }}>
                <h3>其他資訊</h3>
                <p>
                    <strong>特殊需求：</strong>{" "}
                    <textarea
                        className="surgery-reason"
                        name="specialOrRequirements"
                        value={editedSurgery.specialOrRequirements}
                        onChange={handleChange}
                        rows="4"
                        cols="50"
                    />
                </p>

                <p>
                    <strong>申請人：</strong> {surgery.user?.name || "未指定"}
                </p>
            </div>
        </>
    )
}

export default EditableDetail;