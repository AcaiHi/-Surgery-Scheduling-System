package com.backend.project.model;

import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "chief_surgeon")
public class ChiefSurgeon {

    @Id
    @Column(name = "chief_surgeon_employee_id")
    private String chiefSurgeonEmployeeId;

    public String getId() {
        return chiefSurgeonEmployeeId;
    }

    public void setId(String chiefSurgeonEmployeeId) {
        this.chiefSurgeonEmployeeId = chiefSurgeonEmployeeId;
    }

    @Column(name = "physician_name")
    private String physicianName;

    public String getName() {
        return physicianName;
    }

    public void setName(String physicianName) {
        this.physicianName = physicianName;
    }

    @ManyToOne
    @JoinColumn(name = "department_id")
    private Department department;

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
    }

    @OneToMany(mappedBy = "chiefSurgeon")
    private List<Surgery> surgeries;
}
