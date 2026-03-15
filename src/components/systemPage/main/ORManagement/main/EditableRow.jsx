/* eslint-disable react/prop-types */
import { faFloppyDisk, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useEffect, useState } from "react";
import { BASE_URL } from "../../../../../config";

function EditableRow({ key, operatingRoom, handleSave, setIsEditing }) {
    const [editedOperatingRoom, setEditedOperatingRoom] = useState({
        id: operatingRoom.id,
        operatingRoomName: operatingRoom.operatingRoomName,
        departmentId: operatingRoom.department.id,
        roomType: operatingRoom.roomType,
        // status: operatingRoom.status
        status: operatingRoom.status // 👈 改這裡

    });
    const [error, setError] = useState(null);
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        console.log(editedOperatingRoom);
    }, [editedOperatingRoom])

    const handleChange = (e) => {
        setEditedOperatingRoom({
            ...editedOperatingRoom,
            [e.target.name]: e.target.value
        });
    };

    // EditableRow.jsx
    // 不需要使用 setOperatingRooms，直接呼叫 props.handleSave
    const handleSaveClick = () => {
        if (!editedOperatingRoom.id.trim()) {
            setError("手術房編號不能為空");
            return;
        }
        setError(null);
        handleSave(editedOperatingRoom);  // 由父層做後續更新處理
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(BASE_URL + "/api/system/departments");
                setDepartments(response.data);
            } catch (error) {
                console.error("Error fetching data: ", error);
            }
        };

        fetchData();
    }, []);

    return (
        <tr key={key} className="editable-row">
            <td>
                <input type="checkbox" className="invisible" />
            </td>

            <td>{editedOperatingRoom.id}</td>
            {/* <td>
                <input type="text" name="id" value={editedOperatingRoom.id}
                    onChange={handleChange} />
                <p className="error">{error}</p>
            </td> */}
            <td><input type="text" name="operatingRoomName" value={editedOperatingRoom.operatingRoomName}
                onChange={handleChange} /></td>
            <td>
                <select
                    name="departmentId"
                    value={editedOperatingRoom.departmentId}
                    onChange={handleChange}
                >
                    {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                            {department.name}
                        </option>
                    ))}
                </select>
            </td>
            <td>
                {/* <input type="text" name="roomType" value={editedOperatingRoom.roomType}
                    onChange={handleChange}
                /> */}
                <select
                    className={`${operatingRoom.hasSurgeries ? "err-input" : ""}`}
                    name="roomType"
                    value={editedOperatingRoom.roomType}
                    onChange={handleChange}
                    disabled={operatingRoom.hasSurgeries}
                >
                    <option value="普通房">普通房</option>
                    <option value="鉛牆房">鉛牆房</option>
                </select>
                {operatingRoom.hasSurgeries && <span className="error"></span>}
            </td>
            <td>
                <select
                    className={`${operatingRoom.hasSurgeries ? "err-input" : ""}`}
                    name="status" value={editedOperatingRoom.status}
                    onChange={handleChange}
                    disabled={operatingRoom.hasSurgeries}
                >
                    <option value={0}>關閉</option>
                    <option value={1}>開啟</option>
                </select>
                {operatingRoom.hasSurgeries && <span className="error"></span>}
            </td>
            {/* <td>
                <FontAwesomeIcon className="edit-button" icon={faFloppyDisk}
                    onClick={handleSaveClick} />
            </td> */}
            <td className="action-buttons">
                {/* 儲存按鈕 */}
                <button
                    className="action-button edit-button"
                    // onClick={handleSaveClick}
                    onClick={() => {
                        handleSaveClick();  // 這裡只呼叫 props.handleSave
                        setIsEditing(false);
                    }}
                >
                    <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
                </button>

                {/* 取消按鈕 */}
                <button
                    className="action-button delete-button"
                    onClick={() => {
                        handleSaveClick();  // 這裡只呼叫 props.handleSave
                        setIsEditing(false);
                    }}
                >
                    <FontAwesomeIcon icon={faTimes} className="action-icon" />
                </button>
            </td>

        </tr>
    )
}

export default EditableRow;