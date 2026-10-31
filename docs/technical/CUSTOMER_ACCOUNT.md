# Tài khoản Customer

Màn bổ sung theo yêu cầu người dùng ngày 31/10/2026, không có frame Figma riêng. Dùng style BLUE hiện tại: logo local Home, font Be Vietnam Pro, nền #F4F7FC, card trắng, CTA xanh và nhãn nổi như form đăng nhập.

## Route và file

- `CustomerAccount` → `src/features/account/AccountScreen.tsx`.
- `useAccount.ts`: tải profile, chọn ảnh, xác nhận mật khẩu và thông báo.
- `account.styles.ts`: style native; không CSS/BEM.
- `TravelRepository.ts`: AccountProfile/getAccountProfile/updateAccountAvatar/changePassword.
- `createMockRepository.ts` + `mockAuthStorage.ts`: dữ liệu mock được lưu riêng trên thiết bị.
- Review link: `bluemobile://debug/case/NEW-CUSTOMER-ACCOUNT`, cùng component sản phẩm, không bản sao. Review vẫn cần đăng nhập thật để truy cập profile; guest thấy CTA đăng nhập.

## Dữ liệu và thao tác

Hiển thị đúng fullName/email/phone từ đăng ký, không hiển thị password/token. Tài khoản demo Minh Anh chỉ có email, số điện thoại chưa khai báo hiển thị “Chưa cung cấp”, không bịa dữ liệu.

Chọn “Đổi ảnh đại diện” mở system photo picker (expo-image-picker SDK57). Không yêu cầu quyền đọc cả thư viện khi mở app. Người dùng chọn/cắt ảnh vuông; copy ảnh vào documentDirectory/avatars trước lưu profile để không phụ thuộc cache picker. Hủy picker giữ ảnh cũ. Lỗi copy/lưu có thông báo và không cập nhật profile; file mới thất bại được xóa. Ảnh cũ do app quản lý được xóa sau lưu thành công.

Đổi mật khẩu: nhập mật khẩu hiện tại, mới và xác nhận. Repository kiểm tra phiên, mật khẩu cũ, tối thiểu 8 ký tự, khác mật khẩu cũ. UI kiểm tra xác nhận khớp. Thành công xóa ba ô, mật khẩu mới dùng được lần đăng nhập sau; alias cũ bị loại bỏ. Mật khẩu không log hoặc đưa vào profile. Kho auth mock hiện có lưu credential demo local để mô phỏng đăng nhập, không phải cơ chế auth production; khi nối BE phải bỏ lưu password phía client và dùng secure token + endpoint đã xác nhận.

Profile/avatar/password được giữ khi khởi động lại; logout chỉ kết thúc phiên và dọn dữ liệu chuyến theo workflow hiện tại. Không BE, database hoặc HTTP endpoint mới.

## Bố cục và accessibility

Nền phủ toàn cửa sổ, content rộng 100%, tối đa 600dp ở giữa, padding ngang20; card radius24/padding20, hero radius28/padding24; avatar92dp; nút >=44dp, input58dp. Scroll dọc cho màn thấp/keyboard, SafeAreaView cho system bar, KeyboardAvoidingView iOS, không khóa font scale. Tab Tài khoản active duy nhất. Thông tin wrap thay vì cắt; mật khẩu có nút hiện/ẩn và label accessibility.

## Kiểm tra

Repository tests: thông tin đăng ký, không rò credentials, giả accountId bị từ chối, mật khẩu cũ sai/ngắn, đổi thành công, login cũ thất bại, restart giữ mật khẩu/avatar. Hook tests: xác nhận không khớp không gửi repository, thành công xóa form, picker cancel/error, copy ảnh trước lưu. Evidence native và build ở `artifacts/account/`. Trạng thái kiểm tra thực tế ghi ở VERIFICATION.md trong thư mục này.


## Review bổ sung — thanh điều hướng và đăng xuất
Home đặt CustomerBottomNav ngoài ScrollView, content flex1/minHeight0, nav flexShrink0 trong SafeAreaView để luôn ở cuối màn hình; không dùng absolute overlay che nội dung. MA mở cùng CustomerAccount như tab Tài khoản. Tab đang active Home/Search không điều hướng nhầm sang Account. Đăng xuất có testID account.logout, nằm ngay dưới hero/avatar để dễ thấy; xác nhận bằng account.logout.confirm trước logout thật. Evidence artifacts/account/nav-result.json và ảnh home-fixed-nav/home-scrolled-nav/account-logout-visible trên hai emulator.
