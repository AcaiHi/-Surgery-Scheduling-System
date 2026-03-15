import { getColorByEndTime } from '../ROOM/colorUtils';   

const parseCSV = (data) => {
  const rows = data.split("\n");
  const parsedData = [];
  let currentRoom = "";
  let currentRow = [];

  rows.forEach((line, index) => {
    if (index === 0) return;

    const columns = line.split(",");
    
    if (columns[0] && !columns[1]) {
      if (currentRow.length > 0) {
        parsedData.push({ room: currentRoom, data: currentRow });
      }
      currentRoom = columns[0];
      currentRow = [];
    } else if (columns[1]) {
      const [day, doctor, surgery, startTime, endTime, status] = columns;
      if (day.trim() !== '第一天') {
        const isCleaningTime = status.trim() === '4';
        currentRow.push({
          id: `${doctor}-${surgery}-${Math.random()}`,
          color: getColorByEndTime(endTime.trim(), isCleaningTime),
          doctor: doctor.trim() !== 'null' ? doctor.trim() : '',
          surgery: surgery.trim(),
          startTime: startTime.trim(),
          endTime: endTime.trim(),
        });
      }
    }
  });

  if (currentRow.length > 0) {
    parsedData.push({ room: currentRoom, data: currentRow });
  }

  return parsedData;
};

export default parseCSV;