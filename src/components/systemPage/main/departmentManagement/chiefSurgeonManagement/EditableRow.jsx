/* eslint-disable react/prop-types */
import { faFloppyDisk, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import "../../Mgr.css"; // 引入 CSS 檔案

function EditableRow({ chiefSurgeon, handleSave, onCancel }) {
    const [editedChiefSurgeon, setEditedChiefSurgeon] = useState({
        id: chiefSurgeon.id,      // 🔒 固定，不允許修改
        name: chiefSurgeon.name,
    });

    const handleChange = (e) => {
        // 🔒 僅允許修改 name
        if (e.target.name !== "name") return;

        setEditedChiefSurgeon({
            ...editedChiefSurgeon,
            name: e.target.value,
        });
    };

    return (
        <tr className="editable-row">
            <td></td>

            {/* 🔒 醫生編號：唯讀顯示 */}
            <td>
                <span className="readonly-id">
                    {editedChiefSurgeon.id}
                </span>
            </td>

            {/* ✅ 只允許編輯姓名 */}
            <td>
                <input
                    type="text"
                    name="name"
                    value={editedChiefSurgeon.name}
                    onChange={handleChange}
                />
            </td>

            <td className="action-buttons">
                {/* 儲存 */}
                <button
                    className="action-button edit-button"
                    onClick={() => handleSave(editedChiefSurgeon)}
                >
                    <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
                </button>

                {/* 取消 */}
                <button
                    className="action-button delete-button"
                    onClick={() => {
                        setEditedChiefSurgeon({
                            id: chiefSurgeon.id,
                            name: chiefSurgeon.name,
                        });
                        onCancel();
                    }}
                >
                    <FontAwesomeIcon icon={faTimes} className="action-icon" />
                </button>
            </td>
        </tr>
    );
}

export default EditableRow;
