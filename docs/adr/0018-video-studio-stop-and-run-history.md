# ADR-0018: Video Studio — nút Dừng thật + Lịch sử/log chạy

🟢 Accepted

- **Date**: 2026-10-15
- **Status**: Accepted

## Context

Người dùng báo: Video Studio không thấy lịch sử chạy, không thấy log chạy, và không có nút Dừng. Khảo sát code xác nhận đây là 2 lỗ hổng THẬT, không phải chỉ ẩn trong UI:

1. **Nút Dừng không thể hoạt động được dù có vẻ tồn tại hạ tầng**: `ipc/video-studio-handlers.ts`'s `runningRuns` map được tạo và set `{ aborted: false }` nhưng không có handler `video-studio:stop` nào để set nó thành `true` — và quan trọng hơn, `executeVideoPipeline`/`executeNode` (`main/video-studio/engine.ts`) chưa bao giờ đọc field này ở bất kỳ đâu, khác hẳn Automation (`automation/engine.ts` check `ctx.aborted` ở 4 chỗ khác nhau). `VideoExecutionContext` thậm chí không có field `aborted`.
2. **Không có UI lịch sử/log chạy**: `getVideoPipelineRuns(pipelineId)` đã tồn tại đầy đủ ở service layer, dữ liệu `video_pipeline_runs` đã được ghi đúng ở cả 2 nơi chạy (`video-studio:run` và `run_video_pipeline` agent tool) — nhưng không hề được expose qua IPC, không có trong preload, và Video Studio hoàn toàn không có component nào hiển thị nó.

## Decision

### 1. Nút Dừng — mirror chính xác pattern Automation

`VideoExecutionContext` (`video-studio/nodes/base-node.ts`) thêm `aborted?: boolean`. `executeVideoPipeline` (`video-studio/engine.ts`) check `if (ctx.aborted) break` đầu mỗi tầng; `executeNode` check `if (ctx.aborted) return` ngay đầu — vì các node trong cùng 1 tầng chạy ĐỒNG THỜI qua `Promise.allSettled`, không chỉ queue tuần tự như Automation, nên check phải nằm trong từng node chứ không chỉ ở vòng lặp tầng.

`ipc/video-studio-handlers.ts`: `runningRuns` đổi từ lưu `{ aborted: boolean }` (vô dụng — không tham chiếu `ctx` thật) sang lưu `{ abort: () => void }` đóng lại đúng `ctx` đang chạy, giống hệt `workflow:stop`. Thêm handler `video-studio:stop`.

`renderer/stores/video-studio-store.ts`: phát hiện thêm 1 lỗi liên quan khi sửa — `runningRunId` trước đây chỉ được set SAU KHI `window.api.runVideoPipeline()` resolve (= đã chạy xong, lúc đó Dừng vô nghĩa). Sửa: subscribe thêm sự kiện `'video-studio:status'` (trước đây chưa từng lắng nghe) để lấy `runId` thật ngay khi run bắt đầu.

Giới hạn đã biết (giống hệt Automation): chỉ ngăn khởi động tầng/node MỚI, không huỷ ngang 1 lệnh gọi provider đang chạy dở (job trả phí đã submit rồi).

### 2. Lịch sử + log chạy — component mới, tái dùng dữ liệu đã có

`ipc/video-studio-handlers.ts` thêm handler `video-studio:getRuns` wrap thẳng `getVideoPipelineRuns()` đã có. Component mới `VideoExecutionHistory.tsx` — mirror phần "Lịch sử" của Automation's `ExecutionPanel.tsx` nhưng thêm khả năng bấm vào 1 dòng để xem log thật của lần chạy đó (`JSON.parse(run.logs)`) — không làm phần "log đang chạy trực tiếp" như `ExecutionPanel` vì video-studio-store chưa tích luỹ `executionLogs` kiểu đó, nằm ngoài phạm vi yêu cầu (người dùng chỉ thiếu lịch sử + log, không thiếu live-stream log).

`logs` lưu 2 dạng khác nhau tuỳ nơi chạy (`video-studio:run` ghi `LogEntry[]`; `run_video_pipeline` tool ghi `string[]` thuần) — component render phòng hờ cả 2 dạng.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Thêm cả phần "log đang chạy trực tiếp" (như ExecutionPanel) | Đầy đủ hơn | Cần thêm hạ tầng tích luỹ `executionLogs` trong store (chưa có), vượt phạm vi đã nêu | Người dùng chỉ báo thiếu lịch sử + log, không yêu cầu live-stream |
| Trạng thái "stopped" riêng biệt khi Dừng (khác completed/error) | Chính xác hơn về mặt dữ liệu | Automation cũng KHÔNG có trạng thái riêng (dừng giữa chừng vẫn ghi "completed") — thêm bất đối xứng mới giữa 2 module | Giữ nhất quán với tiền lệ đã có, tránh tạo lệch chuẩn mới |
| Mirror chính xác Automation's abort pattern + component lịch sử mới tái dùng service có sẵn (chosen) | Tái dùng tối đa hạ tầng đã kiểm chứng, nhất quán kiến trúc 2 module | Không giải quyết vấn đề "completed dù đã dừng" (kế thừa luôn hạn chế của Automation) | Đúng phạm vi yêu cầu, rủi ro thấp |

## Consequences

### Positive
- Dừng 1 pipeline đang chạy giờ hoạt động thật — ngăn các tầng/node tiếp theo khởi động.
- Lịch sử + log chạy hiện đầy đủ, xem lại được bất kỳ lúc nào, không cần đợi 1 cửa sổ renderer cụ thể đang mở lúc chạy.
- Phát hiện thêm và sửa luôn 1 lỗi liên quan: `runningRunId` trước đây không bao giờ có giá trị hữu ích trong lúc đang chạy.

### Negative
- Vẫn kế thừa hạn chế của Automation: dừng giữa chừng vẫn ghi trạng thái "completed" (không có "stopped" riêng).
- Không hiển thị log đang chạy trực tiếp (chỉ xem được SAU khi 1 lần chạy kết thúc) — nếu cần live-stream log thật, cần làm thêm.

## Related

- [ADR-0014](0014-pipeline-runnable-guard-and-task-output-honesty.md) — guard liên quan tới cùng luồng chạy pipeline
- Automation's `workflow:stop`/`ExecutionPanel.tsx` — pattern gốc được mirror nguyên vẹn
