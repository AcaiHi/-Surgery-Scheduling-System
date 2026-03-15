package com.backend.project.Controller;

import com.backend.project.Service.SnapshotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = {"*"})
@RestController
@RequestMapping("/api/system/schedule")
public class ScheduleSnapshotController {

    private final SnapshotService snapshotService;
    private static final ZoneId TAIPEI = ZoneId.of("Asia/Taipei");

    public ScheduleSnapshotController(SnapshotService snapshotService) {
        this.snapshotService = snapshotService;
    }

    /**
     * 讀既有檔案：snapshots/schedule-YYYY-MM-DD.json（沒有就 404）
     * 前端 Home 進來會用這個讀「某天」的快照
     */
    @GetMapping("/snapshot")
    public ResponseEntity<Map<String, Object>> getSnapshot(
            @RequestParam(required = false) String date) throws Exception {

        LocalDate resolved = (date == null || date.isBlank())
                ? LocalDate.now(TAIPEI)
                : LocalDate.parse(date);

        Map<String, Object> payload = snapshotService.loadSnapshotFromFile(resolved);

        if (payload == null || payload.isEmpty()) {
            Map<String, Object> notFound = new HashMap<>();
            notFound.put("error", "NOT_FOUND");
            notFound.put("_resolvedDate", resolved.toString());
            return ResponseEntity.status(404).body(notFound);
        }

        // 補上後端實際使用日期（若檔內沒有）
        payload.putIfAbsent("date", resolved.toString());
        payload.put("_resolvedDate", resolved.toString());
        return ResponseEntity.ok(payload);
    }

    /**
     * （保留）產生檔案：snapshots/schedule-YYYY-MM-DD.json
     * 用 DB 重新生成某一天的班表 JSON
     */
    @PostMapping("/snapshot/export")
    public ResponseEntity<Map<String, Object>> exportSnapshot(
            @RequestBody(required = false) Map<String, Object> body) throws Exception {

        String date = body != null && body.get("date") != null ? body.get("date").toString() : null;
        Boolean pretty = body != null && body.get("pretty") != null ? (Boolean) body.get("pretty") : Boolean.TRUE;

        LocalDate resolved = (date == null || date.isBlank())
                ? LocalDate.now(TAIPEI)
                : LocalDate.parse(date);

        Map<String, Object> meta = snapshotService.exportSnapshot(resolved, pretty);
        meta.put("_resolvedDate", resolved.toString());
        return ResponseEntity.ok(meta);
    }

    /**
     * 排班管理「更新主頁」：ConfirmScheduleButton 會呼叫這個
     * 需求：在不改前端 API 的情況下，用 DB 生成「明日」班表 JSON 檔。
     */
    @PostMapping("/homepage/update")
    public ResponseEntity<Map<String, Object>> updateHomepageSnapshot() throws Exception {
        LocalDate tomorrow = LocalDate.now(TAIPEI).plusDays(1);
        Map<String, Object> meta = snapshotService.exportSnapshot(tomorrow, true);
        meta.put("_resolvedDate", tomorrow.toString());
        return ResponseEntity.ok(meta);
    }

    /**
     * 若還想保留「動態生成、不中繼」的查詢，可以用這支
     * 從 DB 直接算 snapshot，不寫檔。
     */
    @GetMapping("/snapshot/build")
    public ResponseEntity<Map<String, Object>> getSnapshotBuilt(
            @RequestParam(required = false) String date) {

        LocalDate resolved = (date == null || date.isBlank())
                ? LocalDate.now(TAIPEI)
                : LocalDate.parse(date);

        Map<String, Object> payload = snapshotService.buildSnapshot(resolved);
        if (payload == null || payload.isEmpty()) {
            Map<String, Object> notFound = new HashMap<>();
            notFound.put("error", "NOT_FOUND");
            notFound.put("_resolvedDate", resolved.toString());
            return ResponseEntity.status(404).body(notFound);
        }
        payload.putIfAbsent("date", resolved.toString());
        payload.put("_resolvedDate", resolved.toString());
        return ResponseEntity.ok(payload);
    }

    /**
     * ✅ 給「首頁拖曳修改」用的 API：
     * HomeGantt 的 dragEnd 會呼叫這裡，修改「指定日期」的 JSON 檔內容（僅修改 surgeriesByRoom + orderInRoom）
     *
     * POST /api/system/schedule/snapshot/drag-update
     * {
     *   "date": "2025-11-18",
     *   "roomOrders": [
     *     {
     *       "roomId": "1",
     *       "applicationIds": ["11103", "11114"]
     *     },
     *     {
     *       "roomId": "2",
     *       "applicationIds": ["11105", "11104", "11113", "11122"]
     *     }
     *   ]
     * }
     */
    @PostMapping("/snapshot/drag-update")
    public ResponseEntity<Map<String, Object>> applyDragUpdate(
            @RequestBody DragUpdateRequest body
    ) throws Exception {

        LocalDate resolved = (body == null || body.getDate() == null || body.getDate().isBlank())
                ? LocalDate.now(TAIPEI)
                : LocalDate.parse(body.getDate());

        Map<String, Object> meta = snapshotService.applyDragUpdateOnSnapshot(resolved, body.getRoomOrders());

        // 回傳更新後的檔案內容（讓前端如有需要可重刷）
        Map<String, Object> snapshot = snapshotService.loadSnapshotFromFile(resolved);

        Map<String, Object> resp = new HashMap<>();
        resp.put("meta", meta);
        resp.put("snapshot", snapshot);
        resp.put("_resolvedDate", resolved.toString());
        return ResponseEntity.ok(resp);
    }

    // ====== Request Body DTO ======

    public static class DragUpdateRequest {
        private String date;
        private List<RoomOrder> roomOrders;

        public String getDate() {
            return date;
        }
        public void setDate(String date) {
            this.date = date;
        }

        public List<RoomOrder> getRoomOrders() {
            return roomOrders;
        }
        public void setRoomOrders(List<RoomOrder> roomOrders) {
            this.roomOrders = roomOrders;
        }
    }

    public static class RoomOrder {
        /** JSON 裡的 room key（你的 example 是 "1" ~ "7"） */
        private String roomId;
        /** 這個 room 裡手術的 applicationId 排序 */
        private List<String> applicationIds;

        public String getRoomId() {
            return roomId;
        }
        public void setRoomId(String roomId) {
            this.roomId = roomId;
        }

        public List<String> getApplicationIds() {
            return applicationIds;
        }
        public void setApplicationIds(List<String> applicationIds) {
            this.applicationIds = applicationIds;
        }
    }
}
