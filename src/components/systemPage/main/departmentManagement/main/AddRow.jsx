/* eslint-disable react/prop-types */
import { faFloppyDisk, faTrash, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function AddRow({ addDepartments, setAddDepartments, handleAdd, emptyError, setEmptyError }) {
    const handleChange = (uniqueId, event) => {
        const { name, value } = event.target;
        const updated = [...addDepartments];
        const department = updated.find(dep => dep.uniqueId === uniqueId);
        if (department) {
            department[name] = value;
        }
        setAddDepartments(updated);
    };


    const cleanAddRow = (uniqueId) => {
        const updated = addDepartments.filter(department => department.uniqueId !== uniqueId);
        setAddDepartments(updated);
        setEmptyError((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors[uniqueId];  // 根據 uniqueId 刪除錯誤
            return newErrors;
        });
    };

    return (
        <>
            {addDepartments.map((department) => (
                <tr className="editable-row" key={department.uniqueId}>
                    <td></td>
                    <td>
                        <input
                            className={`${emptyError[`${department.uniqueId}-id`] ? "err-input" : ""}`}
                            type="text"
                            name="id"
                            value={department.id}
                            onChange={(e) => handleChange(department.uniqueId, e)}
                            placeholder="輸入科別編號"
                        />
                        {emptyError[`${department.uniqueId}-id`] && <span className="error">{emptyError[`${department.uniqueId}-id`]}</span>}
                    </td>
                    <td>
                        <input
                            className={`${emptyError[`${department.uniqueId}-name`] ? "err-input" : ""}`}
                            type="text"
                            name="name"
                            value={department.name}
                            onChange={(e) => handleChange(department.uniqueId, e)}
                            placeholder="輸入科別名稱"
                        />
                        {emptyError[`${department.uniqueId}-name`] && <span className="error">{emptyError[`${department.uniqueId}-name`]}</span>}
                    </td>
                    <td>0</td>
                    <td>
                        {/* <div className="action-buttons">
                            <FontAwesomeIcon className="edit-button" icon={faFloppyDisk} onClick={() => {
                                handleAdd(department);
                                if (department.id.trim()) { handleDelete(index); }
                            }} />
                            <FontAwesomeIcon className="delete-button" icon={faTrash} onClick={() => handleDelete(index)} />
                        </div> */}
                        <div className="action-buttons">
                            {/* 儲存按鈕 */}
                            <button className="action-button edit-button" onClick={() => {
                                handleAdd(department, department.uniqueId);
                            }}>
                                <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
                            </button>

                            {/* 刪除按鈕 */}
                            <button className="action-button delete-button"
                                onClick={() => cleanAddRow(department.uniqueId)}>
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