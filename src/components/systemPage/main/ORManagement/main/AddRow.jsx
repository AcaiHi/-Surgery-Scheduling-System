/* eslint-disable react/prop-types */
import axios from "axios";
import { useEffect, useState } from "react";
import { BASE_URL } from "../../../../../config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faTimes } from "@fortawesome/free-solid-svg-icons";

function AddRow({ addOperatingRooms, setAddOperatingRooms, handleAdd, emptyError, setEmptyError }) {
    const handleChange = (uniqueId, event) => {
        const { name, value } = event.target;

        const updated = addOperatingRooms.map((room) =>
            room.uniqueId === uniqueId ? { ...room, [name]: value } : room
        );

        setAddOperatingRooms(updated);
    };

    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        console.log("addOperatingRooms: ", addOperatingRooms);
    }, [addOperatingRooms]);

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

    const handleDelete = (uniqueId) => {
        const updated = addOperatingRooms.filter(operatingRoom => operatingRoom.uniqueId !== uniqueId);
        setAddOperatingRooms(updated);
        setEmptyError((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors[uniqueId];  // 根據 uniqueId 刪除錯誤
            return newErrors;
        });
    };

    return (
        <>
            {addOperatingRooms.map((operatingRoom) => (
                <tr className="editable-row" key={operatingRoom.uniqueId}>
                    <td></td>
                    <td>
                        <input
                            className={`${emptyError[`${operatingRoom.uniqueId}-id`] ? "err-input" : ""}`}
                            type="text"
                            name="id"
                            value={operatingRoom.id}
                            onChange={(e) => handleChange(operatingRoom.uniqueId, e)}
                            placeholder="請輸入手術房編號"
                        />
                        {emptyError[`${operatingRoom.uniqueId}-id`] && <span className="error">{emptyError[`${operatingRoom.uniqueId}-id`]}</span>}
                    </td>
                    <td>
                        <input
                            className={`${emptyError[`${operatingRoom.uniqueId}-name`] ? "err-input" : ""}`}
                            type="text"
                            name="operatingRoomName"
                            value={operatingRoom.operatingRoomName}
                            onChange={(e) => handleChange(operatingRoom.uniqueId, e)}
                            placeholder="請輸入手術房名稱"

                        />
                        {emptyError[`${operatingRoom.uniqueId}-name`] && <span className="error">{emptyError[`${operatingRoom.uniqueId}-name`]}</span>}
                    </td>
                    <td>
                        <select
                            name="departmentId"
                            value={operatingRoom.departmentId}
                            onChange={(e) => handleChange(operatingRoom.uniqueId, e)}
                        >
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                    {department.name}
                                </option>
                            ))}
                        </select>
                    </td>
                    <td>
                        {/* <input
                            type="text"
                            name="roomType"
                            value={operatingRoom.roomType}
                            onChange={(e) => handleChange(operatingRoom.uniqueId, e)}
                        /> */}
                        <select
                            name="roomType"
                            value={operatingRoom.roomType}
                            onChange={(e) => handleChange(operatingRoom.uniqueId, e)}
                        >
                            <option value="普通房">普通房</option>
                            <option value="鉛牆房">鉛牆房</option>
                        </select>
                    </td>
                    <td>
                        <select
                            name="status"
                            value={operatingRoom.status}
                            onChange={(e) => handleChange(operatingRoom.uniqueId, e)}
                        >
                            <option value="1">開啟</option>
                            <option value="0">關閉</option>
                        </select>
                    </td>
                    {/* <td>
                        <div className="action-buttons">
                            <FontAwesomeIcon className="edit-button" icon={faFloppyDisk} onClick={() => {
                                handleAdd(operatingRoom);
                                if (operatingRoom.id.trim()) { handleDelete(index); }
                            }} />
                            <FontAwesomeIcon className="delete-button" icon={faTrash} onClick={() => handleDelete(index)} />
                        </div>
                    </td> */}
                    <td>
                        <div className="action-buttons">
                            {/* 儲存按鈕 */}

                            <button className="action-button edit-button" onClick={() => {
                                handleAdd(operatingRoom);
                            }}>
                                <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
                            </button>

                            {/* 刪除按鈕 */}
                            <button className="action-button delete-button" onClick={() => handleDelete(operatingRoom.uniqueId)}>
                                <FontAwesomeIcon icon={faTimes} className="action-icon" />
                            </button>
                        </div>
                    </td>

                </tr>
            ))}
        </>
    )
}

export default AddRow;