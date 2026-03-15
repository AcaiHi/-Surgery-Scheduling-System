import axios from "axios";
import { useEffect, useState } from "react";
import { BASE_URL } from "../../../../../../../config";

const ORSMButton = ({ reservedRooms  }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showResultButton, setShowResultButton] = useState(false);

    const handleRunAlgorithm = async (event) => {
        event.preventDefault();  // 防止表單提交時刷新頁面
        setIsLoading(true);
        setShowResultButton(false)

        try {
            const response = await axios.post(`${BASE_URL}/api/system/algorithm/run`, {
                closedRoomIds: reservedRooms.map(room => room.id),
            });
            const result = response.data;
            if (typeof result === "string" && result.includes("<html")) {
                alert("⚠️ 錯誤：後端可能回傳了錯誤頁，請檢查是否 .bat 檔執行失敗");
                console.warn("返回 HTML：", result);
            } else {
                setIsLoading(false);
                setShowResultButton(true);
            }
        } catch (error) {
            console.error("執行錯誤：", error);
            alert("錯誤：" + error.message);
        }
    };

    // const handleCloseResultButton = () => {
    //     // setShowResultButton(false);
    //     // Reload the page while keeping the overlay visible to avoid a visible flash

    //     window.location.reload(); // 重新載入頁面
    // }

    const handleCloseResultButton = () => {
        // Clear cached schedule data so the page reload starts fresh
        try {
            localStorage.removeItem("shiftRows");
        } catch {
            // ignore
        }
        // Reload the page while keeping the overlay visible to avoid a visible flash
        window.location.reload(); // 重新載入頁面
    }

    useEffect(() => {
        if (isLoading) {
            const scrollY = window.scrollY;
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollY}px`;
            document.body.style.left = "0";
            document.body.style.right = "0";
            document.body.style.overflowY = "scroll";
            document.body.style.width = "100%";
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.left = "";
            document.body.style.right = "";
            document.body.style.overflowY = "";
            document.body.style.width = "";
            window.scrollTo(0, parseInt(scrollY || "0") * -1);
        }
    }, [isLoading]);
    return (
        <>
            <button
                type="button"
                className="gantt-buttons flex items-center bg-purple-500 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-300"
                onClick={(e) => handleRunAlgorithm(e)}
                disabled={isLoading}
            >
                <svg
                    className="h-6 w-6 mr-1"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                    />
                </svg>
                {isLoading ? '執行中...' : '開始排程'}
            </button>
            {isLoading && (
                <div className="modal-overlay">
                    <div className="spin-wrapper">
                        <div className="spinner"></div>
                        <div className="loading-text">排程中...</div>
                    </div>
                </div>)}

            {showResultButton && !isLoading && (
                // <div className="modal-overlay">
                //     <div className="spin-wrapper">
                //         <div className="checkmark">
                //             <svg viewBox="0 0 52 52">
                //                 <path d="M14 27 L22 35 L38 19" />
                //             </svg>
                //         </div>
                //         <button className="gantt-buttons flex items-center bg-purple-500 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-300"
                //             onClick={handleCloseResultButton}>確認</button>
                //     </div>
                // </div>
                <div className="modal-overlay">
                    <div className="spin-wrapper flex flex-col items-center space-y-4">
                        <div className="text-xl font-semibold text-gray-700">排程完成！</div>

                        <div className="checkmark w-16 h-16">
                            <svg viewBox="0 0 52 52" className="w-full h-full">
                                <path
                                    d="M14 27 L22 35 L38 19"
                                    fill="none"
                                    stroke="green"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <button
                            className="gantt-buttons flex items-center bg-purple-500 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-300"
                            onClick={handleCloseResultButton}
                        >
                            確認
                        </button>
                    </div>
                </div>

            )}
        </>

    );
};

export default ORSMButton;
