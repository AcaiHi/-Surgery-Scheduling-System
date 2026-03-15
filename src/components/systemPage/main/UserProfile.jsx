import { useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../../config";

function UserProfile({ user, onUpdateUser }) {
  const [maskedPassword, setMaskedPassword] = useState("*".repeat(user.password.length));
  const [isChangingPassword, setChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [error, setError] = useState({
    oldPassword: "",
    newPassword: "",
    newPasswordAgain: "",
  });

  const roleMap = {
    1: "查看者",
    2: "編輯者",
    3: "管理者",
  };

  const clearInputs = () => {
    setOldPassword("");
    setNewPassword("");
    setNewPasswordAgain("");
    setError({ oldPassword: "", newPassword: "", newPasswordAgain: "" });
  };

  const confirmHandler = () => {
    const newError = { oldPassword: "", newPassword: "", newPasswordAgain: "" };
    let valid = true;

    if (!oldPassword.trim()) {
      newError.oldPassword = "*請輸入舊密碼";
      valid = false;
    } else if (oldPassword !== user.password) {
      newError.oldPassword = "*與舊密碼不相符";
      valid = false;
    }

    if (!newPassword.trim()) {
      newError.newPassword = "*請輸入新密碼";
      valid = false;
    }

    if (!newPasswordAgain.trim()) {
      newError.newPasswordAgain = "*請再次輸入新密碼";
      valid = false;
    } else if (newPassword !== newPasswordAgain) {
      newError.newPasswordAgain = "*兩個密碼不相同";
      valid = false;
    }

    setError(newError);

    if (valid) changePasswordHandler();
  };

  const changePasswordHandler = async () => {
    try {
      const response = await axios.put(`${BASE_URL}/api/login/changePassword/${user.username}`, {
        password: newPassword,
      });

      if (response.data === "Change Password successfully") {
        setMaskedPassword("*".repeat(newPassword.length));
        onUpdateUser({ ...user, password: newPassword });
        setPasswordChanged(true);
        setChangingPassword(false);
        clearInputs();
      }
    } catch (err) {
      console.error("變更密碼時發生錯誤：", err);
    }
  };

  const cancelHandler = () => {
    setChangingPassword(false);
    setPasswordChanged(false);
    clearInputs();
  };

  return (
    <div className="relative h-screen bg-white">
      <div className="absolute inset-0 z-0 pointer-events-none before:content-[''] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.2),_transparent_70%)]" />
      {/* 藍色波浪背景 - 延伸到頂部 */}
      <div className="absolute top-0 left-0 right-0 h-[200px] overflow-hidden">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute w-full h-full"
        >
          <path
            fill="#3B82F6"
            fillOpacity="0.6"
            d="M0,160L48,176C96,192,192,224,288,229.3C384,235,480,213,576,197.3C672,181,768,171,864,170.7C960,171,1056,181,1152,197.3C1248,213,1344,235,1392,245.3L1440,256L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
          ></path>
        </svg>
      </div>
      {/* 底部波浪 */}
      <div className={`absolute left-0 w-full overflow-hidden rotate-180 transition-all duration-700 ${isChangingPassword ? "bottom-[-300px]" : "bottom-[65px]"}`}>
        <svg className="w-full" style={{ marginBottom: "-1px" }} viewBox="0 0 1200 1200" preserveAspectRatio="none">
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            className="fill-blue-300 opacity-40"
          ></path>
        </svg>
      </div>
      {/* 主內容 */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-lg p-10 w-[800px] mt-50">
          <div className="text-center mb-8">
            <div className="inline-block bg-blue-100 p-4 rounded-full mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-10 h-10 text-blue-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-blue-900">個人資料</h2>
          </div>

          {/* <div className="space-y-5 mb-8 text-gray-700 text-lg "> */}
          <div className="space-y-5 mb-8 text-gray-700 text-2xl">
            <p><strong>帳號：</strong>{user.username}</p>
            <p><strong>姓名：</strong>{user.name}</p>
            <p><strong>單位：</strong>{user.unit}</p>
            <p><strong>權限：</strong>{roleMap[user.role]}</p>
            <p><strong>信箱：</strong>{user.email}</p>
            <p>
              <strong>密碼：</strong>
              {maskedPassword}
              {passwordChanged && <span className="text-green-600 ml-2">(已更新)</span>}
            </p>
          </div>

          {!isChangingPassword ? (
            <button
              onClick={() => setChangingPassword(true)}
              className="w-full bg-blue-400 flex justify-center items-center text-white py-4 font-bold rounded-lg hover:bg-blue-600 transition text-2xl"
            >
              更改密碼
            </button>
          ) : (
            <div className="space-y-5">
              <input
                type="password"
                placeholder="請輸入舊密碼"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full pl-2 pr-4 py-3 bg-blue-50 bg-opacity-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-400 placeholder-blue-300"
              />
              {error.oldPassword && <p className="text-red-500 text-sm">{error.oldPassword}</p>}

              <input
                type="password"
                placeholder="請輸入新密碼"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-2 pr-4 py-3 bg-blue-50 bg-opacity-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-400 placeholder-blue-300"
              />
              {error.newPassword && <p className="text-red-500 text-sm">{error.newPassword}</p>}

              <input
                type="password"
                placeholder="請再次輸入新密碼"
                value={newPasswordAgain}
                onChange={(e) => setNewPasswordAgain(e.target.value)}
                className="w-full pl-2 pr-4 py-3 bg-blue-50 bg-opacity-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-400 placeholder-blue-300"
              />
              {error.newPasswordAgain && <p className="text-red-500 text-sm">{error.newPasswordAgain}</p>}

              <div className="flex space-x-4">
                <button
                  onClick={confirmHandler}
                  className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 text-2xl"
                >
                  確認
                </button>
                <button className="flex-1" />
                <button
                  onClick={cancelHandler}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 text-2xl"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;