package com.backend.project.Controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.project.Service.OperatingRoomService;
import com.backend.project.model.OperatingRoom;
import com.backend.project.model.Surgery;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@CrossOrigin(origins = { "*" })
@RestController
@RequestMapping("/api")
public class OperatingRoomController {
    @Autowired
    private OperatingRoomService operatingRoomService;

    @GetMapping("/system/operating-rooms")
    public List<OperatingRoom> getOperatingRooms() {
        return operatingRoomService.getAllOperatingRooms();
    }

    @PutMapping("/system/operating-room/{id}")
    public ResponseEntity<?> updateOperatingRoom(@PathVariable String id,
            @RequestBody OperatingRoom updatOperatingRoom) {
        operatingRoomService.updateOperatingRoom(id, updatOperatingRoom);
        return ResponseEntity.ok("OperatingRoom update successfully");
    }

    @PostMapping("system/operating-room/add")
    public ResponseEntity<?> addOperatingRoom(
            @RequestBody OperatingRoom operatingRoom) {
        operatingRoomService.addOperatingRoom(operatingRoom);
        return ResponseEntity.ok("OperatingRoom add successfully");
    }

    @PostMapping("/system/operating-rooms/add")
    public ResponseEntity<?> addOperatingRooms(
            @RequestBody List<OperatingRoom> operatingRooms) {
        operatingRoomService.addOperatingRooms(operatingRooms);
        return ResponseEntity.ok("OperatingRooms add successfully");
    }

    @DeleteMapping("/system/operating-room/delete/{id}")
    public ResponseEntity<?> deleteOperatingRoom(@PathVariable String id) {
        operatingRoomService.deleteOperatingRoom(id);
        return ResponseEntity.ok("OperatingRoom delete successfully");
    }

    @DeleteMapping("/system/operating-rooms/delete")
    public ResponseEntity<?> deleteOperatingRooms(@RequestBody List<String> ids) {
        operatingRoomService.deleteOperatingRooms(ids);
        return ResponseEntity.ok("OperatingRooms delete successfully");
    }

    @PatchMapping("/system/operating-room/{id}/toggle-status")
    public ResponseEntity<?> toggleStatus(@PathVariable("id") String id) {
        try {
            OperatingRoom updated = operatingRoomService.toggleOperatingRoomStatus(id);
            return ResponseEntity.ok(updated); // 200，回完整 OperatingRoom JSON
        } catch (IllegalStateException e) {
            // 商業規則衝突：房間仍有手術，無法關閉
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage()); // 409 + 純字串
        } catch (IllegalArgumentException e) {
            // 找不到資源
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage()); // 404 + 純字串
        }
    }
    // ----- Adout surgery -----//

    @GetMapping("/system/operating-rooms/{id}/surgery")
    public List<Surgery> getSurgeries(@PathVariable String id) {
        return operatingRoomService.getSurgeryByOperatingRoomId(id);
    }

    @GetMapping("/system/operating-rooms/{id}/last-surgery-time")
    public Map<String, String> getLastSurgeryTime(@PathVariable String id) {
        String lastSurgeryEndTime = operatingRoomService.getLastSurgeryEndTime(id);
        return Map.of("operatingRoomId", id,
                "lastSurgeryEndTime", lastSurgeryEndTime);
    }
}
