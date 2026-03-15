# 演算法模組 — 自適應模擬退火方法應用於手術排程

本文件說明手術排程最佳化演算法的理論基礎、設計方法與介面規格，供後續開發者實作或替換演算法時參考。

---

## 1. 問題建模與目標函數

### 1.1 符號定義

| 符號 | 說明 |
|------|------|
| I | 所有可參與排程之手術房間集合，\|I\| 為手術房間總數 |
| J | 所有需安排之手術集合，\|J\| 為手術總數 |
| Pi | 手術房間 i 的正常運作時間長度（標準作業期間）|
| Li | 手術房間 i 允許的加班時間長度 |
| Dj | 手術 j 的固定執行期間（排程前已確知）|
| t | 每台手術結束後的固定清消期間（病人轉換、清潔消毒、設備更換）|
| si | 手術房間 i 的實際使用期間（所有手術執行期間 + 清消期間之總和）|
| zi | 手術房間 i 的加班期間（0 ≤ zi ≤ Li）|
| oi | 手術房間 i 的超時期間 |
| N | 所有手術類型集合 |
| αjn | 手術 j 是否屬於類型 n（1 = 是，0 = 否）|
| βin | 手術房間 i 是否具備執行手術類型 n 的能力（1 = 是，0 = 否）|
| xijk | 決策變數：手術 j 被安排於手術房間 i 的第 k 個位置時為 1，否則為 0 |

### 1.2 手術房間使用情形

根據實際使用期間 si 與正常運作時間 Pi 及允許加班時間 Li 之關係，可對應三種狀況：

1. **正常**：si ≤ Pi（未超過正常運作時間）
2. **加班**：si > Pi，產生加班期間 zi（0 ≤ zi ≤ Li）
3. **超時**：si > Pi + Li，產生超時期間 oi

### 1.3 限制條件

- **類型適配限制**：每一項手術只能被分派至具備執行該手術類型能力的手術房間
- **唯一配置限制**：每一項手術被唯一且完整地分派至一個房間的一個位置
- **順序邏輯限制**：手術在同一房間中必須依序安排，不產生空位
- **時間控管限制**：加班期間與超時期間依實際使用期間是否超出正常運作時間與加班上限進行判定
- **非負數性限制**：zi ≥ 0, oi ≥ 0

### 1.4 目標函數

目標為最小化三項成本之加權總和：

```
min W = Σ(gi × zi) + Σ(hi × oi) + λ × Σ|si - s̄|
         i∈I          i∈I              i∈I
```

| 成本項目 | 說明 |
|----------|------|
| gi × zi | 加班時間所對應的加班成本 |
| hi × oi | 超時時間所對應的超時成本 |
| λ × Σ\|si - s̄\| | 平衡各手術房使用時間的配置成本（s̄ 為各房間使用時間平均值）|

---

## 2. 演算法框架

本研究使用**鏈結串列**表示手術房間內的手術順序，每一手術房間對應一組鏈結串列。採用臨床現場提供的原始手術預約資料作為初始排程方案，使後續優化改善幅度能直接與臨床現況對應。

### 演算法流程

```
步驟 1. 讀入原始手術資料作為初始解 X，計算目標函數值 E(X)，記錄最佳解

步驟 2. 依問題規模使用二分搜尋法自適應設定初始溫度，令當前溫度 = 初始溫度

步驟 3. 在當前溫度下執行多次擾動產生新解 Y
        （擾動次數 tgreedy 隨問題規模 n 動態調整）

步驟 4. 計算新解 Y 與目前解 X 的目標函數差值 ΔE
        - 若新解品質更優 → 無條件接受
        - 否則依機率 P = exp(-ΔE / T) 決定是否接受

步驟 5. 依據冷卻策略與熱重啟機制更新溫度，重複步驟 3–4

步驟 6. 當評估函數呼叫次數達到設定門檻時停止，輸出最佳排程方案
```

---

## 3. 溫控機制

### 3.1 自適應初始溫度（二分搜尋法）

初始溫度搜尋範圍 [LB, UB]：
- **下界 LB**：定值 1
- **上界 UB**：由問題規模決定（待排手術總數 × 手術室總數）

搜尋程序：
1. 取當前區間中位數作為測試溫度
2. 執行模擬擾動，觀察解接受率是否符合目標值（50%）
3. 若接受率低於目標 → 溫度過低，調高下界
4. 若接受率高於目標 → 溫度過高，調低上界
5. 反覆迭代至收斂

此策略使不同規模問題自動取得最適初始溫度，避免人工設定參數僵化。

### 3.2 餘弦退火降溫策略（SGDR）

採用餘弦退火函數取代傳統固定冷卻速率，溫度在單一週期內依餘弦函數平滑下降：

```
Tk = Tmin + 0.5 × (Tmax(i) - Tmin) × (1 + cos(π × Qcur / Qi))
```

| 參數 | 說明 |
|------|------|
| Tmin | 預設最低溫度門檻 |
| Tmax(i) | 第 i 個週期的最高溫度 |
| Qcur | 當前週期內已進行的降溫次數 |
| Qi | 當前週期的總降溫次數（Qi = α × √n，隨問題規模動態調整）|

### 3.3 熱重啟機制

當 Qcur = Qi（當前週期結束）時觸發：
- 將溫度重新提升至該週期起始高溫，賦予演算法跳脫局部最佳解的能量
- 同步以**衰減因子**調降下一週期的最高溫度 Tmax(i)
- 使搜尋範圍隨週期演進逐漸聚焦於高品質解區域

---

## 4. 擾動設計（多階段擾動機制）

核心邏輯建立在不同溫度階段對搜尋行為的差異需求，透過正規化溫度 Tnorm 調節搜尋重心。

### 4.1 機率切換公式

```
Prandom = (Tnorm - TL) / (1 - TL)
Prule = 1 - Prandom
```

其中 TL 為最低溫度閾值（如 0.01）。

### 4.2 三階段搜尋行為

| 溫度階段 | Prandom | 搜尋行為 | 擾動策略 |
|----------|---------|----------|----------|
| **高溫**（探索期）| ≈ 1.0 | 全域探索，跳脫局部最佳解 | 隨機化擾動：跨房隨機插入、隨機位置交換 |
| **中溫**（過渡期）| 0.3–0.7 | 探索與開發平衡 | 隨機與規則混合 |
| **低溫**（開發期）| ≈ 0.0 | 精緻開發，局部優化 | 規則化擾動：LPT/SPT 派遣規則導向修正 |

### 4.3 擾動算子

**隨機組擾動**（高溫階段）：
- 跨房隨機插入（crossRoomInsertGreedy）：將手術移至另一房間，貪婪選擇最佳目標房
- 隨機位置交換（swapSurgeries）：隨機交換兩台手術位置
- 連續執行兩種擾動，使單次變化程度更大

**規則組擾動**（低溫階段）：
- 改進型交換（improvedSwap）：基於 LPT/SPT 規則選擇交換對象
- 改進型插入（improvedInsert）：基於派遣規則選擇插入位置
- 直接針對目標函數中的負載不均與加班成本進行修正

### 4.4 自適應擾動次數

每一溫度階段的擾動次數隨問題規模自動調整：

```
tgreedy = n × β
```

其中 n = 手術室數量 × 手術總數（問題規模），β 為調整係數。

---

## 5. 實驗結果摘要

以南部某醫學中心 384 天實際擇期手術資料進行測試，單日手術數量 24–106 台，手術房 12–24 間。

### 評估指標

| 指標 | 說明 |
|------|------|
| 目標函數值（總成本）| 加班成本 + 超時成本 + 負載平衡成本，越低越佳 |
| 總加班時數 | 超出正常工作時間但在加班上限內的時間總和 |
| 總超時分鐘數 | 超出加班上限的時間總量 |
| 負載差異 | 各手術室工作量分配均衡程度 |
| 計算時間 | 演算法實際運行時間（毫秒）|

### 比較方法

| 方法 | 說明 |
|------|------|
| **本研究** | 自適應模擬退火 + SGDR 餘弦退火 + 多階段擾動 |
| CP-SAT | Google OR-Tools 精確求解器（時間限制 10 秒）|
| LPT | 最長手術時間優先派遣規則 |
| SPT | 最短手術時間優先派遣規則 |
| SA-S | 傳統 SA + 交換擾動 |
| SA-I | 傳統 SA + 插入擾動 |
| SA-IW | 傳統 SA + 插入交換混合擾動 |

### 關鍵發現

- **小規模案例**（等級 1–2）：CP-SAT 在小規模下略優，但本研究方法仍具競爭力
- **中大規模案例**（等級 3–5）：本研究方法在目標函數值、超時控制與負載均衡上均為最優
- CP-SAT 隨問題規模增大，搜尋空間指數增長，效能顯著下降
- LPT/SPT 派遣規則計算快速但缺乏全域搜尋能力，加班與負載不均問題顯著
- 本研究方法在各規模案例中均展現最優的整體穩定性

---

## 6. CSV 介面規格

演算法作為獨立 Java 子程序運行，透過 CSV 檔案與後端系統溝通。

### 6.1 輸入檔案

**① TimeTable.csv — 手術時間表**

| 欄位 | 說明 |
|------|------|
| 日期時間 | 第一台手術寫入實際時間（如 `0830`），其餘寫 `TF` |
| 申請書號 | 空房佔位行填 `000000` |
| 病歷號 | |
| 科別名稱 | |
| 主刀醫師 | 空佔位行填「空醫師」|
| 手術房名稱 | 如 `A1` |
| 麻醉方式 | |
| 預估時間（分鐘）| 空佔位行填 `0` |
| 特殊房型需求 | `Y` 或 `N` |
| 優先序列 | 空佔位行填 `99999` |

排除：關閉房、鎖定房、群組從屬手術（只寫主手術）。無手術的開放房寫一行空佔位。

**② room.csv — 手術房清單**

| 區段 | 說明 |
|------|------|
| `#roomNamesOfAll` | 所有參與排程的房間名稱（逗號分隔）|
| `#roomNames4Orth` | 其中屬於特殊房型的名稱 |

排除：關閉房與鎖定房。

**③ Arguments4Exec.csv — 時間參數**

| 參數 | 說明 |
|------|------|
| 排程開始時間 | 分鐘數（如 `510` = 08:30）|
| 正常班最大時間 | 分鐘數（如 `540` = 9 小時）|
| 加班最大時間 | 分鐘數（如 `120` = 2 小時）|
| 清潔銜接時間 | 分鐘數（如 `60`）|

### 6.2 輸出檔案

**① Guidelines.csv — 可讀排程結果**（後端從此解析更新資料庫）

| 欄位 | 說明 |
|------|------|
| 天次 | 如「第1天」|
| 主刀醫師 | |
| 手術名稱(預估時間) | 如 `A0001(90)` |
| 開始時間 | 如 `08:30` |
| 結束時間 | 如 `10:00` |
| 狀態碼 | `1` = 手術，`4` = 清潔時間 |

**② newTimeTable.csv — 機器可讀版本**

與 Guidelines.csv 相同格式，用於系統備份。

### 6.3 後端整合方式

後端透過 `AlgorithmService.java` 中的 `ProcessBuilder` 啟動演算法子程序。整合新演算法時需修改以下常數：

```java
private static final String BATCH_FILE_PATH = "algorithm/your_algorithm.bat";
private String ORSM_FILE_PATH = "algorithm/data/in";
private String ORSM_GUIDELINES_FILE_PATH = "algorithm/data/out";
```

---

## 7. 參考文獻

1. V. Kayvanfar et al., "A new model for operating room scheduling with elective patient strategy," *INFOR*, vol. 59, no. 2, pp. 309–332, 2021.
2. B. T. Denton et al., "Optimal Allocation of Surgery Blocks to Operating Rooms Under Uncertainty," *Operations Research*, vol. 58, no. 4, pp. 802–816, 2010.
3. S. Zhu et al., "Operating room planning and surgical case scheduling: a review of literature," *J. Combinatorial Optimization*, vol. 37, no. 3, pp. 757–805, 2019.
4. Y. Yuan et al., "Adaptive simulated annealing with greedy search for the circle bin packing problem," *Computers & Operations Research*, vol. 144, Art. no. 105826, 2022.
5. A. Bit-Monnot, "Enhancing Hybrid CP-SAT Search for Disjunctive Scheduling," *Frontiers in AI and Applications*, vol. 372, pp. 255–262, 2023.
6. C. Little and S. Choudhury, "A review of the scheduling problem within Canadian healthcare centres," *Applied Sciences*, vol. 12, no. 21, Art. no. 11146, 2022.
7. N. V. Hieu et al., "Combination of dispatching rules to minimize makespan and total weighted tardiness for identical parallel machines scheduling problem," *World J. Advanced Engineering Technology and Sciences*, vol. 17, no. 1, pp. 61–70, 2025.
8. Md. Al Amin et al., "A comprehensive review on operating room scheduling and optimization," *Operational Research*, vol. 25, Art. no. 3, 2025.
9. Y. Lin and C. Yen, "Genetic Algorithm for Solving the No-Wait Three-Stage Surgery Scheduling Problem," *Healthcare*, vol. 11, no. 5, p. 739, 2023.
10. S. Kirkpatrick et al., "Optimization by Simulated Annealing," *Science*, vol. 220, no. 4598, pp. 671–680, 1983.
11. Z. Lu et al., "A Hybrid Evolutionary Algorithm for the Clique Partitioning Problem," *IEEE Trans. Cybernetics*, vol. 52, no. 9, pp. 9391–9403, 2022.
12. M. Becker et al., "Learning proposal distributions in simulated annealing via template networks," in *Proc. ICPR 2024*, LNCS, vol. 15308, Springer, 2025, pp. 1–15.
13. I. Loshchilov and F. Hutter, "SGDR: Stochastic gradient descent with warm restarts," in *Proc. ICLR*, Toulon, France, 2017.
14. K. Wu et al., "ADVCSO: Adaptive Dynamically Enhanced Variant of Chicken Swarm Optimization for Combinatorial Optimization Problems," *Biomimetics*, vol. 10, no. 5, p. 303, 2025.
