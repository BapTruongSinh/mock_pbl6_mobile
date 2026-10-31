# Icon và màn khởi động Android

Nguồn nhận diện: logo BLUE chính thức từ Figma node 644:49, đã lưu tại src/shared/assets/brand-blue-logo.png. Không vẽ lại hoặc thay chữ/icon riêng của logo.

- Icon launcher: src/shared/assets/app/icon.png, canvas PNG 1024×1024 nền trắng, logo giữ tỉ lệ và có đệm 100px.
- Adaptive foreground: src/shared/assets/app/adaptive-icon.png, canvas 1024×1024 nền trắng, đệm 220px để phần logo nằm trong vùng an toàn khi Android bo tròn/mask.
- app.config.ts khai báo icon và android.adaptiveIcon, background trắng.
- Script scripts/sync-android-branding.mjs dùng bộ tạo tài nguyên của Expo đang được pin trong lockfile, tạo legacy/round/adaptive launcher theo các density và logo splash 240×100dp nền trắng, giữ tỉ lệ.
- Splash native dùng layer-list căn giữa, không kéo logo đầy màn. Android12+ có resource values-v31 riêng để hiện đúng BLUE trên system splash.

Sau khi Expo prebuild sinh android/, chạy `pnpm android:branding` rồi build/cài lại APK. `pnpm android:build` đã gọi branding trước build. Native android/ là generated và không commit; asset/config/script mới là nguồn để dựng lại. README có lệnh đầy đủ, không cần đường dẫn của máy người phát triển.

Đây là thay đổi native: Fast Refresh của Metro không đủ để cập nhật icon đã cài. Dùng install -r để cập nhật, giữ dữ liệu; không cần xóa app/AVD. Launcher có thể cache icon một lúc, mở lại danh sách ứng dụng để kiểm tra. Bằng chứng build và ảnh launcher của lần kiểm tra nằm local trong artifacts/branding/.
