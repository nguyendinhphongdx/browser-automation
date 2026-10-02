# Quy ước commit

[← Về mục lục](../README.md)

Lịch sử git repo này theo dạng rút gọn của [Conventional Commits](https://www.conventionalcommits.org/) — tiền tố ngắn + mô tả ngắn gọn ở dòng đầu, không bắt buộc đủ mọi quy tắc của chuẩn gốc.

## Tiền tố đang dùng thực tế

```
docs   — thay đổi tài liệu (docs/, README.md...), không đụng code chạy được
feat   — thêm tính năng mới
fix    — sửa lỗi hành vi sai so với mong đợi
chore  — việc lặt vặt không thuộc feat/fix/docs (đổi dependency, config...)
perf   — cải thiện hiệu năng, không đổi hành vi
ci     — thay đổi `.github/workflows/`
```

Không dùng `refactor`/`test`/`style` thành tiền tố riêng trong lịch sử hiện tại — sửa đổi thuần refactor thường đi kèm 1 `fix`/`feat` liên quan thay vì tách commit riêng chỉ để refactor.

## Dòng đầu — mô tả ở dạng mệnh lệnh (imperative), không phải quá khứ

```
✅ fix: stop leaking IPC event listeners on unsubscribe
❌ fix: fixed IPC listener leak
❌ fix: IPC listener leak fixed
```

Lý do theo chuẩn Conventional Commits: dòng đầu đọc tự nhiên khi ghép sau "This commit will...".

## Phần thân — giải thích **vì sao**, không lặp lại diff

Code diff đã cho thấy **cái gì** đổi — phần thân commit message nên tập trung **lý do** (bug thật gặp phải, quyết định đánh đổi, điều gì sẽ hỏng nếu không sửa). Ví dụ từ lịch sử thật của repo:

```
fix: auto-launch a browser for the AI agent instead of requiring one

Previously the agent only used a browser that was already running for
the profile, leaving page=null (and every browser tool erroring with
"Chưa có browser nào đang mở") whenever the user opened the AI panel
without launching one first. Now it calls the same acquireBrowserPage
helper the scheduler and campaign engine already use...
```

Dòng đầu nói **cái gì**, phần thân nói **vì sao** và **đổi gì về mặt kỹ thuật** — đọc `git log --oneline` vẫn hiểu được bức tranh tổng, đọc đầy đủ `git log` thì hiểu được quyết định đằng sau.

## 1 commit = 1 thay đổi logic hoàn chỉnh

Thà nhiều commit nhỏ rõ ràng còn hơn 1 commit gộp nhiều việc không liên quan — dễ `git revert`/`git bisect` khi cần, review cũng dễ hơn vì mỗi commit tự giải thích được bằng chính nó. Loạt tài liệu này (`docs/`) là ví dụ: mỗi file tài liệu là 1 commit riêng thay vì gộp hết thành 1 commit khổng lồ "add docs".

## Dòng cuối: `Co-Authored-By`

Commit do AI hỗ trợ viết trong repo này kết thúc bằng dòng `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` — ghi nhận rõ nguồn gốc thay đổi, không giả vờ mọi commit đều do người tự tay gõ.
