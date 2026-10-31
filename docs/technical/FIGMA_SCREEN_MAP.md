# Figma screen map — BLUE Mobile

Ngày 2026-10-29. FileKey `OCkWSOZQ8Pq8AejXccajpO`; Customer page `7:6`, Driver page `7:10`. **91 metadata frames: 26 Customer + 65 Driver, 87 active + 4 hidden Archive.** Có 64 context retrieved, 23 quota-blocked; chỉ 4 screenshot đã được Supervisor quan sát. Chưa node nào được accept implementation vì app chưa được tạo. Context retrieved không có nghĩa screenshot đã review hoặc asset/geometry đã xác minh.

Route IDs là đề xuất native; fixture case ID dạng `FIGMA-<nodeId thay : bằng ->`. Mỗi hàng có fixture/state/expected, screenshot Figma, implementation, requirements/mismatch, asset ledger, geometry, test và verdict riêng; không lấy đại diện family. Canonical viewport 390×844, capture contract theo spec. Bốn Archive excluded-approved theo bản thiết kế được duyệt ngày 2026-10-29, metadata được giữ nguyên. Node quota-blocked phải lấy exact context+screenshot trước code. **Một Login chung**, dùng style Customer `64:634` đề xuất; Driver auth `1135:18/95/173/251/322` được adapt sang UI chung và giữ case, role luôn từ kết quả xác thực.

| Case | NodeId | Tên frame nguyên bản | Kích thước | Route đề xuất | Reference status | Screenshot review | Scope / verdict |
|---|---|---|---|---|---|---|---|
| FIGMA-31-2 | 31:2 | Customer App / Home / Guest / 390 | 390×844 | CustomerHome | context-retrieved | Supervisor-observed; chưa accept | active; implementation-not-started |
| FIGMA-31-44 | 31:44 | Customer App / Search / Results / 390 | 390×844 | SearchResults | context-retrieved | pending | active; implementation-not-started |
| FIGMA-31-89 | 31:89 | Customer App / Seat Map / Hold Active / 390 | 390×844 | SeatSelection | context-retrieved | pending | active; implementation-not-started |
| FIGMA-31-172 | 31:172 | Customer App / Payment Return / Processing / 390 | 390×844 | PaymentReturn | context-retrieved | pending | active; implementation-not-started |
| FIGMA-31-183 | 31:183 | Customer App / Ticket / Issued / 390 | 390×844 | TicketDetail | context-retrieved | pending | active; implementation-not-started |
| FIGMA-37-127 | 37:127 | Customer App / Passenger / Completed / 390 | 390×844 | PassengerDetails | context-retrieved | pending | active; implementation-not-started |
| FIGMA-37-171 | 37:171 | Customer App / Review / Passenger Confirmation / 390 | 390×844 | BookingReview | context-retrieved | pending | active; implementation-not-started |
| FIGMA-64-634 | 64:634 | Customer App / Auth / Đăng nhập / 390 | 390×844 | Login | context-retrieved | Supervisor-observed; chưa accept | active; implementation-not-started |
| FIGMA-64-638 | 64:638 | Customer App / Auth / Đăng ký / 390 | 390×844 | Register | context-retrieved | pending | active; implementation-not-started |
| FIGMA-486-279 | 486:279 | Customer App / Search / Filter Sheet / 390 | 390×844 | SearchFilters | context-retrieved | pending | active; implementation-not-started |
| FIGMA-505-203 | 505:203 | Customer App / Search / Edit Route Overlay / 390 | 390×844 | EditRoute | context-retrieved | pending | active; implementation-not-started |
| FIGMA-533-380 | 533:380 | Customer App / Seat Map / Conflict — All Rolled Back / 390 | 390×844 | SeatSelection | context-retrieved | pending | active; implementation-not-started |
| FIGMA-533-491 | 533:491 | Customer App / Seat Map / Hold Expired / 390 | 390×844 | SeatSelection | context-retrieved | pending | active; implementation-not-started |
| FIGMA-635-45 | 635:45 | Customer App / Tickets / List / 390 | 390×844 | MyTickets | context-retrieved | pending | active; implementation-not-started |
| FIGMA-650-4 | 650:4 | Customer App / Welcome / First Open / 390 | 390×844 | Welcome | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1035-7 | 1035:7 | Customer App / Payment / VNPay Checkout / 390 | 390×844 | VNPayCheckout | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1046-200 | 1046:200 | Customer App / Cancellation / Preview / 390 | 390×844 | CancellationPreview | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1046-397 | 1046:397 | Customer App / Cancellation / Refund Processing / 390 | 390×844 | RefundProcessing | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1110-4 | 1110:4 | Customer App / Cancellation / Select Tickets / A01+A02 / 390 | 390×844 | CancellationSelection | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1113-4 | 1113:4 | Customer App / Cancellation / Select Tickets / A01 / 390 | 390×844 | CancellationSelection | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1113-205 | 1113:205 | Customer App / Cancellation / Select Tickets / A02 / 390 | 390×844 | CancellationSelection | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1113-406 | 1113:406 | Customer App / Cancellation / Select Tickets / None / 390 | 390×844 | CancellationSelection | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1113-607 | 1113:607 | Customer App / Cancellation / Confirm / A01 / 390 | 390×844 | CancellationConfirm | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1113-804 | 1113:804 | Customer App / Cancellation / Refund Processing / A01 | 390×844 | RefundProcessing | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1113-878 | 1113:878 | Customer App / Cancellation / Confirm / A02 / 390 | 390×844 | CancellationConfirm | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1113-1075 | 1113:1075 | Customer App / Cancellation / Refund Processing / A02 | 390×844 | RefundProcessing | context-retrieved | pending | active; implementation-not-started |
| FIGMA-35-2 | 35:2 | 01.01 — Chuyến của tôi | 390×844 | DriverTrips | context-retrieved | Supervisor-observed; chưa accept | implemented-mock; Android evidence artifacts/driver; user-review-pending |
| FIGMA-35-28 | 35:28 | 02.02 — TR-204 / Đang đón khách | 390×844 | DriverTripDetail | context-retrieved | pending | implemented-mock; evidence artifacts/driver-detail; user-review-pending |
| FIGMA-35-54 | 35:54 | 04.04 — Check-in thành công | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-35-78 | 35:78 | 04.06 — Chưa xác định kết quả | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-996-68 | 996:68 | Archive / Before Customer Style / Driver App / Assigned Trips / Today / 390 | 390×844 | Archive-excluded | metadata-only; archive-context-pending | pending | hiddenArchive; excluded-approved |
| FIGMA-996-78 | 996:78 | Archive / Before Customer Style / Driver App / Trip Detail / Boarding / 390 | 390×844 | Archive-excluded | metadata-only; archive-context-pending | pending | hiddenArchive; excluded-approved |
| FIGMA-996-88 | 996:88 | Archive / Before Customer Style / Driver App / Scanner / Success In-place / 390 | 390×844 | Archive-excluded | metadata-only; archive-context-pending | pending | hiddenArchive; excluded-approved |
| FIGMA-996-96 | 996:96 | Archive / Before Customer Style / Driver App / Scanner / Network Uncertain / 390 | 390×844 | Archive-excluded | metadata-only; archive-context-pending | pending | hiddenArchive; excluded-approved |
| FIGMA-996-102 | 996:102 | 04.01 — Quét mã QR | 390×844 | DriverScan | context-retrieved | Supervisor-observed; chưa accept | active; implementation-not-started |
| FIGMA-1135-18 | 1135:18 | 06.01 — Đăng nhập | 390×844 | Login(shared) | context-retrieved | pending | active; superseded/adapt-shared-login; preserve scenario |
| FIGMA-1135-95 | 1135:95 | 06.02 — Sai thông tin đăng nhập | 390×844 | Login(shared) | context-retrieved | pending | active; superseded/adapt-shared-login; preserve scenario |
| FIGMA-1135-173 | 1135:173 | 06.03 — Tạm khóa đăng nhập | 390×844 | Login(shared) | context-retrieved | pending | active; superseded/adapt-shared-login; preserve scenario |
| FIGMA-1135-251 | 1135:251 | 06.04 — Phiên đã hết hạn | 390×844 | Login(shared) | context-retrieved | pending | active; superseded/adapt-shared-login; preserve scenario |
| FIGMA-1135-322 | 1135:322 | 06.05 — Không có kết nối | 390×844 | Login(shared) | context-retrieved | pending | active; superseded/adapt-shared-login; preserve scenario |
| FIGMA-1135-393 | 1135:393 | 06.06 — Tài khoản tài xế | 390×844 | DriverAccount | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1135-471 | 1135:471 | 06.09 — Xác nhận đăng xuất | 390×844 | DriverAccount | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1136-18 | 1136:18 | 01.03 — Chuyến sắp tới | 390×844 | DriverTrips | context-retrieved | pending | implemented-mock; Android evidence artifacts/driver; user-review-pending |
| FIGMA-1136-98 | 1136:98 | 01.04 — Chuyến đã hoàn thành | 390×844 | DriverTrips | context-retrieved | pending | implemented-mock; Android evidence artifacts/driver; user-review-pending |
| FIGMA-1136-178 | 1136:178 | 01.05 — Đang tải lịch chuyến | 390×844 | DriverTrips | context-retrieved | pending | implemented-mock; Android evidence artifacts/driver; user-review-pending |
| FIGMA-1136-247 | 1136:247 | 01.06 — Chưa có chuyến hôm nay | 390×844 | DriverTrips | context-retrieved | pending | implemented-mock; Android evidence artifacts/driver; user-review-pending |
| FIGMA-1136-318 | 1136:318 | 01.07 — Lỗi tải lịch chuyến | 390×844 | DriverTrips | context-retrieved | pending | implemented-mock; Android evidence artifacts/driver; user-review-pending |
| FIGMA-1136-389 | 1136:389 | 01.08 — Đã thu hồi phân công | 390×844 | DriverTrips | context-retrieved | pending | implemented-mock; Android evidence artifacts/driver; user-review-pending |
| FIGMA-1137-18 | 1137:18 | 03.01 — TR-204 / Tất cả hành khách | 390×844 | DriverManifest | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1137-100 | 1137:100 | 03.02 — Lọc theo điểm đón | 390×844 | DriverManifest | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1137-182 | 1137:182 | 03.03 — Khách chưa lên xe | 390×844 | DriverManifest | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1137-264 | 1137:264 | 03.04 — Danh sách cần cập nhật | 390×844 | DriverManifest | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1137-345 | 1137:345 | 03.05 — Đang tải hành khách | 390×844 | DriverManifest | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1137-422 | 1137:422 | 03.06 — Không có kết quả lọc | 390×844 | DriverManifest | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1137-501 | 1137:501 | 03.07 — Lỗi tải hành khách | 390×844 | DriverManifest | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-18 | 1138:18 | 04.03 — Đang kiểm tra vé | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-91 | 1138:91 | 04.05 — Vé đã được soát | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-165 | 1138:165 | 04.07 — Vé thuộc chuyến khác | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-239 | 1138:239 | 04.08 — Vé đã hủy | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-313 | 1138:313 | 04.09 — Vé đã hoàn tiền | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-387 | 1138:387 | 04.10 — Vé đã sử dụng | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-461 | 1138:461 | 04.11 — Mã vé không hợp lệ | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-535 | 1138:535 | 04.12 — Không có quyền soát vé | 390×844 | DriverCheckInResult | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1138-608 | 1138:608 | 04.13 — Không thể soát khi mất mạng | 390×844 | DriverCheckInResult | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1138-681 | 1138:681 | 04.02 — Nhập mã vé | 390×844 | DriverManualCode | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1139-18 | 1139:18 | 02.01 — TR-204 / Đã lên lịch | 390×844 | DriverTripDetail | context-retrieved | pending | implemented-mock; evidence artifacts/driver-detail; user-review-pending |
| FIGMA-1139-101 | 1139:101 | 02.03 — TR-204 / Đã xuất bến | 390×844 | DriverTripDetail | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1139-184 | 1139:184 | 02.04 — TR-204 / Đang di chuyển | 390×844 | DriverTripDetail | context-retrieved | pending | implemented-mock; evidence artifacts/driver-detail; user-review-pending |
| FIGMA-1139-267 | 1139:267 | 02.05 — TR-204 / Đã đến nơi | 390×844 | DriverTripDetail | context-retrieved | pending | implemented-mock; evidence artifacts/driver-detail; user-review-pending |
| FIGMA-1139-350 | 1139:350 | 02.06 — TR-204 / Đã hoàn thành | 390×844 | DriverTripDetail | context-retrieved | pending | implemented-mock; evidence artifacts/driver-detail; user-review-pending |
| FIGMA-1140-18 | 1140:18 | 05.01 — Xác nhận đón khách | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-92 | 1140:92 | 05.03 — Xác nhận xuất bến | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-166 | 1140:166 | 05.05 — Xác nhận di chuyển | 390×844 | DriverTransitionConfirm | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1140-240 | 1140:240 | 05.07 — Xác nhận đến nơi | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-314 | 1140:314 | 05.09 — Xác nhận hoàn thành | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-1041 | 1140:1041 | 05.02 — Đang mở đón khách | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-1113 | 1140:1113 | 05.04 — Đang ghi nhận xuất bến | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-1185 | 1140:1185 | 05.06 — Đang ghi nhận di chuyển | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-1257 | 1140:1257 | 05.08 — Đang ghi nhận đến nơi | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-1329 | 1140:1329 | 05.10 — Đang hoàn thành chuyến | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-1401 | 1140:1401 | 05.11 — Chuyển trạng thái không hợp lệ | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1140-1474 | 1140:1474 | 05.12 — Dữ liệu chuyến đã thay đổi | 390×844 | DriverTransitionConfirm | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1140-1547 | 1140:1547 | 05.13 — Lỗi cập nhật chuyến | 390×844 | DriverTransitionConfirm | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1146-888 | 1146:888 | 02.08 — Đang tải thông tin chuyến | 390×844 | DriverTripDetail | context-retrieved | pending | implemented-mock; evidence artifacts/driver-detail; user-review-pending |
| FIGMA-1146-964 | 1146:964 | 02.09 — Lỗi tải thông tin chuyến | 390×844 | DriverTripDetail | context-retrieved | pending | implemented-mock; evidence artifacts/driver-detail; user-review-pending |
| FIGMA-1146-1042 | 1146:1042 | 02.10 — Chuyến không còn khả dụng | 390×844 | DriverTripDetail | context-retrieved | pending | implemented-mock; evidence artifacts/driver-detail; user-review-pending |
| FIGMA-1146-1120 | 1146:1120 | 06.07 — Đang tải tài khoản | 390×844 | DriverAccount | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1146-1196 | 1146:1196 | 06.08 — Lỗi tải tài khoản | 390×844 | DriverAccount | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |
| FIGMA-1160-18 | 1160:18 | 01.02 — Lộ trình hôm nay | 390×844 | DriverRoute | quota-blocked; context+screenshot-required | pending | implemented-mock; Android evidence artifacts/driver; user-review-pending |
| FIGMA-1160-19 | 1160:19 | 02.07 — TR-218 / Thông tin chuyến | 390×844 | DriverTripDetail | context-retrieved | pending | active; implementation-not-started |
| FIGMA-1168-98 | 1168:98 | 03.08 — TR-218 / Hành khách | 390×844 | DriverManifest | quota-blocked; context+screenshot-required | pending | active; implementation-not-started |

## Màn bổ sung không có Figma

| Case | Node | Route | Nguồn / trạng thái |
|---|---|---|---|
| NEW-GUEST-MENU | N/A-new-design | GuestMenu | Người dùng yêu cầu; hai card đặt vé/kiểm tra vé; style-derived, spec-approved |
| NEW-GUEST-LOOKUP | N/A-new-design | GuestTicketLookup | Người dùng yêu cầu; QR hoặc mãvé+phone, noOTP; style-derived |

## Supplemental states

Các scenario LOOKUP/AUTH-RETURN/HOLD/PAY/SAVE/CANCEL/DRIVER-SCAN/SESSION/LAYOUT trong spec là case bổ sung ngoài canonical node, phải tách từng ID trong implementation plan. Reuse screen/component không miễn evidence. Loading/empty/error/forbidden/not-found hoặc camera denied/manual fallback/read-only result không có frame ghi N/A-design-derived. App mới dùng before=N/A-new-screen, không ảnh trước giả. Evidence implementation phải cùng fixture/viewport/font/insets; metadata không chứng minh hoàn thành.



## Driver manifest / check-in — bổ sung 31/10/2026

Đã triển khai mock, chờ người dùng review. Exact node, link case, route/component/file và geometry xem [DRIVER_MANIFEST_CHECKIN.md](DRIVER_MANIFEST_CHECKIN.md). Bao gồm 1137:18/100/182/264/345/422/501, 996:102, 1138:681/18/91/165/239/313/387/461/535/608 và 35:54/78. Mỗi frame có case `FIGMA-<node-dash>` riêng. Bỏ tab Soát vé là override trên toàn Driver page 7:10; không bỏ màn soát vé.


## Driver action confirmations / profile — 31/10/2026

Đã triển khai mock, chờ review: 1140:18/1041/92/1113/240/1257/314/1401/1474/1547, 1146:1196 (lỗi hồ sơ), 1135:322. Xem DRIVER_ACTIONS_AND_ACCOUNT.md cho exact review links, file mapping, geometry và các case bổ sung không có Figma riêng (hết phiên, pending hoàn thành, tài khoản chỉnh sửa theo role).
