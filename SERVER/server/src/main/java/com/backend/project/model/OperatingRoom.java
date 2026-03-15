package com.backend.project.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "operating_room")
public class OperatingRoom {

    @Id
    @Column(name = "operating_room_id")
    private String operatingRoomId;

    public String getId() {
        return operatingRoomId;
    }

    public void setId(String operatingRoomId) {
        this.operatingRoomId = operatingRoomId;
    }

    @Column(name = "operating_room_name")
    private String operatingRoomName;

    public String getOperatingRoomName() {
        return operatingRoomName;
    }
    
    public void setOperatingRoomName(String operatingRoomName) {
        this.operatingRoomName = operatingRoomName;
    }

    @Column(name = "operating_room_status")
    private int operatingRoomStatus;

    public int getStatus() {
        return operatingRoomStatus;
    }

    public void setStatus(int operatingRoomStatus) {
        this.operatingRoomStatus = operatingRoomStatus;
    }

    @Column(name = "operating_room_type")
    private String operatingRoomType;

    public String getRoomType() {
        return operatingRoomType;
    }

    public void setRoomType(String operatingRoomType) {
        this.operatingRoomType = operatingRoomType;
    }

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
    }

    @Transient
    private String departmentId;

    public String getDepartmentId() {
        return departmentId;
    }

    public void setDepartmentId(String departmentId) {
        this.departmentId = departmentId;
    }

    @OneToMany(mappedBy = "operatingRoom" , cascade = CascadeType.REMOVE)
    @JsonIgnore
    private List<Surgery> surgeries;

    public List<Surgery> getSurgeries() {
        return surgeries;
    }

    public void setSurgeries(List<Surgery> surgeries) {
        this.surgeries = surgeries;
    }
}
