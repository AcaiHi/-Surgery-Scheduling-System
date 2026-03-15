import { useState } from "react";
import { BASE_URL } from "../../../../../config";

function ConfirmScheduleButton({ onDone }) {
  const [loading, setLoading] = useState(false);

  // 從 /api/surgeries 撈資料，蒐集所有群組主（groupApplicationIds[0]）的唯一 ID
  async function fetchGroupMainIds() {
    const res = await fetch(`${BASE_URL}/api/surgeries`, { method: "GET" });
    if (!res.ok) {
      const msg = (await res.text().catch(() => "")) || `HTTP ${res.status}`;
      throw new Error(`取得手術列表失敗：${msg}`);
    }
    const surgeries = await res.json();
    const set = new Set();
    for (const s of surgeries || []) {
      const gids = s?.groupApplicationIds;
      if (Array.isArray(gids) && gids.length > 0) {
        const mainId = String(gids[0]);
        if (mainId) set.add(mainId);
      }
    }
    return Array.from(set);
  }

  // 呼叫既有的清群組 API（body 用 text/plain，直接傳純文字 id）
  async function clearGroupByMainId(id) {
    const res = await fetch(`${BASE_URL}/api/system/surgeries/group/clear`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: id,
    });
    if (!res.ok) {
      const msg = (await res.text().catch(() => "")) || `HTTP ${res.status}`;
      throw new Error(`解除群組失敗（id=${id}）：${msg}`);
    }
  }

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1) 先找出所有群組主 ID
      const groupMainIds = await fetchGroupMainIds();

      // 2) 逐一解除群組（保守起見用序列執行）
      for (const id of groupMainIds) {
        await clearGroupByMainId(id);
      }

      // 3) 解除完群組後，再生成首頁快照 JSON
      const res2 = await fetch(`${BASE_URL}/api/system/schedule/homepage/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res2.ok) {
        const text = await res2.text().catch(() => "");
        throw new Error(text || `HTTP ${res2.status}`);
      }

      // 成功提示（不顯示檔名/路徑/大小等敏感細節）
      await res2.json(); // 若需要用到 data 可保留，但不顯示在提示中
      alert("已完成更新。");

      onDone?.();
    } catch (err) {
      console.error(err);
      alert(err?.message || "產生快照失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }

    // 需要刷新頁面時可保留
    setTimeout(() => window.location.reload(), 0);
  };

  return (
    <button
      type="button"
      aria-label="更新首頁"
      className="confirm-schedule-button"
      title={loading ? "生成中…" : "更新首頁"}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <svg className="h-6 w-6 mr-1 animate-spin" viewBox="0 0 24 24" stroke="currentColor" fill="none">
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" opacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-1" viewBox="0 0 30 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )}
      {loading ? "生成中…" : "更新首頁"}
    </button>
  );
}

export default ConfirmScheduleButton;
