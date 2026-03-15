// settingsWrapper.jsx
import RoomStatusSettingWrapper from "./roomStatusSettingWrapper";
import TimeSettingsWrapper from "./timeSettingsWrapper";
import "./settingsWrapper.css";

function SettingsWrapper({ timeSettings, onApply, operatingRooms, onRoomsChange }) {
  return (
    <div className="settings-row">
      <section className="settings-col">
        <TimeSettingsWrapper initial={timeSettings} onApplied={onApply} />
      </section>
      <section className="settings-col">
        <RoomStatusSettingWrapper rooms={operatingRooms} onRoomsChange={onRoomsChange} />
      </section>
    </div>
  );
}

export default SettingsWrapper;
