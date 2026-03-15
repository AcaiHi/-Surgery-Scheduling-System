/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
import { faPenSquare, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import EditableRow from "./EditableRow";
import axios from "axios";
import { BASE_URL } from "../../../../../config";
import AddRow from "./AddRow";
import { BsFillLightbulbOffFill, BsLightbulbFill } from "react-icons/bs";

function ORListWrapper({
    operatingRooms, setOperatingRooms,
    filterOperatingRoom, selectedOperatingRooms,
    setSelectedOperatingRooms, handleDelete,
    addOperatingRooms, setAddOperatingRooms,
    handleAdd, emptyError, setEmptyError
}) {
    const [filteredOperatingRooms, setFilteredOperatingRooms] = useState([]);
    const [editingOperatingRoom, setEditingOperatingRoom] = useState(null);
    const [selectAll, setSelectAll] = useState(false);

    // 顯示狀態的文字
    const statusDisplayMap = {
        1: "開啟",
        0: "關閉",
    };

    // 根據 filterOperatingRoom 中的所有條件進行過濾
    useEffect(() => {
        if (!operatingRooms.length) return;

        const newFilteredOperatingRooms = operatingRooms.filter((operatingRoom) => {
            const matchesId = filterOperatingRoom.id
                ? operatingRoom.id.toLowerCase().includes(filterOperatingRoom.id.toLowerCase())
                : true;
            const matchesName = filterOperatingRoom.operatingRoomName
                ? operatingRoom.operatingRoomName.toLowerCase().includes(filterOperatingRoom.operatingRoomName.toLowerCase())
                : true;
            const matchesDepartment = filterOperatingRoom.department
                ? operatingRoom.department.name.toLowerCase().includes(filterOperatingRoom.department.toLowerCase())
                : true;
            const matchesRoomType = filterOperatingRoom.roomType
                ? operatingRoom.roomType === filterOperatingRoom.roomType
                : true;
            const matchesStatus = filterOperatingRoom.status
                ? operatingRoom.status.toString() === filterOperatingRoom.status
                : true;

            return matchesId && matchesName && matchesDepartment && matchesRoomType && matchesStatus;
        });

        newFilteredOperatingRooms.sort((a, b) => a.id - b.id);

        setFilteredOperatingRooms(newFilteredOperatingRooms);
    }, [
        filterOperatingRoom.id,
        filterOperatingRoom.operatingRoomName,
        filterOperatingRoom.department,
        filterOperatingRoom.roomType,
        filterOperatingRoom.status,
        operatingRooms
    ]);

    const handleEdit = async (operatingRoom) => {
        try {
            // 向 API 查詢該手術房是否包含手術
            const response = await axios.get(`${BASE_URL}/api/system/operating-rooms/${operatingRoom.id}/surgery`);

            if (response.data.length > 0) {
                // 這個手術房有手術，標記為不可修改 roomType
                setEditingOperatingRoom({ ...operatingRoom, hasSurgeries: true });
            } else {
                // 沒有手術，可以正常編輯
                setEditingOperatingRoom({ ...operatingRoom, hasSurgeries: false });
            }
        } catch (error) {
            console.error("查詢手術房的手術失敗：", error);
        }
    };

    const handleSave = async (updatedOperatingRoom) => {
        const isConfirmed = window.confirm(`確定要儲存對手術房編號 ${updatedOperatingRoom.id} 的變更嗎？`);
        if (!isConfirmed) return; // 如果使用者按下取消，則不進行儲存

        try {
            await axios.put(
                `${BASE_URL}/api/system/operating-room/${updatedOperatingRoom.id}`,
                updatedOperatingRoom
            );
            const response = await axios.get(`${BASE_URL}/api/system/operating-rooms`);
            setOperatingRooms(response.data);
            setEditingOperatingRoom(null);
        } catch (error) {
            console.error("更新失敗：", error);
        }
    };

    const handleCheckboxChange = (operatingRoom) => {
        setSelectedOperatingRooms((prevSelected) =>
            prevSelected.includes(operatingRoom)
                ? prevSelected.filter(selectedRoom => selectedRoom.id !== operatingRoom.id)
                : [...prevSelected, operatingRoom]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedOperatingRooms([]);
        } else {
            setSelectedOperatingRooms(filteredOperatingRooms.map(room => room.id));
        }
        setSelectAll(!selectAll);
    }

    useEffect(() => {
        setSelectAll(
            filteredOperatingRooms.length > 0 &&
            selectedOperatingRooms.length === filteredOperatingRooms.length
        );
    }, [filteredOperatingRooms, selectedOperatingRooms]);

    return (
        <div className="mgr-list">
            <table className="system-table table-operatingroom">
                <thead>
                    <tr>
                        <th
                            className="selectable-cell"
                        >
                            <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={handleSelectAll}
                                className="checkbox"
                            />
                        </th>
                        <th>編號</th>
                        <th>名稱</th>
                        <th>所屬科別</th>
                        <th>種類</th>
                        <th>狀態</th>
                        <th>動作</th>
                    </tr>
                </thead>
                <tbody>
                    <AddRow
                        addOperatingRooms={addOperatingRooms}
                        setAddOperatingRooms={setAddOperatingRooms}
                        handleAdd={handleAdd}
                        emptyError={emptyError}
                        setEmptyError={setEmptyError}
                    />
                    {filteredOperatingRooms.length > 0 ? (
                        filteredOperatingRooms.map((operatingRoom) => (
                            editingOperatingRoom?.id === operatingRoom.id ? (
                                <EditableRow
                                    key={operatingRoom.id}
                                    operatingRoom={editingOperatingRoom}
                                    handleSave={handleSave}
                                    setIsEditing={setEditingOperatingRoom}
                                />
                            ) : (
                                // <tr key={operatingRoom.id}>
                                <tr
                                    key={operatingRoom.id}
                                    className={selectedOperatingRooms.includes(operatingRoom.id) ? "selected" : "unselected"}
                                >

                                    <td
                                        onClick={() => handleCheckboxChange(operatingRoom.id)}
                                        className={`selectable-cell ${selectedOperatingRooms.includes(operatingRoom.id) ? "selected" : ""}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedOperatingRooms.includes(operatingRoom.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => handleCheckboxChange(operatingRoom.id)}
                                            className="checkbox"
                                        />
                                    </td>
                                    <td>{operatingRoom.id}</td>
                                    <td>{operatingRoom.operatingRoomName}</td>
                                    <td>{operatingRoom.department.name}</td>
                                    <td>{operatingRoom.roomType}</td>
                                    {/* <td> {statusDisplayMap[operatingRoom.status]}</td> */}
                                    <td className="text-center p-0">
                                        <div className="flex justify-center items-center gap-2">
                                            {operatingRoom.status ? (<BsLightbulbFill fill="#facc15" size={30} />)
                                                : (<BsFillLightbulbOffFill fill="#9ca3af" size={30} />)}
                                            <span>{statusDisplayMap[operatingRoom.status]}</span>
                                        </div>
                                    </td>

                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => handleEdit(operatingRoom)} className="action-button edit-button">
                                                <FontAwesomeIcon icon={faPenSquare} className="action-icon" />
                                            </button>
                                            <button onClick={() => handleDelete(operatingRoom)} className="action-button delete-button">
                                                <FontAwesomeIcon icon={faTrash} className="action-icon" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" className="py-4 px-4 text-center text-gray-500 italic">
                                無符合條件的資料
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default ORListWrapper;
