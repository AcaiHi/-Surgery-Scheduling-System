package com.backend.project.Service;

import com.backend.project.Controller.ScheduleSnapshotController;
import com.backend.project.Dao.OperatingRoomRepository;
import com.backend.project.Dao.SurgeryRepository;
import com.backend.project.Dto.TimeSettingsDTO;
import com.backend.project.model.OperatingRoom;
import com.backend.project.model.Surgery;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SnapshotService {

    private final OperatingRoomRepository operatingRoomRepository;
    private final SurgeryRepository surgeryRepository;
    private final AlgorithmService algorithmService;

    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${snapshot.export.dir:./snapshots}")
    private String exportDir;

    @Value("${snapshot.filename.prefix:schedule-}")
    private String filePrefix;

    @Value("${snapshot.filename.suffix:.json}")
    private String fileSuffix;

    public SnapshotService(OperatingRoomRepository operatingRoomRepository,
                           SurgeryRepository surgeryRepository,
                           AlgorithmService algorithmService) {
        this.operatingRoomRepository = operatingRoomRepository;
        this.surgeryRepository = surgeryRepository;
        this.algorithmService = algorithmService;
    }

    // ============================================================
    // 1. 從 DB 建快照（純資料，不寫檔）
    // ============================================================

    public Map<String, Object> buildSnapshot(LocalDate date) {
        TimeSettingsDTO ts = Optional.ofNullable(algorithmService.getTimeSettingsFromCsv())
                .orElseGet(() -> {
                    TimeSettingsDTO d = new TimeSettingsDTO();
                    d.setSurgeryStartTime(510);
                    d.setRegularEndTime(540);
                    d.setOvertimeEndTime(150);
                    d.setCleaningTime(45);
                    return d;
                });

        final int dayStart = ts.getSurgeryStartTime();
        final int regularEndAbs = dayStart + ts.getRegularEndTime();
        final int overtimeEndAbs = regularEndAbs + ts.getOvertimeEndTime();
        final int cleaning = ts.getCleaningTime();

        List<OperatingRoom> rooms = operatingRoomRepository.findAll()
                .stream().filter(r -> r.getStatus() == 1).toList();
        Set<String> enabledRoomIds = rooms.stream()
                .map(OperatingRoom::getId)
                .collect(Collectors.toSet());

        List<Surgery> surgeriesPicked = surgeryRepository.findAll().stream()
                .filter(s -> s.getOperatingRoom() != null)
                .filter(s -> enabledRoomIds.contains(s.getOperatingRoom().getId()))
                .filter(s -> {
                    if (s.getDate() == null) return false;
                    return s.getDate().toLocalDate().equals(date);
                })
                .collect(Collectors.toList());

        if (surgeriesPicked.isEmpty()) {
            surgeriesPicked = surgeryRepository.findAll().stream()
                    .filter(s -> s.getOperatingRoom() != null)
                    .filter(s -> enabledRoomIds.contains(s.getOperatingRoom().getId()))
                    .collect(Collectors.toList());
        }

        Map<String, List<Surgery>> byRoom = surgeriesPicked.stream()
                .collect(Collectors.groupingBy(s -> s.getOperatingRoom().getId()));

        List<Map<String, Object>> roomsJson = rooms.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("name", Optional.ofNullable(r.getOperatingRoomName()).orElse(""));
            m.put("status", r.getStatus());
            m.put("departmentName", r.getDepartment() != null ? r.getDepartment().getName() : null);
            m.put("roomType", r.getRoomType());
            return m;
        }).toList();

        Map<String, List<Map<String, Object>>> surgeriesByRoomJson = new LinkedHashMap<>();
        int contentMaxAbsEnd = dayStart;

        for (OperatingRoom room : rooms) {
            String roomKey = room.getId();
            List<Surgery> list = new ArrayList<>(byRoom.getOrDefault(roomKey, List.of()));

            list.sort(Comparator.comparing(
                    s -> Optional.ofNullable(s.getOrderInRoom()).orElse(Integer.MAX_VALUE)));

            int cursor = dayStart;
            List<Map<String, Object>> arr = new ArrayList<>();

            for (Surgery s : list) {
                int est = Optional.ofNullable(s.getEstimatedSurgeryTime()).orElse(0);
                int end = cursor + est;
                String status = end <= regularEndAbs ? "normal"
                        : (end <= overtimeEndAbs ? "overtime" : "overlimit");
                contentMaxAbsEnd = Math.max(contentMaxAbsEnd, end + cleaning);

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("applicationId", s.getApplicationId());
                item.put("medicalRecordNumber", s.getMedicalRecordNumber());
                item.put("patientName", s.getPatientName());
                // ✅ 將 SQL Date 轉為字串格式 "yyyy-MM-dd"
                item.put("date", s.getDate() != null ? s.getDate().toLocalDate().toString() : null);
                item.put("surgeryName", s.getSurgeryName());
                item.put("chiefSurgeonName", s.getChiefSurgeonName());
                item.put("operatingRoomName", s.getOperatingRoomName());
                item.put("departmentName", s.getDepartmentName());
                item.put("anesthesiaMethod", s.getAnesthesiaMethod());
                item.put("surgeryReason", s.getSurgeryReason());
                item.put("req", s.getReq());
                item.put("estimatedSurgeryTime", est);
                item.put("orderInRoom", s.getOrderInRoom());
                item.put("groupApplicationIds", s.getGroupApplicationIds());

                item.put("startMinAbs", cursor);
                item.put("endMinAbs", end);
                item.put("startTime", toHHmm(cursor));
                item.put("endTime", toHHmm(end));
                item.put("status", status);

                arr.add(item);
                cursor = end + cleaning;
            }

            surgeriesByRoomJson.put(roomKey, arr);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("date", date.toString());
        out.put("timeSettings", Map.of(
                "surgeryStartTime", ts.getSurgeryStartTime(),
                "regularEndTime", ts.getRegularEndTime(),
                "overtimeEndTime", ts.getOvertimeEndTime(),
                "cleaningTime", ts.getCleaningTime()));
        out.put("operatingRooms", roomsJson);
        out.put("surgeriesByRoom", surgeriesByRoomJson);
        out.put("contentMaxAbsEnd", contentMaxAbsEnd);

        return out;
    }

    // ============================================================
    // 2. 匯出 snapshot
    // ============================================================

    public Map<String, Object> exportSnapshot(LocalDate date, boolean pretty) throws IOException {
        Map<String, Object> snapshot = buildSnapshot(date);
        if (snapshot == null) {
            snapshot = new HashMap<>();
        }
        snapshot.putIfAbsent("date", date.toString());

        Path file = resolveSnapshotPath(date);
        Files.createDirectories(file.getParent());

        ObjectMapper m = pretty
                ? mapper.copy().enable(SerializationFeature.INDENT_OUTPUT)
                : mapper.copy().disable(SerializationFeature.INDENT_OUTPUT);

        String json = m.writeValueAsString(snapshot);
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        Files.write(file, bytes, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("date", date.toString());
        meta.put("filename", file.getFileName().toString());
        meta.put("path", file.toAbsolutePath().toString());
        meta.put("bytes", bytes.length);
        return meta;
    }

    // ============================================================
    // 3. 拖曳更新（含詳細 Log）
    // ============================================================

    public Map<String, Object> applyDragUpdateOnSnapshot(
            LocalDate date,
            List<ScheduleSnapshotController.RoomOrder> roomOrders) throws IOException {

        Map<String, Object> result = new HashMap<>();

        if (roomOrders == null || roomOrders.isEmpty()) {
            result.put("updatedRooms", 0);
            result.put("updatedItems", 0);
            result.put("message", "no roomOrders supplied");
            return result;
        }

        Map<String, Object> snapshot = loadSnapshotFromFile(date);
        if (snapshot == null || snapshot.isEmpty()) {
            result.put("updatedRooms", 0);
            result.put("updatedItems", 0);
            result.put("message", "snapshot file not found for date " + date);
            return result;
        }

        Object tsObj = snapshot.get("timeSettings");
        if (!(tsObj instanceof Map)) {
            result.put("error", "timeSettings not found in snapshot");
            return result;
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> timeSettings = (Map<String, Object>) tsObj;
        
        int dayStart = ((Number) timeSettings.getOrDefault("surgeryStartTime", 510)).intValue();
        int regularEndTime = ((Number) timeSettings.getOrDefault("regularEndTime", 540)).intValue();
        int overtimeEndTime = ((Number) timeSettings.getOrDefault("overtimeEndTime", 150)).intValue();
        int cleaning = ((Number) timeSettings.getOrDefault("cleaningTime", 45)).intValue();
        
        int regularEndAbs = dayStart + regularEndTime;
        int overtimeEndAbs = regularEndAbs + overtimeEndTime;

            ", regularEnd=" + regularEndAbs + ", overtimeEnd=" + overtimeEndAbs);

        Object sbrObj = snapshot.get("surgeriesByRoom");
        if (!(sbrObj instanceof Map)) {
            result.put("updatedRooms", 0);
            result.put("updatedItems", 0);
            result.put("message", "snapshot.surgeriesByRoom is not a map");
            return result;
        }

        @SuppressWarnings("unchecked")
        Map<String, List<Map<String, Object>>> surgeriesByRoom =
                (Map<String, List<Map<String, Object>>>) sbrObj;

        Map<String, Map<String, Object>> byApplicationId = new HashMap<>();
        for (Map.Entry<String, List<Map<String, Object>>> entry : surgeriesByRoom.entrySet()) {
            List<Map<String, Object>> list = entry.getValue();
            if (list == null) continue;
            for (Map<String, Object> s : list) {
                Object appId = s.get("applicationId");
                if (appId != null) {
                    byApplicationId.put(String.valueOf(appId), s);
                }
            }
        }

        int updatedRooms = 0;
        int updatedItems = 0;
        int contentMaxAbsEnd = dayStart;

        for (ScheduleSnapshotController.RoomOrder ro : roomOrders) {
            if (ro == null || ro.getRoomId() == null) continue;

            String roomKey = String.valueOf(ro.getRoomId());
            List<String> appIds = ro.getApplicationIds();
            if (appIds == null) appIds = Collections.emptyList();

            List<Map<String, Object>> newList = new ArrayList<>();
            int cursor = dayStart;
            int order = 0;

            for (String appId : appIds) {
                if (appId == null || appId.isBlank()) continue;
                Map<String, Object> s = byApplicationId.get(appId);
                if (s == null) {
                    continue;
                }

                int est = s.get("estimatedSurgeryTime") != null 
                    ? ((Number) s.get("estimatedSurgeryTime")).intValue() 
                    : 0;
                int end = cursor + est;
                
                String status;
                if (end <= regularEndAbs) {
                    status = "normal";
                } else if (end <= overtimeEndAbs) {
                    status = "overtime";
                } else {
                    status = "overlimit";
                }

                // ✅ 修正 date 欄位：如果是 timestamp，轉換為字串格式
                Object dateObj = s.get("date");
                if (dateObj instanceof Number) {
                    // 如果是 timestamp，轉換為 LocalDate 字串
                    long timestamp = ((Number) dateObj).longValue();
                    LocalDate localDate = new java.util.Date(timestamp).toInstant()
                        .atZone(java.time.ZoneId.systemDefault()).toLocalDate();
                    s.put("date", localDate.toString());
                } else if (dateObj == null) {
                    s.put("date", date.toString());
                }

                    cursor + "-" + end + " (" + status + ")");

                s.put("orderInRoom", order);
                s.put("startMinAbs", cursor);
                s.put("endMinAbs", end);
                s.put("startTime", toHHmm(cursor));
                s.put("endTime", toHHmm(end));
                s.put("status", status);

                newList.add(s);
                updatedItems++;
                
                contentMaxAbsEnd = Math.max(contentMaxAbsEnd, end + cleaning);
                cursor = end + cleaning;
                order++;
            }

            surgeriesByRoom.put(roomKey, newList);
            updatedRooms++;
        }

        snapshot.put("contentMaxAbsEnd", contentMaxAbsEnd);
            updatedItems + " surgeries");

        Path file = resolveSnapshotPath(date);
        
        try {
            saveSnapshotToFile(file, snapshot, true);
        } catch (Exception e) {
            throw e;
        }

        result.put("updatedRooms", updatedRooms);
        result.put("updatedItems", updatedItems);
        result.put("fileDate", date.toString());
        result.put("file", file.toAbsolutePath().toString());
        result.put("message", "drag update applied to snapshot json with recalculated timeline");
        
        return result;
    }

    // ============================================================
    // 4. 讀既有 JSON 檔
    // ============================================================

    public Map<String, Object> loadSnapshotFromFile(LocalDate date) throws IOException {
        Path file = resolveSnapshotPath(date);
        if (!Files.exists(file)) {
            return null;
        }

        byte[] bytes = Files.readAllBytes(file);
        Map<String, Object> map = mapper.readValue(bytes, new TypeReference<Map<String, Object>>() {});
        return map;
    }

    // ============================================================
    // 5. 工具方法
    // ============================================================

    private Path resolveSnapshotPath(LocalDate date) {
        String dirStr = (exportDir == null || exportDir.isBlank()) ? "./snapshots" : exportDir;
        Path dir = Paths.get(dirStr);
        String filename = filePrefix + date + fileSuffix;
        return dir.resolve(filename);
    }

    private void saveSnapshotToFile(Path file,
                                    Map<String, Object> snapshot,
                                    boolean pretty) throws IOException {

        Files.createDirectories(file.getParent());

        ObjectMapper m = pretty
                ? mapper.copy().enable(SerializationFeature.INDENT_OUTPUT)
                : mapper.copy().disable(SerializationFeature.INDENT_OUTPUT);

        try (Writer writer = Files.newBufferedWriter(file, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
            m.writeValue(writer, snapshot);
        }

    }

    private String toHHmm(int mins) {
        int m = ((mins % 1440) + 1440) % 1440;
        int h = m / 60;
        int mm = m % 60;
        return String.format("%02d:%02d", h, mm);
    }
}