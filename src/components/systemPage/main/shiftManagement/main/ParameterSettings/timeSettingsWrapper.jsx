import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../../../../../config";
import "./timeSettingsWrapper.css";

const POST_URL = `${BASE_URL}/api/system/algorithm/time-settings/export`;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const toInt = (v) => (typeof v === "number" ? v : parseInt(v ?? 0, 10) || 0);
const MIN_IN_DAY = 1440;
const TIME_MAX = 23 * 60 + 59;

function minutesToHHmm(mins) {
  if (mins == null || Number.isNaN(mins)) return "00:00";
  const v = clamp(mins, 0, TIME_MAX);
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function parseHHmm(str) {
  if (!str) return null;
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** << 這裡改：接父層 props >>
 * props:
 * - initial: 從父層來的 DTO { surgeryStartTime, regularEndTime, overtimeEndTime, cleaningTime }
 * - onApplied(nextDto): POST 成功後回傳給父層
 */
export default function TimeSettingsWrapper({ initial, onApplied }) {
  const [originAbs, setOriginAbs] = useState(null);
  const [draftAbs, setDraftAbs] = useState({
    startAbs: 0,
    regularAbs: 0,
    overtimeAbs: 0,
    cleaningTime: 0,
  });
  const [txt, setTxt] = useState({ start: "00:00", regular: "00:00", overtime: "00:00", cleaning: "0" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  // << 用父層 initial 初始化 / 同步，不再自己打 GET >>
  useEffect(() => {
    if (!initial) return;
    setLoading(true);
    const sAbs = clamp(toInt(initial.surgeryStartTime), 0, TIME_MAX);
    const dReg = clamp(toInt(initial.regularEndTime), 0, MIN_IN_DAY - 1);
    const dOver = clamp(toInt(initial.overtimeEndTime), 0, MIN_IN_DAY - 1);
    const rAbs = (sAbs + dReg) % MIN_IN_DAY;
    const oAbs = (rAbs + dOver) % MIN_IN_DAY;
    const fixed = {
      startAbs: sAbs,
      regularAbs: rAbs,
      overtimeAbs: oAbs,
      cleaningTime: clamp(toInt(initial.cleaningTime), 0, 24 * 60),
    };
    setOriginAbs(fixed);
    setDraftAbs(fixed);
    setTxt({
      start: minutesToHHmm(fixed.startAbs),
      regular: minutesToHHmm(fixed.regularAbs),
      overtime: minutesToHHmm(fixed.overtimeAbs),
      cleaning: String(fixed.cleaningTime),
    });
    setMsg({ type: "", text: "" });
    setLoading(false);
  }, [initial]);

  // 驗證（開始時間需為 15 的倍數）
  const startParsed = parseHHmm(txt.start);
  const startFmtInvalid = txt.start.length > 0 && startParsed == null;
  const startNotQuarter = txt.start.length > 0 && startParsed != null && (startParsed % 15 !== 0);
  const invalidStart = startFmtInvalid || startNotQuarter;
  const invalidRegular = txt.regular.length > 0 && parseHHmm(txt.regular) == null;
  const invalidOvertime = txt.overtime.length > 0 && parseHHmm(txt.overtime) == null;
  const hasErrors = invalidStart || invalidRegular || invalidOvertime;

  const isDirty = useMemo(() => {
    if (!originAbs) return false;
    return (
      originAbs.startAbs !== draftAbs.startAbs ||
      originAbs.regularAbs !== draftAbs.regularAbs ||
      originAbs.overtimeAbs !== draftAbs.overtimeAbs ||
      originAbs.cleaningTime !== draftAbs.cleaningTime
    );
  }, [originAbs, draftAbs]);

  const onTimeInput = (which) => (e) => {
    const val = e.target.value.replace(/\s+/g, "");
    setTxt((t) => ({ ...t, [which]: val }));
    const mins = parseHHmm(val);
    if (mins == null) return;
    if (which === "start" && mins % 15 !== 0) return; // 開始時間必須 15 的倍數
    setDraftAbs((d) => ({
      ...d,
      startAbs: which === "start" ? mins : d.startAbs,
      regularAbs: which === "regular" ? mins : d.regularAbs,
      overtimeAbs: which === "overtime" ? mins : d.overtimeAbs,
    }));
  };
  const onTimeBlur = () => {
    setTxt((t) => ({
      ...t,
      start: minutesToHHmm(draftAbs.startAbs),
      regular: minutesToHHmm(draftAbs.regularAbs),
      overtime: minutesToHHmm(draftAbs.overtimeAbs),
    }));
  };

  const onCleaningInput = (e) => {
    const raw = e.target.value.replace(/\s+/g, "");
    if (!/^\d*$/.test(raw)) return;
    setTxt((t) => ({ ...t, cleaning: raw }));
    const num = raw === "" ? null : clamp(parseInt(raw, 10) || 0, 0, 24 * 60);
    if (num != null) setDraftAbs((d) => ({ ...d, cleaningTime: num }));
  };
  const onCleaningBlur = () => setTxt((t) => ({ ...t, cleaning: String(draftAbs.cleaningTime) }));

  const onCancel = () => {
    if (!originAbs) return;
    setDraftAbs(originAbs);
    setTxt({
      start: minutesToHHmm(originAbs.startAbs),
      regular: minutesToHHmm(originAbs.regularAbs),
      overtime: minutesToHHmm(originAbs.overtimeAbs),
      cleaning: String(originAbs.cleaningTime),
    });
    setMsg({ type: "", text: "" });
  };

  const onSubmit = async () => {
    if (hasErrors) return;
    setSubmitting(true);
    setMsg({ type: "", text: "" });
    try {
      const { startAbs, regularAbs, overtimeAbs, cleaningTime } = draftAbs;
      const dRegular = (regularAbs - startAbs + MIN_IN_DAY) % MIN_IN_DAY;
      const dOvertime = (overtimeAbs - regularAbs + MIN_IN_DAY) % MIN_IN_DAY;

      const payload = {
        surgeryStartTime: startAbs,
        regularEndTime: dRegular,
        overtimeEndTime: dOvertime,
        cleaningTime,
      };

      const res = await axios.post(POST_URL, payload, { headers: { "Content-Type": "application/json" } });
      setOriginAbs({ ...draftAbs });
      setMsg({ type: "ok", text: res?.data || "已更新時間設定" });

      // << 關鍵：把新的 DTO 回給父層 >>
      if (typeof onApplied === "function") onApplied(payload);
    } catch (e) {
      setMsg({ type: "error", text: e?.response?.data || e?.message || "更新失敗" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="param-card">
      <div className="param-header"><h2 className="paramh2-title">時間設定</h2></div>
      <div className="param-state2">
        <ul
          style={{
            marginTop: "1px",
            marginBottom: 0,
            paddingLeft: "28px",
            listStyle: "disc",
            fontSize: "16px",
            // backgroundColor: "#c1d7ffff",
          }}
        >
          <li style={{ color: "#6b7280" }}>
            <strong>開始時間設定：</strong>指定每日排程開始時間，作為所有手術計算起始點。
          </li>

          <li style={{ color: "#6b7280" }}>
            <strong>一般時段結束設定：</strong>定義正常工作時段的截止時間。
          </li>

          <li style={{ color: "#6b7280" }}>
            <strong>加班時間結束設定：</strong>設定加班時間。
          </li>

          <li style={{ color: "#6b7280" }}>
            <strong>清潔時間設定（分鐘）：</strong>指定每台手術結束後的清潔與銜接時間。
          </li>

          <li style={{ color: "#6b7280" }}>
            <strong>參數套用說明：</strong>調整以上任何參數後，按下確認即可將設定套用至甘特圖。
          </li>

        </ul>
      </div>

      {loading && <div className="param-state">載入中…</div>}
      {!loading && msg.type === "error" && <div className="param-state param-error">錯誤：{msg.text}</div>}
      {!loading && msg.type === "ok" && <div className="param-state param-ok">{msg.text}</div>}

      {
        !loading && (
          <>
            <div className="ts-stack">
              <div className="ts-item">
                <label htmlFor="ts-start">手術開始（HH:mm，分鐘須為 00/15/30/45）</label>
                <input
                  id="ts-start"
                  className={`plain-time ${invalidStart ? "invalid" : ""}`}
                  inputMode="numeric"
                  placeholder="HH:mm"
                  value={txt.start}
                  onChange={onTimeInput("start")}
                  onBlur={onTimeBlur}
                />
                {startFmtInvalid && <div className="error-hint">格式不正確，例：08:30</div>}
                {!startFmtInvalid && (startNotQuarter) && (
                  <div className="error-hint">開始時間分鐘必須為 00/15/30/45</div>
                )}
              </div>

              <div className="ts-item">
                <label htmlFor="ts-regular">一般結束（HH:mm）</label>
                <input
                  id="ts-regular"
                  className={`plain-time ${invalidRegular ? "invalid" : ""}`}
                  inputMode="numeric"
                  placeholder="HH:mm"
                  value={txt.regular}
                  onChange={onTimeInput("regular")}
                  onBlur={onTimeBlur}
                />
                {invalidRegular && <div className="error-hint">格式不正確，例：17:00</div>}
              </div>

              <div className="ts-item">
                <label htmlFor="ts-overtime">超時結束（HH:mm）</label>
                <input
                  id="ts-overtime"
                  className={`plain-time ${invalidOvertime ? "invalid" : ""}`}
                  inputMode="numeric"
                  placeholder="HH:mm"
                  value={txt.overtime}
                  onChange={onTimeInput("overtime")}
                  onBlur={onTimeBlur}
                />
                {invalidOvertime && <div className="error-hint">格式不正確，例：19:30</div>}
              </div>

              <div className="ts-item">
                <label htmlFor="ts-cleaning">清潔時間（分鐘）</label>
                <input
                  id="ts-cleaning"
                  className="plain-number"
                  inputMode="numeric"
                  placeholder="0"
                  value={txt.cleaning}
                  onChange={onCleaningInput}
                  onBlur={onCleaningBlur}
                />
              </div>
            </div>

            {isDirty && (
              <div className="form-actions-bottom">
                <button type="button" className="param-btn confirm" disabled={submitting || hasErrors} onClick={onSubmit}>
                  確認
                </button>
                <button type="button" className="param-btn cancel" disabled={submitting} onClick={onCancel}>
                  取消
                </button>
                {hasErrors && <span className="actions-hint">請先修正上方紅色欄位（開始需為 15 分倍數）</span>}
              </div>
            )}
          </>
        )
      }
    </div >
  );
}
