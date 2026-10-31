# Native navigation contract

Đây là route ID React Navigation, không phải URL web. Source code tạo tại Task2 `src/navigation/types.ts` và RootNavigator; nested CustomerTabs/DriverTabs tại Task3/9. Role từ Session của repository. Không thêm LoginDriver/RolePicker.

| Route | Params cho phép | Guard / owner task |
|---|---|---|
| Welcome | undefined | first-open/public;2 |
| Login | `{returnTarget?:'booking'|'tickets'|'account'|'cancellation',intentId?:string}` | public/shared;2; intentId trỏ memory store, không mang PII |
| Register | undefined | public Customer-only signup;2 |
| GuestMenu | undefined | public;2 |
| GuestTicketLookup | undefined | public;2 |
| GuestScan | undefined | public, camera permission on action;2 |
| GuestTicketResult | `{lookupId:string}` | read-only result cache scoped Guest, không ticket mutation;2 |
| CustomerHome | undefined | Guest/Customer;3 |
| SearchResults | `{search?:SearchInput}` | public;3; không params mở form nhập tuyến, không giả có result |
| SearchFilters | `{searchId:string}` | public;3; committed search store |
| EditRoute | `{searchId?:string}` | public;3; cancel không apply draft form |
| SeatSelection | `{tripId:string}` | public;4 |
| PassengerDetails | `{draftId:string}` | Customer+claimed hold valid;5 |
| BookingReview | `{draftId:string}` | Customer+ownership+hold valid;5 |
| VNPayCheckout | `{draftId:string}` | Customer+valid review/hold;6 |
| PaymentReturn | `{operationKey:string}` | Customer/account;6, key không token/payment credential |
| MyTickets | `{filter:'all'|'upcoming'}` | Customer;7; Journey dùng upcoming |
| TicketDetail | `{ticketId:string}` | Customer+ownership;7 |
| CustomerAccount | undefined | Customer;3; Guest được Login prompt |
| CancellationSelection | `{bookingId:string}` | Customer+ownership+status;8 |
| CancellationPreview | `{quoteId:string}` | Customer+ownership+quote version;8 |
| CancellationConfirm | `{quoteId:string}` | Customer+ownership;8 |
| RefundProcessing | `{operationKey:string}` | Customer/account;8; không đòi refundId khi timeout chưa nhận ID |
| DriverTrips | `{tab?:'today'|'upcoming'|'completed'}` | Driver;9 |
| DriverRoute | undefined | Driver, chỉ stops name/address;9 |
| DriverTripDetail | `{tripId:string}` | Driver+assignment;9 |
| DriverAccount | undefined | Driver;9 |
| DriverManifest | `{tripId:string,pickupStopId?:string,unboardedOnly?:boolean}` | Driver+assignment;10 |
| DriverScan | `{tripId:string}` | Driver+assignment+online to mutate;11 |
| DriverManualCode | `{tripId:string}` | Driver+assignment;11 |
| DriverCheckInResult | `{tripId:string,operationKey:string}` | Driver/account+assignment;11 |
| DriverTransitionConfirm | `{tripId:string,to:TripStatus,version:number}` | Driver+assignment+state/version;12 |

Root AppProviders lưu repository/session/clock/query client; identity không lấy từ params/deep link. QR/phone/passenger/token nằm trong repository/ephemeral scoped state, không URL/params/log. Unknown route/role có fallback an toàn, không default thành Customer. Back/deep-link/modal phải áp dụng guard như bấm button.

CustomerTabs: Home→CustomerHome; Search→SearchResults; Journey→MyTickets upcoming; Tickets→MyTickets all; Account→CustomerAccount. DriverTabs: Today→DriverTrips; Route→DriverRoute; Scan→DriverScan theo assigned trip được chọn; Account→DriverAccount. Nếu chưa chọn trip, Scan yêu cầu chọn từ assigned trips, không lấy trip bất kỳ. Chỉ một tab selected, không active theo label trùng/hai route cùng href như lỗi Desktop.

Home notification mock empty panel có Close/Back; recommendation/destination/See all mở search với params; calendar/passenger picker validate date/count. Social/Forgot là action mô phỏng có giải thích; không noop. Legal links nếu chưa có tài liệu chính thức dùng panel ghi rõ nội dung demo/chưa cung cấp, không giả đó là chính sách pháp lý thật.

Trước task sở hữu downstream screen, typed target được đăng ký bằng development boundary có nhãn `feature not implemented`; chỉ test dispatch navigation, không báo downstream screen đã hoàn thành. Ví dụ Search/DriverTrips trong Task2 chờ Task3/9, MyTickets trong Task3 chờ Task7, DriverScan trong Task9 chờ Task11. Task sở hữu target phải thay boundary bằng màn thật và kiểm tra integration từ entry tương ứng. Task13 reject mọi route shipping còn placeholder. Đây là dependency delivery, không hình để nghiệm thu Figma.
