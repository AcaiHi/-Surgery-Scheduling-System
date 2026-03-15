package com.backend.project.Dao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.backend.project.model.OperatingRoom;
import com.backend.project.model.Surgery;

public interface SurgeryRepository extends JpaRepository<Surgery, String> {
    List<Surgery> findByPrioritySequenceNot(int value);

    // ✅ 正確的巢狀屬性名稱：operatingRoom.id
    List<Surgery> findByOperatingRoom_IdOrderByOrderInRoomAsc(String operatingRoomId);

    // 若你在其他地方用到（看你的 Service 有用到）
    List<Surgery> findByOperatingRoom(OperatingRoom room);

    // 方便尾插計算（0-based appendAt = count）
    long countByOperatingRoom_Id(String operatingRoomId);

    // （可選）等價 JPQL，喜歡用 Query 也可以保留
    @Query("select s from Surgery s where s.operatingRoom.id = :roomId order by s.orderInRoom asc")
    List<Surgery> findAllByRoomOrderAsc(@Param("roomId") String roomId);
}
