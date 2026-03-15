package com.backend.project.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.backend.project.Dao.ChiefSurgeonRepository;
import com.backend.project.Dao.DepartmentRepository;
import com.backend.project.model.ChiefSurgeon;
import com.backend.project.model.Department;

@Service
public class DepartmentService {
    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private ChiefSurgeonRepository chiefSurgeonRepository;

    public List<Department> getAllDepartments() {
        return departmentRepository.findAll();
    }

    public Department updateDepartment(String id, Department updatedDepartment) {
        return departmentRepository.findById(id).map(department -> {
            department.setId(updatedDepartment.getId());
            department.setName(updatedDepartment.getName());
            return departmentRepository.save(department);
        }).orElseThrow(() -> new RuntimeException("Department not found"));
    }

    public Department addDepartment(Department department) {
        return departmentRepository.save(department);
    }

    public void addDepartments(List<Department> departments) {
        departmentRepository.saveAll(departments);
    }

    public void deleteDepartment(String id) {
        departmentRepository.deleteById(id);
    }

    public void deleteDepartments(List<String> ids) {
        departmentRepository.deleteAllById(ids);
    }

    public List<ChiefSurgeon> getChiefSurgeonsByDepartmentId(String departmentId) {
        return chiefSurgeonRepository.findByDepartmentId(departmentId);
    }
}
