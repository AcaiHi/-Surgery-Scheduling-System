package com.backend.project.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.project.Service.ChiefSurgeonService;
import com.backend.project.model.ChiefSurgeon;

import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@CrossOrigin(origins = { "*" })
@RestController
@RequestMapping("/api")
public class ChiefSurgeonController {
    @Autowired
    private ChiefSurgeonService chiefSurgeonService;

    @PutMapping("system/chief-surgeon/{id}")
    public ResponseEntity<?> pudateChiefSurgeon(@PathVariable String id, @RequestBody ChiefSurgeon updateChiefSurgeon) {
        chiefSurgeonService.updatChiefSurgeon(id, updateChiefSurgeon);
        return ResponseEntity.ok("ChiefSurgeon update successfully");
    }

    @PostMapping("/system/{departmentId}/chief-surgeon/add")
    public ResponseEntity<ChiefSurgeon> addChiefSurgeon(
            @PathVariable String departmentId,
            @RequestBody ChiefSurgeon chiefSurgeon) {
        return ResponseEntity.ok(chiefSurgeonService.addChiefSurgeon(departmentId, chiefSurgeon));
    }

    @PostMapping("/system/{departmentId}/chief-surgeons/add")
    public ResponseEntity<List<ChiefSurgeon>> addChiefSurgeons(
            @PathVariable String departmentId,
            @RequestBody List<ChiefSurgeon> chiefSurgeons) {
        return ResponseEntity.ok(chiefSurgeonService.addChiefSurgeons(departmentId, chiefSurgeons));
    }

    @DeleteMapping("/system/chief-surgeon/delete/{id}")
    public ResponseEntity<?> deleteChiefSurgeon(@PathVariable String id) {
        chiefSurgeonService.deleteChiefSurgeon(id);
        return ResponseEntity.ok("ChiefSurgeon delete successfully");
    }

    @DeleteMapping("/system/chief-surgeons/delete")
    public ResponseEntity<?> deleteChiefSurgeons(@RequestBody List<String> ids) {
        chiefSurgeonService.deleteChiefSurgeons(ids);
        return ResponseEntity.ok("ChiefSurgeons delete successfully");
    }
}
