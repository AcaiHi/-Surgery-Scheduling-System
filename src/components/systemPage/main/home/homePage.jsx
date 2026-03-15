import { useEffect, useMemo, useRef, useState } from "react";
import HomeGantt from "./main/homeGantt";
import "./home.css";
import HomeHeader from "./header/homeHeader";
import { BASE_URL } from "../../../../config";
import FilterDrawer from "./main/filters/FilterDrawer";
import FilterToggleTag from "./main/filters/FilterToggleTag";

const SNAPSHOT_DIR = `${BASE_URL}/snapshots`;
const SNAPSHOT_PREFIX = "schedule-";
const SNAPSHOT_SUFFIX = ".json";

// 以台北時區產出 yyyy-MM-dd（offsetDays: today=0, tomorrow=1）
function ymdByOffset(offsetDays = 0) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getDate() + offsetDays);
  return fmt.format(target);
}

function toSlashDate(s) {
  return typeof s === "string" ? s.replaceAll("-", "/") : s;
}

function HomePage() {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState("");
  const [sourceInfo, setSourceInfo] = useState(null);
  const [dndEnabled, setDndEnabled] = useState(false);
  
  // ✅ 從 URL 或 localStorage 讀取初始日期選擇
  const [schedule, setSchedule] = useState(() => {
    try {
      // 先檢查 URL 參數
      const url = new URL(window.location.href);
      const scheduleParam = url.searchParams.get("schedule");
      if (scheduleParam === "tomorrow" || scheduleParam === "today") {
        return scheduleParam;
      }
      // 再檢查 localStorage
      const saved = localStorage.getItem("home:schedule");
      if (saved === "tomorrow" || saved === "today") {
        return saved;
      }
    } catch (e) {
      console.warn("Failed to read schedule preference:", e);
    }
    return "today"; // 預設值
  });

  // 篩選器
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const offset = schedule === "tomorrow" ? 1 : 0;
  const selectedDash = useMemo(() => ymdByOffset(offset), [offset]);
  const selectedSlash = useMemo(
    () => toSlashDate(selectedDash),
    [selectedDash]
  );

  // 讓 Header 與 Gantt 共用的兩個 ref
  const timeScaleRef = useRef(null);
  const ganttScrollRef = useRef(null);

  // 拖曳開關：從 URL / localStorage 初始設定
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("dnd");
      if (q === "1" || q === "on" || q === "true") {
        localStorage.setItem("home:dnd", "on");
        setDndEnabled(true);
      } else {
        setDndEnabled(localStorage.getItem("home:dnd") === "on");
      }
    } catch {
      setDndEnabled(false);
    }
  }, []);

  // ✅ 當 schedule 改變時，保存到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem("home:schedule", schedule);
      console.log("[HomePage] Schedule saved:", schedule);
    } catch (e) {
      console.warn("Failed to save schedule preference:", e);
    }
  }, [schedule]);

  // Header 上「啟用移動修改」按鈕的切換邏輯
  const handleToggleDnd = () => {
    setDndEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("home:dnd", next ? "on" : "off");
      } catch {
        // localStorage 失敗就算了，不影響功能
      }
      return next;
    });
  };

  // 只抓「選定日期」
  useEffect(() => {
    const fetchSnapshot = async () => {
      setError(null);
      setSnapshot(null);
      setDataSource("");
      setSourceInfo(null);

      const tryFetchOnce = async (dashDate) => {
        // ✅ 加上時間戳記避免快取
        const timestamp = Date.now();
        
        try {
          // 嘗試 API
          const apiUrl = `${BASE_URL}/api/system/schedule/snapshot?date=${dashDate}&_t=${timestamp}`;
          console.log("[HomePage] Trying API:", apiUrl);
          
          const r = await fetch(apiUrl, { 
            cache: "no-store",
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!r.ok) throw new Error(`API HTTP ${r.status}`);
          const data = await r.json();
          
          console.log("[HomePage] API success, loaded snapshot:", data);
          setSnapshot(data);
          setDataSource("api");
          setSourceInfo({
            source: "api",
            url: apiUrl,
            date: data?._resolvedDate || data?.date || dashDate,
          });
          return true;
        } catch (apiError) {
          console.warn("[HomePage] API failed:", apiError.message);
          
          // API 失敗，嘗試靜態檔案
          try {
            const fileUrl = `${SNAPSHOT_DIR}/${SNAPSHOT_PREFIX}${dashDate}${SNAPSHOT_SUFFIX}?_t=${timestamp}`;
            console.log("[HomePage] Trying file:", fileUrl);
            
            const r2 = await fetch(fileUrl, { 
              cache: "no-store",
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            
            if (!r2.ok) throw new Error(`File HTTP ${r2.status}`);
            const data2 = await r2.json();
            
            console.log("[HomePage] File success, loaded snapshot:", data2);
            setSnapshot(data2);
            setDataSource("file");
            setSourceInfo({
              source: "file",
              url: fileUrl,
              date: data2?.date || dashDate,
            });
            return true;
          } catch (fileError) {
            console.error("[HomePage] File also failed:", fileError.message);
            return false;
          }
        }
      };

      const ok = await tryFetchOnce(selectedDash);
      if (!ok) setError(`找不到 ${selectedDash} 的資料（API/檔案皆無）`);
    };

    fetchSnapshot();
  }, [selectedDash]);

  const headerDate =
    toSlashDate(snapshot?._resolvedDate || snapshot?.date) || selectedSlash;
  const [tipsCollapsed, setTipsCollapsed] = useState(false);
  const toggleTips = () => setTipsCollapsed((prev) => !prev);

  return (
    <div className="home-gantt-wrapper relative">
      <HomeHeader
        title={`${headerDate} 手術排程甘特圖`}
        defaultSchedule={schedule}
        onScheduleChange={setSchedule}
        timeScaleRef={timeScaleRef}
        ganttChartRef={ganttScrollRef}
        dndEnabled={dndEnabled}
        onToggleDnd={handleToggleDnd}
      />

      <div
        className={`gantt-tips ${tipsCollapsed ? "tips-collapsed" : ""}`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
        }}
      >
        <svg
          className="gantt-tips-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          style={{
            marginLeft: "100px",
            width: "28px",
            height: "28px",
            flexShrink: 0,
          }}
        >
          <circle cx="12" cy="12" r="10" fill="#3B82F6" />
          <circle cx="12" cy="7" r="1.5" fill="white" />
          <rect x="11" y="9.5" width="2" height="6" rx="1" fill="white" />
        </svg>

        <div style={{ flexGrow: 1 }}>
          <div
            className="tips-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <p
              style={{
                fontWeight: 600,
                margin: 0,
                fontSize: "20px",
                paddingRight: "8px",
              }}
            >
              使用提示
            </p>

            <button
              onClick={toggleTips}
              style={{
                border: "none",
                background: "#3B82F6",
                color: "white",
                padding: "4px 10px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {tipsCollapsed ? "展開" : "收合"}
            </button>
          </div>

          {!tipsCollapsed && (
            <ul
              style={{
                marginTop: "1px",
                marginBottom: 0,
                paddingLeft: "-10px",
                listStyle: "disc",
                fontSize: "18px",
              }}
            >
              <li>可以橫向滾動查看不同時間段的排程</li>
              <li>點擊「生成 PDF」按鈕可將當前甘特圖生成 PDF 檔案</li>
              <li>點擊「啟用移動修改」按鈕可臨時調整排程位置</li>
              <li>點擊手術項目可查看詳細資訊</li>
            </ul>
          )}
        </div>
      </div>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onFiltersChange={setFilters}
      />

      {!filterOpen && (
        <div className="home-filter-toggle-dock--inside">
          <FilterToggleTag onClick={() => setFilterOpen(true)} />
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 12,
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#991b1b",
            borderRadius: 8,
            margin: "0 1%",
          }}
        >
          {error}
        </div>
      )}

      {!error && !snapshot && (
        <div style={{ padding: 12, margin: "0 1%" }}>載入中…</div>
      )}

      {snapshot && (
        <HomeGantt
          snapshot={snapshot}
          dndEnabled={dndEnabled}
          filters={filters}
          timeScaleRef={timeScaleRef}
          ganttScrollRef={ganttScrollRef}
        />
      )}
    </div>
  );
}

export default HomePage;