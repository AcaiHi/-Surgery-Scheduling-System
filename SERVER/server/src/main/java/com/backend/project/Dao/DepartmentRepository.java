package com.backend.project.Dao;

import org.springframework.data.jpa.repository.JpaRepository;

import com.backend.project.model.Department;

public interface DepartmentRepository extends JpaRepository<Department, String>{
}
