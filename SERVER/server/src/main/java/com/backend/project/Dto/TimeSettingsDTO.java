package com.backend.project.Dto;

public class TimeSettingsDTO {
    private Integer surgeryStartTime;
    private Integer regularEndTime;
    private Integer overtimeEndTime;
    private Integer cleaningTime;

    // Getters & Setters
    public Integer getSurgeryStartTime() {
        return surgeryStartTime;
    }

    public void setSurgeryStartTime(Integer surgeryStartTime) {
        this.surgeryStartTime = surgeryStartTime;
    }

    public Integer getRegularEndTime() {
        return regularEndTime;
    }

    public void setRegularEndTime(Integer regularEndTime) {
        this.regularEndTime = regularEndTime;
    }

    public Integer getOvertimeEndTime() {
        return overtimeEndTime;
    }

    public void setOvertimeEndTime(Integer overtimeEndTime) {
        this.overtimeEndTime = overtimeEndTime;
    }

    public Integer getCleaningTime() {
        return cleaningTime;
    }

    public void setCleaningTime(Integer cleaningTime) {
        this.cleaningTime = cleaningTime;
    }
}
