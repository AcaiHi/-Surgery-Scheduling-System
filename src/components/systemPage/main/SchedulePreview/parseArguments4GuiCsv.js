// src/components/systemPage/main/SchedulePreview/parseArguments4GuiCsv.js

function safeTrim(s) {
  return (s ?? "").toString().trim();
}

function parseIntLoose(str) {
  const s = safeTrim(str);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function minutesToHHMM(totalMinutes) {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * TSV / CSV / whitespace smart split
 */
function splitLineSmart(line) {
  const raw = (line ?? "").toString().replace(/\uFEFF/g, "");
  if (raw.includes("\t")) {
    return raw.split("\t").map((x) => x.trim());
  }
  if (raw.includes(",")) {
    return raw.split(",").map((x) => x.trim());
  }
  return raw.split(/\s{2,}|\s+/).map((x) => x.trim());
}

/**
 * token 範例：
 * 黃富鼎(surg_1_420~540_)
 */
function parseSurgeryToken(token, fallbackDateISO, startMinAbs) {
  const t = safeTrim(token);
  if (!t) return null;

  const m = t.match(/^(.+?)\((.+)\)\s*([*]?)\s*$/);
  if (!m) return null;

  const doctorName = safeTrim(m[1]);
  const inner = safeTrim(m[2]);
  const tailStar = safeTrim(m[3]);

  const idMatch = inner.match(/^surg_(\d+)/);
  const surgeryId = idMatch ? idMatch[1] : "";

  const range = inner.match(/_(\d+)\s*~\s*(\d+)_/);
  if (!range) return null;

  const startOffset = parseIntLoose(range[1]);
  const endOffset = parseIntLoose(range[2]);
  if (startOffset == null || endOffset == null) return null;

  const startAbs = startMinAbs + startOffset;
  const endAbs = startMinAbs + endOffset;

  return {
    _uid: `${fallbackDateISO}_${doctorName}_${startOffset}_${endOffset}_${surgeryId}`,
    date: fallbackDateISO,
    doctor: doctorName,
    startTime: minutesToHHMM(startAbs),
    endTime: minutesToHHMM(endAbs),
    meta: {
      surgeryId,
      startOffsetMin: startOffset,
      endOffsetMin: endOffset,
      isPriority: inner.includes("#"),
      isSevereOvertime: inner.includes("*") || tailStar === "*",
    },
  };
}

export function parseArguments4GuiCsv(csvText, fallbackDateISO) {
  const lines = (csvText || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\uFEFF/g, ""));

  // 找表頭
  const headerIdx = lines.findIndex((l) =>
    safeTrim(l).startsWith("手術房間名稱")
  );
  if (headerIdx === -1) {
    return { scheduleData: [], csvDefaults: null };
  }

  // ---------- 表頭上方參數 ----------
  const pre = lines.slice(0, headerIdx).filter((l) => safeTrim(l) !== "");

  const row0 = pre[0] ? splitLineSmart(pre[0]) : [];
  const row1 = pre[1] ? splitLineSmart(pre[1]) : [];
  const row2 = pre[2] ? splitLineSmart(pre[2]) : [];
  const row3 = pre[3] ? splitLineSmart(pre[3]) : [];
  const row4 = pre[4] ? splitLineSmart(pre[4]) : [];
  const row5 = pre[5] ? splitLineSmart(pre[5]) : [];

  const pdfAllRoomsPath = safeTrim(row0[0] || "");
  const pdfSingleRoomPath = safeTrim(row1[0] || "");

  const startMin = parseIntLoose(row2[0]) ?? 510;
  const normalMax = parseIntLoose(row3[0]) ?? 0;
  const overtimeMax = parseIntLoose(row4[0]) ?? 0;
  const cleaningMin = parseIntLoose(row5[0]) ?? 45;

  const normalEndAbs = startMin + normalMax;
  const overtimeEndAbs = normalEndAbs + overtimeMax;

  const csvDefaults = {
    pdfAllRoomsPath,
    pdfSingleRoomPath,
    surgeryStart: minutesToHHMM(startMin),
    normalEnd: minutesToHHMM(normalEndAbs),
    overtimeEnd: minutesToHHMM(overtimeEndAbs),
    cleaningMin,
    _raw: {
      startMin,
      normalMaxMin: normalMax,
      overtimeMaxMin: overtimeMax,
      cleaningMin,
    },
  };

  // ---------- 房間表 ----------
  const dataLines = lines
    .slice(headerIdx + 1)
    .map((l) => l.trimEnd());

  const stopIdx = dataLines.findIndex((l) =>
    safeTrim(l).startsWith("手術總數")
  );
  const tableLines = (stopIdx === -1
    ? dataLines
    : dataLines.slice(0, stopIdx)
  ).filter((l) => safeTrim(l) !== "");

  const roomMap = new Map();

  for (const line of tableLines) {
    const cols = splitLineSmart(line).filter(Boolean);
    if (cols.length < 3) continue;

    const roomName = safeTrim(cols[0]);
    if (!roomName) continue;

    const tokens = cols.slice(2);

    const surgeries = tokens
      .map((t) => parseSurgeryToken(t, fallbackDateISO, startMin))
      .filter(Boolean)
      .map((s) => ({
        ...s,
        room: roomName,
      }));

    roomMap.set(roomName, surgeries);
  }

  const scheduleData = Array.from(roomMap.entries()).map(
    ([room, surgeries]) => ({
      room,
      surgeries,
    })
  );

  return { scheduleData, csvDefaults };
}
