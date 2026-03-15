import UserList from "./UserList";
import "../SystemPage.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/* eslint-disable react/prop-types */

function HeaderWrapper({ fullTogglePage, user, toggleMainPage, setReloadKey }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    toggleMainPage("mainPage");
  }, [toggleMainPage]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getClockHands = () => {
    const hours = currentTime.getHours() % 12;
    const minutes = currentTime.getMinutes();
    const hourAngle = hours * 30 + minutes * 0.5;
    const minuteAngle = minutes * 6;
    const hourHandLength = 35;
    const minuteHandLength = 45;
    return {
      hourHand: {
        x2: 100 + hourHandLength * Math.sin((hourAngle * Math.PI) / 180),
        y2: 100 - hourHandLength * Math.cos((hourAngle * Math.PI) / 180),
      },
      minuteHand: {
        x2: 100 + minuteHandLength * Math.sin((minuteAngle * Math.PI) / 180),
        y2: 100 - minuteHandLength * Math.cos((minuteAngle * Math.PI) / 180),
      },
    };
  };

  const getMedicalCross = () => {
    const minutes = currentTime.getMinutes();
    const minuteAngle = minutes * 6;
    const centerDistance = 30;
    const centerX = 100 + centerDistance * Math.sin((minuteAngle * Math.PI) / 180);
    const centerY = 100 - centerDistance * Math.cos((minuteAngle * Math.PI) / 180);
    return {
      horizontal: {
        x: centerX - 15,
        y: centerY - 4,
      },
      vertical: {
        x: centerX - 4,
        y: centerY - 15,
      },
    };
  };

  const { hourHand, minuteHand } = getClockHands();
  const cross = getMedicalCross();

  return (
    <div className="w-full bg-gradient-to-r from-blue-400 to-blue-400 shadow-md z-[1000] relative">
      <div className="w-full max-w-screen-3xl mx-auto px-4">
        <div className="flex items-center mr-auto h-16 z-">
          {/* Logo and Hospital Name */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/system/main")}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-full h-full">
                    <circle cx="100" cy="100" r="90" fill="#0d6efd" />
                    <circle cx="100" cy="100" r="75" fill="#FFFFFF" />
                    <line x1="100" y1="40" x2="100" y2="50" stroke="#0d6efd" strokeWidth="5" />
                    <line x1="100" y1="150" x2="100" y2="160" stroke="#0d6efd" strokeWidth="5" />
                    <line x1="40" y1="100" x2="50" y2="100" stroke="#0d6efd" strokeWidth="5" />
                    <line x1="150" y1="100" x2="160" y2="100" stroke="#0d6efd" strokeWidth="5" />
                    <line x1="100" y1="100" x2={hourHand.x2} y2={hourHand.y2} stroke="#0d6efd" strokeWidth="6" strokeLinecap="round" />
                    <line x1="100" y1="100" x2={minuteHand.x2} y2={minuteHand.y2} stroke="#0d6efd" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="100" cy="100" r="8" fill="#0d6efd" />
                    <rect
                      x={cross.horizontal.x}
                      y={cross.horizontal.y}
                      width="30"
                      height="8"
                      rx="4"
                      fill="#0d6efd"
                      transform={`rotate(${currentTime.getMinutes() * 6}, ${cross.horizontal.x + 15}, ${cross.horizontal.y + 4})`}
                    />
                    <rect
                      x={cross.vertical.x}
                      y={cross.vertical.y}
                      width="8"
                      height="30"
                      rx="4"
                      fill="#0d6efd"
                      transform={`rotate(${currentTime.getMinutes() * 6}, ${cross.vertical.x + 4}, ${cross.vertical.y + 15})`}
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-2">
                <span className="text-white text-3xl font-semibold drop-shadow-[0_0_3px_#2563eb]">
                  智能手術排程管理系統
                </span>
              </div>
            </div>
          </div>
          {/* Navigation */}
          <div className="flex items-center space-x-4 ml-auto">
            <button
              className="flex items-center cursor-pointer font-bold px-4 py-2 text-white text-2xl bg-blue-400 drop-shadow-[0_0_2px_white] rounded-md hover:bg-blue-500 transition duration-300"
              onClick={() => navigate("/system/main")}
            >
              首頁
            </button>
            
            {/* 預覽班表資料按鈕 */}
            <button
              className="flex items-center cursor-pointer font-bold px-4 py-2 text-white text-2xl bg-blue-400 drop-shadow-[0_0_2px_white] rounded-md hover:bg-blue-500 transition duration-300"
              onClick={() => {
                navigate("/system/schedule-preview");
                setReloadKey((prevKey) => prevKey + 1);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6 h-6 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                />
              </svg>
              預覽班表
            </button>

            {(user.role == 3 || user.role == 2) && (
              <div className="ml-4 relative group">
                <button className="cursor-pointer drop-shadow-[0_0_3px_#2563eb] flex font-bold items-center cursor-pointer px-4 py-2 bg-transparent text-white text-2xl hover:bg-blue-500 rounded-md transition duration-300 flex items-center">
                  管理功能
                  <svg
                    className="ml-1 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <div className="cursor-pointer dropdown-menu absolute text-2xl z-10 mt-1 w-48 bg-white rounded-md shadow-lg py-1">
                  {user.role == 3 && (
                    <button
                      className="cursor-pointer flex items-center w-full text-left px-4 py-2 text-lg text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        navigate("/system/account-mgr");
                        setReloadKey((prevKey) => prevKey + 1);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6 mr-2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                        />
                      </svg>
                      帳號管理
                    </button>
                  )}

                  {user.role == 3 && (
                    <button
                      className="cursor-pointer flex items-center w-full text-left px-4 py-2 text-lg text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        navigate("/system/department-mgr");
                        setReloadKey((prevKey) => prevKey + 1);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6 mr-2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z"
                        />
                      </svg>
                      科別管理
                    </button>
                  )}

                  {user.role == 3 && (
                    <button
                      className="cursor-pointer flex items-center w-full text-left px-4 py-2 text-lg text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        navigate("/system/OR-mgr");
                        setReloadKey((prevKey) => prevKey + 1);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6 mr-2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                      手術房管理
                    </button>
                  )}
                  <button
                    className="cursor-pointer flex items-center w-full text-left px-4 py-2 text-lg text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      navigate("/system/surgery-mgr");
                      setReloadKey((prevKey) => prevKey + 1);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="w-6 h-6 mr-2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5"
                      />
                    </svg>
                    手術管理
                  </button>
                  {user.role == 3 && (
                    <button
                      className="cursor-pointer flex items-center w-full text-left px-4 py-2 text-lg text-gray-700 hover:bg-gray-100"
                      onClick={() => {
                        navigate("/system/shift-mgr");
                        setReloadKey((prevKey) => prevKey + 1);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-6 h-6 mr-2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z"
                        />
                      </svg>
                      排程管理
                    </button>
                  )}

                </div>
              </div>
            )}

            {/* User Profile */}
            <div className="ml-4 text-2xl">
              <UserList
                fullTogglePage={fullTogglePage}
                name={user.username}
                toggleMainPage={toggleMainPage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeaderWrapper;