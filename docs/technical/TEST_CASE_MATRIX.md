**Current Foundation status:** FOUNDATION-SMOKE accepted by Supervisor (Plan01 localTask2); see artifacts/agy/plan01/task02/sol-handoff/supervisor-review.md. Plan01 final Task3 pending review; all other planned rows unchanged.

# Matrix kiểm thử và traceability — BLUE Mobile

Ngày 2026-10-29. Kế hoạch chưa được thực thi. Nguồn machine-readable: `docs/technical/TEST_CASE_MATRIX.csv`; file CSV chứa **exact fixture path, test path, native YAML path, artifact path, required testIDs, expected, reference status, task owner** cho từng row. Bảng dưới là bản đọc nhanh của cùng dữ liệu.

Tổng 173 row: 91 node Figma (87 active, 4 Archive excluded-approved), 2 màn Guest mới, 52 supplemental ID từ spec, 27 case interaction/error/release bổ sung và 1 Foundation smoke harness. Không row nào có verdict implementation accepted. 5 Driver auth rows giữ scenario trên Login chung theo quyết định người dùng. Exclusion Archive là áp dụng đề xuất của thiết kế vừa được duyệt, không xóa metadata.

## Cách thực thi một row

- ID `FIGMA-31-2` → fixture `src/testing/scenarios/FIGMA-31-2.ts`, unit/component `src/testing/cases/FIGMA-31-2.test.tsx`, native `tests/native/cases/FIGMA-31-2.yaml`, evidence `artifacts/FIGMA-31-2/`. CSV ghi đầy đủ cùng quy tắc cho mọi row.
- Mỗi screen mount `screen.<CASE>` cùng các required IDs trong CSV. Test phải assert expected state/role/actions của chính row, không chỉ screen tồn tại. State name lấy từ exact frame/case ở cột Expected; dữ liệu text/geometry/asset phải trích exact context trước UI, không tự đoán từ tên frame.
- Factory fixture seed thật repository/account/clock/fault mode. Loading/processing cố định pending, không capture race sau success. Row auth adapt dùng layout64:634 và giữ semantic state của node Driver.
- Unit test theo template plan; native YAML thực hiện thao tác/tình trạng của row và kiểm tra required IDs/state; snapshot hình và geometry không thay behavioral assertion.
- Mọi case UI chạy profile canonical390×844/font1, widths320/360/390/412/480, fonts1/1.3/2 và applicable keyboard/long-text/inset tests; N/A phải có lý do cụ thể (ví dụ result read-only không có input), không miễn cả family. LAYOUT rows kiểm tra harness mẫu, không thay kiểm tra từng màn.
- Evidence gồm reference.json/figma.png (hoặc design-derived), geometry.json, implementation.png, overlay.png, diff report, layout/native/a11y logs, findings.md, CHECKLIST.md, verdict.json. Verdict schema: `{caseId,task,status:'accepted'|'changes-requested'|'blocked',supervisor,referenceVersion,sourceHash,commands:[{command,exitCode}],artifacts,findings}`. Accepted cần không Critical/Important, reference đầy đủ và source hash đúng lần test.
- Excluded Archive: không tạo fixture/code chỉ để đếm; verdict exclusion ghi source node và quyết định duyệt thiết kế. Case quota-blocked không completed. Camera callback injection không chứng minh camera decoding thật; gallery mock API không chứng minh ảnh đã vào thư viện.

## Case → task → route → expected

| Case | Task | Node | Route | Expected / kiểm chứng |
|---|---|---|---|---|
| FIGMA-31-2 | 3 | 31:2 | CustomerHome | guest-visual-personalized-fixture; runtime-guest-no-false-session |
| FIGMA-31-44 | 3 | 31:44 | SearchResults | results-nonempty |
| FIGMA-31-89 | 4 | 31:89 | SeatSelection | hold-active |
| FIGMA-31-172 | 6 | 31:172 | PaymentReturn | payment-processing |
| FIGMA-31-183 | 7 | 31:183 | TicketDetail | ticket-issued |
| FIGMA-37-127 | 5 | 37:127 | PassengerDetails | passenger-completed |
| FIGMA-37-171 | 5 | 37:171 | BookingReview | review-ready |
| FIGMA-64-634 | 2 | 64:634 | Login | Customer App / Auth / Đăng nhập / 390 |
| FIGMA-64-638 | 2 | 64:638 | Register | Customer App / Auth / Đăng ký / 390 |
| FIGMA-486-279 | 3 | 486:279 | SearchFilters | Customer App / Search / Filter Sheet / 390 |
| FIGMA-505-203 | 3 | 505:203 | EditRoute | Customer App / Search / Edit Route Overlay / 390 |
| FIGMA-533-380 | 4 | 533:380 | SeatSelection | conflict-all-rolled-back |
| FIGMA-533-491 | 4 | 533:491 | SeatSelection | hold-expired |
| FIGMA-635-45 | 7 | 635:45 | MyTickets | ticket-list |
| FIGMA-650-4 | 2 | 650:4 | Welcome | Customer App / Welcome / First Open / 390 |
| FIGMA-1035-7 | 6 | 1035:7 | VNPayCheckout | Customer App / Payment / VNPay Checkout / 390 |
| FIGMA-1046-200 | 8 | 1046:200 | CancellationPreview | cancellation-preview |
| FIGMA-1046-397 | 8 | 1046:397 | RefundProcessing | refund-processing-both |
| FIGMA-1110-4 | 8 | 1110:4 | CancellationSelection | selected-A01+A02 |
| FIGMA-1113-4 | 8 | 1113:4 | CancellationSelection | selected-A01 |
| FIGMA-1113-205 | 8 | 1113:205 | CancellationSelection | selected-A02 |
| FIGMA-1113-406 | 8 | 1113:406 | CancellationSelection | selected-none; confirm-disabled |
| FIGMA-1113-607 | 8 | 1113:607 | CancellationConfirm | confirm-A01 |
| FIGMA-1113-804 | 8 | 1113:804 | RefundProcessing | refund-processing-A01 |
| FIGMA-1113-878 | 8 | 1113:878 | CancellationConfirm | confirm-A02 |
| FIGMA-1113-1075 | 8 | 1113:1075 | RefundProcessing | refund-processing-A02 |
| FIGMA-35-2 | 9 | 35:2 | DriverTrips | today-assigned-TR204-TR218 |
| FIGMA-35-28 | 9 | 35:28 | DriverTripDetail | TR204-boarding |
| FIGMA-35-54 | 11 | 35:54 | DriverCheckInResult | checkIn-success |
| FIGMA-35-78 | 11 | 35:78 | DriverCheckInResult | checkIn-unknown-after-commit |
| FIGMA-996-68 | excluded | 996:68 | Archive-pending | Archive / Before Customer Style / Driver App / Assigned Trips / Today / 390 |
| FIGMA-996-78 | excluded | 996:78 | Archive-pending | Archive / Before Customer Style / Driver App / Trip Detail / Boarding / 390 |
| FIGMA-996-88 | excluded | 996:88 | Archive-pending | Archive / Before Customer Style / Driver App / Scanner / Success In-place / 390 |
| FIGMA-996-96 | excluded | 996:96 | Archive-pending | Archive / Before Customer Style / Driver App / Scanner / Network Uncertain / 390 |
| FIGMA-996-102 | 11 | 996:102 | DriverScan | 04.01 — Quét mã QR |
| FIGMA-1135-18 | 2 | 1135:18 | Login | shared-login-default |
| FIGMA-1135-95 | 2 | 1135:95 | Login | shared-login-invalid-credentials |
| FIGMA-1135-173 | 2 | 1135:173 | Login | shared-login-locked |
| FIGMA-1135-251 | 2 | 1135:251 | Login | shared-login-session-expired |
| FIGMA-1135-322 | 2 | 1135:322 | Login | shared-login-offline |
| FIGMA-1135-393 | 9 | 1135:393 | DriverAccount | 06.06 — Tài khoản tài xế |
| FIGMA-1135-471 | 9 | 1135:471 | DriverAccount | 06.09 — Xác nhận đăng xuất |
| FIGMA-1136-18 | 9 | 1136:18 | DriverTrips | 01.03 — Chuyến sắp tới |
| FIGMA-1136-98 | 9 | 1136:98 | DriverTrips | 01.04 — Chuyến đã hoàn thành |
| FIGMA-1136-178 | 9 | 1136:178 | DriverTrips | 01.05 — Đang tải lịch chuyến |
| FIGMA-1136-247 | 9 | 1136:247 | DriverTrips | 01.06 — Chưa có chuyến hôm nay |
| FIGMA-1136-318 | 9 | 1136:318 | DriverTrips | 01.07 — Lỗi tải lịch chuyến |
| FIGMA-1136-389 | 9 | 1136:389 | DriverTrips | 01.08 — Đã thu hồi phân công |
| FIGMA-1137-18 | 10 | 1137:18 | DriverManifest | 03.01 — TR-204 / Tất cả hành khách |
| FIGMA-1137-100 | 10 | 1137:100 | DriverManifest | 03.02 — Lọc theo điểm đón |
| FIGMA-1137-182 | 10 | 1137:182 | DriverManifest | 03.03 — Khách chưa lên xe |
| FIGMA-1137-264 | 10 | 1137:264 | DriverManifest | 03.04 — Danh sách cần cập nhật |
| FIGMA-1137-345 | 10 | 1137:345 | DriverManifest | 03.05 — Đang tải hành khách |
| FIGMA-1137-422 | 10 | 1137:422 | DriverManifest | 03.06 — Không có kết quả lọc |
| FIGMA-1137-501 | 10 | 1137:501 | DriverManifest | 03.07 — Lỗi tải hành khách |
| FIGMA-1138-18 | 11 | 1138:18 | DriverCheckInResult | checkIn-validating |
| FIGMA-1138-91 | 11 | 1138:91 | DriverCheckInResult | checkIn-alreadyCheckedIn |
| FIGMA-1138-165 | 11 | 1138:165 | DriverCheckInResult | checkIn-wrongTrip |
| FIGMA-1138-239 | 11 | 1138:239 | DriverCheckInResult | checkIn-cancelled |
| FIGMA-1138-313 | 11 | 1138:313 | DriverCheckInResult | checkIn-refunded |
| FIGMA-1138-387 | 11 | 1138:387 | DriverCheckInResult | checkIn-used |
| FIGMA-1138-461 | 11 | 1138:461 | DriverCheckInResult | checkIn-invalid |
| FIGMA-1138-535 | 11 | 1138:535 | DriverCheckInResult | checkIn-forbidden |
| FIGMA-1138-608 | 11 | 1138:608 | DriverCheckInResult | checkIn-offline |
| FIGMA-1138-681 | 11 | 1138:681 | DriverManualCode | manual-entry |
| FIGMA-1139-18 | 9 | 1139:18 | DriverTripDetail | TR204-scheduled |
| FIGMA-1139-101 | 9 | 1139:101 | DriverTripDetail | TR204-departed |
| FIGMA-1139-184 | 9 | 1139:184 | DriverTripDetail | TR204-inTransit |
| FIGMA-1139-267 | 9 | 1139:267 | DriverTripDetail | TR204-arrived |
| FIGMA-1139-350 | 9 | 1139:350 | DriverTripDetail | TR204-completed |
| FIGMA-1140-18 | 12 | 1140:18 | DriverTransitionConfirm | 05.01 — Xác nhận đón khách |
| FIGMA-1140-92 | 12 | 1140:92 | DriverTransitionConfirm | 05.03 — Xác nhận xuất bến |
| FIGMA-1140-166 | 12 | 1140:166 | DriverTransitionConfirm | 05.05 — Xác nhận di chuyển |
| FIGMA-1140-240 | 12 | 1140:240 | DriverTransitionConfirm | 05.07 — Xác nhận đến nơi |
| FIGMA-1140-314 | 12 | 1140:314 | DriverTransitionConfirm | 05.09 — Xác nhận hoàn thành |
| FIGMA-1140-1041 | 12 | 1140:1041 | DriverTransitionConfirm | 05.02 — Đang mở đón khách |
| FIGMA-1140-1113 | 12 | 1140:1113 | DriverTransitionConfirm | 05.04 — Đang ghi nhận xuất bến |
| FIGMA-1140-1185 | 12 | 1140:1185 | DriverTransitionConfirm | 05.06 — Đang ghi nhận di chuyển |
| FIGMA-1140-1257 | 12 | 1140:1257 | DriverTransitionConfirm | 05.08 — Đang ghi nhận đến nơi |
| FIGMA-1140-1329 | 12 | 1140:1329 | DriverTransitionConfirm | 05.10 — Đang hoàn thành chuyến |
| FIGMA-1140-1401 | 12 | 1140:1401 | DriverTransitionConfirm | 05.11 — Chuyển trạng thái không hợp lệ |
| FIGMA-1140-1474 | 12 | 1140:1474 | DriverTransitionConfirm | 05.12 — Dữ liệu chuyến đã thay đổi |
| FIGMA-1140-1547 | 12 | 1140:1547 | DriverTransitionConfirm | 05.13 — Lỗi cập nhật chuyến |
| FIGMA-1146-888 | 9 | 1146:888 | DriverTripDetail | 02.08 — Đang tải thông tin chuyến |
| FIGMA-1146-964 | 9 | 1146:964 | DriverTripDetail | 02.09 — Lỗi tải thông tin chuyến |
| FIGMA-1146-1042 | 9 | 1146:1042 | DriverTripDetail | 02.10 — Chuyến không còn khả dụng |
| FIGMA-1146-1120 | 9 | 1146:1120 | DriverAccount | 06.07 — Đang tải tài khoản |
| FIGMA-1146-1196 | 9 | 1146:1196 | DriverAccount | 06.08 — Lỗi tải tài khoản |
| FIGMA-1160-18 | 9 | 1160:18 | DriverRoute | 01.02 — Lộ trình hôm nay |
| FIGMA-1160-19 | 9 | 1160:19 | DriverTripDetail | TR218-detail |
| FIGMA-1168-98 | 10 | 1168:98 | DriverManifest | TR218-manifest |
| NEW-GUEST-MENU | 2 | N/A-design-derived | GuestMenu | Login > Continue guest > exactly Book ticket and Check ticket; Book targets SearchResults; Check targets GuestTicketLookup |
| NEW-GUEST-LOOKUP | 2 | N/A-design-derived | GuestTicketLookup | QR scan or both code+bookingPhone required; no OTP; accessible error and manual fallback |
| GUEST-001 | 2 | N/A-design-derived | GuestMenu | Book targets SearchResults without Login |
| GUEST-002 | 2 | N/A-design-derived | GuestMenu | Check targets GuestTicketLookup; Back targets shared Login |
| LOOKUP-001 | 2 | N/A-design-derived | GuestTicketLookup | matching code+phone returns exact ticket |
| LOOKUP-002 | 2 | N/A-design-derived | GuestTicketLookup | missing code/phone blocks request and labels error |
| LOOKUP-003 | 2 | N/A-design-derived | GuestTicketLookup | wrong phone or wrong code returns generic mismatch |
| LOOKUP-004 | 2 | N/A-design-derived | GuestTicketLookup | valid QR alone opens read-only result |
| LOOKUP-005 | 2 | N/A-design-derived | GuestTicketLookup | invalid/version-unsupported/oversize QR rejected |
| LOOKUP-006 | 2 | N/A-design-derived | GuestTicketLookup | camera denied or blocked retains manual path |
| LOOKUP-007 | 2 | N/A-design-derived | GuestTicketLookup | repeated scan single lookup; camera stops on blur |
| LOOKUP-008 | 2 | N/A-design-derived | GuestTicketLookup | offline lookup shows retry; no false result |
| LOOKUP-009 | 2 | N/A-design-derived | GuestTicketLookup | guest result has no cancellation/payment/check-in mutation |
| AUTH-RETURN-001 | 4 | N/A-design-derived | SeatSelection | Customer Login restores exact trip/seat/hold and claims draft |
| AUTH-RETURN-002 | 4 | N/A-design-derived | SeatSelection | now equals expiresAt is expired; no PassengerDetails |
| AUTH-RETURN-003 | 4 | N/A-design-derived | SeatSelection | conflicting hold rolls back selected seats |
| AUTH-RETURN-004 | 4 | N/A-design-derived | SeatSelection | Driver Login goes DriverTrips; draft not consumed or extended |
| AUTH-RETURN-005 | 4 | N/A-design-derived | SeatSelection | cancel Login returns seat state only if hold still valid |
| AUTH-RETURN-006 | 4 | N/A-design-derived | SeatSelection | different account cannot inherit claimed draft; logout clears |
| HOLD-001 | 4 | N/A-design-derived | SeatSelection | six seats allowed; seventh rejected; duplicates not counted twice |
| HOLD-002 | 4 | N/A-design-derived | SeatSelection | doubletap same seat does not create two holds |
| HOLD-003 | 4 | N/A-design-derived | SeatSelection | background beyond600000ms then resume clears expired selection |
| HOLD-004 | 4 | N/A-design-derived | SeatSelection | stale hold version rejected before continuation |
| HOLD-005 | 4 | N/A-design-derived | SeatSelection | one conflicting selected seat rolls entire requested hold back |
| PAY-001 | 6 | N/A-design-derived | PaymentReturn | success issues exact ticketIds once |
| PAY-002 | 6 | N/A-design-derived | PaymentReturn | failed payment issues no tickets |
| PAY-003 | 6 | N/A-design-derived | PaymentReturn | cancelled payment is not paid |
| PAY-004 | 6 | N/A-design-derived | PaymentReturn | processing keeps status pending and recheck action |
| PAY-005 | 6 | N/A-design-derived | PaymentReturn | timeout-after-commit queries client key without received server ID |
| PAY-006 | 6 | N/A-design-derived | PaymentReturn | duplicate callback/key returns same tickets; mismatched payload conflicts |
| SAVE-001 | 7 | N/A-design-derived | TicketDetail | actual saved gallery PNG exists and independent decode equals ticket payload |
| SAVE-002 | 7 | N/A-design-derived | TicketDetail | permission denied shows retry/settings path; no success |
| SAVE-003 | 7 | N/A-design-derived | TicketDetail | write/disk failure does not show saved and cleans temp |
| SAVE-004 | 7 | N/A-design-derived | TicketDetail | doubletap triggers one export with busy accessibility state |
| SAVE-005 | 7 | N/A-design-derived | TicketDetail | saved historical image never authorizes current check-in |
| CANCEL-001 | 8 | N/A-design-derived | CancellationSelection | guest cancellation opens Login then checks ownership |
| CANCEL-002 | 8 | N/A-design-derived | CancellationSelection | other customer forbidden at repository and UI |
| CANCEL-003 | 8 | N/A-design-derived | CancellationSelection | no selected ticket means disabled confirm and zero mutation |
| CANCEL-004 | 8 | N/A-design-derived | CancellationSelection | timeout-after-commit reconciles refund by client key |
| CANCEL-005 | 8 | N/A-design-derived | CancellationSelection | repeated confirmation same key produces one refund |
| DRIVER-SCAN-001 | 11 | N/A-design-derived | DriverScan | camera preview plus QR from actual camera decodes synthetic ticket; injected event is separate evidence |
| DRIVER-SCAN-002 | 11 | N/A-design-derived | DriverScan | manual code equals QR outcome for same ticket/trip |
| DRIVER-SCAN-003 | 11 | N/A-design-derived | DriverScan | duplicate callback causes one mutation and boarded increment once |
| DRIVER-SCAN-004 | 11 | N/A-design-derived | DriverScan | unknown-after-commit recovered by operation key; no optimistic success |
| DRIVER-SCAN-005 | 11 | N/A-design-derived | DriverScan | offline prevents mutation and does not queue check-in |
| SESSION-001 | 2 | N/A-design-derived | Login | logout clears SecureStore/query/draft and cancels in-flight request |
| SESSION-002 | 2 | N/A-design-derived | Login | expired session goes shared Login; no private screen leak |
| SESSION-003 | 9 | N/A-design-derived | DriverTrips | assignment revoked blocks actions and removes private cached view |
| SESSION-004 | 2 | N/A-design-derived | Login | guest/customer/unknown-role protected deep link rejected |
| LAYOUT-001 | 3 | N/A-design-derived | CustomerHome | portrait320 and480 layouts preserve required content without unintended overlap |
| LAYOUT-002 | 3 | N/A-design-derived | CustomerHome | fontScale2 wraps content; does not disable scaling |
| LAYOUT-003 | 3 | N/A-design-derived | CustomerHome | keyboard focused last field and CTA can be reached by scroll |
| LAYOUT-004 | 3 | N/A-design-derived | CustomerHome | long Vietnamese names/addresses/prices wrap without covering neighbor |
| LAYOUT-005 | 3 | N/A-design-derived | CustomerHome | insets/modals/list-end stay above navigation bar and reachable |
| SEARCH-LOADING | 3 | N/A-design-derived | SearchResults | loading state distinct; no stale results presented as fresh |
| SEARCH-EMPTY | 3 | N/A-design-derived | SearchResults | zero results distinct; change filter/search available |
| SEARCH-ERROR | 3 | N/A-design-derived | SearchResults | network error retains committed search and retry |
| SEARCH-PICKERS | 3 | N/A-design-derived | EditRoute | calendar/passenger controls validate date and1..6; cancel leaves committed route unchanged |
| CUSTOMER-TABS | 3 | N/A-design-derived | CustomerHome | exactly one active tab; Guest protected tab Login return; Journey filter upcoming and Tickets all |
| CUSTOMER-ACCOUNT | 3 | N/A-design-derived | CustomerAccount | Customer-only session info and logout; Guest Login prompt; no role selector |
| CUSTOMER-NOTIFICATIONS | 3 | N/A-design-derived | CustomerHome | notification opens closable mock empty panel; Back restores Home |
| HOME-ACTIONS | 3 | N/A-design-derived | CustomerHome | recommendation/destination/see-all route to valid search params; no location permission |
| PASSENGER-VALIDATION | 5 | N/A-design-derived | PassengerDetails | one passenger per selected seat; missing duplicate extra seat blocked; input retained |
| PASSENGER-KEYBOARD | 5 | N/A-design-derived | PassengerDetails | last field focus, validation announcement and Continue reachable320/font2/keyboard |
| REVIEW-EDIT | 5 | N/A-design-derived | BookingReview | edit preserves values; saved review and integer total update; expired hold blocks pay |
| TICKETS-LOADING | 7 | N/A-design-derived | MyTickets | loading distinct from empty and avoids wrong-account cached tickets |
| TICKETS-EMPTY | 7 | N/A-design-derived | MyTickets | empty has search action; Guest cannot read personal ticket list |
| TICKETS-ERROR | 7 | N/A-design-derived | MyTickets | network error retry; no false ticket issued |
| REFUND-FAILED | 8 | N/A-design-derived | RefundProcessing | failed distinct from succeeded/pending; no optimistic refunded ticket status |
| REFUND-UNKNOWN | 8 | N/A-design-derived | RefundProcessing | unknown keeps intent key and rechecks without duplicate refund |
| AUTH-UNKNOWN-ROLE | 2 | N/A-design-derived | Login | unrecognized response role is rejected; no default customer/driver route |
| ROUTE-NOT-FOUND | 2 | N/A-design-derived | Login | unsupported native route/deep link has safe not-found fallback, no private data |
| LOGIN-SOCIAL-FORGOT | 2 | N/A-design-derived | Login | Facebook/Google/Forgot actions show explicit mock explanation; no false external auth |
| TRANSITION-TIMEOUT | 12 | N/A-design-derived | DriverTransitionConfirm | timeout-after-commit without server ID recovered by key; version increases once |
| TRANSITION-KEY-CONFLICT | 12 | N/A-design-derived | DriverTransitionConfirm | same client key different target is conflict; does not mutate trip |
| PRODUCTION-HARNESS | 13 | N/A-design-derived | Login | release build rejects debug case/role/reset deep links and starts without Metro |
| SESSION-RELEASE | 13 | N/A-design-derived | Login | release relaunch after logout and role change has no account cache or pending intent leak |

## Kiểm tra độ phủ khi bàn giao

Các row bổ sung cuối CSV: SEARCH-ENTRY (Task3, nhập tìm chuyến khi Guest Book), GUEST-QR-CANCELLED/REFUNDED/USED (Task2, kết quả read-only theo status), FOUNDATION-SMOKE (Task1, measured native harness). Cùng exact path rule trong CSV; không gộp các status QR vào một verdict.

Task13 phải so sánh exact node IDs của FIGMA_SCREEN_MAP với CSV, reject duplicate hoặc missing IDs; kiểm tra mọi active row có fixture/test/YAML/artifact/verdict riêng, token không lọt logs, unknown case fail nonzero. Không coi reference status context-retrieved là đã review screenshot. Backend contract và chính sách phí/camera QR signature vẫn là mock/handoff chờ BE, không tự đổi server.
