package com.backend.project.Controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.backend.project.Service.DepartmentService;
import com.backend.project.model.ChiefSurgeon;
import com.backend.project.model.Department;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;

@CrossOrigin(origins = { "*" })
@RestController
@RequestMapping("/api")
public class DepartmentController {
    @Autowired
    private DepartmentService departmentService;
    
    @GetMapping("/system/departments")
    public List<Department> getAllDepartments() {
        return departmentService.getAllDepartments();
    }
    
    @PutMapping("/system/department/{id}")
    public ResponseEntity<?> updateDepartment(@PathVariable String id, @RequestBody Department updateDepartment) {
        departmentService.updateDepartment(id, updateDepartment);
        return ResponseEntity.ok("Department update successfully");
    }

    @PostMapping("/system/department/add")
    public ResponseEntity<?> addDepartment(@RequestBody Department department) {
        departmentService.addDepartment(department);
        return ResponseEntity.ok("Department add successfully");
    }

    @PostMapping("/system/departments/add")
    public ResponseEntity<?> addDepartments(@RequestBody List<Department> departments) {
        departmentService.addDepartments(departments);
        return ResponseEntity.ok("Departments add successfully");
    }
    
    @DeleteMapping("/system/department/delete/{id}")
    public ResponseEntity<?> deleteDepartment(@PathVariable String id) {
        departmentService.deleteDepartment(id);
        return ResponseEntity.ok("Department deleted successfully");
    }

    @DeleteMapping("/system/departments/delete")
    public ResponseEntity<?> deleteDepartments(@RequestBody List<String> ids) {
        departmentService.deleteDepartments(ids);
        return ResponseEntity.ok("Departments deleted successfully");
    }

    @GetMapping("/system/department/{id}/chief-surgeons")
    public List<ChiefSurgeon> getChiefSurgeons(@PathVariable String id) {
        return departmentService.getChiefSurgeonsByDepartmentId(id);
    }
    
}
