import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../config";

function LoginWrapper({ togglePage, fullTogglePage, setNowUsername }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState({ username: "", password: "" });
  const [currentTime, setCurrentTime] = useState(new Date());
  const passwordInputRef = useRef(null);

  // 更新當前時間
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 計算時針、分針位置
  const getClockHands = () => {
    const hours = currentTime.getHours() % 12;
    const minutes = currentTime.getMinutes();
    const hourAngle = (hours * 30) + (minutes * 0.5);
    const minuteAngle = minutes * 6;
    const hourHandLength = 35;
    const hourX = 100 + hourHandLength * Math.sin(hourAngle * Math.PI / 180);
    const hourY = 100 - hourHandLength * Math.cos(hourAngle * Math.PI / 180);
    const minuteHandLength = 45;
    const minuteX = 100 + minuteHandLength * Math.sin(minuteAngle * Math.PI / 180);
    const minuteY = 100 - minuteHandLength * Math.cos(minuteAngle * Math.PI / 180);

    return {
      hourHand: { x2: hourX, y2: hourY },
      minuteHand: { x2: minuteX, y2: minuteY }
    };
  };

  // 計算十字位置（與分針相同位置）
  const getMedicalCross = () => {
    const minutes = currentTime.getMinutes();
    const minuteAngle = minutes * 6;
    const crossWidth = 30;
    const crossHeight = 8;
    const centerDistance = 30;
    const centerX = 100 + centerDistance * Math.sin(minuteAngle * Math.PI / 180);
    const centerY = 100 - centerDistance * Math.cos(minuteAngle * Math.PI / 180);
    const horizRectX = centerX - crossWidth / 2;
    const horizRectY = centerY - crossHeight / 2;
    const vertRectX = centerX - crossHeight / 2;
    const vertRectY = centerY - crossWidth / 2;

    return {
      horizontal: { x: horizRectX, y: horizRectY },
      vertical: { x: vertRectX, y: vertRectY }
    };
  };

  const { hourHand, minuteHand } = getClockHands();
  const cross = getMedicalCross();

  const confirmHandler = () => {
    const newError = { username: "", password: "" };
    let valid = true;
    if (!username.trim()) {
      newError.username = "*請輸入帳號";
      valid = false;
    }
    if (!password.trim()) {
      newError.password = "*請輸入密碼";
      valid = false;
    }
    setError(newError);

    if (valid) {
      loginHandler();
    }
  };

  const loginHandler = async () => {
    try {
      const payload = {
        username: username,
        password: password,
      };

      const response = await axios.post(`${BASE_URL}/api/login`, payload);
      
      setMessage(response.data);
    } catch (error) {
      setMessage("登入時發生錯誤");
    }
  };

  // 處理忘記密碼
  const handleForgotPassword = () => {
    togglePage("forgotPasswordPage");
  };

  useEffect(() => {
    if (message === "登入成功") {
      fullTogglePage("systemPage");
      setNowUsername(username);
    }
  }, [message, fullTogglePage, setNowUsername, username]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white overflow-hidden">
      {/* 上方波浪 */}
      <div className="absolute top-0 left-0 w-full overflow-hidden">
        <svg className="w-full h-[200px]" style={{ marginTop: "-1px" }} viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            className="fill-blue-400 opacity-60"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
            className="fill-blue-300 opacity-60"
          ></path>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            className="fill-blue-200 opacity-60"
          ></path>
        </svg>
      </div>

      {/* 底部波浪 */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden rotate-180">
        <svg className="w-full h-[200px]" style={{ marginBottom: "-1px" }} viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            className="fill-blue-300 opacity-40"
          ></path>
        </svg>
      </div>

      {/* 登入卡片 */}
      <div className="z-10 bg-white bg-opacity-95 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-2xl mx-4 border border-blue-50 hover:shadow-blue-100 transition duration-300 relative">
        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-30 h-30 mb-4">
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
          <h1 className="text-5xl font-bold text-blue-900 mb-1 p-2">智能手術排程管理系統</h1>
          <p className="text-2xl text-blue-600 font-medium p-2">登入</p>
        </div>

        <div className="space-y-10 relative z-10 p-1">
          <div>
            <div className="relative">
              <input
                className="text-3xl w-full pl-15 pr-4 py-5 bg-blue-50 bg-opacity-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition placeholder-blue-300"
                placeholder="帳號"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    passwordInputRef.current?.focus();
                  }
                }}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {error.username && <p className="text-sm text-red-600 mt-1">{error.username}</p>}
          </div>

          <div>
            <div className="relative">
              <input
                type="password"
                ref={passwordInputRef}
                className="text-3xl w-full pl-15 pr-4 py-5 bg-blue-50 bg-opacity-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition placeholder-blue-300"
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    confirmHandler();
                  }
                }}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            {error.password && <p className="text-sm text-red-600 mt-1">{error.password}</p>}
          </div>

          {message && (
            <div className="py-2 px-3 bg-red-50 text-center rounded-md">
              <p className="text-sm text-red-600">{message}</p>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              className="text-2xl text-blue-700 hover:text-blue-800 hover:underline flex items-center"
              onClick={handleForgotPassword}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className=" h-10 w-10 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              忘記密碼？
            </button>
            <button
              className="text-3xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center transition duration-200"
              onClick={confirmHandler}
            >
              確定
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginWrapper;