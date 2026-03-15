package com.backend.project.Dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.backend.project.model.OperatingRoom;

public interface OperatingRoomRepository extends JpaRepository<OperatingRoom, String>  {
    Optional<OperatingRoom> findByOperatingRoomName(String operatingRoomName);

    @Query("SELECT r FROM OperatingRoom r WHERE r.surgeries IS EMPTY")
    List<OperatingRoom> findAllWithoutSurgeries();
}
