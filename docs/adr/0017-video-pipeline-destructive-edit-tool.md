# ADR-0017: AI có thể xoá/thay toàn bộ pipeline Video Studio (propose_destructive_video_pipeline_change)

🟢 Accepted

- **Date**: 2026-10-15
- **Status**: Accepted

## Context

Người dùng báo: khi yêu cầu AI "sửa" 1 node đã có trên canvas Automation, AI dùng `add_nodes` thêm 1 node mới cạnh node cũ còn nguyên, để lại rác/trùng lặp — đã sửa bằng cách dạy AI ưu tiên `update_node` tại chỗ, và dùng `remove_nodes` (Automation đã có từ đầu) khi cần đổi hẳn loại node.

Khi rà lại Video Studio để áp dụng cùng fix, phát hiện khoảng trống SÂU hơn: `propose_video_pipeline_change` (tool duy nhất AI dùng để sửa pipeline Video Studio) **chưa từng có `remove_nodes`/`replace_all` từ đầu** — quyết định ban đầu (ghi rõ trong comment file) là "AI chủ yếu DỰNG MỚI 1 pipeline từ 1 câu brief, chỉnh sửa/xoá thì người dùng tự thao tác tay trên canvas". Tức là ở Video Studio, AI **hoàn toàn không có cách nào xoá node** dù có muốn — tệ hơn vấn đề gốc ở Automation (ít nhất Automation có tool nhưng AI không được dạy dùng đúng lúc; Video Studio thì tool không tồn tại).

## Decision

Thêm tool mới `propose_destructive_video_pipeline_change` (`main/agent/tools/propose-destructive-video-pipeline-change.ts`) — mirror chính xác `propose-destructive-workflow-change.ts`: 2 action `remove_nodes`/`replace_all`, tách khỏi `propose_video_pipeline_change` (chỉ còn `add_nodes`/`update_node`) để gating là 1 entry tĩnh theo tên tool, đúng lý do Automation đã tách 2 tool tương tự.

Mở rộng theo chuỗi:
- `shared/video-studio/validate-pipeline-patch.ts`: thêm nhánh `remove_nodes` (check id tồn tại), gộp `replace_all` vào cùng nhánh validate với `add_nodes` (chỉ khác: `replace_all` KHÔNG cho edge trỏ sang node cũ, vì canvas sẽ bị xoá sạch).
- `shared/video-studio/apply-video-pipeline-patch.ts`: `VideoPipelineChangePatch` thêm 2 action, `applyVideoPipelinePatch` xử lý xoá node+edge liên quan (`remove_nodes`) hoặc xây lại từ rỗng (`replace_all`).
- `main/agent/tools/registry.ts`: đăng ký vào `buildVideoToolset`.
- `main/agent/domains.ts`: gate `propose_destructive_video_pipeline_change` trong `approvalGatedTools` của domain `video-studio` (giống `run_video_pipeline`); thêm rule 5b vào `VIDEO_AGENT_INSTRUCTIONS` dạy AI ưu tiên `update_node` tại chỗ, chỉ `remove_nodes`+`add_nodes` khi cần đổi hẳn loại node, `replace_all` chỉ khi dựng lại từ đầu — đúng cấu trúc rule 7d vừa thêm cho Automation.
- `main/agent/tools/delegate-to-video-studio.ts` + `renderer/pages/video-studio/VideoStudioCanvas.tsx`: mở rộng điều kiện nhận diện tool-result từ 1 tên sang 2 tên, để patch phá huỷ cũng được áp dụng (khi đã qua được approval) giống hệt patch thường.

## Alternatives considered

| Option | Pros | Cons | Why not |
|---|---|---|---|
| Giữ nguyên quyết định ban đầu — Video Studio không cần tool xoá, người dùng tự thao tác canvas | Không cần code mới | Chính là nguyên nhân gây rác canvas người dùng vừa báo (ở dạng nặng hơn Automation) | Quyết định ban đầu không còn đúng với nhu cầu thật |
| Gộp remove_nodes/replace_all thẳng vào propose_video_pipeline_change (không tách tool riêng) | Ít file hơn | Mất khả năng gate ĐỘC LẬP theo tên tool — phải dùng predicate động (ADR-0007's comment ghi rõ: "không phải phần ổn định của API này dựa vào") | Không nhất quán với pattern Automation đã chọn và đã test |
| Tool riêng `propose_destructive_video_pipeline_change`, mirror chính xác Automation, gate theo tên (chosen) | Nhất quán kiến trúc với Automation, gating đơn giản/ổn định, tái dùng tối đa validate/apply logic đã có | Thêm 1 file tool mới + mở rộng 4 file khác | Đúng pattern đã chứng minh hoạt động, chi phí hợp lý |

## Consequences

### Positive
- Video Studio giờ đối xứng với Automation: AI có `update_node` (sửa tại chỗ), `remove_nodes`+`add_nodes` (đổi loại node), và `replace_all` (dựng lại từ đầu) — không còn kẹt ở "chỉ biết thêm".
- Validate/apply logic tái dùng gần như nguyên vẹn từ Automation (cùng cấu trúc discriminated union, cùng cách check tồn tại id) — rủi ro thấp.

### Negative
- `propose_destructive_video_pipeline_change` luôn cần người dùng duyệt — xoá/thay nhiều node liên tiếp (vd dọn cả pipeline) sẽ tốn nhiều lượt duyệt nếu AI chia nhỏ thay vì gộp vào 1 lần gọi `replace_all`/`remove_nodes` với mảng nhiều id.

## Related

- Rule 7d mới thêm cho Automation's `AGENT_INSTRUCTIONS` (cùng commit trước ADR này) — nguồn gốc trực tiếp của phát hiện này
- [ADR-0007](0007-agent-orchestration.md) — cơ chế auto-deny của sub-agent mà gate của tool mới này dựa vào khi gọi qua `delegate_to_video_studio`
