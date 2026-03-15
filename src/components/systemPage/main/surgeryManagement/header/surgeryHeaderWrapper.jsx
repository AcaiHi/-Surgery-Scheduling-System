/* eslint-disable react/prop-types */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import SurgeryFilter from "../SurgeryFilter";  // 引入新建立的篩選器元件
import { useEffect, useRef, useState } from "react";
import axios from 'axios';
import { BASE_URL } from "../../../../../config";

function SurgeryHeaderWrapper({ user }) {

  const fileInputRef = useRef(null);

  const handleButtonClick = () => {
    fileInputRef.current.click(); // 模擬點擊隱藏的input
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    if (!file.name.endsWith('.csv')) {
      alert('請上傳 CSV 檔案');
      return;
    }
  
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', user.username);
  
    try {
      const response = await axios.post(`${BASE_URL}/api/system/surgeries/upload-time-table`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('上傳成功:', response.data);
      alert(response.data);
    } catch (error) {
      console.error('上傳失敗:', error);
      if (error.response && error.response.data) {
        if (error.response.data.failedApplications) {
          alert(`部分手術無法新增:\n${error.response.data.failedApplications.join('\n')}`);
        } else {
          alert('上傳失敗: ' + JSON.stringify(error.response.data));
        }
      } else {
        alert('上傳失敗');
      }
    }
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
            d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5"
          />
        </svg>
        <h1>手術管理</h1>
      </div>
      <div className="header-function">
        {/* <SurgeryFilter
          operatingRooms={operatingRooms}
          filterOperatingRoom={filterOperatingRoom}
          setFilterOperatingRoom={setFilterOperatingRoom}
        /> */}

        <button className="account-button" onClick={handleButtonClick} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          新增手術csv檔
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".csv"
        />
      </div>
    </div>
  );
}

export default SurgeryHeaderWrapper;
