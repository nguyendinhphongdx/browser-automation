# ADR-0011: AI có thể tự CHẠY pipeline video thật (gate approval)

🟢 Accepted

- **Date**: 2026-10-12
- **Status**: Accepted

## Context

AI (cả domain video-studio và trợ lý chung qua `delegate_to_video_studio`) trước giờ chỉ THIẾT KẾ được pipeline (`propose_video_pipeline_change`) — không có tool nào thật sự CHẠY nó. Người dùng xác nhận 1 task kind="image" được AI báo "Xong" nhưng không có ảnh nào được tạo ra — vì ngay cả khi AI thiết kế đúng pipeline, chưa từng có cách nào để nó tự chạy ra kết quả thật; người dùng phải tự mở Video Studio bấm Chạy.

Người dùng chốt: thêm khả năng chạy thật, có gate approval (giống `delete_resource`/`delegate_to_automation`) vì tốn tiền/thời gian gọi provider thật (Flux/OpenAI Image/Kling/Runway/ComfyUI).

Khảo sát xác nhận `executeVideoPipeline(nodes, edges, ctx)` (`video-studio/engine.ts`) KHÔNG cần `WebContents` — khác `executeCampaign` (ADR-0008 đã loại trừ vì lý do này) — `ctx` chỉ là callback thuần (`log`, `onNodeStart/Progress/Done/Error`), gọi được thẳng từ 1 agent tool không cần renderer nào đang mở.

## Decision

Tool mới `run_video_pipeline(videoPipelineId)` — `getVideoPipelineById` lấy pipeline, `createVideoPipelineRun` mở 1 run, gọi `executeVideoPipeline` với `ctx.log` gom log (không cần onNodeProgress/... vì không có renderer để báo tiến độ tới), `updateVideoPipelineRun` ghi kết quả. Trả `{ok, runId, status, logs}` — log của `save-to-library` node đã tự in ra tên/id resource thật được lưu, AI đọc logs để biết chính xác đã tạo ra gì.

Đăng ký vào CẢ `buildVideoToolset` VÀ `buildGeneralToolset` — gate `run_video_pipeline` trong `approvalGatedTools` của cả 2 domain. Không thêm vào toolset riêng của sub-agent delegate (không cần — `buildVideoToolset` CHÍNH LÀ toolset sub-agent `delegate_to_video_studio` dùng, nhưng cơ chế auto-deny approval có sẵn của `runSubAgent` (ADR-0007) đã tự động chặn sub-agent gọi tool gate mà không ai duyệt được — chỉ khi gọi trực tiếp từ 1 run KHÔNG phải sub-agent (chat video-studio thật, hoặc trợ lý chung gọi thẳng) thì approval mới hiện ra cho người dùng thật duyệt).

Không làm tương tự cho Automation (`run_workflow`) ở bước này — ngoài phạm vi yêu cầu, để lại như 1 giới hạn đã biết.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Không thêm gì, AI chỉ thiết kế | An toàn tuyệt đối | Đúng vấn đề người dùng chỉ ra — AI "làm xong" mà không tạo được gì thật | Người dùng chọn thêm khả năng chạy |
| Thêm tool chạy nhưng KHÔNG gate | AI tự động hoàn toàn | Tốn tiền/thời gian thật không kiểm soát, rủi ro cao | Người dùng chọn giữ gate |
| Thêm `run_video_pipeline` gate approval, ở cả video-studio + general, dựa vào auto-deny sẵn có của sub-agent (chosen) | Giải quyết đúng vấn đề, không cần cơ chế mới (tái dùng engine + ADR-0007's auto-deny), rủi ro chạy ngầm không duyệt được chặn tự nhiên | Vẫn tốn 1 lượt duyệt thật mỗi lần chạy | Đánh đổi hợp lý — đúng mức rủi ro |

## Consequences

### Positive

- AI giờ có thể thật sự tạo ra ảnh/video, không chỉ dừng ở thiết kế — đóng đúng khoảng trống người dùng chỉ ra.
- Không rủi ro chạy ngầm không kiểm soát qua delegate — auto-deny của sub-agent (ADR-0007) tự nhiên chặn, không cần logic mới.

### Negative

- Vẫn không có `run_workflow` cho Automation — kind="automation" task vẫn chỉ dừng ở mức AI tự làm qua `delegate_to_automation`'s propose, không chạy thật được.
- `ctx` không có onNodeProgress/onNodeDone báo real-time (không có renderer nào lắng nghe) — AI chỉ biết kết quả sau khi toàn bộ pipeline chạy xong, không thấy tiến độ giữa chừng.

## Related

- [ADR-0007](0007-agent-orchestration.md) — cơ chế `runSubAgent` auto-deny approval mà quyết định này dựa vào
- [ADR-0008](0008-general-assistant-campaigns-resources-profiles.md) — tiền lệ loại trừ executeCampaign vì cần WebContents sender
