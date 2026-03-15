/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../../../../../config";
import MiniMultiSelect from "./MiniMultiSelect";

const CONDITION_DEFS = [
  { key: "科別", id: "department" },
  { key: "手術名稱", id: "surgeryName" },
  { key: "主刀醫師", id: "chiefSurgeon" },
  { key: "手術室", id: "operatingRoom" },
  { key: "麻醉方式", id: "anesthesiaMethod" },
  { key: "手術原因", id: "surgeryReason" },
  // ✅ 新增：預估時間（只有選了才會出現）
  { key: "預估時間(分)", id: "estimatedTimeRange", isRange: true },
];

const toInt = (v) =>
  typeof v === "number" ? Math.trunc(v) : (parseInt(v ?? 0, 10) || 0);

export default function FilterDrawer({ open, onClose, onFiltersChange }) {
  const [conditions, setConditions] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [operatingRooms, setOperatingRooms] = useState([]);
  const [surgeries, setSurgeries] = useState([]);

  // 開啟抽屜時抓資料
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [orRes, sRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/system/operating-rooms`),
          axios.get(`${BASE_URL}/api/surgeries`),
        ]);
        setOperatingRooms(orRes.data || []);
        setSurgeries(sRes.data || []);
      } catch (e) {
        console.error("[FilterDrawer] fetch failed:", e);
      }
    })();
  }, [open]);

  // 類別選項
  const optionsMap = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const deptFromOR = uniq(
      (operatingRooms || []).map(
        (or) => or?.department?.name || or?.departmentName
      )
    );
    const roomNames = uniq(
      (operatingRooms || []).map((or) => or?.operatingRoomName || or?.name)
    );
    const sName = uniq((surgeries || []).map((s) => s?.surgeryName));
    const surgeon = uniq(
      (surgeries || []).map(
        (s) => s?.chiefSurgeon?.name || s?.chiefSurgeonName
      )
    );
    const anesthesia = uniq(
      (surgeries || []).map((s) => s?.anesthesiaMethod)
    );
    const reason = uniq((surgeries || []).map((s) => s?.surgeryReason));
    return {
      department: deptFromOR,
      operatingRoom: roomNames,
      surgeryName: sName,
      chiefSurgeon: surgeon,
      anesthesiaMethod: anesthesia,
      surgeryReason: reason,
    };
  }, [operatingRooms, surgeries]);

  // 全部手術的預估時間邊界
  const [baseMin, baseMax] = useMemo(() => {
    const xs = (surgeries || [])
      .map((s) =>
        Number(
          s?.estimatedSurgeryTime ??
          s?.estimated_time ??
          s?.estimatedTime ??
          0
        )
      )
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!xs.length) return [0, 0];
    return [Math.min(...xs), Math.max(...xs)];
  }, [surgeries]);

  // 工具：找/改「預估時間」條件
  const findRangeIdx = () =>
    conditions.findIndex((c) => c.id === "estimatedTimeRange");
  const getRange = () => {
    const i = findRangeIdx();
    return i >= 0 ? conditions[i].values || [baseMin, baseMax] : [baseMin, baseMax];
  };
  const setRange = (mn, mx) => {
    const i = findRangeIdx();
    if (i < 0) return; // 沒加此條件就不做
    const next = [...conditions];
    next[i] = { ...next[i], values: [mn, mx] };
    setConditions(next);
  };
  const clampRange = (min, max) => {
    let a = toInt(min),
      b = toInt(max);
    if (a > b) [a, b] = [b, a];
    a = Math.max(baseMin, Math.min(a, baseMax));
    b = Math.max(baseMin, Math.min(b, baseMax));
    return [a, b];
  };

  // baseMin/baseMax 改變時，把現有 range 條件的值夾回邊界
  useEffect(() => {
    const i = findRangeIdx();
    if (i < 0) return;
    const [curMin, curMax] = getRange();
    const [mn, mx] = clampRange(curMin, curMax);
    if (mn !== curMin || mx !== curMax) setRange(mn, mx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseMin, baseMax]);

  // 下拉清單：尚未加入的條件
  const existingIds = new Set(conditions.map((c) => c.id));
  const remainingDefs = CONDITION_DEFS.filter((d) => !existingIds.has(d.id));

  const addCondition = (def) =>
    setConditions((prev) => {
      if (def.id === "estimatedTimeRange") {
        // 初始值設為全域邊界
        return [...prev, { id: def.id, key: def.key, values: [baseMin, baseMax], isRange: true }];
      }
      return [...prev, { id: def.id, key: def.key, values: [] }];
    });

  const removeCondition = (id) =>
    setConditions((prev) => prev.filter((c) => c.id !== id));

  const updateValues = (id, values) =>
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, values } : c))
    );

  const clearAll = () => setConditions([]);

  // 回拋：只有被加入的條件才會出現在 map，
  // 且「預估時間」只有縮小區間才加入（與全域邊界相同時視為未啟用）
  useEffect(() => {
    const map = {};
    for (const c of conditions) {
      if (c.id === "estimatedTimeRange") {
        const [mn, mx] = Array.isArray(c.values) ? c.values : [baseMin, baseMax];
        if (baseMax > baseMin && (mn > baseMin || mx < baseMax)) {
          map.estimatedTimeRange = [mn, mx];
        }
      } else if (Array.isArray(c.values) && c.values.length > 0) {
        map[c.id] = c.values;
      }
    }
    onFiltersChange?.(map);
  }, [conditions, baseMin, baseMax, onFiltersChange]);

  // chips 顯示（只顯示類別條件）
  const summaryChips = useMemo(() => {
    return conditions
      .filter((c) => c.id !== "estimatedTimeRange")
      .flatMap((c) =>
        (c.values || []).map((v) => ({ id: c.id, key: c.key, value: v }))
      );
  }, [conditions]);

  const removeChip = (id, value) => {
    updateValues(
      id,
      (conditions.find((c) => c.id === id)?.values || []).filter((x) => x !== value)
    );
  };

  // 取得目前 range 值（若未加入此條件不會用到）
  const [timeMin, timeMax] = getRange();
  const rangeDisabled = baseMax <= baseMin;

  return (
    <div
      className={`
        pointer-events-none absolute left-0 top-30 h-full z-[600]
        transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-[320px]"}
      `}
      aria-hidden={!open}
    >
      <div
        className="
          pointer-events-auto w-[300px] h-full bg-white
          border-2 border-blue-400 rounded-md
          shadow-xl p-4 relative flex flex-col
        "
      >
        <div className="flex items-center justify-between">
          <h3 className="text-blue-700 font-bold text-xl">篩選條件</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉篩選器"
            className="text-blue-600 hover:text-blue-800 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="h-[2px] bg-gray-200 my-2" />

        {/* 頂部：已選 chips + 新增條件 */}
        <div className="relative">
          <div
            role="combobox"
            aria-expanded={pickerOpen}
            tabIndex={0}
            onClick={() => setPickerOpen((v) => !v)}
            className="
              w-full min-h-[42px]
              border border-gray-300 rounded-md
              px-2 py-1 pr-10
              flex items-center flex-wrap gap-1
              hover:border-blue-400
              focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500
              cursor-pointer
            "
          >
            {summaryChips.length === 0 ? (
              <span className="text-gray-500">新增篩選條件…</span>
            ) : (
              summaryChips.map((chip, i) => (
                <span
                  key={`${chip.id}-${chip.value}-${i}`}
                  className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded"
                  onClick={(e) => e.stopPropagation()}
                  title={`${chip.key}`}
                >
                  {chip.value}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => removeChip(chip.id, chip.value)}
                    aria-label={`移除 ${chip.key}：${chip.value}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}

            <span
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-600"
              aria-hidden="true"
            >
              <svg
                className={`w-4 h-4 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.957a.75.75 0 111.1 1.02l-4.24 4.52a.75.75 0 01-1.1 0l-4.24-4.52a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </div>

          {pickerOpen && (
            <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-auto bg-white border rounded-md shadow-lg z-[61]">
              {remainingDefs.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">已無可新增條件</div>
              ) : (
                remainingDefs.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => {
                      addCondition(def);
                      setPickerOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50"
                  >
                    {def.key}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* 條件卡片 */}
        <div className="mt-4 space-y-3 overflow-auto pr-1">
          {conditions.map((c) => {
            if (c.id !== "estimatedTimeRange") {
              // 一般（多選）條件
              return (
                <div key={c.id} className="border rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">{c.key}</div>
                    <button
                      type="button"
                      onClick={() => removeCondition(c.id)}
                      className="text-red-500 hover:text-red-600"
                      aria-label={`移除 ${c.key}`}
                    >
                      ✕
                    </button>
                  </div>

                  <MiniMultiSelect
                    options={optionsMap[c.id] || []}
                    values={c.values}
                    onChange={(vals) => updateValues(c.id, vals)}
                    placeholder={`選擇${c.key}…`}
                  />
                </div>
              );
            }

            // ✅ 預估時間（只有選了這個條件才會呈現）
            const [curMin, curMax] = Array.isArray(c.values)
              ? c.values
              : [baseMin, baseMax];
            const [mn, mx] = [curMin, curMax];

            return (
              <div key={c.id} className="border rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">{c.key}</div>
                  <button
                    type="button"
                    onClick={() => removeCondition(c.id)}
                    className="text-red-500 hover:text-red-600"
                    aria-label={`移除 ${c.key}`}
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs text-gray-500 mb-2">
                  全部：{baseMin} ~ {baseMax} 分
                </div>

                <label className="block text-sm text-gray-700 mb-1">
                  最小值(分):
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  disabled={rangeDisabled}
                  className="w-full mb-2 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 disabled:opacity-60"
                  value={mn}
                  min={baseMin}
                  max={mx}
                  onChange={(e) => {
                    const [a, b] = clampRange(e.target.value, mx);
                    setRange(a, b);
                  }}
                />

                <label className="block text-sm text-gray-700 mb-1">
                  最大值(分):
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  disabled={rangeDisabled}
                  className="w-full mb-3 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 disabled:opacity-60"
                  value={mx}
                  min={mn}
                  max={baseMax}
                  onChange={(e) => {
                    const [a, b] = clampRange(mn, e.target.value);
                    setRange(a, b);
                  }}
                />

                <input
                  type="range"
                  className="w-full mb-2"
                  disabled={rangeDisabled}
                  min={baseMin}
                  max={baseMax}
                  step={1}
                  value={mn}
                  onChange={(e) => {
                    const v = toInt(e.target.value);
                    setRange(Math.min(v, mx), mx);
                  }}
                />
                <input
                  type="range"
                  className="w-full"
                  disabled={rangeDisabled}
                  min={baseMin}
                  max={baseMax}
                  step={1}
                  value={mx}
                  onChange={(e) => {
                    const v = toInt(e.target.value);
                    setRange(mn, Math.max(v, mn));
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className=" pt-3">
          <button
            type="button"
            onClick={clearAll}
            className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700"
          >
            清除所有篩選條件
          </button>
        </div>
      </div>
    </div>
  );
}
