package com.backend.project.Service;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.io.Writer;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.backend.project.Dao.OperatingRoomRepository;
import com.backend.project.Dao.SurgeryRepository;
import com.backend.project.Dto.TimeSettingsDTO;
import com.backend.project.model.OperatingRoom;
import com.backend.project.model.Surgery;
import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import com.opencsv.exceptions.CsvException;
import com.opencsv.exceptions.CsvValidationException;

@Service
public class AlgorithmService {

    private static final String BATCH_FILE_PATH = "Surgery-Scheduling-SA_SGDR/runScheduler.bat";

    @Value("${time-table.export.path}")
    private String TIME_TABLE_FILE_PATH;

    private String ORSM_FILE_PATH = "Surgery-Scheduling-SA_SGDR/data/in";

    private String ORSM_GUIDELINES_FILE_PATH = "Surgery-Scheduling-SA_SGDR/data/out";

    @Autowired
    private SurgeryRepository surgeryRepository;

    @Autowired
    private OperatingRoomRepository operatingRoomRepository;

    @Autowired
    @Lazy
    private SurgeryService surgeryService;

    /** 儲存釘選的手術房（不參與演算法） */
    private final Map<String, Boolean> pinnedRooms = new ConcurrentHashMap<>();

    /** 被演算法輸入應排除的手術房：關閉(status==0) 或 已釘選(pinned) 即排除 */
    private boolean shouldExcludeFromAlgorithm(OperatingRoom room) {
        if (room == null)
            return true;
        if (room.getStatus() == 0)
            return true; // 關閉/停用的房
        if (Boolean.TRUE.equals(pinnedRooms.get(room.getId())))
            return true; // 釘選的房
        return false;
    }

    /** 方便在只有 roomId 時做 pinned 檢查 */
    private boolean isPinned(String roomId) {
        return Boolean.TRUE.equals(pinnedRooms.get(roomId));
    }

    public void runBatchFile(List<String> closedRoomIds) throws Exception {
        exportSurgeriesToCsv(closedRoomIds);
        exportOperatingRoomToCsv(closedRoomIds);

        try {
            File batchFile = new File(BATCH_FILE_PATH);

            File fullPathBatch = new File(System.getProperty("user.dir"), BATCH_FILE_PATH).getAbsoluteFile();

            ProcessBuilder processBuilder = new ProcessBuilder("cmd.exe", "/c", fullPathBatch.getAbsolutePath());
            processBuilder.directory(fullPathBatch.getParentFile());
            processBuilder.inheritIO();

            Process process = processBuilder.start();
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new Exception("批處理執行失敗，錯誤代碼: " + exitCode);
            }
        } catch (IOException | InterruptedException e) {
            throw new Exception("演算法執行失敗: " + e.getMessage(), e);
        }

        try {
            cleanEmptySurgeonsAndShiftForward(ORSM_GUIDELINES_FILE_PATH + "/Guidelines.csv");
            addPinnedOperatingRoomToCsv();
            parseCsvAndUpdateOrder(ORSM_GUIDELINES_FILE_PATH + "/Guidelines.csv");
            copyGuidelines();
        } catch (Exception e) {
            throw new Exception("演算法後處理失敗: " + e.getMessage(), e);
        }
    }

    /** 匯出手術到 TimeTable.csv（排除：關閉房、釘選房） */
    public void exportSurgeriesToCsv(List<String> closedRoomIds) {
        List<Surgery> surgeries = surgeryRepository.findAll();
        List<OperatingRoom> operatingRooms = operatingRoomRepository.findAllWithoutSurgeries();
        String filePath = TIME_TABLE_FILE_PATH + "/TimeTable.csv";
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        String tomorrowDate = LocalDate.now().plusDays(1).format(formatter);

        Map<String, Boolean> firstSurgeryMap = new HashMap<>();
        Set<String> processedGroupIds = new HashSet<>(); // 已處理過的群組 id

        try (OutputStreamWriter osw = new OutputStreamWriter(new FileOutputStream(filePath), Charset.forName("UTF-8"));
                BufferedWriter writer = new BufferedWriter(osw);
                CSVWriter csvWriter = new CSVWriter(writer,
                        CSVWriter.DEFAULT_SEPARATOR,
                        CSVWriter.NO_QUOTE_CHARACTER,
                        CSVWriter.DEFAULT_ESCAPE_CHARACTER,
                        CSVWriter.DEFAULT_LINE_END)) {

            // 寫入 BOM 以避免 Excel 亂碼
            osw.write("\uFEFF");

            // 1) 寫入所有「非釘選且狀態非 0」手術房的實際手術（群組只寫主手術）
            for (Surgery surgery : surgeries) {
                OperatingRoom room = surgery.getOperatingRoom();
                if (shouldExcludeFromAlgorithm(room)) {
                    // 釘選或關閉的房：完全不進演算法
                    continue;
                }

                List<String> groupIds = surgery.getGroupApplicationIds();
                String applicationId = surgery.getApplicationId();

                if (groupIds != null && !groupIds.isEmpty()) {
                    String groupKey = String.join(",", groupIds);
                    if (processedGroupIds.contains(groupKey)) {
                        continue; // 同一群組只寫一次（第一筆）
                    }
                    processedGroupIds.add(groupKey);
                }

                String EST = surgery.getEstimatedSurgeryTime().toString();
                String departmentName = room.getDepartment().getName().replace("\n", " ");
                String chiefSurgeonName = surgery.getChiefSurgeon().getName().replace("\n", " ");
                String operatingRoomName = room.getOperatingRoomName();

                String dateSuffix = firstSurgeryMap.getOrDefault(operatingRoomName, false) ? "TF" : "0830";
                firstSurgeryMap.put(operatingRoomName, true);

                String[] data = {
                        tomorrowDate + " " + dateSuffix,
                        applicationId,
                        surgery.getMedicalRecordNumber(),
                        departmentName,
                        chiefSurgeonName,
                        operatingRoomName,
                        surgery.getAnesthesiaMethod(),
                        EST,
                        surgery.getReq() == null ? "N" : surgery.getReq(),
                        String.valueOf(surgery.getPrioritySequence())
                };
                csvWriter.writeNext(data);
            }

            // 2) 為「開啟且未釘選」但沒有手術或尚未寫第一筆手術的房，補上空房佔位（空醫師）
            if (operatingRooms != null && !operatingRooms.isEmpty()) {
                for (OperatingRoom room : operatingRooms) {
                    if (shouldExcludeFromAlgorithm(room)) {
                        continue;
                    }
                    String roomName = room.getOperatingRoomName();
                    if (Boolean.TRUE.equals(firstSurgeryMap.get(roomName))) {
                        continue; // 已有手術，略過
                    }
                    String[] data = {
                            tomorrowDate + " 0830",
                            "000000",
                            "000000",
                            room.getDepartment().getName(),
                            "空醫師",
                            roomName,
                            "GA",
                            "0",
                            "N",
                            "99999",
                    };
                    csvWriter.writeNext(data);
                }
            }

        } catch (IOException e) {
        }
    }

    /** 匯出手術房名到 room.csv（排除：關閉房、釘選房） */
    public void exportOperatingRoomToCsv(List<String> closedRoomIds) {
        List<OperatingRoom> operatingRooms = operatingRoomRepository.findAll();
        String filePath = ORSM_FILE_PATH + "/room.csv";

        Set<String> roomNamesOfAll = new LinkedHashSet<>();
        Set<String> roomNames4Orth = new LinkedHashSet<>();

        for (OperatingRoom room : operatingRooms) {
            if (shouldExcludeFromAlgorithm(room)) {
                // 關閉或釘選 → 不出現在 room.csv
                continue;
            }

            String name = room.getOperatingRoomName();
            if (name == null || name.isBlank())
                continue;

            String type = room.getRoomType();
            roomNamesOfAll.add(name);

            if ("鉛牆房".equals(type)) {
                roomNames4Orth.add(name);
            }
        }

        // 如需強制把 closedRoomIds 的房名加入（即使 status==0），可開啟下列區塊；
        // 但若該房被釘選，仍然排除（不進演算法）。
        /*
         * if (closedRoomIds != null) {
         * for (String roomId : closedRoomIds) {
         * operatingRoomRepository.findById(roomId).ifPresent(room -> {
         * if (isPinned(room.getId())) {
         * System.out.println("[略過] closedRoomIds 包含被釘選房，從 room.csv 排除: " +
         * room.getOperatingRoomName());
         * return;
         * }
         * String name = room.getOperatingRoomName();
         * String type = room.getRoomType();
         * if (name != null && !name.isBlank()) {
         * roomNamesOfAll.add(name);
         * if ("鉛牆房".equals(type)) {
         * roomNames4Orth.add(name);
         * }
         * System.out.println("[強制加入-closedRoomIds] 房號: " + name + " 類型: [" + (type ==
         * null ? "" : type) + "]");
         * }
         * });
         * }
         * }
         */

        try (OutputStreamWriter osw = new OutputStreamWriter(new FileOutputStream(filePath), Charset.forName("UTF-8"));
                BufferedWriter writer = new BufferedWriter(osw);
                CSVWriter csvWriter = new CSVWriter(writer,
                        CSVWriter.DEFAULT_SEPARATOR,
                        CSVWriter.DEFAULT_QUOTE_CHARACTER,
                        CSVWriter.DEFAULT_ESCAPE_CHARACTER,
                        CSVWriter.DEFAULT_LINE_END)) {

            writer.write("# roomNamesOfAll");
            writer.newLine();
            csvWriter.writeNext(new String[] { String.join(",", roomNamesOfAll) });

            writer.write("# roomNames4Orth");
            writer.newLine();
            csvWriter.writeNext(new String[] { String.join(",", roomNames4Orth) });

        } catch (IOException e) {
        }
    }

    /** 釘選房不參與演算法；演算法結束後把釘選房資料附加寫入 Guidelines.csv */
    public void addPinnedOperatingRoomToCsv() {
        String filePath = ORSM_GUIDELINES_FILE_PATH + "/Guidelines.csv";
        String argumentsFilePath = ORSM_FILE_PATH + "/Arguments4Exec.csv";

        int startSchedulingTime = 0;
        int connectionTime = 0;

        // 讀 Arguments4Exec.csv
        try {
            List<String> lines = Files.readAllLines(Paths.get(argumentsFilePath), Charset.forName("UTF-8"));
            int lineNumber = 0;
            for (String line : lines) {
                lineNumber++;
                if (line.startsWith("#"))
                    continue;
                line = line.trim();
                if (line.isEmpty())
                    continue;

                if (lineNumber == 2) {
                    startSchedulingTime = Integer.parseInt(line);
                } else if (lineNumber == 8) {
                    connectionTime = Integer.parseInt(line);
                }
            }
        } catch (IOException e) {
        }

        // 這個 findAll 只用來找出有哪些 room 有被釘選（後面會用 roomId 去查真正排序好的清單）
        List<Surgery> surgeries = surgeryRepository.findAll();

        try (OutputStreamWriter osw = new OutputStreamWriter(new FileOutputStream(filePath, true), "UTF-8");
                BufferedWriter writer = new BufferedWriter(osw);
                CSVWriter csvWriter = new CSVWriter(writer,
                        CSVWriter.DEFAULT_SEPARATOR,
                        CSVWriter.NO_QUOTE_CHARACTER,
                        CSVWriter.DEFAULT_ESCAPE_CHARACTER,
                        CSVWriter.DEFAULT_LINE_END)) {

            Set<String> processedRooms = new HashSet<>();
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");

            for (Surgery surgery : surgeries) {
                if (surgery.getOperatingRoom() == null) {
                    continue;
                }
                String operatingRoomId = surgery.getOperatingRoom().getId();

                // 只處理「有被釘選」且「尚未寫過」的房
                if (Boolean.TRUE.equals(pinnedRooms.get(operatingRoomId))
                        && !processedRooms.contains(operatingRoomId)) {

                    String operatingRoomName = surgery.getOperatingRoom().getOperatingRoomName();
                    csvWriter.writeNext(new String[] { operatingRoomName });

                    processedRooms.add(operatingRoomId);

                    // ★★★ 關鍵：這裡改成「依原本 orderInRoom 排序」
                    List<Surgery> roomSurgeries = surgeryRepository
                            .findByOperatingRoom_IdOrderByOrderInRoomAsc(operatingRoomId);

                    int previousEndTime = startSchedulingTime;

                    for (Surgery currentSurgery : roomSurgeries) {
                        if (currentSurgery == null)
                            continue;

                        String EST = currentSurgery.getEstimatedSurgeryTime().toString();
                        String chiefSurgeonName = currentSurgery.getChiefSurgeon().getName().replace("\n", " ");

                        int surgeryStartTime = previousEndTime;
                        int surgeryEndTime = surgeryStartTime + Integer.parseInt(EST);
                        surgeryStartTime = surgeryStartTime % 1440;
                        surgeryEndTime = surgeryEndTime % 1440;

                        previousEndTime = surgeryEndTime + connectionTime;

                        String startTimeFormatted = LocalTime
                                .ofSecondOfDay(surgeryStartTime * 60)
                                .format(timeFormatter);
                        String endTimeFormatted = LocalTime
                                .ofSecondOfDay(surgeryEndTime * 60)
                                .format(timeFormatter);

                        // 手術列
                        String[] surgeryData = {
                                "第1天",
                                chiefSurgeonName,
                                currentSurgery.getApplicationId() + "(" + EST + ")",
                                startTimeFormatted,
                                endTimeFormatted,
                                "1"
                        };
                        csvWriter.writeNext(surgeryData);

                        int cleaningMinutes = 80; // 先沿用你原本的 80，之後要讀設定再改這行
                        int cleaningEndTime = (surgeryEndTime + cleaningMinutes) % 1440; // 確保在 0~1439 之間
                        String cleaningEndFormatted = LocalTime
                                .ofSecondOfDay(cleaningEndTime * 60L) // 這裡一定不會再超過 86399
                                .format(timeFormatter);

                        String[] cleaningData = {
                                "第1天",
                                "null",
                                "整理時間",
                                endTimeFormatted,
                                cleaningEndFormatted,
                                "4"
                        };
                        csvWriter.writeNext(cleaningData);
                    }
                }
            }

        } catch (IOException e) {
        }
    }

    public void copyGuidelines() throws IOException {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        String timestamp = String.valueOf(System.currentTimeMillis());

        String outputFileNameOfGuidelines = date + "_Guidelines" + timestamp + ".csv";
        String outputFileNameOfTimeTable = date + "_TimeTable" + timestamp + ".csv";

        Path inputPathOfGuidelines = Paths.get(ORSM_GUIDELINES_FILE_PATH, "Guidelines.csv");
        Path inputPathOfTimeTable = Paths.get(ORSM_GUIDELINES_FILE_PATH, "newTimeTable.csv");
        Path outputDir = Paths.get(ORSM_GUIDELINES_FILE_PATH, "Backup4Guidelines");

        if (!Files.exists(outputDir)) {
            Files.createDirectories(outputDir);
        }

        Path outputPathOfGuidelines = outputDir.resolve(outputFileNameOfGuidelines);
        Path outputPathOfTimeTable = outputDir.resolve(outputFileNameOfTimeTable);

        try (
                Reader readerOfGuidelines = Files.newBufferedReader(inputPathOfGuidelines, Charset.forName("UTF-8"));
                CSVReader csvReaderOfGuidelines = new CSVReader(readerOfGuidelines);

                Reader readerOfTimeTable = Files.newBufferedReader(inputPathOfTimeTable, Charset.forName("UTF-8"));
                CSVReader csvReaderOfTimeTable = new CSVReader(readerOfTimeTable);

                Writer writerGuidelines = Files.newBufferedWriter(outputPathOfGuidelines, Charset.forName("UTF-8"));
                CSVWriter csvWriterGuidelines = new CSVWriter(writerGuidelines);

                Writer writerTimeTable = Files.newBufferedWriter(outputPathOfTimeTable, Charset.forName("UTF-8"));
                CSVWriter csvWriterTimeTable = new CSVWriter(writerTimeTable)) {
            String[] nextLine;
            while ((nextLine = csvReaderOfGuidelines.readNext()) != null) {
                csvWriterGuidelines.writeNext(nextLine);
            }
            while ((nextLine = csvReaderOfTimeTable.readNext()) != null) {
                csvWriterTimeTable.writeNext(nextLine);
            }
        } catch (CsvValidationException e) {
        }

    }

    public void exportArgumentsToCsv(String startTime, String normalTime, String maxTime, String bridgeTime) {
        String filePath = ORSM_FILE_PATH + "/Arguments4Exec.csv";

        try (OutputStreamWriter osw = new OutputStreamWriter(new FileOutputStream(filePath), Charset.forName("UTF-8"));
                BufferedWriter writer = new BufferedWriter(osw);
                CSVWriter csvWriter = new CSVWriter(writer,
                        CSVWriter.DEFAULT_SEPARATOR,
                        CSVWriter.NO_QUOTE_CHARACTER,
                        CSVWriter.DEFAULT_ESCAPE_CHARACTER,
                        "\n")) {

            String[] data = {
                    "#每日開始排程時間 (分)。例如：510 表示 08:30、540 表示 09:00",
                    (startTime.isEmpty() ? "510" : startTime),
                    "#每日允許可用的最大常規期間 (分)。預設：540",
                    (normalTime.isEmpty() ? "540" : normalTime),
                    "#每日允許可用的最大超時期間 (分)。預設：120",
                    (maxTime.isEmpty() ? "120" : maxTime),
                    "#兩檯手術之間的銜接期間 (分)。預設：60",
                    (bridgeTime.isEmpty() ? "60" : bridgeTime)
            };
            for (String line : data) {
                csvWriter.writeNext(new String[] { line });
            }

        } catch (IOException e) {
        }
    }

    public TimeSettingsDTO getTimeSettingsFromCsv() {
        TimeSettingsDTO dto = new TimeSettingsDTO();

        try (CSVReader csvReader = new CSVReader(
                new FileReader(ORSM_FILE_PATH + "/Arguments4Exec.csv", Charset.forName("UTF-8")))) {
            String[] nextLine;
            int lineNumber = 0;

            while ((nextLine = csvReader.readNext()) != null) {
                if (nextLine[0].startsWith("#")) {
                    continue;
                }
                if (lineNumber == 0) {
                    dto.setSurgeryStartTime(Integer.parseInt(nextLine[0].trim()));
                } else if (lineNumber == 1) {
                    dto.setRegularEndTime(Integer.parseInt(nextLine[0].trim()));
                } else if (lineNumber == 2) {
                    dto.setOvertimeEndTime(Integer.parseInt(nextLine[0].trim()));
                } else if (lineNumber == 3) {
                    dto.setCleaningTime(Integer.parseInt(nextLine[0].trim()));
                }
                lineNumber++;
            }
        } catch (IOException | CsvValidationException e) {
            return null;
        }

        return dto;
    }

    public void setPinned(String roomId, boolean isPinned) {
        pinnedRooms.put(roomId, isPinned);
    }

    public void processGuidelinesCsv(String csvPath) throws Exception {
        Path path = Paths.get(csvPath);
        Charset utf8 = Charset.forName("UTF-8");
        List<String[]> updatedRows = new ArrayList<>();

        TimeSettingsDTO settings = getTimeSettingsFromCsv();
        if (settings == null) {
            return;
        }
        int cleaningTime = settings.getCleaningTime();

        List<String[]> originalRows;
        try (CSVReader reader = new CSVReader(new InputStreamReader(new FileInputStream(path.toFile()), utf8))) {
            originalRows = reader.readAll();
        }

        for (int i = 0; i < originalRows.size(); i++) {
            String[] row = originalRows.get(i);
            updatedRows.add(row);

            if (i == 0)
                continue; // 跳過第一行
            if (row.length < 6)
                continue; // 跳過逗號數小於5的行
            if ("整理時間".equals(row[2]))
                continue; // 跳過整理時間行

            String rawSurgeryName = row[2];
            String applicationId = extractApplicationId(rawSurgeryName);
            if (applicationId == null) {
                continue;
            }

            Surgery surgery = surgeryRepository.findById(applicationId).orElseThrow();
            if (surgery == null) {
                continue;
            }
            if (surgery.getGroupApplicationIds() == null) {
                continue;
            }

            List<String> groupIds = surgery.getGroupApplicationIds();
            List<String> otherIds = groupIds.stream()
                    .filter(id -> !id.equals(applicationId))
                    .collect(Collectors.toList());
            if (otherIds.isEmpty()) {
                continue;
            }

            String day = row[0];
            String startTimeStr = row[3];

            LocalTime cursorTime = parseCustomTime(startTimeStr);
            List<String[]> insertedRows = new ArrayList<>();

            int duration = surgery.getEstimatedSurgeryTime();
            LocalTime endTime = cursorTime.plusMinutes(duration);
            row[4] = formatCustomTime(endTime);

            cursorTime = endTime;
            endTime = cursorTime.plusMinutes(cleaningTime);
            insertedRows.add(
                    new String[] { day, "null", "整理時間", formatCustomTime(cursorTime), formatCustomTime(endTime), "4" });
            cursorTime = endTime;

            for (String otherId : otherIds) {
                Surgery other = surgeryRepository.findById(otherId).orElseThrow();
                if (other == null) {
                    continue;
                }
                int est = other.getEstimatedSurgeryTime();
                LocalTime otherEnd = cursorTime.plusMinutes(est);
                insertedRows.add(new String[] {
                        day,
                        other.getChiefSurgeon().getName(),
                        formatSurgeryName(otherId),
                        formatCustomTime(cursorTime),
                        formatCustomTime(otherEnd),
                        "1"
                });
                        + formatCustomTime(otherEnd));
                cursorTime = otherEnd;

                LocalTime cleanEnd = cursorTime.plusMinutes(cleaningTime);
                insertedRows.add(new String[] { day, "null", "整理時間", formatCustomTime(cursorTime),
                        formatCustomTime(cleanEnd), "4" });
                cursorTime = cleanEnd;
            }

            updatedRows.addAll(insertedRows);
        }

        try (CSVWriter writer = new CSVWriter(new OutputStreamWriter(new FileOutputStream(path.toFile()), utf8))) {
            writer.writeAll(updatedRows);
        }
    }

    private String extractApplicationId(String surgeryName) {
        if (surgeryName == null)
            return null;
        int idx = surgeryName.indexOf("(");
        return idx > 0 ? surgeryName.substring(0, idx) : surgeryName;
    }

    private String formatSurgeryName(String id) {
        return id + "(TF)";
    }

    private LocalTime parseCustomTime(String timeStr) {
        String[] parts = timeStr.split(":");
        int hour = Integer.parseInt(parts[0]);
        int minute = Integer.parseInt(parts[1]);
        return LocalTime.of(hour, minute);
    }

    private String formatCustomTime(LocalTime time) {
        return String.format("%d:%02d", time.getHour(), time.getMinute());
    }

    @Transactional
    public void parseCsvAndUpdateOrder(String csvPath) throws Exception {
        Path path = Paths.get(csvPath);
        Charset utf8 = Charset.forName("UTF-8");

        List<String[]> rows;
        try (CSVReader reader = new CSVReader(
                new InputStreamReader(new FileInputStream(path.toFile()), Charset.forName("UTF-8")))) {
            rows = reader.readAll();
        }

        OperatingRoom currentRoom = null;
        int orderInRoom = 1;

        int rowIndex = 0;
        for (String[] row : rows) {
            rowIndex++;

            if (row.length == 0 || row[0].trim().isEmpty()) {
                continue;
            }

            String firstCol = row[0].trim();

            if (firstCol.matches("^[A-Z]\\d+$")) {
                if (currentRoom != null) {
                    surgeryService.updateSurgeryPrioritySequenceByRoom(currentRoom.getId());
                }

                currentRoom = operatingRoomRepository.findByOperatingRoomName(firstCol)
                        .orElseThrow(() -> new RuntimeException("找不到手術房：" + firstCol));
                orderInRoom = 1;
                continue;
            }

            if (row.length < 3) {
                continue;
            }

            String surgeryName = row[2].trim();

            if (surgeryName == null || surgeryName.contains("整理時間") || !surgeryName.matches("^\\d+\\(.*\\)$")) {
                continue;
            }

            String applicationId = surgeryName.split("\\(")[0].trim();

            if ("000000".equals(applicationId)) {
                continue;
            }
            Surgery surgery = surgeryRepository.findById(applicationId)
                    .orElseThrow(() -> new RuntimeException("找不到手術：" + applicationId));

            if (surgery.getGroupApplicationIds() != null && !surgery.getGroupApplicationIds().isEmpty()) {
                List<String> groupIds = surgery.getGroupApplicationIds();
                List<Surgery> groupSurgeries = surgeryRepository.findAllById(groupIds);
                for (Surgery groupSurgery : groupSurgeries) {
                    groupSurgery.setOperatingRoom(currentRoom);
                }
                surgeryRepository.saveAll(groupSurgeries);
                        "🔁 群組手術同步更新了 " + groupSurgeries.size() + " 台手術的手術房為：" + currentRoom.getOperatingRoomName());
            }

            if (currentRoom == null) {
                throw new RuntimeException("無對應手術房，手術 ID: " + applicationId);
            }

            surgery.setOperatingRoom(currentRoom);
            surgery.setOrderInRoom(orderInRoom);
            surgeryRepository.save(surgery);

                    + orderInRoom);
            orderInRoom++;
        }

        if (currentRoom != null) {
            surgeryService.updateSurgeryPrioritySequenceByRoom(currentRoom.getId());
        }

    }

    public void cleanEmptySurgeonsAndShiftForward(String csvPath) throws IOException {
        Path path = Paths.get(csvPath);
        Charset utf8 = Charset.forName("UTF-8");

        List<String[]> originalRows;
        try (CSVReader reader = new CSVReader(new InputStreamReader(new FileInputStream(path.toFile()), utf8))) {
            originalRows = reader.readAll();
        } catch (IOException | CsvException e) {
            return;
        }

        TimeSettingsDTO settings = getTimeSettingsFromCsv();
        if (settings == null) {
            return;
        }
        int cleaningTime = settings.getCleaningTime();

        List<String[]> filteredRows = new ArrayList<>();
        int i = 0;
        while (i < originalRows.size()) {
            String[] row = originalRows.get(i);

            if (row.length == 1 && !row[0].trim().isEmpty()) {
                filteredRows.add(row); // 房間代碼
                i++;
                continue;
            }

            if (row.length < 6) {
                filteredRows.add(row);
                i++;
                continue;
            }

            String surgeon = row[1].trim();
            String status = row[5].trim();

            if ((surgeon.equals("空醫師") || surgeon.equals("null")) && status.equals("1")) {
                i += 2; // 跳過手術與整理時間
                continue;
            }

            filteredRows.add(row);
            i++;
        }

        List<String[]> adjustedRows = new ArrayList<>();
        for (String[] row : filteredRows) {
            if (row.length == 1) {
                adjustedRows.add(row);
                continue;
            }

            if (row.length < 6) {
                adjustedRows.add(row);
                continue;
            }

            try {
                LocalTime start = parseCustomTime(row[3]);
                LocalTime end = parseCustomTime(row[4]);

                start = start.minusMinutes(cleaningTime);
                end = end.minusMinutes(cleaningTime);

                row[3] = formatCustomTime(start);
                row[4] = formatCustomTime(end);
            } catch (Exception e) {
            }

            adjustedRows.add(row);
        }

        try (CSVWriter writer = new CSVWriter(new OutputStreamWriter(new FileOutputStream(path.toFile()), utf8))) {
            writer.writeAll(adjustedRows);
        }

    }
}
