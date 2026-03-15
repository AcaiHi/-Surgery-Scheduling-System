// src/features/home/components/GeneratePDFButton.jsx
import React, { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

/**
 * 僅彈一次對話框：
 * - forcePicker = true：有 showSaveFilePicker 就一定用，不再 fallback（使用者取消就直接結束，不會再跳第 2 次）
 * - forcePicker = false（預設）：先試 picker；若非使用者取消造成的錯誤才 fallback 下載
 */
async function savePdf(pdf, filename, { forcePicker = false } = {}) {
  const blob = pdf.output("blob");

  // 只允許觸發一次（避免雙重對話框）
  if (!savePdf._once) savePdf._once = new WeakSet();
  if (savePdf._once.has(pdf)) return;
  savePdf._once.add(pdf);

  const hasPicker = typeof window.showSaveFilePicker === "function";

  if (hasPicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // 使用者取消 -> 不再 fallback，保持「只跳一次」
      if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) return;
      if (forcePicker) throw err; // 強制 picker：發生錯誤也不 fallback
      // 否則走 fallback
    }
  }

  // Fallback：直接下載一次
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const GeneratePDFButton = ({
  timeScaleRef,
  ganttChartRef,
  filename = "gantt-chart.pdf",
  forcePicker = true, // 預設啟用，只會跳「一次」系統對話框
}) => {
  const [loading, setLoading] = useState(false);
  const [overlayText, setOverlayText] = useState("正在生成 PDF…");
  const guardRef = useRef(false); // 生成過程防連點

  // 與排程按鈕一致：執行中鎖定畫面捲動
  useEffect(() => {
    if (loading) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflowY = "scroll";
      document.body.style.width = "100%";
      return () => {
        const y = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflowY = "";
        document.body.style.width = "";
        window.scrollTo(0, parseInt(y || "0") * -1);
      };
    }
  }, [loading]);

  const generatePDF = async () => {
    if (guardRef.current || loading) return;
    if (!timeScaleRef?.current || !ganttChartRef?.current) {
      alert("找不到時間軸或甘特圖 DOM");
      return;
    }

    guardRef.current = true;
    setLoading(true);
    setOverlayText("準備畫面…");

    // 等待 UI 先進入 loading 狀態
    await new Promise((r) => requestAnimationFrame(r));

    // 確保字型載入完成
    if (document?.fonts?.ready) {
      try { await document.fonts.ready; } catch { }
    }

    const originalTimeScaleStyle = timeScaleRef.current.style.cssText;
    const originalGanttStyle = ganttChartRef.current.style.cssText;
    const originalScrollTop = ganttChartRef.current.scrollTop;
    const originalScrollLeft = ganttChartRef.current.scrollLeft;
    const originalTimeScaleParentStyle =
      timeScaleRef.current.parentElement?.style?.cssText ?? "";

    const CAPTURE_SCALE = 2; // 2~3：越大越清晰、檔案越大
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-99999px";
    tempContainer.style.top = "0";
    document.body.appendChild(tempContainer);

    try {
      setOverlayText("整理時間尺…");
      const timeScaleClone = timeScaleRef.current.cloneNode(true);
      tempContainer.appendChild(timeScaleClone);

      const fullWidth = ganttChartRef.current.scrollWidth;
      const fullHeight = ganttChartRef.current.scrollHeight;

      timeScaleClone.style.cssText = `
        position:absolute;top:0;left:0;
        width:${fullWidth}px;height:120px;
        visibility:visible;background:#f0f0f0;transform:none;z-index:1;
      `;
      ganttChartRef.current.style.cssText = `
        position:relative;overflow:visible;
        width:${fullWidth}px;height:${fullHeight}px;
        padding-top:0;margin-top:0;
      `;
      ganttChartRef.current.scrollTop = 0;
      ganttChartRef.current.scrollLeft = 0;

      await new Promise((r) => setTimeout(r, 50));

      setOverlayText("擷取時間尺…");
      const timeScaleCanvas = await html2canvas(timeScaleClone, {
        scale: CAPTURE_SCALE,
        useCORS: true,
        backgroundColor: "#f0f0f0",
        logging: false,
        width: fullWidth,
        height: 120,
      });

      setOverlayText("擷取甘特圖…");
      const ganttCanvas = await html2canvas(ganttChartRef.current, {
        scale: CAPTURE_SCALE,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
      });

      setOverlayText("合併圖面…");
      const combined = document.createElement("canvas");
      const gap = 8 * CAPTURE_SCALE;
      combined.width = Math.max(timeScaleCanvas.width, ganttCanvas.width);
      combined.height = timeScaleCanvas.height + gap + ganttCanvas.height;

      const ctx = combined.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, combined.width, combined.height);
      ctx.drawImage(timeScaleCanvas, 0, 0);
      ctx.drawImage(ganttCanvas, 0, timeScaleCanvas.height + gap);

      setOverlayText("排版與分頁…");
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a3" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const scaleToPage = pageW / combined.width;
      const sliceHeightInCanvas = Math.floor(pageH / scaleToPage);

      let offsetY = 0;
      let pageIndex = 0;
      while (offsetY < combined.height) {
        const sliceHeight = Math.min(sliceHeightInCanvas, combined.height - offsetY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = combined.width;
        pageCanvas.height = sliceHeight;
        const pctx = pageCanvas.getContext("2d");
        pctx.drawImage(
          combined,
          0, offsetY, combined.width, sliceHeight,
          0, 0, combined.width, sliceHeight
        );
        const img = pageCanvas.toDataURL("image/png", 1.0);
        if (pageIndex > 0) pdf.addPage("a3", "landscape");
        pdf.addImage(img, "PNG", 0, 0, pageW, sliceHeight * scaleToPage, "", "FAST");
        offsetY += sliceHeight;
        pageIndex += 1;

        // 進度提示（與排程按鈕一致的 loading 樣式）
        setOverlayText(`排版與分頁…（第 ${pageIndex} 頁）`);
        await new Promise((r) => requestAnimationFrame(r));
      }

      setOverlayText("準備存檔…");
      await savePdf(pdf, filename, { forcePicker });

      setOverlayText("完成！");
      await new Promise((r) => setTimeout(r, 280));
    } catch (error) {
      console.error("生成 PDF 時發生錯誤:", error);
      alert("生成 PDF 發生錯誤");
    } finally {
      timeScaleRef.current.style.cssText = originalTimeScaleStyle;
      ganttChartRef.current.style.cssText = originalGanttStyle;
      ganttChartRef.current.scrollTop = originalScrollTop;
      ganttChartRef.current.scrollLeft = originalScrollLeft;
      if (timeScaleRef.current.parentElement) {
        timeScaleRef.current.parentElement.style.cssText = originalTimeScaleParentStyle;
      }
      tempContainer.remove();
      setLoading(false);
      guardRef.current = false;
    }
  };

  return (
    <>
      {/* 保持你原本的按鈕樣式不變 */}
      <button
        className="gantt-buttons flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition-colors duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={generatePDF}
        title={loading ? "生成中…" : "輸出甘特圖為 PDF"}
        aria-busy={loading ? "true" : "false"}
        aria-live="polite"
        disabled={loading}
        type="button"
      >
        {loading ? (
          // 這顆 icon 留著就好；主要視覺在覆蓋層
          <svg className="h-5 w-5 mr-2 animate-spin" viewBox="0 0 24 24" stroke="currentColor" fill="none">
            <circle cx="12" cy="12" r="9" strokeWidth="1.5" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        {loading ? "生成中…" : "生成 PDF"}
      </button>

      {/* ✅ 覆蓋滿版，沿用排程按鈕同款 class：modal-overlay / spin-wrapper / spinner / loading-text */}
      {loading && (
        <div className="modal-overlay">
          <div className="spin-wrapper">
            <div className="spinner"></div>
            <div className="loading-text">{overlayText}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default GeneratePDFButton;
