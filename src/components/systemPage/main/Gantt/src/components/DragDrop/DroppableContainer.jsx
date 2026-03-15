import React from "react";
import { Droppable, Draggable } from "react-beautiful-dnd";
import RoomItem from "../ROOM/RoomItem";
import Group from "../ROOM/Group";

function DroppableContainer({ 
  room, 
  roomIndex, 
  isPinned, 
  roomName, 
  readOnly = false, 
  onSurgeryClick, 
  isGroupMode = false,
  isMultiSelectMode = false,
  isUngroupMode = false,
  selectedSurgeries = [],
  isMainPage = false,
  isFiltered = false
}) {
  const fixedHeight = "60px";

  // 確保每個項目都有唯一的 ID
  const ensureUniqueId = (item, index) => {
    // 優先使用applicationId作為唯一標識，其次是現有id，最後才使用生成的id
    return item.applicationId || item.id || `generated-id-${roomIndex}-${index}-${Date.now()}`;
  };

  // 檢查手術是否被選中
  const isSurgerySelected = (surgery) => {
    return selectedSurgeries.some(s => s.id === surgery.id);
  };

  // 渲染群組項目
  const renderGroupItem = (group, index) => {
    if (!group.isGroup) return null;

    return (
      <Group
        key={`group-${group.id}`}
        group={group}
        roomIndex={roomIndex}
        fixedHeight={fixedHeight}
        isDragging={false}
        isPinned={isPinned}
        roomName={roomName}
        readOnly={readOnly && !isUngroupMode} // 在解除模式下允許點擊
        onSurgeryClick={onSurgeryClick}
        isUngroupMode={isUngroupMode}
      />
    );
  };

  // 渲染普通手術項目
  const renderSurgeryItem = (surgery, itemIndex, cleaning) => {
    const isSelected = (isGroupMode || isMultiSelectMode) && isSurgerySelected(surgery);
    
    return (
      <div
        key={`${ensureUniqueId(surgery, itemIndex)}-${itemIndex}`}
        style={{
          display: "flex",
          height: fixedHeight,
          position: "relative",
        }}
      >
        <RoomItem
          item={surgery}
          itemIndex={itemIndex}
          roomIndex={roomIndex}
          fixedHeight={fixedHeight}
          isDragging={false}
          isPinned={isPinned}
          roomName={roomName}
          readOnly={readOnly || (isGroupMode && !isMultiSelectMode)}
          onSurgeryClick={onSurgeryClick}
          isSelected={isSelected}
          isGroupMode={isGroupMode}
          isMultiSelectMode={isMultiSelectMode}
          isUngroupMode={isUngroupMode}
          isMainPage={isMainPage}
        />
        {cleaning && (
          <RoomItem
            item={cleaning}
            itemIndex={itemIndex + 1}
            roomIndex={roomIndex}
            fixedHeight={fixedHeight}
            isDragging={false}
            isPinned={isPinned}
            roomName={roomName}
            readOnly={readOnly || (isGroupMode && !isMultiSelectMode)}
            onSurgeryClick={onSurgeryClick}
            isGroupMode={isGroupMode}
            isMultiSelectMode={isMultiSelectMode}
            isUngroupMode={isUngroupMode}
            isMainPage={isMainPage}
          />
        )}
      </div>
    );
  };

  // 創建虛擬拖曳容器項目
  const createDragContainer = (items) => {
    if (!items || items.length === 0) return null;
    
    // 排序項目，按開始時間排序
    const sortedItems = [...items].sort((a, b) => {
      // 轉換時間為分鐘，以便比較
      const aMinutes = timeToMinutes(a.startTime);
      const bMinutes = timeToMinutes(b.startTime);
      return aMinutes - bMinutes;
    });
    
    // 生成容器ID
    const containerId = `drag-container-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 取第一個和最後一個項目的時間
    const firstItem = sortedItems[0];
    const lastItem = sortedItems[sortedItems.length - 1];
    
    // 創建容器項目
    return {
      id: containerId,
      startTime: firstItem.startTime,
      endTime: lastItem.endTime,
      items: sortedItems,
      isVirtualContainer: true,
      // 保留原始數據
      originalRoomIndex: roomIndex,
      roomName: roomName
    };
  };

  // 輔助函數：將時間轉換為分鐘數
  const timeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 開始修改：如果有篩選條件，確保返回不可拖曳的版本
  // 如果是只讀模式或群組模式或解除模式或多選模式或已篩選，直接渲染不可拖動的內容
  if (readOnly || isGroupMode || isUngroupMode || isMultiSelectMode || isFiltered) {
    console.log("DroppableContainer: 渲染不可拖曳的內容，isFiltered =", isFiltered, "readOnly =", readOnly);
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          minHeight: fixedHeight,
          minWidth: "100px",
          position: "relative",
          background: !isMainPage && isPinned ? "rgba(254, 226, 226, 0.4)" : "transparent",
          cursor: isFiltered ? "not-allowed" : "default",
        }}
      >
        {(room.data && room.data.length > 0
          ? Array.from({ length: Math.ceil(room.data.length / 2) })
          : [null]
        ).map((_, index) => {
          const itemIndex = index * 2;
          const surgery = room.data?.[itemIndex];
          const cleaning = room.data?.[itemIndex + 1];

          if (!surgery && index === 0) {
            return <div key="empty" style={{ height: fixedHeight, minWidth: "50px" }} />;
          }

          if (!surgery) return null;

          // 如果是群組，渲染群組
          if (surgery.isGroup) {
            return renderGroupItem(surgery, itemIndex);
          }

          // 否則渲染普通手術
          return renderSurgeryItem(surgery, itemIndex, cleaning);
        })}
      </div>
    );
  }
  
  // 確保完全禁用拖曳功能
  console.log("DroppableContainer: 渲染可拖曳的內容");

  // 否則，使用拖放功能
  return (
    <Droppable
      droppableId={`droppable-${roomIndex}`}
      direction="horizontal"
      type="SURGERY_PAIR"
      isDropDisabled={!isMainPage && isPinned}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={{
            display: "flex",
            flexDirection: "row",
            minHeight: fixedHeight,
            minWidth: "100px",
            background: snapshot.isDraggingOver
              ? "rgba(100, 0, 100, 0.5)"
              : !isMainPage && isPinned ? "rgba(254, 226, 226, 0.4)" : "transparent",
            transition: "background 0.2s ease",
            position: "relative",
            zIndex: snapshot.isDraggingOver ? 1 : "auto",
          }}
        >
          {!isMainPage && isPinned && (
            <div 
              className="absolute inset-0 border-2 border-red-300 rounded-md pointer-events-none"
              style={{ zIndex: 0 }}
            ></div>
          )}
          
          {(room.data && room.data.length > 0
            ? Array.from({ length: Math.ceil(room.data.length / 2) })
            : [null]
          ).map((_, index) => {
            const itemIndex = index * 2;
            const surgery = room.data?.[itemIndex];
            const cleaning = room.data?.[itemIndex + 1];

            if (!surgery && index === 0) {
              return <div key="empty" style={{ height: fixedHeight, minWidth: "50px" }} />;
            }

            if (!surgery) return null;
            
            // 如果是虛擬拖曳容器，特殊處理
            if (surgery.isVirtualContainer) {
              return (
                <Draggable
                  key={surgery.id}
                  draggableId={surgery.id}
                  index={index}
                  isDragDisabled={!isMainPage && isPinned || isFiltered}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        height: fixedHeight,
                        opacity: snapshot.isDragging ? 0.9 : 1,
                        zIndex: snapshot.isDragging ? 9999 : 1,
                        cursor: !isMainPage && isPinned ? 'not-allowed' : 'move',
                        display: 'flex',
                        background: '#10B981',
                        color: 'white',
                        borderRadius: '0.5rem',
                        padding: '4px',
                        justifyContent: 'center',
                        alignItems: 'center',
                        ...provided.draggableProps.style,
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div>{`${surgery.items.length} 個已選項目`}</div>
                        <div>{`${surgery.startTime} - ${surgery.endTime}`}</div>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            }
            
            // 如果是群組，使用特殊的群組渲染邏輯
            if (surgery.isGroup) {
              return (
                <Draggable
                  key={surgery.id}
                  draggableId={surgery.id}
                  index={index}
                  isDragDisabled={!isMainPage && isPinned || isFiltered}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        height: fixedHeight,
                        opacity: snapshot.isDragging ? 0.9 : 1,
                        zIndex: snapshot.isDragging ? 9999 : 1,
                        cursor: !isMainPage && isPinned ? 'not-allowed' : 'move',
                        ...provided.draggableProps.style,
                      }}
                    >
                      {renderGroupItem(surgery, itemIndex)}
                    </div>
                  )}
                </Draggable>
              );
            }
            
            // 為拖曳項目生成唯一 ID
            const draggableId = `draggable-${roomIndex}-${index}`;
            const surgeryId = ensureUniqueId(surgery, itemIndex);

            return (
              <Draggable
                key={surgery.id}
                draggableId={surgery.id}
                index={index}
                isDragDisabled={!isMainPage && isPinned || isFiltered}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      display: "flex",
                      height: fixedHeight,
                      opacity: snapshot.isDragging ? 0.9 : 1,
                      zIndex: snapshot.isDragging ? 9999 : 1,
                      cursor: !isMainPage && isPinned ? 'not-allowed' : 'move',
                      position: "relative",
                      ...provided.draggableProps.style,
                    }}
                  >
                    <RoomItem
                      item={{...surgery, id: surgeryId}}
                      itemIndex={itemIndex}
                      roomIndex={roomIndex}
                      fixedHeight={fixedHeight}
                      isDragging={snapshot.isDragging}
                      isPinned={isPinned}
                      roomName={roomName}
                      onSurgeryClick={onSurgeryClick}
                      isMainPage={isMainPage}
                    />
                    {cleaning && (
                      <RoomItem
                        item={{...cleaning, id: ensureUniqueId(cleaning, itemIndex + 1)}}
                        itemIndex={itemIndex + 1}
                        roomIndex={roomIndex}
                        fixedHeight={fixedHeight}
                        isDragging={snapshot.isDragging}
                        isPinned={isPinned}
                        roomName={roomName}
                        onSurgeryClick={onSurgeryClick}
                        isMainPage={isMainPage}
                      />
                    )}
                  </div>
                )}
              </Draggable>
            );
          })}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default DroppableContainer;
