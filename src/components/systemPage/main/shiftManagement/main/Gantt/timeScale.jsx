function TimeScale({ timeSettings, scrollRef, onHostScroll, endAbs }) {
  const startMin = Number(timeSettings?.surgeryStartTime ?? 510);
  const ticks = [];

  for (let abs = startMin; abs <= endAbs; abs += 15) {
    const isHour = abs % 60 === 0;
    const dayRel = abs % 1440;
    const hour = Math.floor(dayRel / 60);
    const min = dayRel % 60;
    const label =
      dayRel === 0 && abs > 0 ? "24:00" :
      `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    ticks.push({ abs, isHour, label, isMidnight: dayRel === 0 && abs > 0 });
  }

  return (
    <div className="time-scale" ref={scrollRef} onScroll={onHostScroll}>
      <div className="time-scale-track" style={{ width: `var(--timeline-width)` }}>
        {ticks.map((t) => (
          <div
            key={t.abs}
            className={`tick ${t.isHour ? "tick--hour" : "tick--q"} ${t.isMidnight ? "tick--midnight" : ""}`}
          >
            {t.isHour && <span className="tick-label">{t.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TimeScale;
