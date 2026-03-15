/* eslint-disable react/prop-types */
import axios from "axios";
import { BASE_URL } from "../../../../../config";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenSquare, faTrash } from "@fortawesome/free-solid-svg-icons";
import EditableRow from "./EditableRow";
import AddRow from "./AddRow";

const ChiefSurgeonListWrapper = forwardRef(({
    departmentId,
    addChiefSurgeons,
    setAddChiefSurgeons,
    setDepartments,
    selectedChiefIds,
    setSelectedChiefIds,
    refreshKey,
    setRefreshKey,
}, ref) => {
    const [chiefSurgeons, setChiefSurgeons] = useState([]);
    const [editingChiefSurgeon, setEditingChiefSurgeon] = useState(null);
    const [emptyError, setEmptyError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            const res = await axios.get(`${BASE_URL}/api/system/department/${departmentId}/chief-surgeons`);
            setChiefSurgeons(res.data);
        };
        fetchData();
    }, [departmentId, refreshKey]);

    useImperativeHandle(ref, () => ({
        async handleDeleteSelectedChiefSurgeons() {
            if (selectedChiefIds.length === 0) return alert("請先選取要刪除的主治醫師");
            if (!window.confirm(`確定要刪除 ${selectedChiefIds.length} 位主治醫師？`)) return;

            await Promise.all(selectedChiefIds.map(id => axios.delete(`${BASE_URL}/api/system/chief-surgeon/delete/${id}`)));
            const response = await axios.get(`${BASE_URL}/api/system/department/${departmentId}/chief-surgeons`);
            setChiefSurgeons([...response.data]);

            const resDepartments = await axios.get(`${BASE_URL}/api/system/departments`);
            setDepartments(resDepartments.data);

            setSelectedChiefIds([]);
            setRefreshKey(prev => prev + 1);
        }
    }));

    const handleCheckboxChange = (id) => {
        setSelectedChiefIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    return (
        <div>
            <table className="system-table chief-surgeon-list">
                <thead>
                    <tr>
                        <th>選取</th>
                        <th>編號</th>
                        <th>姓名</th>
                        <th>動作</th>
                    </tr>
                </thead>
                <tbody>
                    <AddRow
                        addChiefSurgeons={addChiefSurgeons}
                        setAddChiefSurgeons={setAddChiefSurgeons}
                        handleAdd={async (chiefSurgeon) => {
                            const trimmedId = chiefSurgeon.id.trim();
                        
                            if (!trimmedId) {
                                alert("❗ 員工編號欄位不得為空");
                                return;
                            }
                        
                            // 重複檢查（可選）
                            const isDuplicate = chiefSurgeons.some(cs => cs.id === trimmedId);
                            if (isDuplicate) {
                                alert(`❗ 員工編號 "${trimmedId}" 已存在，請使用其他編號`);
                                return;
                            }
                        
                            try {
                                await axios.post(`${BASE_URL}/api/system/${departmentId}/chief-surgeon/add`, chiefSurgeon);
                                const response = await axios.get(`${BASE_URL}/api/system/department/${departmentId}/chief-surgeons`);
                                setChiefSurgeons(response.data);
                        
                                const responseDepartments = await axios.get(BASE_URL + "/api/system/departments");
                                setDepartments(responseDepartments.data);
                            } catch (error) {
                                console.error("Error add data: ", error);
                                alert("❌ 新增失敗，請稍後再試");
                            }
                        }}
                        
                        emptyError={emptyError}
                    />
                    {chiefSurgeons.map((cs) => (
                        editingChiefSurgeon?.id === cs.id ? (
                            <EditableRow
                                key={cs.id}
                                chiefSurgeon={cs}
                                handleSave={async (updatedChiefSurgeon) => {
                                    try {
                                        await axios.put(`${BASE_URL}/api/system/chief-surgeon/${updatedChiefSurgeon.id}`, updatedChiefSurgeon);
                                        const response = await axios.get(`${BASE_URL}/api/system/department/${departmentId}/chief-surgeons`);
                                        setChiefSurgeons(response.data);
                                        setEditingChiefSurgeon(null);
                                    } catch (error) {
                                        console.error("updated error：", error);
                                    }
                                }}
                                onCancel={() => setEditingChiefSurgeon(null)}
                            />
                        ) : (
                            <tr key={cs.id} className={selectedChiefIds.includes(cs.id) ? "selected" : "unselected"}>
                                <td onClick={() => handleCheckboxChange(cs.id)} className={`selectable-cell ${selectedChiefIds.includes(cs.id) ? "selected" : ""}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedChiefIds.includes(cs.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => handleCheckboxChange(cs.id)}
                                        className="checkbox"
                                    />
                                </td>
                                <td>{cs.id}</td>
                                <td>{cs.name}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button onClick={() => setEditingChiefSurgeon(cs)} className="action-button edit-button">
                                            <FontAwesomeIcon icon={faPenSquare} className="action-icon" />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const isConfirmed = window.confirm(`請確認是否刪除該主治醫師 ${cs.name} （ID: ${cs.id}）？`);
                                                if (!isConfirmed) return;
                                                try {
                                                    await axios.delete(`${BASE_URL}/api/system/chief-surgeon/delete/${cs.id}`);
                                                    const response = await axios.get(`${BASE_URL}/api/system/department/${departmentId}/chief-surgeons`);
                                                    setChiefSurgeons(response.data);
                                                    const resDepartments = await axios.get(`${BASE_URL}/api/system/departments`);
                                                    setDepartments(resDepartments.data);
                                                } catch (error) {
                                                    console.error("刪除失敗：", error);
                                                }
                                            }}
                                            className="action-button delete-button"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="action-icon" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )
                    ))}
                </tbody>
            </table>
        </div>
    );
});

export default ChiefSurgeonListWrapper;