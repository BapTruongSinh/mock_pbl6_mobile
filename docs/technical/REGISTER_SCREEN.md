# Register screen — Figma 64:638

Direct implementation requested by user; Codex implements, user reviews. Historical plan workflow is not resumed.

- Route Register -> src/features/auth/RegisterScreen.tsx -> register.styles.ts + shared auth.styles.ts.
- Behavior: useRegisterForm.ts -> useSession.register -> existing frontend mock repository. No backend implemented.
- Entry: Login > Đăng ký; return: Đã có tài khoản? Đăng nhập. Dev-only direct link bluemobile://debug/case/FIGMA-64-638 renders same real component, not a copy.
- Fields: fullName, phone, email, password, confirmPassword. Confirmation and terms consent stay client-side; repository receives fullName/phone/email/password. Social buttons explicitly show mock notice.
- Exact source frame390x844; measured coordinates artifacts/FIGMA-64-638/geometry.json. Official local assets/node/callsite/geometry/checksums artifacts/FIGMA-64-638/assets.json. Screenshot reference figma.png.
- Native StyleSheet, semantic theme tokens, safe-area and current-window dimensions; full app width, form max480dp; small windows/large font reflow, vertical ScrollView, Android adjustResize keyboard behavior. No font scaling disabled.
- Verified: lint/typecheck;12 tests (5register validation +7Login regression); native image inspected on emulator5554/5556, tablet scroll executed, actual empty-submit validation visible. Before=N/A-new-screen. Complete responsive/font/keyboard matrix not claimed. Ready for user visual review, not claimed pixel-perfect or plan acceptance.
