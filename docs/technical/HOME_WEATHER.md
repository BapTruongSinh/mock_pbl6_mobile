# Thời tiết Home theo vị trí

Người dùng đồng ý Open-Meteo31/10/2026. Xin quyền vị trí foreground khi Home mount. Từ chối/GPS tắt/mất mạng/dữ liệu sai/timeout20s: --°C · ---. App không đóng, không cản đặt/tra vé. Bấm badge thời tiết để thử lại. Không background location, không lưu/toạ độ vào log; request Open-Meteo gửi lat/lon làm tròn2chữ số, không tên/email. Service loadLocalWeather tại src/features/home/weatherService.ts; hook useLocalWeather.ts; UI CustomerHomeScreen.tsx. Quyền Android trong app.config.ts/AndroidManifest; expo-location57.0.22. Dữ liệu current.temperature_2m/weather_code là thời tiết hiện tại theo mô hình, không phải cảnh báo thời tiết chính thức. Chưa dựng dự báo nhiều ngày.

Nguồn API: https://open-meteo.com/en/docs ; quyền vị trí: https://docs.expo.dev/versions/latest/sdk/location/ .

Blur nền: glow.png raster3x từ nguyên glow.svg official Figma qua @resvg/resvg-js; giữ Gaussian stdDeviation27.5 và tỉ lệ390x300. Không chỉnh asset thiết kế hoặc thay ellipse rõ cạnh. NativeSVGfilter không đủ tương thích ở thiết bị hiện tại.

Kiểm chứng:3tests denied/no-position-no-fetch, granted/rounded-coordinates/current mapping, clear/rain/thunder PASS; typecheck/eslint PASS; Android debug buildPASS, cài5554/5556 Success. Metro mới artifacts/sol/weather-metro.*. Chưa tuyên bố end-to-end GPS/API thật nếu chưa có screenshot dữ liệu thực.
