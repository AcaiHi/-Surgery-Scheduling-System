import React from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

const GeneratePDFButton = ({ timeScaleRef, ganttChartRef }) => {
  const generatePDF = async () => {
    if (!timeScaleRef.current || !ganttChartRef.current) {
      console.error("參考的 DOM 元素不存在");
      alert("發生錯誤：無法找到 Gantt 圖表或時間刻度");
      return;
    }

    // 儲存原始狀態
    const originalTimeScaleStyle = timeScaleRef.current.style.cssText;
    const originalGanttStyle = ganttChartRef.current.style.cssText;
    const originalScrollTop = ganttChartRef.current.scrollTop;
    const originalTimeScaleParentStyle = timeScaleRef.current.parentElement.style.cssText;

    try {
      // 創建臨時容器來分別渲染時間刻度和甘特圖
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);

      // 複製時間刻度到臨時容器
      const timeScaleClone = timeScaleRef.current.cloneNode(true);
      tempContainer.appendChild(timeScaleClone);

      // 調整時間刻度樣式
      timeScaleClone.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${ganttChartRef.current.scrollWidth}px;
        height: 120px;
        visibility: visible;
        z-index: 999;
        background-color: #f0f0f0;
        transform: none;
      `;

      // 調整甘特圖樣式
      ganttChartRef.current.style.cssText = `
        position: relative;
        overflow: visible;
        height: ${ganttChartRef.current.scrollHeight}px;
        width: ${ganttChartRef.current.scrollWidth}px;
        padding-top: 0;
        margin-top: 0;
      `;
      
      // 確保滾動位置重置為頂部
      ganttChartRef.current.scrollTop = 0;

      // 等待樣式應用與重繪
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 擷取時間刻度畫布
      const timeScaleCanvas = await html2canvas(timeScaleClone, {
        scale: 5,
        useCORS: true,
        backgroundColor: "#f0f0f0",
        logging: false,
        width: ganttChartRef.current.scrollWidth,
        height: 100,
      });

      // 擷取甘特圖畫布
      const ganttChartCanvas = await html2canvas(ganttChartRef.current, {
        scale: 1,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: ganttChartRef.current.scrollWidth,
        height: ganttChartRef.current.scrollHeight,
        windowWidth: ganttChartRef.current.scrollWidth,
        windowHeight: ganttChartRef.current.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });

      // 轉換為圖片
      const timeScaleImgData = timeScaleCanvas.toDataURL("image/png", 1.0);
      const ganttChartImgData = ganttChartCanvas.toDataURL("image/png", 1.0);

      // 創建 PDF
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [
          ganttChartCanvas.width + 50,
          ganttChartCanvas.height + timeScaleCanvas.height + 50,
        ],
      });

      // 計算並添加圖片
      const pageWidth = pdf.internal.pageSize.getWidth();
      const timeScaleHeight = 120;

      // 添加時間刻度（在頂部）
      pdf.addImage(
        timeScaleImgData,
        "PNG",
        25,
        25,
        pageWidth - 50,
        timeScaleHeight,
        "",
        "FAST"
      );

      // 添加甘特圖（在時間刻度下方）
      pdf.addImage(
        ganttChartImgData,
        "PNG",
        25,
        timeScaleHeight + 35,
        pageWidth - 50,
        ganttChartCanvas.height * ((pageWidth - 50) / ganttChartCanvas.width),
        "",
        "FAST"
      );

      // 下載 PDF
      pdf.save("gantt-chart.pdf");

      // 清理臨時元素
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error("生成 PDF 時發生錯誤:", error);
      alert("生成 PDF 時發生錯誤，請稍後再試");
    } finally {
      // 恢復原始樣式和滾動位置
      timeScaleRef.current.style.cssText = originalTimeScaleStyle;
      ganttChartRef.current.style.cssText = originalGanttStyle;
      ganttChartRef.current.scrollTop = originalScrollTop;
      if (timeScaleRef.current.parentElement) {
        timeScaleRef.current.parentElement.style.cssText = originalTimeScaleParentStyle;
      }
    }
  };

  return (
    <button
      className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-300"
      onClick={generatePDF}
    >
      <svg
        className="h-4 w-4 mr-2"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      生成 PDF
    </button>
  );
};

export default GeneratePDFButton;
