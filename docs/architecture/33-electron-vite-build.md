# Build Electron-Vite

[← Về mục lục](../README.md)

`electron.vite.config.ts` build **3 target riêng biệt** trong 1 lần chạy — khớp đúng 3 tiến trình/ngữ cảnh của Electron ([02-main-process.md](02-main-process.md)):

```ts
export default defineConfig({
  main:     { build: { rollupOptions: { input: 'src/main/index.ts' } } },
  preload:  { build: { lib: { entry: 'src/main/preload.ts' } } },
  renderer: { root: 'src/renderer', build: { rollupOptions: { input: 'src/renderer/index.html' } } },
})
```

- **`main`**: bundle Node.js thường — `externalizeDepsPlugin()` giữ nguyên `require()` cho dependency thay vì bundle chúng vào (native module như `better-sqlite3`/`playwright-core` không bundle được, phải ở dạng `require` thật lúc chạy)
- **`preload`**: build dạng `lib` (1 file output duy nhất, không code-splitting) — preload script Electron load trực tiếp 1 file, không qua module resolution phức tạp
- **`renderer`**: build như 1 ứng dụng Vite/React bình thường, root riêng ở `src/renderer` (tách khỏi `src/main`/`src/shared` để Vite không cố bundle nhầm code Node vào bundle trình duyệt)

## Alias — chỉ renderer có, main/preload không cần

```ts
renderer: {
  resolve: { alias: { '@': 'src/renderer', '@shared': 'src/shared' } }
}
```

`@`/`@shared` chỉ khai báo cho `renderer` vì chỉ code renderer dùng alias (`vitest.config.ts` — [02-kiem-thu.md](../development/02-kiem-thu.md) — khai lại alias này riêng cho test, 2 nơi khai trùng nhau vì Vitest không tự đọc `electron.vite.config.ts`). Code trong `main/` dùng import tương đối (`../../shared/types`) thay vì alias — nhất quán với cách Node.js resolve module thường, không cần thêm bước cấu hình.

## Output: `out/` lúc dev, đóng gói qua `electron-builder` riêng

Build xong nằm ở `out/main`/`out/preload`/`out/renderer` — `electron-builder` ([15-auto-update-release.md](15-auto-update-release.md)) đọc từ đây để đóng gói thành `.exe`/`.dmg`/`.AppImage`, không tự chạy `electron-vite build` (phải chạy tay trước, xem `package.json`'s script `desktop:build`).
