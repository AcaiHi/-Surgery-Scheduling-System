package com.backend.project.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.backend.project.Dao.ChiefSurgeonRepository;
import com.backend.project.Dao.DepartmentRepository;
import com.backend.project.model.ChiefSurgeon;
import com.backend.project.model.Department;

@Service
public class ChiefSurgeonService {
    @Autowired
    private ChiefSurgeonRepository chiefSurgeonRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    public ChiefSurgeon updatChiefSurgeon(String id, ChiefSurgeon updatChiefSurgeon) {
        return chiefSurgeonRepository.findById(id).map(chiefSurgeon -> {
            chiefSurgeon.setId(updatChiefSurgeon.getId());
            chiefSurgeon.setName(updatChiefSurgeon.getName());
            return chiefSurgeonRepository.save(chiefSurgeon);
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public ChiefSurgeon addChiefSurgeon(String departmentId, ChiefSurgeon chiefSurgeon) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new RuntimeException("Department not found"));
        chiefSurgeon.setDepartment(department);

        return chiefSurgeonRepository.save(chiefSurgeon);
    }

    public List<ChiefSurgeon> addChiefSurgeons(String departmentId, List<ChiefSurgeon> chiefSurgeons) {
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new RuntimeException("Department not found"));

        for (ChiefSurgeon chiefSurgeon : chiefSurgeons) {
            chiefSurgeon.setDepartment(department);
        }

        return chiefSurgeonRepository.saveAll(chiefSurgeons);
    }

    public void deleteChiefSurgeon(String id) {
        chiefSurgeonRepository.deleteById(id);
    }

    public void deleteChiefSurgeons(List<String> ids) {
        chiefSurgeonRepository.deleteAllById(ids);
    }
}
