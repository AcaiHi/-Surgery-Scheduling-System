// src/components/systemPage/main/SchedulePreview/SchedulePreview.jsx

import { useRef, useState } from "react";
import SchedulePreviewGantt from "./SchedulePreviewGantt";
import { parseArguments4GuiCsv } from "./parseArguments4GuiCsv";

export default function SchedulePreview() {
  const [csvData, setCsvData] = useState(null);
  const [scheduleData, setScheduleData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [viewMode, setViewMode] = useState("gantt");
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterRoom, setFilterRoom] = useState("all");
  const [hasChanges, setHasChanges] = useState(false);

  // ✅ 匯入格式：table(7欄) or arguments4gui
  const [importFormat, setImportFormat] = useState(null);

  // ✅ 由 Gantt 回傳的最新參數(拿它來輸出 Arguments4GUI)
  const [ganttSettings, setGanttSettings] = useState({
    surgeryStart: "08:30",
    normalEnd: "17:30",
    overtimeEnd: "20:00",
    cleaningMin: 45,
    timeStepMin: 15,
  });

  const fileInputRef = useRef(null);
  const timeScaleRef = useRef(null);
  const ganttScrollRef = useRef(null);

  // ====== uid generator ======
  const uidRef = useRef(1);
  const genUid = () => `surg_${uidRef.current++}`;

  // ---- 工具：優先用 Big5 讀(兼容 Arguments4GUI.csv)，必要時 fallback UTF-8 ----
  const readCsvTextSmart = async (file) => {
    const buf = await file.arrayBuffer();
    let text = new TextDecoder("big5").decode(buf);
    if (text.includes("�")) {
      const utf8 = new TextDecoder("utf-8").decode(buf);
      if (!utf8.includes("�")) text = utf8;
    }
    return text;
  };

  // ---- 解析 7 欄表格 CSV (你的原格式) ----
  const parseTableCsv = (text) => {
    const rows = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean)
      .map((row) => row.split(","));

    const data = rows
      .slice(1)
      .filter((row) => row.length >= 7)
      .map((row) => ({
        room: row[0]?.trim(),
        date: row[1]?.trim(),
        surgeryName: row[2]?.trim(),
        patientName: row[3]?.trim(),
        doctor: row[4]?.trim(),
        startTime: row[5]?.trim(),
        endTime: row[6]?.trim(),
      }))
      .filter((x) => x.room && x.date && x.startTime && x.endTime);

    return data;
  };

  // ---- 將「扁平表格資料」轉為甘特圖結構 ----
  const processScheduleData = (data) => {
    const groupedByRoom = data.reduce((acc, item) => {
      if (!acc[item.room]) acc[item.room] = [];
      acc[item.room].push(item);
      return acc;
    }, {});

    const dates = data.map((d) => new Date(d.date)).filter((d) => !isNaN(d));
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      setDateRange({ start: minDate, end: maxDate });
      setSelectedDate(minDate.toISOString().split("T")[0]);
    } else {
      setDateRange({ start: null, end: null });
      setSelectedDate(null);
    }

    const schedule = Object.entries(groupedByRoom).map(([room, surgeries]) => ({
      room,
      surgeries: surgeries
        .sort((a, b) => {
          const dateCompare = new Date(a.date) - new Date(b.date);
          if (dateCompare !== 0) return dateCompare;
          return (a.startTime || "").localeCompare(b.startTime || "");
        })
        .map((s) => ({
          ...s,
          _uid: genUid(), // ✅ 穩定識別
        })),
    }));

    setScheduleData(schedule);
  };

  // ---- 處理 CSV 檔案上傳(支援兩種格式) ----
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("請上傳 CSV 格式的檔案");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const text = await readCsvTextSmart(file);
      const trimmed = text.trim();

      const firstLine = trimmed.split("\n")[0] || "";
      const isTableCsv =
        firstLine.startsWith("手術室,日期,") || firstLine.includes("手術室,日期,");

      const isArguments4Gui = trimmed.includes("手術房間名稱") && trimmed.includes("手術串列");

      if (isTableCsv) {
        setImportFormat("table");
        uidRef.current = 1;
        const data = parseTableCsv(text);
        if (data.length === 0) {
          setError("CSV 內容為空或欄位不足(需至少 7 欄)");
          setCsvData(null);
          setScheduleData([]);
          return;
        }
        setCsvData(data);
        processScheduleData(data);
        setFilterRoom("all");
        setViewMode("gantt");
        setHasChanges(false);
        return;
      }

      if (isArguments4Gui) {
        setImportFormat("arguments4gui");
        uidRef.current = 1;
        const todayISO = new Date().toISOString().split("T")[0];
        const parsed = parseArguments4GuiCsv(text, todayISO);

        // flat(for stats/table)
        const flat = (parsed.scheduleData || []).flatMap((room) =>
          (room.surgeries || []).map((s) => ({
            room: room.room,
            date: s.date,
            surgeryName: s.surgeryName,
            patientName: s.patientName,
            doctor: s.doctor,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        );

        // ✅ 加入 _uid 到 scheduleData
        const scheduleWithUid = (parsed.scheduleData || []).map((r) => ({
          ...r,
          surgeries: (r.surgeries || []).map((s) => ({
            ...s,
            _uid: genUid(),
          })),
        }));

        setCsvData(flat);
        setScheduleData(scheduleWithUid);

        const d = new Date(todayISO);
        setDateRange({ start: d, end: d });
        setSelectedDate(todayISO);
        setFilterRoom("all");
        setViewMode("gantt");
        setHasChanges(false);
        return;
      }

      setError("不支援的 CSV 格式：請確認是(手術室,日期,...)或 Arguments4GUI 格式");
      setCsvData(null);
      setScheduleData([]);
      setImportFormat(null);
    } catch (err) {
      console.error(err);
      setError("檔案讀取或解析失敗，請確認 CSV 格式與編碼");
      setCsvData(null);
      setScheduleData([]);
      setImportFormat(null);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // updates: [{ uid, oldRoom, newRoom, newDate, newStartTime, newEndTime }]
  const handleSurgeryUpdate = (updates) => {
    setScheduleData((prev) => {
      const newData = prev.map((r) => ({
        ...r,
        surgeries: Array.isArray(r.surgeries) ? [...r.surgeries] : [],
      }));

      const findRoomIndexByName = (roomName) => newData.findIndex((r) => r.room === roomName);

      const ensureRoom = (roomName) => {
        let ri = findRoomIndexByName(roomName);
        if (ri === -1) {
          newData.push({ room: roomName, surgeries: [] });
          ri = newData.length - 1;
        }
        return ri;
      };

      const findSurgeryGlobalByUid = (uid) => {
        for (let ri = 0; ri < newData.length; ri++) {
          const si = newData[ri].surgeries.findIndex((s) => s?._uid === uid);
          if (si >= 0) return { roomIndex: ri, surgIndex: si };
        }
        return null;
      };

      const sortRoom = (ri) => {
        newData[ri].surgeries.sort((a, b) => {
          const dateCompare = new Date(a.date) - new Date(b.date);
          if (dateCompare !== 0) return dateCompare;
          return (a.startTime || "").localeCompare(b.startTime || "");
        });
      };

      (updates || []).forEach((u) => {
        const { uid, newRoom, oldRoom, surgeryIndex, newDate, newStartTime, newEndTime } = u || {};

        let surgeryObj = null;

        // 1) uid 全域找
        if (uid) {
          const found = findSurgeryGlobalByUid(uid);
          if (found) {
            const { roomIndex: fromRi, surgIndex: fromSi } = found;
            const [picked] = newData[fromRi].surgeries.splice(fromSi, 1);
            surgeryObj = picked ? { ...picked } : null;
          }
        }

        // 2) fallback oldRoom + index
        if (!surgeryObj) {
          if (!oldRoom || surgeryIndex == null) return;
          const fromRi = findRoomIndexByName(oldRoom);
          if (fromRi < 0) return;
          if (surgeryIndex < 0 || surgeryIndex >= newData[fromRi].surgeries.length) return;
          const [picked] = newData[fromRi].surgeries.splice(surgeryIndex, 1);
          surgeryObj = picked ? { ...picked } : null;
        }

        if (!surgeryObj) return;

        if (newDate) surgeryObj.date = newDate;
        if (newStartTime) surgeryObj.startTime = newStartTime;
        if (newEndTime) surgeryObj.endTime = newEndTime;

        const targetRoomName = newRoom || surgeryObj.room || oldRoom;
        surgeryObj.room = targetRoomName;

        const toRi = ensureRoom(targetRoomName);
        newData[toRi].surgeries.push(surgeryObj);
        sortRoom(toRi);
      });

      // 清空空房
      return newData.filter((r) => (r.surgeries || []).length > 0);
    });

    setHasChanges(true);
  };

  // ====== 匯出：7欄表格 CSV ======
  const exportTableCsv = () => {
    const rows = [["手術室", "日期", "手術名稱", "病患姓名", "主刀醫師", "開始時間", "結束時間"]];

    scheduleData.forEach((room) => {
      room.surgeries.forEach((s) => {
        rows.push([
          room.room,
          s.date,
          s.surgeryName || "",
          s.patientName || "",
          s.doctor || "",
          s.startTime,
          s.endTime,
        ]);
      });
    });

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `手術排程_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setHasChanges(false);
  };

  // ====== 匯出：Arguments4GUI TSV(你貼的格式) ======
  const exportArguments4Gui = () => {
    const pad2 = (n) => String(n).padStart(2, "0");

    const hhmmToMin = (hhmm) => {
      if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return null;
      const [h, m] = hhmm.split(":").map(Number);
      if ([h, m].some(Number.isNaN)) return null;
      return h * 60 + m;
    };

    // 允許跨日：如果 end < start 就 +1440
    const diffMinFromStart = (hhmm, startMin) => {
      const m = hhmmToMin(hhmm);
      if (m == null) return null;
      let d = m - startMin;
      if (d < 0) d += 1440;
      return d;
    };

    const startMin = hhmmToMin(ganttSettings.surgeryStart) ?? 510;
    const normalEndMin = hhmmToMin(ganttSettings.normalEnd) ?? 1050;
    const overtimeEndMin = hhmmToMin(ganttSettings.overtimeEnd) ?? 1200;
    const cleaningMin = Number(ganttSettings.cleaningMin) || 0;

    // normalMax = 常規可用分鐘(從 start 到 normalEnd)
    let normalMax = normalEndMin - startMin;
    if (normalMax < 0) normalMax += 1440;

    // overtimeMax = 超時可用分鐘(從 normalEnd 到 overtimeEnd)
    let overtimeMax = overtimeEndMin - normalEndMin;
    if (overtimeMax < 0) overtimeMax += 1440;

    const totalAvail = normalMax + overtimeMax;

    const lines = [];

    // 你貼的前兩行有路徑，但你說不用記住，那就留空欄位照格式輸出
    lines.push(`\t排程圖示結果儲存路徑 (全部手術房間 (未展開))`);
    lines.push(`\t排程圖示結果儲存路徑 (單一手術房間 (展開))`);
    lines.push(`${startMin}\t開始繪圖時間(510表示上午8:30、540表示上午9:00)`);
    lines.push(`${normalMax}\t每日允許可用的最大常規期間(分鐘)`);
    lines.push(`${overtimeMax}\t每日允許可用的最大超時期間(分鐘)`);
    lines.push(`${cleaningMin}\t兩檯手術之間的銜接期間(分鐘)`);
    lines.push(``);

    lines.push(`手術房間名稱\t剩餘可用時間\t手術串列`);

    // 逐房輸出
    scheduleData.forEach((room) => {
      const tokens = [];
      let maxUsed = 0;

      // 只輸出「當下選擇日期」或全部？
      // 你現在 Arguments4GUI 匯入都是單日，所以匯出也用 selectedDate
      const list = (room.surgeries || [])
        .filter((s) => (selectedDate ? s.date === selectedDate : true))
        .slice()
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

      list.forEach((s) => {
        const os = diffMinFromStart(s.startTime, startMin);
        const oe = diffMinFromStart(s.endTime, startMin);
        if (os == null || oe == null) return;

        // 更新 maxUsed (取最大 end offset)
        if (oe > maxUsed) maxUsed = oe;

        // 顯示字串：醫師名(病歷號_0~120_) 這裡你資料沒有病歷號，只能用 uid 或手術名稱當替代
        const doctor = (s.doctor || "").trim() || "醫師未填";
        const caseId = (s.caseId || s.patientId || s.surgeryId || s._uid || "").toString().trim();

        // 組 token：<doctor>(<id>_<start>~<end>_)
        // 若沒有 id，就只放底線保結構
        tokens.push(`${doctor}(${caseId}_${os}~${oe}_)`);
      });

      const remain = Math.max(0, totalAvail - maxUsed);

      // 注意：原格式是 tab 分隔，手術串列是「一格一個 token」也用 tab 分開
      // A1 345  token1  token2 ...
      lines.push([room.room, String(remain), ...tokens].join("\t"));
    });

    // 統計區：你貼的檔尾這些不是必要，但你要像，就補上(至少手術總數)
    const allSurg = scheduleData.reduce((sum, r) => sum + (r.surgeries || []).filter(s => (selectedDate ? s.date === selectedDate : true)).length, 0);
    lines.push(``);
    lines.push(`手術總數：${allSurg}`);

    const content = lines.join("\n");

    // 用 UTF-8(含 BOM) 讓 Excel 不亂碼；你若一定要 Big5，可再改 encoder
    const blob = new Blob(["\ufeff" + content], { type: "text/plain;charset=utf-8;" });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Arguments4GUI_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setHasChanges(false);
  };

  // ✅ 匯出入口：依照「匯入格式」決定匯出格式
  const handleExportCSV = () => {
    if (importFormat === "arguments4gui") {
      exportArguments4Gui();
    } else {
      exportTableCsv();
    }
  };

  const calculateDuration = (startTime, endTime) => {
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);
    let duration = endHours + endMinutes / 60 - (startHours + startMinutes / 60);
    if (duration < 0) duration += 24;
    return (duration / 24) * 100;
  };

  const getAllDates = () => {
    if (!dateRange.start || !dateRange.end) return [];
    const dates = [];
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getAllRooms = () => [...new Set((scheduleData || []).map((s) => s.room))];

  const getFilteredDataForTable = () => {
    let filtered = scheduleData;
    if (filterRoom !== "all") filtered = filtered.filter((room) => room.room === filterRoom);
    return filtered;
  };

  const getStats = () => {
    const totalSurgeries = scheduleData.reduce((sum, room) => sum + (room.surgeries?.length || 0), 0);
    const uniqueDoctors = [...new Set(scheduleData.flatMap((r) => r.surgeries.map((s) => s.doctor)).filter(Boolean))].length;
    const uniqueRooms = getAllRooms().length;
    return { totalSurgeries, uniqueDoctors, uniqueRooms };
  };

  const stats = csvData ? getStats() : null;
  const filteredDataForTable = getFilteredDataForTable();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="w-full max-w-none mx-auto space-y-6">
        {/* 頂部卡片 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">手術排程甘特圖</h1>
                {dateRange.start && (
                  <p className="text-sm text-gray-500 mt-1">
                    排程期間: {dateRange.start.toLocaleDateString("zh-TW")} - {dateRange.end.toLocaleDateString("zh-TW")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {csvData && (
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("gantt")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                      viewMode === "gantt" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"
                    }`}
                  >
                    <span>甘特圖</span>
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 ${
                      viewMode === "table" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600"
                    }`}
                  >
                    <span>表格</span>
                  </button>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md disabled:from-gray-400 disabled:to-gray-400"
              >
                <span className="font-medium">{loading ? "載入中..." : "匯入 CSV"}</span>
              </button>

              {scheduleData.length > 0 && (
                <button
                  onClick={handleExportCSV}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all shadow-md ${
                    hasChanges
                      ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="font-medium">匯出 CSV</span>
                  {hasChanges && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">有變更</span>}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
              <span>{error}</span>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-700">總手術數</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">{stats.totalSurgeries}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-green-700">手術室數</div>
                <div className="text-3xl font-bold text-green-600 mt-1">{stats.uniqueRooms}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-purple-700">醫師數</div>
                <div className="text-3xl font-bold text-purple-600 mt-1">{stats.uniqueDoctors}</div>
              </div>
            </div>
          )}

          {csvData && (
            <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-200">
              {viewMode === "gantt" && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">日期:</label>
                  <select
                    value={selectedDate || ""}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getAllDates().map((date) => (
                      <option key={date} value={date}>
                        {new Date(date).toLocaleDateString("zh-TW")}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">手術室:</label>
                <select
                  value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">全部</option>
                  {getAllRooms().map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ 顯示當前匯出格式(讓你確認) */}
              {importFormat && (
                <div className="text-xs text-gray-500 ml-auto">
                  匯出格式: {importFormat === "arguments4gui" ? "Arguments4GUI" : "7欄表格"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 甘特圖視圖 */}
        {scheduleData.length > 0 && viewMode === "gantt" && (
          <SchedulePreviewGantt
            scheduleData={scheduleData}
            selectedDate={selectedDate}
            filterRoom={filterRoom}
            dateRange={dateRange}
            timeScaleRef={timeScaleRef}
            ganttScrollRef={ganttScrollRef}
            onSurgeryUpdate={handleSurgeryUpdate}
            allRooms={getAllRooms()}
            // ✅ 接收 Gantt 的參數回傳，用來匯出 Arguments4GUI
            onSettingsChange={setGanttSettings}
          />
        )}

        {/* 表格視圖 */}
        {scheduleData.length > 0 && viewMode === "table" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">手術排程明細</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">手術室</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">日期</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">手術名稱</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">病患姓名</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">主刀醫師</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">開始時間</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">結束時間</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">手術時數</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDataForTable.flatMap((roomData) =>
                    (roomData.surgeries || []).map((surgery, idx) => {
                      const duration = calculateDuration(surgery.startTime, surgery.endTime);
                      const hours = ((duration / 100) * 24).toFixed(1);

                      return (
                        <tr key={`${roomData.room}-${surgery._uid || idx}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-800">{roomData.room}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {surgery.date ? new Date(surgery.date).toLocaleDateString("zh-TW") : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800 font-medium">{surgery.surgeryName || "-"}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{surgery.patientName || "-"}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{surgery.doctor || "-"}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{surgery.startTime || "-"}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{surgery.endTime || "-"}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-700">{hours} 小時</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 空狀態 */}
        {scheduleData.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">尚未匯入排程資料</h3>
            <p className="text-gray-500 mb-8">請點擊上方「匯入 CSV」按鈕上傳檔案</p>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-left max-w-2xl mx-auto border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-4">CSV 檔案格式說明</h4>
              <div className="text-sm text-gray-600 space-y-3">
                <p>支援兩種格式：</p>
                <ol className="list-decimal ml-6 space-y-2">
                  <li>表格 CSV(7 欄)：手術室,日期,手術名稱,病患姓名,主刀醫師,開始時間,結束時間</li>
                  <li>Arguments4GUI：內含「手術房間名稱 / 剩餘可用時間 / 手術串列」(常見為 Big5)</li>
                </ol>
                <p className="text-xs text-gray-500">
                  匯出會依照你匯入的格式輸出：匯入 Arguments4GUI 就輸出 Arguments4GUI；匯入 7欄就輸出 7欄。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
