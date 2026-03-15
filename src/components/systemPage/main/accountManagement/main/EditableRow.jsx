/* eslint-disable react/prop-types */
// import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { useState } from "react";
// import React, { useState } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faPen, faFloppyDisk, faTimes } from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react"; // ✅ 只需一次導入 React 和 useState
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faTimes } from "@fortawesome/free-solid-svg-icons"; // ✅ 整合圖示導入
import "../../Mgr.css"; // ✅ 導入 CSS 檔案

function EditableRow({ key, user, handleSave, setIsEditing }) {
    const [editedUser, setEditedUser] = useState({
        username: user.username,
        name: user.name,
        unit: user.unit,
        role: user.role,
        email: user.email,
    });

    const handleChange = (e) => {
        setEditedUser({
            ...editedUser,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <tr key={key} className="editable-row">
            <td></td>
            <td>{editedUser.username}</td>
            <td><input type="text" name="name" value={editedUser.name} onChange={handleChange} /></td>
            <td><input type="text" name="unit" value={editedUser.unit} onChange={handleChange} /></td>
            <td>
                <select name="role" value={editedUser.role} onChange={handleChange}>
                    <option value={1}>查看者</option>
                    <option value={2}>編輯者</option>
                    <option value={3}>管理者</option>
                </select>
            </td>
            <td><input type="text" name="email" value={editedUser.email} onChange={handleChange} /></td>
            {/* <td>
                <FontAwesomeIcon className="edit-button" icon={faFloppyDisk}
                    onClick={() => handleSave(editedUser)} />
            </td> */}
            <td className="action-buttons">
                {/* 儲存按鈕 */}
                <button
                    className="action-button edit-button"
                    onClick={() => {
                        handleSave(editedUser); // 儲存當前的編輯內容
                        setIsEditing(false); // 退出編輯模式
                    }}
                >
                    <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
                </button>

                {/* 取消按鈕 */}
                <button
                    className="action-button delete-button"
                    onClick={() => {
                        setEditedUser({ ...user }); // 確保還原為原始資料
                        setIsEditing(false); // 退出編輯模式
                    }}
                >
                    <FontAwesomeIcon icon={faTimes} className="action-icon" />
                </button>
            </td>

        </tr>
    );
}

export default EditableRow;