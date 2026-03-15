/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import "../Mgr.css"
import { BASE_URL } from "../../../../config";
import DepartmentHeaderWrapper from "./header/DepartmentHeaderWrapper";
import DepartmentListWrapper from "./main/DepartmentListWrapper";
import axios from "axios";
import DepartmentFilter from "./DepartmentFilter";

function DepartmentMgrWrapper({ reloadKey, refreshKey, setRefreshKey }) {
    const [departments, setDepartments] = useState([]);
    const [filterDepartment, setFilterDepartment] = useState({ id: "", name: "" });
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [addDepartments, setAddDepartments] = useState([]);
    const [emptyError, setEmptyError] = useState({});
    const [isOpen, setIsOpen] = useState(false);

    //const [idforChiefSurgeons, setIdforChiefSurgeons] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(BASE_URL + "/api/system/departments");
                setDepartments(response.data);
            } catch (error) {
                console.error("Error fetching data: ", error);
            }

        };

        fetchData();
    }, []);

    useEffect(() => {
        console.log("科別資料", departments);
    }, [departments]);

    /*const addHandleSubmit = async () => {
        const hasEmptyField = addDepartments.some(department => !department.id.trim());
        if (hasEmptyField) {
            setEmptyError("*科別編號欄位不得為空");
        } else {
            try {
                await axios.post(BASE_URL + "/api/system/departments/add", addDepartments);
                const response = await axios.get(BASE_URL + "/api/system/departments");
                setDepartments(response.data);
                setEmptyError(null);
                setPageState("list");
            } catch (error) {
                console.log("Error add data: ", error);
            }
        }
    }*/

    const handleAdd = async (department) => {
        const trimmedId = department.id.trim();
        const trimmedName = department.name.trim();

        // 編號檢查
        if (!trimmedId) {
            alert("❗ 科別編號不得為空");
            return;
        }
        if (departments.some(d => d.id === trimmedId)) {
            alert(`❗ 科別編號 "${trimmedId}" 已存在，請使用其他編號`);
            return;
        }

        // 名稱檢查
        if (!trimmedName) {
            alert("❗ 科別名稱不得為空");
            return;
        }
        if (departments.some(d => d.name === trimmedName)) {
            alert(`❗ 科別名稱 "${trimmedName}" 已存在，請使用其他名稱`);
            return;
        }

        try {
            await axios.post(`${BASE_URL}/api/system/department/add`, department);
            const response = await axios.get(BASE_URL + "/api/system/departments");
            setDepartments(response.data);
            cleanAddRow(department.uniqueId);
            alert(`✅ 科別 "${trimmedName}" 新增成功`);
        } catch (error) {
            console.error("新增失敗：", error);
            alert("❌ 新增失敗，請稍後再試");
        }
    };

    const handleAddAll = async (newDepartments) => {
        const newEmptyError = {};
        const existingIds = new Set(departments.map(d => d.id.trim()));
        const existingNames = new Set(departments.map(d => d.name.trim()));
        const seenIds = new Set();
        const seenNames = new Set();

        // newDepartments.forEach(dept => {
        //     const trimmedId = dept.id?.trim();
        //     const trimmedName = dept.name?.trim();
        //     const idKey = `${dept.uniqueId}-id`;
        //     const nameKey = `${dept.uniqueId}-name`;

        //     // 編號檢查
        //     if (!trimmedId) {
        //         newEmptyError[idKey] = "*科別編號欄位不得為空";
        //     } else if (existingIds.has(trimmedId)) {
        //         newEmptyError[idKey] = `科別編號 "${trimmedId}" 已存在`;
        //     } else if (seenIds.has(trimmedId)) {
        //         newEmptyError[idKey] = `科別編號 "${trimmedId}" 重複`;
        //     } else {
        //         seenIds.add(trimmedId);
        //     }

        //     // 名稱檢查
        //     if (!trimmedName) {
        //         newEmptyError[nameKey] = "*科別名稱欄位不得為空";
        //     } else if (existingNames.has(trimmedName)) {
        //         newEmptyError[nameKey] = `科別名稱 "${trimmedName}" 已存在`;
        //     } else if (seenNames.has(trimmedName)) {
        //         newEmptyError[nameKey] = `科別名稱 "${trimmedName}" 重複`;
        //     } else {
        //         seenNames.add(trimmedName);
        //     }
        // });
        for (const dept of newDepartments) {
            const trimmedId = dept.id?.trim();
            const trimmedName = dept.name?.trim();

            if (!trimmedId) {
                alert(`❗ 科別 ID：編號欄位不得為空`);
                return;
            }

            if (existingIds.has(trimmedId)) {
                alert(`❗ 科別編號 "${trimmedId}" 已存在，請使用其他編號`);
                return;
            }

            if (seenIds.has(trimmedId)) {
                alert(`❗ 科別編號 "${trimmedId}" 在本次新增中重複`);
                return;
            }

            seenIds.add(trimmedId);

            if (!trimmedName) {
                alert(`❗ 科別 ID "${trimmedId}"：名稱欄位不得為空`);
                return;
            }

            if (existingNames.has(trimmedName)) {
                alert(`❗ 科別名稱 "${trimmedName}" 已存在，請使用其他名稱`);
                return;
            }

            if (seenNames.has(trimmedName)) {
                alert(`❗ 科別名稱 "${trimmedName}" 在本次新增中重複`);
                return;
            }

            seenNames.add(trimmedName);
        }

        // 若有任何錯誤就不送出，顯示錯誤
        if (Object.keys(newEmptyError).length > 0) {
            setEmptyError(newEmptyError);
            return;
        }

        try {
            await axios.post(`${BASE_URL}/api/system/departments/add`, newDepartments);
            const response = await axios.get(`${BASE_URL}/api/system/departments`);
            setDepartments(response.data);
            setAddDepartments([]);
        } catch (error) {
            console.error("批次新增錯誤：", error);
        }
    };



    const cleanAddRow = (uniqueId) => {
        const updated = addDepartments.filter((department) => department.uniqueId !== uniqueId);
        setAddDepartments(updated);
        setEmptyError((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors[uniqueId]; // 根據 uniqueId 刪除錯誤
            return newErrors;
        });
    };

    // const handleDeleteAll = async (selectedDepartments) => {
    //     if (selectedDepartments.length === 0) {
    //         alert("請選擇要刪除的科別");
    //         return;
    //     }

    //     try {
    //         // 並行檢查所有選擇的科別是否有主治醫師
    //         const results = await Promise.all(
    //             selectedDepartments.map(department =>
    //                 axios.get(`${BASE_URL}/api/system/department/${department.id}/chief-surgeons`)
    //             )
    //         );

    //         // 篩選出有主治醫師的科別
    //         const departmentsWithChiefs = selectedDepartments.filter((department, index) => results[index].data.length > 0);

    //         if (departmentsWithChiefs.length > 0) {
    //             alert(`以下科別仍有主治醫師，無法刪除：${departmentsWithChiefs.map(department => department.name).join(", ")}`);
    //             setSelectedDepartments([]); // 取消勾選
    //             return;
    //         }

    //         const isConfirmed = window.confirm(`請確認是否刪除這 ${selectedDepartments.length} 筆科別？`);
    //         if (!isConfirmed) {
    //             setSelectedDepartments([]); // 取消勾選
    //             return;
    //         }

    //         // 批量刪除科別
    //         await axios.delete(`${BASE_URL}/api/system/departments/delete`, {
    //             data: selectedDepartments.map(department => department.id) // 傳送部門的 id
    //         });

    //         // 重新獲取科別資料
    //         const response = await axios.get(`${BASE_URL}/api/system/departments`);
    //         setDepartments(response.data);
    //         setSelectedDepartments([]);
    //     } catch (error) {
    //         console.error("刪除失敗：", error);
    //     }
    // };
    //* 這個函式會檢查選擇的科別是否有主治醫師，然後刪除科別 */
    // 因為 selectedDepartments 僅包含 ID，無法直接取得科別名稱，因此需從 departments 裡查出完整資料以支援檢查與提示訊息。
    const handleDeleteAll = async (selectedIds) => {
        if (selectedIds.length === 0) {
            alert("請選擇要刪除的科別");
            return;
        }

        try {
            // 根據 ID 從 departments 中找出完整物件（包含 name）
            const selectedDepartmentsData = departments.filter(dept =>
                selectedIds.includes(dept.id)
            );

            // 檢查是否有主治醫師
            const results = await Promise.all(
                selectedDepartmentsData.map(dept =>
                    axios.get(`${BASE_URL}/api/system/department/${dept.id}/chief-surgeons`)
                )
            );

            const departmentsWithChiefs = selectedDepartmentsData.filter((dept, index) => results[index].data.length > 0);

            if (departmentsWithChiefs.length > 0) {
                alert(`以下科別仍有主治醫師，無法刪除：${departmentsWithChiefs.map(dept => dept.name).join(", ")}`);
                setSelectedDepartments([]);
                return;
            }

            const isConfirmed = window.confirm(`請確認是否刪除這 ${selectedDepartmentsData.length} 筆科別？`);
            if (!isConfirmed) {
                setSelectedDepartments([]);
                return;
            }

            await axios.delete(`${BASE_URL}/api/system/departments/delete`, {
                data: selectedDepartmentsData.map(dept => dept.id)
            });

            const response = await axios.get(`${BASE_URL}/api/system/departments`);
            setDepartments(response.data);
            setSelectedDepartments([]);
        } catch (error) {
            console.error("刪除失敗：", error);
        }
    };



    const handleDelete = async (id, name) => {
        const response = await axios.get(`${BASE_URL}/api/system/department/${id}/chief-surgeons`);
        if (response.data.length > 0) {
            alert(`無法刪除科別 "${name}"，因為仍有主治醫師在此科別內。`);
            setSelectedDepartments([]); // 取消勾選
            return;
        }

        const isConfirmed = window.confirm(`請確認是否刪除科別 ${id} ( 名稱: ${name} )？`);
        if (!isConfirmed) return;

        try {
            await axios.delete(`${BASE_URL}/api/system/department/delete/${id}`);

            // 重新獲取最新的科別資料
            const response = await axios.get(BASE_URL + "/api/system/departments");
            setDepartments(response.data);
            setSelectedDepartments([]);
        } catch (error) {
            console.error("刪除失敗：", error);
        }
    };

    // return (
    //     <div key={reloadKey} className="mgr-wrapper relative overflow-hidden">
    //         <DepartmentHeaderWrapper
    //             departments={departments}
    //             setDepartments={setDepartments}
    //             filterDepartment={filterDepartment}
    //             setFilterDepartment={setFilterDepartment}
    //             selectedDepartments={selectedDepartments}
    //             setSelectedDepartments={setSelectedDepartments}
    //             setEmptyError={setEmptyError}
    //             handleDelete={handleDeleteAll}
    //             addDepartments={addDepartments}
    //             setAddDepartments={setAddDepartments}
    //         />
    //         <DepartmentListWrapper
    //             departments={departments}
    //             setDepartments={setDepartments}
    //             filterDepartment={filterDepartment}
    //             selectedDepartments={selectedDepartments}
    //             setSelectedDepartments={setSelectedDepartments}
    //             handleDelete={handleDelete}
    //             addDepartments={addDepartments}
    //             setAddDepartments={setAddDepartments}
    //             handleAdd={handleAdd}
    //             emptyError={emptyError}
    //             setEmptyError={setEmptyError}
    //             refreshKey={refreshKey}
    //             setRefreshKey={setRefreshKey}
    //         />
    //         <DepartmentFilter
    //             departments={departments}
    //             filterDepartment={filterDepartment}
    //             setFilterDepartment={setFilterDepartment}
    //         />
    //     </div>
    // )
    return (
        <div key={reloadKey} className="mgr-wrapper relative overflow-hidden">
            <DepartmentHeaderWrapper
                departments={departments}
                setDepartments={setDepartments}
                filterDepartment={filterDepartment}
                setFilterDepartment={setFilterDepartment}
                selectedDepartments={selectedDepartments}
                setSelectedDepartments={setSelectedDepartments}
                setEmptyError={setEmptyError}
                handleDelete={handleDeleteAll}
                addDepartments={addDepartments}
                setAddDepartments={setAddDepartments}
                handleAddAll={handleAddAll}
            />

            <div className="flex w-full transition-all duration-500 ease-in-out ">
                {/* 篩選器滑入區塊 //shrink-0 transition-all duration-500 ease-in-out*/}
                {isOpen && (
                    <div className=" w-75 shrink-0 transition-all duration-500 ease-in-out p-4">
                        <DepartmentFilter
                            isOpen={isOpen}
                            departments={departments}
                            filterDepartment={filterDepartment}
                            setFilterDepartment={setFilterDepartment}
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

                    <div className="p-4 ">
                        <DepartmentListWrapper
                            departments={departments}
                            setDepartments={setDepartments}
                            filterDepartment={filterDepartment}
                            selectedDepartments={selectedDepartments}
                            setSelectedDepartments={setSelectedDepartments}
                            handleDelete={handleDelete}
                            addDepartments={addDepartments}
                            setAddDepartments={setAddDepartments}
                            handleAdd={handleAdd}
                            emptyError={emptyError}
                            setEmptyError={setEmptyError}
                            refreshKey={refreshKey}
                            setRefreshKey={setRefreshKey}
                            handleAddAll={handleAddAll}
                        />
                    </div>
                </div>
            </div>
        </div>
    );

}

export default DepartmentMgrWrapper;