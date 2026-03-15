// /* eslint-disable react/prop-types */
// import { useEffect, useState } from "react";
// import "../Mgr.css"
// import AccountListWrapper from "./main/AccountListWrapper";
// import { BASE_URL } from "../../../../config";
// import axios from "axios";
// import AccountHeaderWrapper from "./header/AccountHeaderWrapper";
// import AccountFilter from "./AccountFilter";

// function AccountMgrWrapper({ reloadKey }) {
//     const [users, setUsers] = useState([]);
//     const [username, setUsername] = useState("");
//     const [filterUser, setFilterUser] = useState({
//         username: "", name: "", unit: "", role: null
//     })
//     const [selectedUsers, setSelectedUsers] = useState([]);
//     const [addUsers, setAddUsers] = useState([]);
//     const [emptyError, setEmptyError] = useState({});
//     const [isOpen, setIsOpen] = useState(false);

//     useEffect(() => {
//         const fetchData = async () => {
//             try {
//                 const response = await axios.get(BASE_URL + "/api/system/users");
//                 setUsers(response.data);
//             } catch (error) {
//                 console.error("Error fetching data: ", error);
//             }
//         };

//         fetchData();
//     }, []);

//     useEffect(() => {
//         console.log(users);
//     }, [users])

//     const handleAdd = async (user) => {
//         if (!user.username.trim()) {
//             setEmptyError((prevErrors) => ({
//                 ...prevErrors,
//                 [user.uniqueId]: "*帳號欄位不得為空",
//             }));
//             return;
//         }

//         const isDuplicate = users.some(existingUser => existingUser.username === user.username);
//         if (isDuplicate) {
//             setEmptyError((prevErrors) => ({
//                 ...prevErrors,
//                 [user.uniqueId]: `帳號 "${user.username}" 已存在，請使用其他帳號`,
//             }));
//             return;
//         }

//         try {
//             console.log("User:", user);
//             await axios.post(`${BASE_URL}/api/system/user/add`, user);
//             const response = await axios.get(BASE_URL + "/api/system/users");
//             setUsers(response.data);
//             cleanAddRow(user.uniqueId); // 刪除新增的使用者
//         } catch (error) {
//             console.log("Error add data: ", error);
//         }

//     }

//     const cleanAddRow = (uniqueId) => {
//         const updated = addUsers.filter((user) => user.uniqueId !== uniqueId);
//         setAddUsers(updated);
//         setEmptyError((prevErrors) => {
//             const newErrors = { ...prevErrors };
//             delete newErrors[uniqueId]; // 根據 uniqueId 刪除錯誤
//             return newErrors;
//         });
//     };

//     const handleDeleteAll = async (selectedUsers) => {
//         if (selectedUsers.length === 0) {
//             alert("請選擇要刪除的帳戶");
//             return;
//         }
//         const isConfirmed = window.confirm(`請確認是否刪除這 ${selectedUsers.length} 筆帳號`);
//         if (!isConfirmed) {
//             setSelectedUsers([]); // 取消勾選
//             return;
//         }

//         try {
//             await axios.delete(`${BASE_URL}/api/system/users/delete`, {
//                 data: selectedUsers
//             });
//             const response = await axios.get(BASE_URL + "/api/system/users");
//             setUsers(response.data);
//             setSelectedUsers([]);
//         } catch (error) {
//             console.error("刪除失敗：", error);
//         }
//     };

//     const handleDelete = async (username, name) => {
//         const isConfirmed = window.confirm(`請確認是否刪除帳號 ${username} ( 姓名: ${name} ) `);
//         if (!isConfirmed) return;

//         try {
//             await axios.delete(`${BASE_URL}/api/system/user/delete/${username}`);
//             const response = await axios.get(BASE_URL + "/api/system/users");
//             setUsers(response.data);
//             setSelectedUsers([]);
//         } catch (error) {
//             console.error("刪除失敗：", error);
//         }
//     };

//     // return (
//     //     <div key={reloadKey} className="mgr-wrapper">
//     //         {/* <AccountHeaderWrapper
//     //             selectedUsers={selectedUsers}
//     //             handleDelete={handleDeleteAll}
//     //             addUsers={addUsers}
//     //             setAddUsers={setAddUsers}
//     //         />
//     //         <AccountListWrapper
//     //             users={users}
//     //             setUsers={setUsers}
//     //             username={username}
//     //             filterUser={filterUser}
//     //             selectedUsers={selectedUsers}
//     //             setSelectedUsers={setSelectedUsers}
//     //             handleDelete={handleDelete}
//     //             addUsers={addUsers}
//     //             setAddUsers={setAddUsers}
//     //             handleAdd={handleAdd}
//     //             emptyError={emptyError}
//     //             setEmptyError={setEmptyError}
//     //         />
//     //         <AccountFilter
//     //             users={users}
//     //             filterUser={filterUser}
//     //             setFilterUser={setFilterUser}
//     //         /> */}
//     //         <AccountHeaderWrapper
//     //             selectedUsers={selectedUsers}
//     //             handleDelete={handleDeleteAll}
//     //             addUsers={addUsers}
//     //             setAddUsers={setAddUsers}
//     //         />

//     //         <div className="flex w-full transition-all duration-300">
//     //             {/* 左邊：篩選器 */}
//     //             {isOpen && (
//     //                 <div className="w-full md:w-1/4 transition-all duration-300">
//     //                     <AccountFilter
//     //                         users={users}
//     //                         filterUser={filterUser}
//     //                         setFilterUser={setFilterUser}
//     //                         onClose={() => setIsOpen(false)} // 👈 傳入關閉用的 callback
//     //                     />
//     //                 </div>
//     //             )}

//     //             {/* 右邊：主畫面（會被擠壓） */}
//     //             <div className={`${isOpen ? "w-full md:w-3/4" : "w-full"} transition-all duration-300`}>
//     //                 <div className="p-4">
//     //                     <button
//     //                         onClick={() => setIsOpen(!isOpen)}
//     //                         className="bg-blue-500 text-white px-4 py-2 rounded-md mb-4"
//     //                     >
//     //                         篩選
//     //                     </button>

//     //                     <AccountListWrapper
//     //                         users={users}
//     //                         setUsers={setUsers}
//     //                         username={username}
//     //                         filterUser={filterUser}
//     //                         selectedUsers={selectedUsers}
//     //                         setSelectedUsers={setSelectedUsers}
//     //                         handleDelete={handleDelete}
//     //                         addUsers={addUsers}
//     //                         setAddUsers={setAddUsers}
//     //                         handleAdd={handleAdd}
//     //                         emptyError={emptyError}
//     //                         setEmptyError={setEmptyError}
//     //                     />
//     //                 </div>
//     //             </div>
//     //         </div>

//     //     </div>
//     // );
//     return (
//         <div key={reloadKey} className="mgr-wrapper">

//             <div key={reloadKey} className="mgr-wrapper relative overflow-hidden">
//                 <AccountHeaderWrapper
//                     selectedUsers={selectedUsers}
//                     handleDelete={handleDeleteAll}
//                     addUsers={addUsers}
//                     setAddUsers={setAddUsers}
//                 />

//                 <div className="relative flex w-full">

//                     {/* 篩選器區塊 - 滑入滑出 */}
//                     <div
//                         className={`absolute top-0 left-0 h-full z-30 w-72 transition-transform duration-500 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
//                             }`}
//                     >
//                         <AccountFilter
//                             users={users}
//                             filterUser={filterUser}
//                             setFilterUser={setFilterUser}
//                             onClose={() => setIsOpen(false)}
//                         />
//                     </div>

//                     {/* 右側主畫面（會被推擠） */}
//                     <div
//                         className={`relative transition-transform duration-500 ease-in-out w-full ${isOpen ? "md:translate-x-72" : "translate-x-0"
//                             }`}
//                     >
//                         {/* ✅ 左上角篩選按鈕浮動在內容旁 */}
//                         {!isOpen && (
//                             <button
//                                 onClick={() => setIsOpen(true)}
//                                 className="absolute top-0 left-0 bg-blue-500 text-white px-3 py-2 rounded-r-md shadow z-20"
//                             >
//                                 篩
//                                 選
//                             </button>
//                         )}

//                         <div className="p-4 pl-16"> {/* 👈 加 padding-left 避免按鈕壓到表格 */}
//                             <AccountListWrapper
//                                 users={users}
//                                 setUsers={setUsers}
//                                 username={username}
//                                 filterUser={filterUser}
//                                 selectedUsers={selectedUsers}
//                                 setSelectedUsers={setSelectedUsers}
//                                 handleDelete={handleDelete}
//                                 addUsers={addUsers}
//                                 setAddUsers={setAddUsers}
//                                 handleAdd={handleAdd}
//                                 emptyError={emptyError}
//                                 setEmptyError={setEmptyError}
//                             />
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );

// }

// export default AccountMgrWrapper;
/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import "../Mgr.css"
import AccountListWrapper from "./main/AccountListWrapper";
import { BASE_URL } from "../../../../config";
import axios from "axios";
import AccountHeaderWrapper from "./header/AccountHeaderWrapper";
import AccountFilter from "./AccountFilter";

function AccountMgrWrapper({ reloadKey }) {
    const [users, setUsers] = useState([]);
    const [filterUser, setFilterUser] = useState({
        username: "", name: "", unit: "", role: null
    });
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [addUsers, setAddUsers] = useState([]);
    const [emptyError, setEmptyError] = useState({});
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(BASE_URL + "/api/system/users");
                setUsers(response.data);
            } catch (error) {
                console.error("Error fetching data: ", error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        console.log(users);
    }, [users]);

    const handleAdd = async (user) => {
        const trimmedUsername = user.username.trim();

        if (!trimmedUsername) {
            alert("❗ 帳號編號不得為空");
            return;
        }

        const isDuplicate = users.some(existingUser => existingUser.username === trimmedUsername);
        if (isDuplicate) {
            alert(`❗ 帳號 "${trimmedUsername}" 已存在，請使用其他帳號`);
            return;
        }

        try {
            await axios.post(`${BASE_URL}/api/system/user/add`, user);
            const response = await axios.get(BASE_URL + "/api/system/users");
            setUsers(response.data);
            cleanAddRow(user.uniqueId);
            alert(`✅ 帳號 "${trimmedUsername}" 新增成功`);
        } catch (error) {
            console.error("Error add data: ", error);
            alert("❌ 新增失敗，請稍後再試");
        }
    };


    const handleAddAll = async (newUsers) => {
        const existingUsernames = new Set(users.map(u => u.username.trim()));
        const seenUsernames = new Set();

        for (const user of newUsers) {
            const trimmedUsername = user.username?.trim();

            if (!trimmedUsername) {
                alert(`❗ 使用者 ID ：帳號欄位不得為空`);
                return;
            }

            if (existingUsernames.has(trimmedUsername)) {
                alert(`❗ 帳號 "${trimmedUsername}" 已存在，請使用其他帳號`);
                return;
            }

            if (seenUsernames.has(trimmedUsername)) {
                alert(`❗ 帳號 "${trimmedUsername}" 在本次新增中重複`);
                return;
            }

            seenUsernames.add(trimmedUsername);
        }

        try {
            await axios.post(`${BASE_URL}/api/system/users/add`, newUsers);
            const response = await axios.get(`${BASE_URL}/api/system/users`);
            setUsers(response.data);
            setAddUsers([]);
            alert("✅ 批次新增成功！");
        } catch (error) {
            console.error("Error add data: ", error);
            alert("❌ 批次新增失敗，請稍後再試");
        }
    };


    const cleanAddRow = (uniqueId) => {
        const updated = addUsers.filter((user) => user.uniqueId !== uniqueId);
        setAddUsers(updated);
        setEmptyError((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors[uniqueId];
            return newErrors;
        });
    };

    const handleDeleteAll = async (selectedUsers) => {
        if (selectedUsers.length === 0) {
            alert("請選擇要刪除的帳戶");
            return;
        }
        const isConfirmed = window.confirm(`請確認是否刪除這 ${selectedUsers.length} 筆帳號`);
        if (!isConfirmed) {
            setSelectedUsers([]);
            return;
        }

        try {
            await axios.delete(`${BASE_URL}/api/system/users/delete`, {
                data: selectedUsers
            });
            const response = await axios.get(BASE_URL + "/api/system/users");
            setUsers(response.data);
            setSelectedUsers([]);
        } catch (error) {
            console.error("刪除失敗：", error);
        }
    };

    const handleDelete = async (username, name) => {
        const isConfirmed = window.confirm(`請確認是否刪除帳號 ${username} ( 姓名: ${name} ) `);
        if (!isConfirmed) return;

        try {
            await axios.delete(`${BASE_URL}/api/system/user/delete/${username}`);
            const response = await axios.get(BASE_URL + "/api/system/users");
            setUsers(response.data);
            setSelectedUsers([]);
        } catch (error) {
            console.error("刪除失敗：", error);
        }
    };

    return (
        <div key={reloadKey} className="mgr-wrapper relative overflow-hidden">
            <AccountHeaderWrapper
                selectedUsers={selectedUsers}
                handleDelete={handleDeleteAll}
                addUsers={addUsers}
                setAddUsers={setAddUsers}
                handleAddAll={handleAddAll}
            />

            <div className="flex w-full transition-all duration-500 ease-in-out">
                {/* 篩選器滑入區塊 */}
                {isOpen && (
                    <div className="w-75 shrink-0 transition-all duration-500 ease-in-out p-4">
                        <AccountFilter
                            isOpen={isOpen}
                            users={users}
                            filterUser={filterUser}
                            setFilterUser={setFilterUser}
                            onClose={() => setIsOpen(false)}
                        />
                    </div>
                )}

                {/* 表格內容會自動收縮 */}
                <div className={`flex-1 transition-all duration-500 ease-in-out relative`}>
                    {!isOpen && (
                        <button
                            onClick={() => setIsOpen(true)}
                            className="absolute top-4 left-4 z-20 bg-blue-500 text-white px-2 py-4 rounded shadow size-15"
                            style={{ width: "70px", fontSize: "20px" }}
                        >
                            篩選
                        </button>
                    )}

                    <div className="p-4">
                        <AccountListWrapper
                            users={users}
                            setUsers={setUsers}
                            filterUser={filterUser}
                            selectedUsers={selectedUsers}
                            setSelectedUsers={setSelectedUsers}
                            handleDelete={handleDelete}
                            addUsers={addUsers}
                            setAddUsers={setAddUsers}
                            handleAdd={handleAdd}
                            emptyError={emptyError}
                            setEmptyError={setEmptyError}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}

export default AccountMgrWrapper;
