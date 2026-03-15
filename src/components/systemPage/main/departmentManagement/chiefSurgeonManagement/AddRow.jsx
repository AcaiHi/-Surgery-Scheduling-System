/* eslint-disable react/prop-types */
import { faFloppyDisk, faTrash, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function AddRow({
    addChiefSurgeons, setAddChiefSurgeons,
    handleAdd, emptyError, setEmptyError }) {

    const handleChange = (index, event) => {
        const { name, value } = event.target;
        const updated = [...addChiefSurgeons];
        updated[index][name] = value;
        setAddChiefSurgeons(updated);
    };

    const handleDelete = (index) => {
        const updated = addChiefSurgeons.filter((chiefSurgeon, idx) => idx !== index);
        setAddChiefSurgeons(updated);
    };

    return (
        <>
            {addChiefSurgeons.map((chiefSurgeon, index) => (
                <tr className="editable-row" key={index}>
                    <td></td>
                    <td>
                        <input
                            type="text"
                            name="id"
                            value={chiefSurgeon.id}
                            onChange={(e) => handleChange(index, e)}
                            placeholder="請輸入編號"
                        />
                        <div className="error">{emptyError}</div>
                    </td>
                    <td>
                        <input
                            type="text"
                            name="name"
                            value={chiefSurgeon.name}
                            onChange={(e) => handleChange(index, e)}
                            placeholder="請輸入姓名"
                        />
                    </td>
                    <td>
                        {/* <div className="action-buttons">
                            <FontAwesomeIcon className="edit-button" icon={faFloppyDisk} onClick={() => {
                                handleAdd(chiefSurgeon);
                                if (chiefSurgeon.id.trim()) { handleDelete(index); }
                            }} />
                            <FontAwesomeIcon className="delete-button" icon={faTrash} onClick={() => handleDelete(index)} />
                        </div> */}
                        <div className="action-buttons">
                            {/* 儲存按鈕 */}
                            <button className="action-button edit-button" onClick={() => {
                                handleAdd(chiefSurgeon);
                                if (chiefSurgeon.id.trim()) { handleDelete(index); }
                            }}>
                                <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
                            </button>

                            {/* 刪除按鈕 */}
                            <button className="action-button delete-button" onClick={() => handleDelete(index)}>
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