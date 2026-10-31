# Domain contracts Mobile — source canonique của plan

Thiết kế được duyệt 2026-10-29. Đây là contract **mock frontend**, không là API .NET đã có. Implementation tại `src/domain/types.ts`, `src/repositories/contracts/TravelRepository.ts`; mỗi task đọc signatures này để không tự đặt tên khác.

```ts
export const MAX_SEATS = 6;
export const HOLD_DURATION_MS = 600000;
export type Role = 'customer' | 'driver';
export type ErrorCode = 'validation'|'unauthorized'|'forbidden'|'notFound'|'conflict'|'expired'|'network'|'unknown'|'notImplemented';
export type Result<T> = {ok:true; value:T}|{ok:false; code:ErrorCode; message:string};
export type Session = {accountId:string;sessionId:string;role:Role;accessToken:string;expiresAt:number};
export type Stop = {id:string;name:string;address:string};
export type TripStatus = 'scheduled'|'boarding'|'departed'|'inTransit'|'arrived'|'completed';
export type Trip = {id:string;origin:string;destination:string;departureAt:string;arrivalAt:string;fareVnd:number;status:TripStatus;version:number;pickupStops:Stop[];dropoffStops:Stop[]};
export type SearchInput = {origin:string;destination:string;departureDate:string;passengerCount:number;departurePeriod?:'morning'|'afternoon'|'evening';minFareVnd?:number;maxFareVnd?:number};
export type Seat = {id:string;label:string;state:'available'|'heldByOther'|'booked'|'disabled'};
export type SeatHold = {id:string;tripId:string;seatIds:string[];expiresAt:number;version:number};
export type BookingDraft = {id:string;guestSessionId:string;tripId:string;seatIds:string[];holdId:string;holdVersion:number;expiresAt:number;version:number;customerAccountId?:string};
export type Passenger = {seatId:string;fullName:string;phone:string};
export type BookingReview = {draftId:string;passengers:Passenger[];totalVnd:number;version:number};
export type PaymentState = 'created'|'pending'|'succeeded'|'failed'|'cancelled'|'unknown';
export type PaymentAttempt = {id:string;draftId:string;accountId:string;state:PaymentState;ticketIds:string[];idempotencyKey:string};
export type TicketStatus = 'issued'|'checkedIn'|'cancelled'|'refunded'|'used';
export type Ticket = {id:string;bookingId:string;accountId:string;code:string;bookingPhone:string;tripId:string;seatId:string;status:TicketStatus;qrPayload:string;fareVnd:number};
export type CancellationQuote = {id:string;bookingId:string;ticketIds:string[];refundVnd:number;feeVnd:number;version:number};
export type Refund = {id:string;quoteId:string;state:'pending'|'succeeded'|'failed'|'unknown';idempotencyKey:string};
export type ManifestEntry = {ticketId:string;passengerName:string;seatId:string;pickupStopId:string;checkedIn:boolean};
export type DriverAccount = {id:string;displayName:string;phone:string;email?:string};
export type OperationKind = 'payment'|'refund'|'checkIn'|'tripTransition';
export type OperationRecord =
  | {kind:'payment';value:PaymentAttempt}
  | {kind:'refund';value:Refund}
  | {kind:'checkIn';value:CheckInResult}
  | {kind:'tripTransition';value:Trip};
export type CheckInOutcome = 'success'|'alreadyCheckedIn'|'wrongTrip'|'cancelled'|'refunded'|'used'|'invalid'|'forbidden'|'offline'|'unknown';
export type CheckInResult = {attemptId:string;outcome:CheckInOutcome;ticketId?:string;idempotencyKey:string};
export type MockOptions = {now:()=>number;seed:string;storage?:MockStateStorage};
export type Scenario = {id:string;route:string;reset:()=>void;expectedTestIds:string[]};
export interface TravelRepository {
  readonly kind:'mock'|'http';
  initialize():Promise<Result<void>>;
  login(input:{identifier:string;password:string}):Promise<Result<Session>>;
  register(input:{fullName:string;phone?:string;email?:string;password:string}):Promise<Result<Session>>;
  logout(session:Session):Promise<void>;
  search(input:SearchInput):Promise<Result<Trip[]>>;
  getTrip(tripId:string):Promise<Result<Trip>>;
  getSeats(tripId:string):Promise<Result<Seat[]>>;
  holdSeats(input:{tripId:string;seatIds:string[];guestSessionId:string;idempotencyKey:string}):Promise<Result<SeatHold>>;
  replaceHold(input:{holdId:string;seatIds:string[];version:number;guestSessionId:string;idempotencyKey:string}):Promise<Result<SeatHold>>;
  releaseHold(input:{holdId:string;guestSessionId:string}):Promise<Result<void>>;
  revalidateHold(input:{holdId:string;version:number}):Promise<Result<SeatHold>>;
  createBookingDraft(input:{holdId:string;guestSessionId:string;idempotencyKey:string}):Promise<Result<BookingDraft>>;
  claimBookingDraft(input:{draftId:string;guestSessionId:string;holdVersion:number;session:Session}):Promise<Result<BookingDraft>>;
  savePassengers(input:{draftId:string;passengers:Passenger[];session:Session}):Promise<Result<BookingReview>>;
  getBookingReview(draftId:string,session:Session):Promise<Result<BookingReview>>;
  createPayment(input:{draftId:string;session:Session;idempotencyKey:string}):Promise<Result<PaymentAttempt>>;
  getPayment(attemptId:string,session:Session):Promise<Result<PaymentAttempt>>;
  getTickets(session:Session):Promise<Result<Ticket[]>>;
  getTicket(ticketId:string,session:Session):Promise<Result<Ticket>>;
  lookupTicket(input:{code:string;phone:string}|{qrPayload:string}):Promise<Result<Ticket>>;
  quoteCancellation(input:{ticketIds:string[];session:Session}):Promise<Result<CancellationQuote>>;
  cancelTickets(input:{quoteId:string;version:number;session:Session;idempotencyKey:string}):Promise<Result<Refund>>;
  getRefund(refundId:string,session:Session):Promise<Result<Refund>>;
  getAssignedTrips(session:Session):Promise<Result<Trip[]>>;
  getAssignedTrip(tripId:string,session:Session):Promise<Result<Trip>>;
  getDriverAccount(session:Session):Promise<Result<DriverAccount>>;
  getManifest(tripId:string,session:Session):Promise<Result<ManifestEntry[]>>;
  checkIn(input:{tripId:string;qrPayload?:string;ticketCode?:string;session:Session;idempotencyKey:string}):Promise<Result<CheckInResult>>;
  getCheckIn(attemptId:string,session:Session):Promise<Result<CheckInResult>>;
  transitionTrip(input:{tripId:string;to:TripStatus;version:number;session:Session;idempotencyKey:string}):Promise<Result<Trip>>;
  getOperation(input:{kind:OperationKind;idempotencyKey:string;session:Session}):Promise<Result<OperationRecord>>;
}
```

Task 1 tạo skeleton typed; task sở hữu hành vi mới implement method tương ứng. `notImplemented` không được xuất hiện trong case accepted. Domain helpers khóa tên/path:

| File | Signature | Task |
|---|---|---|
| src/domain/lookup.ts | normalizeTicketCode(value:string):string; normalizeVietnamPhone(value:string):Result<string> | 2 |
| src/domain/booking.ts | validateSeatSelection(ids:string[]):Result<string[]>; isHoldExpired(hold:SeatHold,now:number):boolean | 4 |
| src/features/auth/continueBooking.ts | continueBooking(draft:BookingDraft,session:Session,repository:TravelRepository,now:number):Promise<Result<BookingDraft>> | 4 |
| src/features/booking/bookingDraftStore.ts | createBookingDraftStore(): {getDraft():BookingDraft\|null;setDraft(draft:BookingDraft):void;clear():void} | 4 |
| src/domain/passenger.ts | validatePassengers(passengers:Passenger[],seatIds:string[]):Result<Passenger[]> | 5 |
| src/domain/tripTransitions.ts | canTransition(from:TripStatus,to:TripStatus):boolean | 12 |
| src/shared/native/ticketExportGateway.ts | exportTicketImage(ticket:Ticket):Promise<Result<{uri:string}>> | 7 |
| src/shared/native/cameraGateway.ts | requestCameraPermission():Promise<'granted'\|'denied'\|'blocked'>; parseTicketQr(payload:string):Result<{version:1;ticketCode:string;signature:string}> | 2/11 |
| src/shared/native/secureSessionStorage.ts | saveSession(session:Session):Promise<void>; readSession():Promise<Session\|null>; clearSession():Promise<void> | 2 |

Mock QR schema đề xuất khóa: JSON `{version:1,ticketCode,signature}` với signature tổng hợp `mock:<ticketCode>`, không QR production. Parse unknown input với giới hạn 2048 ký tự, không execute URL/code; manual code ASCII uppercase. Normalize phone chỉ contract Việt Nam: bỏ space, `-`, `.`, `(`, `)`; đổi prefix +84→0 rồi yêu cầu `^0[0-9]{9}$`, reject quốc gia khác. Phone hợp lệ không đủ lookup nếu code sai.

Continuation: `continueBooking` chỉ role customer; role driver trả forbidden, không sửa draft; `now >= expiresAt` trả expired. Sau `revalidateHold`, gọi `claimBookingDraft` với đúng guest session/hold version; chỉ repository mới bind customerAccountId. Khác guest session/account đã claim trả forbidden. Thời điểm hết hạn được kiểm tra lại ngay lúc claim/savePassengers/createPayment, không chỉ ở UI. Login không gia hạn expiresAt. Logout chủ động clear session/query/draft; token không ra navigation params/log/artifacts. Ownership trong mock như BE dự kiến, không chỉ button guard.

Idempotency lưu kết quả theo account+operation+key; cùng key cùng payload trả cùng kết quả, key cùng payload khác trả conflict. Retry unknown phải query trạng thái trước, giữ key. Mock timeout-after-commit phải test được; không cho UI tạo key mới mỗi rerender. Giá/fee/quote là fixture rõ không tuyên bố chính sách BE thật.

Kiểm tra auth/account scope trước truy cập key; với key đã commit, xác nhận payload khớp rồi trả result cũ trước khi kiểm tra lại business transition. Nếu kiểm tra lại status sau commit trước dedup, retry hợp lệ có thể bị sai thành “vé đã hủy/chuyến không còn trạng thái trước”. Test phải bắt lỗi này.

Hold policy mock trong plan: chọn ghế đầu tiên tạo hold; thay đổi selection dùng replaceHold cùng holdId/version, giữ expiresAt ban đầu, không tạo hold mới làm mất dấu ghế cũ. Mỗi lần update thành công increment hold.version; danh sách rỗng releaseHold, đổi trip/abandon rõ cũng release; Back/Login cancel vẫn giữ hold còn hạn. Expiry loại ghế khỏi held state khi query/revalidate, không đợi timer UI. Conflict update rollback toàn bộ selection/hold theo case533:380, không giữ một phần rồi hiển thị tất cả đã chọn. Nếu draft đã tạo, repository đồng bộ seatIds/holdVersion với hold hoặc invalidate draft; không dùng draft.version làm holdVersion. Claim/revalidate dùng draft.holdVersion; draft.version là version riêng. Tests gồm replace không gia hạn TTL, ghế bỏ chọn được trả lại, version stale không ghi đè, conflict rollback không ghost hold. BE policy vẫn pending handoff.

Nếu timeout trước khi nhận server ID, UI vẫn có client key. Dùng `getOperation({kind,idempotencyKey,session})`, không đòi attemptId/refundId chưa nhận được. `notFound` khác `network/unknown`; chỉ retry cùng key khi đã xác định chưa có kết quả. Unknown chưa xác minh giữ trạng thái chờ, không tự phát vé/hoàn tiền/check-in thành công.

## Test world và model trình bày

Task 1 tạo `src/testing/createTestWorld.ts`, API dùng chung cho mọi test snippet trong plan:

```ts
type MutationName = 'createPayment'|'cancelTickets'|'checkIn'|'transitionTrip';
interface TestWorld {
  repository: TravelRepository;
  clock: {now():number;advanceBy(ms:number):void};
  sessions: {customer:Session;otherCustomer:Session;driver:Session};
  fixtures: {trip:Trip;hold:SeatHold;draft:BookingDraft;ticket:Ticket;quote:CancellationQuote};
  faults: {once(operation:MutationName,mode:'timeoutAfterCommit'|'networkBeforeCommit'):void};
  calls: {count(operation:string):number};
}
export function createTestWorld(options?:{now?:number;caseId?:string}):TestWorld;
```

`now` mặc định fixture clock xác định, không `Date.now()` trong assertion. `caseId` chọn đúng fixture riêng từng row matrix; không đổi expected để khớp code. Fixtures được seed vào repository, không chỉ trả object mà repository không biết. Trip/hold/draft/ticket/quote dùng ID hợp lệ liên kết với nhau; test trạng thái chưa sở hữu được từ chối khi gọi repository trực tiếp. Không import TestWorld vào production.

Task 1 tạo `src/testing/renderScenario.tsx`: `renderScenario(caseId:string):Promise<void>` mount App/providers với repository/session/clock thuộc registry và chờ initial state. Mỗi scenario export `Scenario` với ID duy nhất, route hợp lệ, reset và expectedTestIds; Task 1 kiểm tra duplicate/unknown ID. `registerScenario`, `launchScenario` là dev harness; production build không cho external intent chọn role/case, reset seed hoặc đọc fixture registry.

UI không được bịa dữ liệu bị thiếu trong domain. Task sở hữu màn bổ sung view-model tại `src/features/<feature>/models.ts` cho những field trình bày trong context: operator/coach/biển số, capacity và số đã lên xe, duration/availability, passenger contact, pickup/dropoff được chọn, nhóm refund, badge/copy. View-model chỉ dùng để hiển thị, không cấp quyền. Mọi field bắt buộc có mapping nguồn fixture/domain/asset trong `API_HANDOFF.md`; nếu frame có field chưa có type, thêm type và mapper trước UI cùng test, không hardcode text vào screen. Không thêm tọa độ hoặc location.

`checkIn` input phải có đúng một trong qrPayload/ticketCode (runtime XOR); session Driver và assigned trip hợp lệ. Guest lookup có phone chỉ dùng đối chiếu ở mock boundary, màn read-only không hiển thị số điện thoại không che mặc định. Dữ liệu tổng hợp phục vụ visual fixtures được ghi rõ.

## Service factories cho dependency injection

Task 6 tạo `createPaymentService(repository:TravelRepository)` tại `paymentService.ts`, trả `{startPayment(draftId,session,key),reconcilePayment(key,session)}` với signatures/return types trong plan. Task 8 tạo `createCancellationService(repository)` trả `{reconcileRefund(key,session)}`; helper `selectCancellation` thuần export riêng cùng file. Task 11 tạo `createCheckInService(repository)` trả `{reconcileCheckIn(key,session)}`. Task 12 tạo `createTripTransitionService(repository)` trả `{reconcileTripTransition(key,session)}`. Các method lấy repository từ factory, không biến global và không lấy session ngầm từ module singleton.

Trong mỗi test: import helper/service/`createTestWorld`, tạo world mới trong `beforeEach`; destructure service từ factory với `world.repository`. Snippets trong plan là assertions bên trong test đó. UI hooks lấy repository qua AppProviders rồi tạo service tương ứng; tests kiểm soát clock/faults/seed qua cùng repository.

## Dữ liệu mặc định và persistence của mock

TestWorld mặc định clock `2026-08-27T00:00:00+07:00`; trip `TR-204`, seats A01..A08, customer `CUSTOMER-1`, otherCustomer `CUSTOMER-2`, driver `DRIVER-1`, ticket code `TK-A01`, booking phone `0912345678`. Hold expiresAt=now+600000 và version1. Draft/quote/ticket tồn tại liên kết trong mock storage; draft mặc định đã claim CUSTOMER-1 để test payment. AUTH-RETURN/HOLD scenarios tạo draft chưa claim. Mỗi visual case override nội dung/time/status theo node của chính nó. Không dùng giá trị mặc định này thay dữ liệu Figma khi chụp.

Register mock nhận fullName và ít nhất phone hoặc email hợp lệ; password tối thiểu8 ký tự, confirmation chỉ thuộc UI schema và phải match. Đọc đúng các field trong frame Register trước layout; không bỏ email nếu Figma có. Đây là policy mock đề xuất trong plan, BE cần xác nhận sau. Login response validate role, không tin object bất kỳ lấy từ storage.

Session mock có expiresAt; mọi protected repository method kiểm tra token/session/account/role/expiry, không chỉ type của object client gửi. `now >= session.expiresAt` là unauthorized và clear private view/cache ở UI. `readSession` parse shape, kiểm expiry theo clock provider trước restore; AppState resume revalidate trước protected action. Visual fixture expired giữ state Login chung, không cấp session mới tự động. Contract refresh/JWT thật chờ BE, không triển khai server.

Task1 tạo `src/repositories/mock/mockStateStorage.ts` và `src/shared/native/pendingIntentStorage.ts`. Quyết định kỹ thuật của plan: mock server state được lưu app-private để đóng/mở app vẫn tìm được vé đã phát và operation outcome; không dùng một biến memory mất toàn bộ kết quả rồi giả recovery đã chạy. Đây là persistence của simulation frontend, không database/BE thật và không mẫu lưu trữ production. Token luôn SecureStore, không nằm trong snapshot. User/session cache và pending intent riêng theo account, logout clear; mock server records không bị xóa như cache vì Guest vẫn cần lookup trạng thái vé.

```ts
export interface MockStateStorage {
  load():Promise<unknown>;
  save(snapshot:unknown):Promise<void>;
  clear():Promise<void>;
}
export type PendingIntent = {accountId:string;kind:OperationKind;key:string};
export interface PendingIntentStorage {
  read(accountId:string):Promise<PendingIntent[]>;
  write(intent:PendingIntent):Promise<void>;
  clear(accountId:string):Promise<void>;
}
```

MockOptions có optional storage như khai báo phía trên; test dùng in-memory adapter, app dùng Expo FileSystem private directory. Repository methods chờ `initialize` resolve; AppProviders chờ init trước mount protected UI. Parse snapshot bằng schema+version, bounded size, ghi temp rồi atomic replace; lỗi/corruption báo demo-state-reset/error rõ, không phát hoặc hoàn tiền giả. Mutation chỉ acknowledge sau snapshot commit. Test timeout-after-commit là commit storage đã xong nhưng response bị mất. Pending client key được ghi trước send và xóa sau terminal outcome; cold relaunch đọc theo account rồi getOperation. Không lưu QR/phone/token vào pending intent. Không ghi snapshot ra gallery/shared/public storage hoặc log; chỉ export ảnh khi user bấm Save.

Snapshot dữ liệu mock là dữ liệu thử nghiệm app-private; khi thay HTTP adapter phải bỏ simulation storage, xác nhận BE ownership/persistence/privacy thay vì bê JSON simulation thành backend. Runtime không tự reset seed sau mỗi mount; reset chỉ qua test harness dev hoặc thao tác demo rõ. Test fixture reset có chủ đích không được lẫn với app-user lifecycle.
