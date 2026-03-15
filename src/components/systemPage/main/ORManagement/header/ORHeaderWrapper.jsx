import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import ORFilter from "../ORFilter";

/* eslint-disable react/prop-types */
function ORHeaderWrapper({
  operatingRooms, setOperatingRooms,
  filterOperatingRoom, setFilterOperatingRoom,
  selectedOperatingRooms, setSelectedOperatingRooms,
  setEmptyError, handleDelete,
  addOperatingRooms, setAddOperatingRooms,
  handleAddAll
}) {
  const addRow = () => {
    const newOperatingRoom = {
      id: "",
      operatingRoomName: "",
      departmentId: "1",
      roomType: "普通房",
      status: 1,
      uniqueId: Date.now()  // 使用當前時間戳作為唯一 ID
    };
    setAddOperatingRooms([...addOperatingRooms, newOperatingRoom]);
  };

  return (
    <div className="header-wrapper">
      <div className="title">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6 mr-2"
          style={{ width: "1em", height: "1em" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
        <h1>手術房管理</h1>
      </div>
      <div className="header-function">
        {/* <ORFilter
          operatingRooms={operatingRooms}
          filterOperatingRoom={filterOperatingRoom}
          setFilterOperatingRoom={setFilterOperatingRoom}
        /> */}
        <button className="account-button" onClick={addRow} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            style={{ width: "1em", height: "1em" }} // 讓圖示大小隨字體變化
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
            />
          </svg> */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            style={{ width: "1em", height: "1em" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          新增
        </button>

        {addOperatingRooms.length > 0 && (
          <button className="account-button" onClick={() => handleAddAll(addOperatingRooms)} style={{ display: "flex", alignItems: "center", gap: "8px" }} >
            <FontAwesomeIcon icon={faMagnifyingGlass} className="action-icon" />
            一鍵保存
          </button>
        )}

        <button className="account-button mgr-cancel" onClick={() => handleDelete(selectedOperatingRooms)} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            style={{ width: "1em", height: "1em" }} // 讓圖示大小隨字體變化
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
            />
          </svg> */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            style={{ width: "1em", height: "1em" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          刪除
        </button>
      </div>
    </div>
  );
}

export default ORHeaderWrapper;
