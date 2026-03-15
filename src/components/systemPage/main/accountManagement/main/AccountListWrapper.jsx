/* eslint-disable react/prop-types */
import axios from "axios";
import { useEffect, useState } from "react";
import { BASE_URL } from "../../../../../config";
import EditableRow from "./EditableRow";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenSquare, faTrash } from "@fortawesome/free-solid-svg-icons";
import AddRow from "./AddRow";
import "../../Mgr.css";
import { FaUserAlt, FaUserCog, FaUserEdit } from "react-icons/fa";

function AccountListWrapper({
    users,
    setUsers,
    filterUser,
    selectedUsers,
    setSelectedUsers,
    handleDelete,
    addUsers,
    setAddUsers,
    handleAdd,
    emptyError,
    setEmptyError
}) {
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [editingUser, setEditingUser] = useState(null);
    const [selectAll, setSelectAll] = useState(false);

    const roleDisplayMap = {
        1: "查看者",
        2: "編輯者",
        3: "管理者",
    };

    // ✅ 不再 early return，確保 users 變化一定會反映
    useEffect(() => {
        const result = users.filter(user => {
            const username = filterUser.username?.toLowerCase() ?? "";
            const name = filterUser.name?.toLowerCase() ?? "";
            const unit = filterUser.unit?.toLowerCase() ?? "";
            const role = filterUser.role;

            const matchesUsername = username
                ? user.username?.toLowerCase().includes(username)
                : true;
            const matchesName = name
                ? user.name?.toLowerCase().includes(name)
                : true;
            const matchesUnit = unit
                ? user.unit?.toLowerCase().includes(unit)
                : true;
            const matchesRole = role
                ? Number(user.role) === Number(role)
                : true;

            return matchesUsername && matchesName && matchesUnit && matchesRole;
        });

        setFilteredUsers([...result].sort((a, b) => b.role - a.role));
    }, [users, filterUser]);

    const handleEdit = (user) => {
        setEditingUser(user);
    };

    const handleSave = async (updatedUser) => {
        const ok = window.confirm(`確定要儲存 ${updatedUser.username} 的變更嗎？`);
        if (!ok) return;

        try {
            await axios.put(
                `${BASE_URL}/api/system/user/${updatedUser.username}`,
                updatedUser
            );

            setUsers(prev =>
                prev.map(u =>
                    u.username === updatedUser.username ? updatedUser : u
                )
            );
            setEditingUser(null);
        } catch (err) {
            console.error("update error:", err);
        }
    };

    const handleCheckboxChange = (username) => {
        setSelectedUsers(prev =>
            prev.includes(username)
                ? prev.filter(u => u !== username)
                : [...prev, username]
        );
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(u => u.username));
        }
        setSelectAll(!selectAll);
    };

    return (
        <div className="mgr-list">
            <table className="system-table table-accounts">
                <thead>
                    <tr>
                        <th className="selectable-cell" onClick={handleSelectAll}>
                            <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={handleSelectAll}
                                className="checkbox"
                            />
                        </th>
                        <th>帳號</th>
                        <th>姓名</th>
                        <th>單位</th>
                        <th>權限</th>
                        <th>電子信箱</th>
                        <th>動作</th>
                    </tr>
                </thead>

                <tbody>
                    <AddRow
                        addUsers={addUsers}
                        setAddUsers={setAddUsers}
                        handleAdd={handleAdd}
                        emptyError={emptyError}
                        setEmptyError={setEmptyError}
                    />

                    {filteredUsers.length > 0 ? (
                        filteredUsers.map(user =>
                            editingUser?.username === user.username ? (
                                <EditableRow
                                    key={user.username}
                                    user={user}
                                    handleSave={handleSave}
                                    setIsEditing={setEditingUser}
                                />
                            ) : (
                                <tr
                                    key={user.username}
                                    className={selectedUsers.includes(user.username) ? "selected" : ""}
                                >
                                    <td
                                        className="selectable-cell"
                                        onClick={() => handleCheckboxChange(user.username)}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.username)}
                                            onClick={e => e.stopPropagation()}
                                            onChange={() => handleCheckboxChange(user.username)}
                                            className="checkbox"
                                        />
                                    </td>

                                    <td>{user.username}</td>
                                    <td>{user.name}</td>
                                    <td>{user.unit}</td>

                                    <td>
                                        <div className="inline-flex items-center gap-2">
                                            {user.role == 1 && <FaUserAlt fill="#22c55e" size={22} />}
                                            {user.role == 2 && <FaUserEdit fill="#3b82f6" size={22} />}
                                            {user.role == 3 && <FaUserCog fill="#ef4444" size={22} />}
                                            <span>{roleDisplayMap[user.role]}</span>
                                        </div>
                                    </td>

                                    <td>{user.email}</td>

                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="action-button edit-button"
                                            >
                                                <FontAwesomeIcon icon={faPenSquare} />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(user.username, user.name)}
                                                className="action-button delete-button"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        )
                    ) : (
                        <tr>
                            <td colSpan="7">無符合條件的資料</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default AccountListWrapper;
