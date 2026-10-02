# Campaign Engine

[← Về mục lục](../README.md)

`main/automation/campaign-engine.ts` chạy N profile × M workflow theo cấu hình `CampaignExecution` — xem phía người dùng ở [user-guide/11-campaigns.md](../user-guide/11-campaigns.md).

## 2 chiến lược chạy, 2 hàm riêng biệt

```ts
if (exec.mode === 'parallel') {
  await runParallel(tasks, exec, sender, state)
} else {
  await runSequential(tasks, exec, sender, state)
}
```

### `runSequential` — vòng `for` đơn giản

Chạy từng task, chờ xong mới sang task kế, có delay ngẫu nhiên giữa 2 task (`randomDelay(exec.delayBetweenProfiles)` — khoảng min–max, không phải số cố định, để tránh nhịp độ quá đều). `stopOnError` kiểm tra sau mỗi task, `break` khỏi vòng lặp nếu bật.

### `runParallel` — worker pool tự quản lý concurrency

```ts
async function worker() {
  while (startIndex < tasks.length && !state.aborted) {
    const task = tasks[startIndex++]
    await runTaskWithRetry(task, exec, sender, state)
    if (exec.warmUp && currentMax < maxConcurrent) {
      currentMax = Math.min(currentMax + (exec.warmUpStep || 1), maxConcurrent)
    }
  }
}
const workers = [...Array(Math.min(currentMax, tasks.length))].map(() => worker())
await Promise.all(workers)
```

Đây là pattern **worker pool chia sẻ 1 con trỏ `startIndex`** — không chia task thành N mảng cố định trước (dễ lệch tải nếu các task nhanh/chậm khác nhau), mỗi worker tự lấy task tiếp theo khi rảnh.

```ts
const workers: Promise<void>[] = []
for (let i = 0; i < Math.min(currentMax, tasks.length); i++) {
  if (i > 0) await sleep(randomDelay(exec.delayBetweenProfiles), state)
  workers.push(worker())
}
await Promise.all(workers)
```

Warm-up hoạt động được nhờ 1 chi tiết dễ bỏ sót: điều kiện vòng `for` (`Math.min(currentMax, tasks.length)`) được **đánh giá lại ở mỗi lượt lặp**, không cache 1 lần. Mỗi lượt lặp có `await sleep(...)` — nhường quyền điều khiển cho các worker đang chạy, nơi `currentMax` có thể đã tăng lên (worker tăng nó sau mỗi task xong, nếu `warmUp` bật). Nhờ vậy vòng `for` launch worker mới **nhỏ giọt theo đúng nhịp warm-up** thay vì launch hết toàn bộ `currentMax` ban đầu ngay từ đầu — không cần 1 cơ chế ramp-up tách riêng, chỉ tận dụng việc JS không cache cận vòng lặp + state dùng chung qua closure.

## Repeat — chạy lại toàn bộ, reset kết quả

```ts
for (let repeat = 0; repeat < totalRepeats && !state.aborted; repeat++) {
  if (repeat > 0) {
    // reset result từng task về 'pending', đẩy lại 'campaign:results'
    await sleep(randomDelay(exec.repeatDelay), state)
  }
  if (exec.mode === 'parallel') await runParallel(...)
  else await runSequential(...)
}
```

Mỗi lần lặp lại dùng **chung 1 mảng `tasks`**, chỉ reset field `status`/`logs`/`startedAt`/`finishedAt` — không tạo lại task mới, tránh rò rỉ reference cũ.

## Pause/Resume — polling cờ, không dùng semaphore thật

```ts
while (state.paused && !state.aborted) {
  await new Promise(r => setTimeout(r, 500))
}
```

Tạm dừng = vòng lặp chờ 500ms kiểm tra lại cờ `paused`, không phải cơ chế block/wake thật (`Promise` treo tới khi được `resolve`). Đơn giản, đủ dùng — Campaign không chạy tần suất cao tới mức polling 500ms gây đáng kể overhead.

## Push kết quả real-time

Mỗi lần `task.result` đổi trạng thái, gửi luôn `sender.send('campaign:results', allResults)` / `'campaign:status'` — renderer không cần tự poll, chỉ subscribe như mọi push channel khác (xem [03-ipc.md](03-ipc.md)).
