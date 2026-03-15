/* eslint-disable react/prop-types */
import { faFloppyDisk, faTrash, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function AddRow({ addUsers, setAddUsers, handleAdd, emptyError, setEmptyError }) {

    const handleChange = (uniqueId, event) => {
        const { name, value } = event.target;
        const updated = [...addUsers];
        const user = updated.find((user) => user.uniqueId === uniqueId);
        if (user) {
            user[name] = value;
        }
        setAddUsers(updated);
    };

    const cleanAddRow = (uniqueId) => {
        const updated = addUsers.filter((user) => user.uniqueId !== uniqueId);
        setAddUsers(updated);
        setEmptyError((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors[uniqueId]; // 根據 uniqueId 刪除錯誤
            return newErrors;
        });
    };

    return (
        <>
            {addUsers.map((user) => (
                <tr className="editable-row" key={user.uniqueId}>
                    <td></td>
                    <td>
                        <input
                            className={`${emptyError[user.uniqueId] ? "err-input" : ""}`}
                            type="text"
                            name="username"
                            value={user.username}
                            onChange={(e) => handleChange(user.uniqueId, e)}
                            placeholder="輸入帳號"
                        />
                        {emptyError[user.uniqueId] && <span className="error">{emptyError[user.uniqueId]}</span>}
                    </td>
                    <td>
                        <input
                            type="text"
                            name="name"
                            value={user.name}
                            onChange={(e) => handleChange(user.uniqueId, e)}
                            placeholder="輸入姓名"
                        />
                    </td>
                    <td>
                        <input
                            type="text"
                            name="unit"
                            value={user.unit}
                            onChange={(e) => handleChange(user.uniqueId, e)}
                            placeholder="輸入單位"
                        />
                    </td>
                    <td>
                        <select name="role" value={user.role} onChange={(e) => handleChange(user.uniqueId, e)}>
                            <option value={1}>查看者</option>
                            <option value={2}>編輯者</option>
                            <option value={3}>管理者</option>
                        </select>
                    </td>
                    <td>
                        <input
                            type="email"
                            name="email"
                            value={user.email}
                            onChange={(e) => handleChange(user.uniqueId, e)}
                            placeholder="輸入電子信箱"
                        />
                    </td>
                    <td>
                        <div className="action-buttons">
                            <button className="action-button edit-button" onClick={() => {
                                handleAdd(user, user.uniqueId);
                            }}>
                                <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
                            </button>

                            <button className="action-button delete-button"
                                onClick={() => cleanAddRow(user.uniqueId)}>
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