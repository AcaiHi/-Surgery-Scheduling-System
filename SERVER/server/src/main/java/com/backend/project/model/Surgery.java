package com.backend.project.model;

import java.sql.Date;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

import com.backend.project.StringListConverter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "surgery")
public class Surgery {

    @Id
    @Column(name = "application_id")
    private String applicationId;

    @Column(name = "date")
    private Date date;

    @Column(name = "medical_record_number")
    private String medicalRecordNumber;

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "surgery_name")
    private String surgeryName;

    @Column(name = "anesthesia_method")
    private String anesthesiaMethod;

    @Column(name = "surgery_reason")
    private String surgeryReason;

    @Column(name = "priority_sequence")
    private int prioritySequence;

    @Column(name = "special_or_requirements")
    private String specialOrRequirements;

    // Indicates whether a special operating room is required (Y/N)
    @Column(name = "req")
    private String req;

    @Column(name = "estimated_surgery_time")
    private Integer estimatedSurgeryTime;

    @Column(name = "order_in_room")
    private Integer orderInRoom;

    @Column(name = "group_application_ids")
    @Convert(converter = StringListConverter.class)
    private List<String> groupApplicationIds;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "chief_surgeon_employee_id")
    private ChiefSurgeon chiefSurgeon;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "username")
    private User user;

    @Transient
    private String username;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "operating_room_id")
    private OperatingRoom operatingRoom;

    @Transient
    private String operatingRoomId;

    @Transient
    private String chiefSurgeonId;

    @Transient
    private String departmentName;

    @Transient
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Map<String, Object> extraData = new HashMap<>();

    // ===== Getters and Setters =====

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public Date getDate() {
        return date;
    }

    public void setDate(Date date) {
        this.date = date;
    }

    public String getMedicalRecordNumber() {
        return medicalRecordNumber;
    }

    public void setMedicalRecordNumber(String medicalRecordNumber) {
        this.medicalRecordNumber = medicalRecordNumber;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public String getSurgeryName() {
        return surgeryName;
    }

    public void setSurgeryName(String surgeryName) {
        this.surgeryName = surgeryName;
    }

    public String getAnesthesiaMethod() {
        return anesthesiaMethod;
    }

    public void setAnesthesiaMethod(String anesthesiaMethod) {
        this.anesthesiaMethod = anesthesiaMethod;
    }

    public String getSurgeryReason() {
        return surgeryReason;
    }

    public void setSurgeryReason(String surgeryReason) {
        this.surgeryReason = surgeryReason;
    }

    public int getPrioritySequence() {
        return prioritySequence;
    }

    public void setPrioritySequence(int prioritySequence) {
        this.prioritySequence = prioritySequence;
    }

    public String getSpecialOrRequirements() {
        return specialOrRequirements;
    }

    public void setSpecialOrRequirements(String specialOrRequirements) {
        this.specialOrRequirements = specialOrRequirements;
    }

    public String getReq() {
        return req;
    }

    public void setReq(String req) {
        this.req = req;
    }

    public Integer getEstimatedSurgeryTime() {
        return estimatedSurgeryTime;
    }

    public void setEstimatedSurgeryTime(Integer estimatedSurgeryTime) {
        this.estimatedSurgeryTime = estimatedSurgeryTime;
    }

    public Integer getOrderInRoom() {
        return orderInRoom;
    }

    public void setOrderInRoom(Integer orderInRoom) {
        this.orderInRoom = orderInRoom;
    }

    public ChiefSurgeon getChiefSurgeon() {
        return chiefSurgeon;
    }

    public void setChiefSurgeon(ChiefSurgeon chiefSurgeon) {
        this.chiefSurgeon = chiefSurgeon;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public OperatingRoom getOperatingRoom() {
        return operatingRoom;
    }

    public void setOperatingRoom(OperatingRoom operatingRoom) {
        this.operatingRoom = operatingRoom;
    }

    public String getOperatingRoomId() {
        return operatingRoomId;
    }

    public void setOperatingRoomId(String operatingRoomId) {
        this.operatingRoomId = operatingRoomId;
    }

    public String getChiefSurgeonId() {
        return chiefSurgeonId;
    }

    public void setChiefSurgeonId(String chiefSurgeonId) {
        this.chiefSurgeonId = chiefSurgeonId;
    }

    public String getChiefSurgeonName() {
        return chiefSurgeon != null ? chiefSurgeon.getName() : null;
    }

    public String getOperatingRoomName() {
        return operatingRoom != null ? operatingRoom.getOperatingRoomName() : null;
    }

    public List<String> getGroupApplicationIds() {
        return groupApplicationIds;
    }

    public void setGroupApplicationIds(List<String> groupApplicationIds) {
        this.groupApplicationIds = groupApplicationIds;
    }

    public String getDepartmentName() {
        // 如果設置了departmentName則返回
        if (departmentName != null) {
            return departmentName;
        }

        // 嘗試從operatingRoom獲取科別資訊
        if (operatingRoom != null && operatingRoom.getDepartment() != null) {
            return operatingRoom.getDepartment().getName();
        }

        // 嘗試從extraData中獲取
        if (extraData != null && extraData.containsKey("departmentName")) {
            return (String) extraData.get("departmentName");
        }

        return "未指定科別";
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    public Map<String, Object> getExtraData() {
        return extraData;
    }

    public void setExtraData(Map<String, Object> extraData) {
        this.extraData = extraData;
    }

    public String getFormattedTime() {
        try {
            if (this.date == null) {
                return "00:00";
            }
            return new SimpleDateFormat("HH:mm").format(this.date);
        } catch (Exception e) {
            return "00:00";
        }
    }
}
