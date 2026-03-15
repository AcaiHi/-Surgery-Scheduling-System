import { useEffect, useState } from "react";
import SurgeryHeaderWrapper from "./header/surgeryHeaderWrapper.jsx";
import SurgeryListWrapper from "./main/SurgeryListWrapper";
import axios from "axios";
import { BASE_URL } from "../../../../config";
import SurgeryFilter from "./SurgeryFilter";


function SurgeryMgrWrapper({ user, reloadKey, setReloadKey, nowUsername }) {
  const [operatingRooms, setOperatingRooms] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // 新增篩選狀態，請依需求預設所有欄位（此處包含：id, name, department, roomType）
  const [filterOperatingRoom, setFilterOperatingRoom] = useState({
    id: "",
    operatingRoomName: "",
    department: "",
    roomType: "",
    status: ""
  });
  const [addOperatingRooms, setAddOperatingRooms] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(BASE_URL + "/api/system/operating-rooms");
        // 過濾掉status為0（關閉）的手術房
        const openOperatingRooms = response.data.filter(room => room.status !== 0);
        console.log('手術管理頁面: 顯示狀態為開啟的手術房，過濾了關閉的手術房');
        const sortedRooms = openOperatingRooms.sort((a, b) =>
          a.id.toString().localeCompare(b.id.toString(), undefined, { numeric: true, sensitivity: 'base' })
        );
        setOperatingRooms(openOperatingRooms);
      } catch (error) {
        console.error("Error fetching data: ", error);
      }
    };

    fetchData();
  }, [reloadKey]);

  // 您可自行定義 handleDelete
  const handleDelete = () => {
    // 範例：實作批次刪除
  };

  // return (
  //   <div key={reloadKey} className="mgr-wrapper">
  //     <SurgeryHeaderWrapper
  //       operatingRooms={operatingRooms}
  //       filterOperatingRoom={filterOperatingRoom}
  //       setFilterOperatingRoom={setFilterOperatingRoom}
  //       addOperatingRooms={addOperatingRooms}
  //       setAddOperatingRooms={setAddOperatingRooms}
  //       handleDelete={handleDelete}
  //     />
  //     <SurgerListWrapper
  //       operatingRooms={operatingRooms}
  //       filterOperatingRoom={filterOperatingRoom}
  //       setReloadKey={setReloadKey}
  //       nowUsername={nowUsername}
  //     />
  //   </div>
  // );
  return (
    <div key={reloadKey} className="mgr-wrapper relative overflow-hidden">
      <SurgeryHeaderWrapper
        user={user}
        operatingRooms={operatingRooms}
        filterOperatingRoom={filterOperatingRoom}
        setFilterOperatingRoom={setFilterOperatingRoom}
        addOperatingRooms={addOperatingRooms}
        setAddOperatingRooms={setAddOperatingRooms}
        handleDelete={handleDelete}
      />

      <div className="flex w-full transition-all duration-500 ease-in-out">
        {/* 篩選器滑入區塊 */}
        {isOpen && (
          <div className="w-75 shrink-0 transition-all duration-500 ease-in-out p-4">
            <SurgeryFilter
              isOpen={isOpen}
              operatingRooms={operatingRooms}
              filterOperatingRoom={filterOperatingRoom}
              setFilterOperatingRoom={setFilterOperatingRoom}
              onClose={() => setIsOpen(false)}
            />
          </div>
        )}

        {/* 主內容區塊 */}
        <div className="flex-1 transition-all duration-500 ease-in-out relative">
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
            <SurgeryListWrapper
              user={user}
              operatingRooms={operatingRooms}
              filterOperatingRoom={filterOperatingRoom}
              setReloadKey={() => { }}
              nowUsername={nowUsername}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SurgeryMgrWrapper;
