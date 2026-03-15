/* eslint-disable react/prop-types */
// import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { useState } from "react";
import React, { useState } from "react"; // ✅ 只需一次導入 React 和 useState
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faTimes } from "@fortawesome/free-solid-svg-icons"; // ✅ 整合圖示導入

function EditableRow({ key, department, handleSave, setIsEditing }) {
  const [editedDepartment, setEditedDepartment] = useState({
    id: department.id,
    name: department.name,
  });

  const handleChange = (e) => {
    setEditedDepartment({
      ...editedDepartment,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <tr key={key} className="editable-row">
      <td></td>
      {/* <td>
        <input
          type="text"
          name="id"
          value={editedDepartment.id}
          onChange={handleChange}
        />
      </td> */}
      <td>{editedDepartment.id}</td>

      <td>
        <input
          type="text"
          name="name"
          value={editedDepartment.name}
          onChange={handleChange}
        />
      </td>
      <td>
        {department.chiefSurgeonsCount}
      </td>
      {/* <td><FontAwesomeIcon icon={faFloppyDisk} className="edit-button" onClick={() => handleSave(editedDepartment)} /></td> */}
      <td className="action-buttons">
        {/* 儲存按鈕 */}
        <button
          className="action-button edit-button"
          onClick={() => {
            handleSave(editedDepartment.id,editedDepartment); // 儲存當前的編輯內容
            setIsEditing(false); // 退出編輯模式
          }}
        >
          <FontAwesomeIcon icon={faFloppyDisk} className="action-icon" />
        </button>

        {/* 取消按鈕 */}
        <button
          className="action-button delete-button"
          onClick={() => {
            setEditedDepartment({ ...department }); // 確保還原為原始資料
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
