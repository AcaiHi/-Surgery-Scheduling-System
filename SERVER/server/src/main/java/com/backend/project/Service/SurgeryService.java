package com.backend.project.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.backend.project.Dao.ChiefSurgeonRepository;
import com.backend.project.Dao.OperatingRoomRepository;
import com.backend.project.Dao.SurgeryRepository;
import com.backend.project.Dao.UserRepository;
import com.backend.project.Dto.TimeSettingsDTO;
import com.backend.project.model.ChiefSurgeon;
import com.backend.project.model.OperatingRoom;
import com.backend.project.model.Surgery;
import com.backend.project.model.User;

import jakarta.transaction.Transactional;

@Service
public class SurgeryService {

    @Autowired
    private SurgeryRepository surgeryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OperatingRoomRepository operatingRoomRepository;

    @Autowired
    private ChiefSurgeonRepository chiefSurgeonRepository;

    @Autowired
    private AlgorithmService algorithmService;

    public List<Surgery> getAllSurgeries() {
        return surgeryRepository.findAll();
    }

    public Surgery getSurgeryById(String applicationId) {
        Optional<Surgery> surgery = surgeryRepository.findById(applicationId);
        return surgery.orElse(null);
    }

    public Surgery updateSurgeryForHome(Surgery surgery) {
        return surgeryRepository.save(surgery);
    }

    public Surgery updateSurgery(String id,
            Surgery updateSurgery) {
        OperatingRoom operatingRoom = operatingRoomRepository.findById(updateSurgery.getOperatingRoomId())
                .orElseThrow(() -> new RuntimeException("OperatingRoom not found"));
        ChiefSurgeon chiefSurgeon = chiefSurgeonRepository.findById(updateSurgery.getChiefSurgeonId())
                .orElseThrow(() -> new RuntimeException("chiefSurgeon not found"));

        return surgeryRepository.findById(id).map(surgery -> {
            surgery.setApplicationId(updateSurgery.getApplicationId());
            surgery.setDate(updateSurgery.getDate());
            surgery.setMedicalRecordNumber(updateSurgery.getMedicalRecordNumber());
            surgery.setPatientName(updateSurgery.getPatientName());
            surgery.setSurgeryName(updateSurgery.getSurgeryName());
            surgery.setAnesthesiaMethod(updateSurgery.getAnesthesiaMethod());
            surgery.setSurgeryReason(updateSurgery.getSurgeryReason());
            surgery.setSpecialOrRequirements(updateSurgery.getSpecialOrRequirements());
            surgery.setReq(updateSurgery.getReq());
            surgery.setEstimatedSurgeryTime(updateSurgery.getEstimatedSurgeryTime());
            surgery.setChiefSurgeon(chiefSurgeon);
            surgery.setOperatingRoom(operatingRoom);
            return surgeryRepository.save(surgery);
        }).orElseThrow(() -> new RuntimeException("Surgery not found"));
    }

    public Surgery updateSurgery4OrderInRoom(String id, int orderInRoom) {
        return surgeryRepository.findById(id).map(surgery -> {
            surgery.setOrderInRoom(orderInRoom);
            return surgeryRepository.save(surgery);
        }).orElseThrow(() -> new RuntimeException("Surgery not found"));
    }

    public void updateSurgeryOrderAndRoom(String id, int orderInRoom, String operatingRoomId) {
        Surgery surgery = surgeryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Surgery not found with id " + id));

        surgery.setOrderInRoom(orderInRoom);

        if (operatingRoomId != null && !operatingRoomId.equals(surgery.getOperatingRoom().getId())) {
            OperatingRoom newRoom = operatingRoomRepository.findById(operatingRoomId)
                    .orElseThrow(() -> new RuntimeException("OperatingRoom not found with id " + operatingRoomId));
            surgery.setOperatingRoom(newRoom);
        }

        surgeryRepository.save(surgery);
    }

    public Surgery addSurgery(Surgery surgery) {
        User user = userRepository.findByUsername(surgery.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        OperatingRoom operatingRoom = operatingRoomRepository.findById(surgery.getOperatingRoomId())
                .orElseThrow(() -> new RuntimeException("OperatingRoom not found"));

        ChiefSurgeon chiefSurgeon = chiefSurgeonRepository.findById(surgery.getChiefSurgeonId())
                .orElseThrow(() -> new RuntimeException("ChiefSurgeon not found"));

        surgery.setUser(user);
        surgery.setOperatingRoom(operatingRoom);
        surgery.setChiefSurgeon(chiefSurgeon);

        // ✅ 0-based：append 到最後一格
        int appendAt = (int) surgeryRepository.countByOperatingRoom_Id(operatingRoom.getId());
        surgery.setOrderInRoom(appendAt);

        if (surgery.getReq() == null)
            surgery.setReq("N");
        return surgeryRepository.save(surgery);
    }

    public void deleteSurgery(String id) {
        surgeryRepository.deleteById(id);
    }

    // 更新每個手術的 groupApplicationIds
    public void updateSurgeryGroups(List<String> applicationIds) {
        if (applicationIds == null || applicationIds.isEmpty()) {
            throw new IllegalArgumentException("applicationIds 不可為空");
        }

        // 找第一台手術，推得 OperatingRoom
        Surgery firstSurgery = surgeryRepository.findById(applicationIds.get(0))
                .orElseThrow(() -> new RuntimeException("找不到手術 ID: " + applicationIds.get(0)));
        OperatingRoom room = firstSurgery.getOperatingRoom();

        // 找出該手術房的所有手術（用你提供的方法），並根據 orderInRoom 排序
        List<Surgery> allSurgeriesInRoom = surgeryRepository.findByOperatingRoom(room).stream()
                .sorted(Comparator.comparing(Surgery::getOrderInRoom, Comparator.nullsLast(Integer::compareTo)))
                .collect(Collectors.toList());

        // 標記群組 ID
        Set<String> groupSet = new HashSet<>(applicationIds);

        List<String> sortedGroupIds = allSurgeriesInRoom.stream()
                .filter(s -> groupSet.contains(s.getApplicationId()))
                .map(Surgery::getApplicationId)
                .collect(Collectors.toList());

        // 找出所有已經存在的群組
        Map<String, List<String>> existingGroups = new HashMap<>();
        for (Surgery surgery : allSurgeriesInRoom) {
            if (surgery.getGroupApplicationIds() != null && !surgery.getGroupApplicationIds().isEmpty()) {
                String groupKey = String.join("-", surgery.getGroupApplicationIds());
                if (!existingGroups.containsKey(groupKey)) {
                    existingGroups.put(groupKey, surgery.getGroupApplicationIds());
                }
            }
        }

        // 檢查新群組是否與現有群組有交集
        boolean hasIntersection = false;
        for (List<String> existingGroup : existingGroups.values()) {
            Set<String> existingSet = new HashSet<>(existingGroup);
            existingSet.retainAll(groupSet);
            if (!existingSet.isEmpty()) {
                hasIntersection = true;
                break;
            }
        }

        // 如果新群組與現有群組有交集，則先清除相關群組
        if (hasIntersection) {
            for (Surgery surgery : allSurgeriesInRoom) {
                if (surgery.getGroupApplicationIds() != null) {
                    Set<String> surgeryGroupIds = new HashSet<>(surgery.getGroupApplicationIds());
                    surgeryGroupIds.retainAll(groupSet);
                    if (!surgeryGroupIds.isEmpty()) {
                        // 如果手術屬於與新群組有交集的群組，清除其群組標記
                        surgery.setGroupApplicationIds(null);
                    }
                }
            }
        }

        // 更新屬於新群組的手術
        for (Surgery surgery : allSurgeriesInRoom) {
            if (groupSet.contains(surgery.getApplicationId())) {
                surgery.setGroupApplicationIds(sortedGroupIds);
            }
            // 不再清除其他手術的群組標記
        }

        // 重新編排 orderInRoom，保持手術的原始順序
        // 收集所有群組信息
        Map<String, List<Surgery>> groupsMap = new HashMap<>();

        // 先將所有手術按群組分類
        for (Surgery surgery : allSurgeriesInRoom) {
            if (surgery.getGroupApplicationIds() != null && !surgery.getGroupApplicationIds().isEmpty()) {
                String groupKey = String.join("-", surgery.getGroupApplicationIds());
                if (!groupsMap.containsKey(groupKey)) {
                    groupsMap.put(groupKey, new ArrayList<>());
                }
                groupsMap.get(groupKey).add(surgery);
            }
        }

        // 使用一個新列表來保存處理後的手術
        List<Surgery> orderedSurgeries = new ArrayList<>();

        // 遍歷原始手術列表，保持順序
        int currentOrder = 1;
        Set<String> processedIds = new HashSet<>();

        for (Surgery surgery : allSurgeriesInRoom) {
            String applicationId = surgery.getApplicationId();

            // 如果已經處理過，跳過
            if (processedIds.contains(applicationId)) {
                continue;
            }

            // 檢查是否屬於群組
            if (surgery.getGroupApplicationIds() != null && !surgery.getGroupApplicationIds().isEmpty()) {
                String groupKey = String.join("-", surgery.getGroupApplicationIds());
                List<Surgery> groupSurgeries = groupsMap.get(groupKey);

                // 對群組內手術按原有順序排序
                groupSurgeries
                        .sort(Comparator.comparing(Surgery::getOrderInRoom, Comparator.nullsLast(Integer::compareTo)));

                // 找出群組中的第一個手術（通常是最小的 orderInRoom）
                Surgery firstGroupSurgery = groupSurgeries.get(0);
                firstGroupSurgery.setOrderInRoom(currentOrder++);
                orderedSurgeries.add(firstGroupSurgery);
                processedIds.add(firstGroupSurgery.getApplicationId());

                // 其餘群組手術設為 null
                for (int i = 1; i < groupSurgeries.size(); i++) {
                    Surgery groupSurgery = groupSurgeries.get(i);
                    groupSurgery.setOrderInRoom(null);
                    orderedSurgeries.add(groupSurgery);
                    processedIds.add(groupSurgery.getApplicationId());
                }
            } else {
                // 非群組手術
                surgery.setOrderInRoom(currentOrder++);
                orderedSurgeries.add(surgery);
                processedIds.add(applicationId);
            }
        }

        // 儲存所有手術
        surgeryRepository.saveAll(orderedSurgeries);
    }

    // 清空手術的 groupApplicationIds
    public void clearSurgeryGroups(String id) {
        Surgery initSurgery = surgeryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Surgery not found with id " + id));

        List<String> applicationIds = initSurgery.getGroupApplicationIds();
        if (applicationIds == null || applicationIds.isEmpty()) {
            return;
        }

        // 取得 OperatingRoom
        OperatingRoom room = initSurgery.getOperatingRoom();

        // 房內手術依照順序排列
        List<Surgery> surgeriesInRoom = surgeryRepository.findByOperatingRoom(room).stream()
                .sorted(Comparator.comparing(Surgery::getOrderInRoom, Comparator.nullsLast(Integer::compareTo)))
                .collect(Collectors.toList());

        // 找到 main 手術在房間中的位置
        int mainIndex = -1;
        for (int i = 0; i < surgeriesInRoom.size(); i++) {
            if (surgeriesInRoom.get(i).getApplicationId().equals(id)) {
                mainIndex = i;
                break;
            }
        }

        if (mainIndex == -1) {
            throw new RuntimeException("主手術未在該房間內");
        }

        // 取得群組所有手術（依 groupIds 順序）
        List<Surgery> groupSurgeries = surgeryRepository.findAllById(applicationIds).stream()
                .sorted(Comparator.comparingInt(s -> applicationIds.indexOf(s.getApplicationId())))
                .collect(Collectors.toList());

        // 清除每一筆群組成員的 groupApplicationIds
        groupSurgeries.forEach(s -> s.setGroupApplicationIds(null));

        // 移除所有群組手術（主+副）出手術房中現有清單
        Set<String> groupIdSet = new HashSet<>(applicationIds);
        surgeriesInRoom.removeIf(s -> groupIdSet.contains(s.getApplicationId()));

        // 插回主手術位置（保留順序）
        surgeriesInRoom.addAll(mainIndex, groupSurgeries);

        // 重新編號 orderInRoom
        for (int i = 0; i < surgeriesInRoom.size(); i++) {
            surgeriesInRoom.get(i).setOrderInRoom(i + 1);
        }

        // 儲存所有手術更新
        surgeryRepository.saveAll(surgeriesInRoom);
    }

    // 根據 groupApplicationIds 更新手術群組的 estimatedSurgeryTime
    public void updateSurgeryGroupEstimatedTime(List<String> groupApplicationIds) {
        if (groupApplicationIds == null || groupApplicationIds.isEmpty()) {
            return;
        }

        // 查詢群組中所有手術
        List<Surgery> surgeries = surgeryRepository.findAllById(groupApplicationIds);
        if (surgeries.isEmpty()) {
            return;
        }

        // 取得 cleaningTime
        TimeSettingsDTO timeSettings = algorithmService.getTimeSettingsFromCsv();
        if (timeSettings == null) {
            return; // 若取得 cleaningTime 失敗，則退出
        }

        int cleaningTime = timeSettings.getCleaningTime();

        // 計算所有手術的 estimatedSurgeryTime 總和
        int totalEstimatedTime = surgeries.stream()
                .mapToInt(surgery -> surgery.getEstimatedSurgeryTime() != null ? surgery.getEstimatedSurgeryTime() : 0)
                .sum();

        // 加上 (n - 1) * cleaningTime
        int totalCleaningTime = (surgeries.size() - 1) * cleaningTime;
        totalEstimatedTime += totalCleaningTime;

        // 明確找出第一個指定的 ID
        String firstId = groupApplicationIds.get(0);
        Optional<Surgery> optionalFirstSurgery = surgeries.stream()
                .filter(s -> s.getApplicationId().equals(firstId))
                .findFirst();

        // 保存更新後的手術資料
        if (optionalFirstSurgery.isPresent()) {
            Surgery firstSurgery = optionalFirstSurgery.get();
            firstSurgery.setEstimatedSurgeryTime(totalEstimatedTime);
            surgeryRepository.save(firstSurgery);
        }
    }

    // 根據群組的 applicationIds 還原手術的 estimatedSurgeryTime
    public void restoreSurgeryGroupEstimatedTime(String id) {
        Surgery initSurgery = surgeryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Surgery not found with id " + id));

        List<String> groupIds = initSurgery.getGroupApplicationIds();
        List<Surgery> surgeries = surgeryRepository.findAllById(groupIds);

        if (surgeries.isEmpty()) {
            return;
        }

        TimeSettingsDTO timeSettings = algorithmService.getTimeSettingsFromCsv();
        if (timeSettings == null) {
            return;
        }

        int cleaningTime = timeSettings.getCleaningTime();

        // 明確取得第一台手術（根據群組傳入順序）
        String firstId = groupIds.get(0);
        Optional<Surgery> optionalFirstSurgery = surgeries.stream()
                .filter(s -> s.getApplicationId().equals(firstId))
                .findFirst();

        if (!optionalFirstSurgery.isPresent()) {
            return;
        }

        Surgery firstSurgery = optionalFirstSurgery.get();

        // 計算其他手術的總 estimatedSurgeryTime
        int totalEstimatedTime = surgeries.stream()
                .filter(s -> !s.getApplicationId().equals(firstId))
                .mapToInt(s -> s.getEstimatedSurgeryTime() != null ? s.getEstimatedSurgeryTime() : 0)
                .sum();

        totalEstimatedTime += (surgeries.size() - 1) * cleaningTime;

        // 還原第一台手術的 estimatedTime
        Integer currentGroupEstimated = firstSurgery.getEstimatedSurgeryTime();
        if (currentGroupEstimated != null && currentGroupEstimated > totalEstimatedTime) {
            int originalEstimatedTime = currentGroupEstimated - totalEstimatedTime;
            firstSurgery.setEstimatedSurgeryTime(originalEstimatedTime);
            surgeryRepository.save(firstSurgery);
        }
    }

    public void updateSurgery4DrogEnd(String id, String operatingRoomId) {
        // ✅ 直接尾插（0-based），改呼叫 moveAndReindex，避免 1-based
        int appendAt = (int) surgeryRepository.countByOperatingRoom_Id(operatingRoomId);
        moveAndReindex(id, operatingRoomId, appendAt, null);
    }

    public void updateSurgeryPrioritySequenceByRoom(String roomId) {

        // 撈出整院所有手術
        List<Surgery> allSurgeries = surgeryRepository.findAll();
        if (allSurgeries == null || allSurgeries.isEmpty()) {
            return;
        }

        // 按 estimatedSurgeryTime 排序（大的排前面）
        allSurgeries.sort((s1, s2) -> {
            int est1 = s1.getEstimatedSurgeryTime() != null ? s1.getEstimatedSurgeryTime() : 0;
            int est2 = s2.getEstimatedSurgeryTime() != null ? s2.getEstimatedSurgeryTime() : 0;
            return Integer.compare(est2, est1); // 大到小
        });

        // 從 1 開始重新設定 prioritySequence
        int sequence = 1;
        for (Surgery surgery : allSurgeries) {
            surgery.setPrioritySequence(sequence++);
                    "手術 " + surgery.getApplicationId() + " 設定 prioritySequence = " + surgery.getPrioritySequence());
        }

        // 一次存回
        surgeryRepository.saveAll(allSurgeries);

    }

    public List<String> uploadTimeTable(MultipartFile file, String username) {
        List<String> failedApplications = new ArrayList<>();
        List<Surgery> surgeriesToSave = new ArrayList<>(); // 批次存比較快
        Map<String, Integer> roomIdToNextOrderMap = new HashMap<>(); // 手動記錄每間房的 orderInRoom

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), Charset.forName("UTF-8")))) {
            String line;
            int lineNumber = 0;

            while ((line = reader.readLine()) != null) {
                lineNumber++;

                String[] columns = line.split(",", -1);
                if (columns.length < 10) {
                    failedApplications.add("第 " + lineNumber + " 行欄位數不足");
                    continue;
                }

                String applicationId = columns[1].trim();
                String medicalRecordNumber = columns[2].trim();
                String departmentName = columns[3].trim();
                String chiefSurgeonName = columns[4].trim();
                String operatingRoomName = columns[5].trim();
                String anesthesiaMethod = columns[6].trim();
                String estimatedTimeStr = columns[7].trim();
                String specialRequirements = columns[8].trim();

                // 檢查申請編號是否已存在
                if (surgeryRepository.existsById(applicationId)) {
                    failedApplications.add(applicationId + " 已存在，無法新增");
                    continue;
                }

                // 查找手術房
                Optional<OperatingRoom> optionalRoom = operatingRoomRepository
                        .findByOperatingRoomName(operatingRoomName);
                if (optionalRoom.isEmpty()) {
                    failedApplications.add(applicationId + " 找不到手術房：" + operatingRoomName);
                    continue;
                }
                OperatingRoom room = optionalRoom.get();

                        (room.getDepartment() != null ? room.getDepartment().getName() : "null"));

                // 驗證科別是否符合
                if (room.getDepartment() == null || !room.getDepartment().getName().equals(departmentName)) {
                    failedApplications.add(applicationId + " 手術房與科別不一致（房間科別: " +
                            (room.getDepartment() != null ? room.getDepartment().getName() : "無科別") + "）");
                    continue;
                }

                // 查找主刀醫師
                Optional<ChiefSurgeon> optionalSurgeon = chiefSurgeonRepository.findByPhysicianName(chiefSurgeonName);
                if (optionalSurgeon.isEmpty()) {
                    failedApplications.add(applicationId + " 找不到主刀醫師：" + chiefSurgeonName);
                    continue;
                }
                ChiefSurgeon chiefSurgeon = optionalSurgeon.get();

                // 決定 orderInRoom
                String roomId = room.getId();
                int nextOrder = roomIdToNextOrderMap.getOrDefault(roomId, room.getSurgeries().size() + 1);
                roomIdToNextOrderMap.put(roomId, nextOrder + 1);

                // 設定使用者
                User user = userRepository.findByUsername(username)
                        .orElseThrow(() -> new RuntimeException("User not found"));

                // 建立 Surgery
                Surgery surgery = new Surgery();
                surgery.setApplicationId(applicationId);
                surgery.setMedicalRecordNumber(medicalRecordNumber);
                surgery.setOperatingRoom(room);
                surgery.setChiefSurgeon(chiefSurgeon);
                surgery.setAnesthesiaMethod(anesthesiaMethod);
                surgery.setDate(Date.valueOf(LocalDate.now().plusDays(1)));
                surgery.setOrderInRoom(nextOrder);
                surgery.setUser(user);

                try {
                    surgery.setEstimatedSurgeryTime(Integer.parseInt(estimatedTimeStr));
                } catch (NumberFormatException e) {
                    failedApplications.add(applicationId + " 手術預估時間格式錯誤");
                    continue;
                }

                surgery.setSpecialOrRequirements(specialRequirements.equalsIgnoreCase("Y") ? "Y" : "N");

                surgeriesToSave.add(surgery);
            }
        } catch (IOException e) {
            throw new RuntimeException("讀取上傳檔案失敗: " + e.getMessage());
        }

        // 批次存入資料庫
        surgeryRepository.saveAll(surgeriesToSave);

        List<OperatingRoom> operatingRooms = operatingRoomRepository.findAll();
        for (OperatingRoom room : operatingRooms) {
            updateSurgeryPrioritySequenceByRoom(room.getId());
        }

        return failedApplications;
    }

    @Transactional
    public void moveAndReindex(String id, String destRoomId, int destIndex, String srcRoomIdFromClient) {
        Surgery s = surgeryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Surgery not found: " + id));

        String srcRoomId = s.getOperatingRoom().getId();
        boolean sameRoom = srcRoomId.equals(destRoomId);

        OperatingRoom destRoom = operatingRoomRepository.findById(destRoomId)
                .orElseThrow(() -> new RuntimeException("OperatingRoom not found: " + destRoomId));

        // ✅ 改這裡（錯誤的 operatingRoomId → 正確的 operatingRoom_Id）
        List<Surgery> dst = surgeryRepository.findByOperatingRoom_IdOrderByOrderInRoomAsc(destRoomId);

        if (sameRoom) {
            dst.removeIf(x -> x.getApplicationId().equals(s.getApplicationId()));
        } else {
            s.setOperatingRoom(destRoom);
        }

        int insertAt = Math.max(0, Math.min(destIndex, dst.size()));
        dst.add(insertAt, s);

        List<String> groupIds = s.getGroupApplicationIds();
        if (groupIds != null && !groupIds.isEmpty()) {
            for (String gid : groupIds) {
                if (gid.equals(s.getApplicationId()))
                    continue;
                surgeryRepository.findById(gid).ifPresent(member -> {
                    member.setOperatingRoom(destRoom);
                    surgeryRepository.save(member);
                });
            }
        }

        // 目標房重排：0-based
        for (int i = 0; i < dst.size(); i++)
            dst.get(i).setOrderInRoom(i);
        surgeryRepository.saveAll(dst);

        if (!sameRoom) {
            // ✅ 這裡也改
            List<Surgery> src = surgeryRepository.findByOperatingRoom_IdOrderByOrderInRoomAsc(srcRoomId);
            src.removeIf(x -> x.getApplicationId().equals(s.getApplicationId()));
            for (int i = 0; i < src.size(); i++)
                src.get(i).setOrderInRoom(i);
            surgeryRepository.saveAll(src);
        }
    }
}