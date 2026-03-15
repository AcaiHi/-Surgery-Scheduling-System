package com.backend.project.Dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.project.model.ChiefSurgeon;

public interface ChiefSurgeonRepository extends JpaRepository<ChiefSurgeon, String> {
    List<ChiefSurgeon> findByDepartmentId(String departmentId);
    Optional<ChiefSurgeon> findByPhysicianName(String physicianName);
}
