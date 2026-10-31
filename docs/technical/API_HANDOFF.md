# API handoff — Mobile mock, chưa là BE contract

Người phụ trách BE .NET xác nhận bảng này trước HTTP integration. Không sửa BE và không tuyên bố endpoint đã tồn tại. DTO bên dưới là đề xuất. Domain/source signatures canonical: DOMAIN_CONTRACTS.md.

| UI / repository method | FE fields | DTO / endpoint đề xuất | Auth / lưu ý |
|---|---|---|---|
| Login/login | identifier,password → Session.role/expiresAt | POST /auth/login, role/accountId/accessToken/expiresAt | Role từ response, không client role picker; expiry/JWT/refresh cần BE xác nhận |
| Register/register | fullName,phone hoặc email,password | POST /auth/register | Chỉ Customer; policy/password fields cần BE xác nhận, không bỏ field Figma |
| Search/search | origin,destination,departureDate,passengerCount,filters | GET /trips | Public, normalize timezone; không GPS |
| Trip/getTrip/getSeats | tripId → stops/seats/version | GET /trips/{id}; /seats | Public; tên/địa chỉ stops |
| Seat/holdSeats/revalidateHold | seatIds/holdId/version/expiresAt | POST /seat-holds; GET /seat-holds/{id} | Public guest hold;600000ms/max6; conflict atomic rollback |
| Seat/replaceHold/releaseHold | holdId,seatIds,holdVersion,guestSessionId | PUT /seat-holds/{id}; DELETE /seat-holds/{id} | Mock update không gia hạn TTL; không ghost hold; draft.version tách holdVersion; BE cần xác nhận policy |
| Passenger/savePassengers | draftId/passengers | PUT /booking-drafts/{id}/passengers | Customer+hold+ownership |
| Draft/createBookingDraft/claimBookingDraft | holdId,guestSessionId,draftId,holdVersion | POST /booking-drafts; POST /booking-drafts/{id}/claim | Đề xuất mock; validate guest ownership trước bind Customer, không bind bằng UI state |
| Review/getBookingReview | draftId,passengers,totalVnd,version | GET /booking-drafts/{id}/review | Customer+ownership, total authoritative trong repository |
| VNPay/createPayment/getPayment | draftId,idempotencyKey,state | POST /payments/vnpay; GET /payments/{id} | Customer; unknown reconcile; no real integration yet |
| MyTickets/getTickets/getTicket | ticketId,status,qrPayload | GET /me/tickets; GET /tickets/{id} | Customer+ownership |
| Guest/lookupTicket | code+phone hoặc qrPayload | POST /tickets/lookup | Read-only, generic mismatch; no OTP; QR protocol xác nhận |
| Cancel/quoteCancellation/cancelTickets/getRefund | ticketIds,quote/version,key | POST /cancellations/quote; POST /cancellations; GET /refunds/{id} | Customer+ownership+status; fee/cutoff cần xác nhận |
| Driver/getAssignedTrips/getManifest | session/tripId/filter | GET /driver/trips; /driver/trips/{id}/manifest | Driver+assignment, revoked403 |
| Driver/checkIn/getCheckIn | qrPayload hoặc ticketCode,key,tripId | POST /driver/check-ins; GET /driver/check-ins/{id} | Online only; idempotent; unknown reconciliation |
| Lifecycle/transitionTrip | tripId,to,version,key | POST /driver/trips/{id}/transitions | Assignment+valid transition+version |
| Operation/getOperation | kind,idempotencyKey,session | GET /operations/by-client-key (đề xuất) | Recovery khi timeout chưa nhận server ID; scope account+operation+key; không trả operation account khác |
| Driver/getAssignedTrip/getDriverAccount | tripId,displayName,phone,email | GET /driver/trips/{id}; GET /driver/me | Assignment/account enforced, loading/error qua repository |

HTTP envelope/status/error codes, auth refresh/logout, rate limit, VN phone normalization, seat reservation ownership/TTL, QR signature/expiry/replay, partial cancel/refund fees and trip state machine đều **pending BE confirmation**. Không ghi như API thật đã chạy. Mock auth role/customer/driver/sessions cũng phải enforce tại repository; HTTP server vẫn chịu trách nhiệm thật sau này.

Handoff verification tương lai: mapper fixture/domain runtime validation; contract test lỗi401/403/404/409/expired/network/unknown; không tích hợp endpoint thiếu docs chỉ bằng suy đoán. Token QR/phone không xuất artifact/log, chỉ fixture synthetic.


## Account — đề xuất chưa xác nhận
FE đang dùng getAccountProfile/updateAccountAvatar/changePassword trong mock repository; không có HTTP endpoint thật. BE xác nhận API profile (fullName,email,phone,avatarUrl), upload ảnh, đổi mật khẩu (current/new) và chính sách hết hạn/revoke phiên trước tích hợp. Không gửi lại password qua profile, không lưu password production trong app. Avatar mock là file URI local; production cần upload được xác thực. Không tự triển khai BE ở task này.


## Driver assigned schedules — dự kiến, chưa xác nhận API
Mock FE tách schedule tabs và xác minh session.role driver bằng authority. BE cần cung cấp danh sách chuyến theo driver authenticated, thời điểm/zone/status/date, vehicle/pickup, assignment version và trả forbidden/not-found khi assignment revoked. Mỗi reload/entry/detail/manifest phải recheck assignment, xóa stale passenger data khi mất quyền. Không tự triển khai endpoint/server/SQL trong Mobile. Trạng thái offline dùng ExpoNetwork, không giả network thành công hoặc dữ liệu vận hành thật từ fixture.


## Driver trip lifecycle — contract đề xuất
FE mock dùng version/stage/departureAt/arrivalAt/departedAt và kiểm assignment/session mỗi get/transition. BE phải xác nhận server-time gate, actualdeparture+plannedDuration, strict sequential transition, concurrent duplicate/version conflict, một active trip/driver, completedhistory và assignmentrevocation. Clientclock chỉ demo, không phải enforcement production. Không triển khai server/SQL tại Mobile.


## Driver manifest/checkin (đềxuất)
BE xácnhậnmanifestrevision,passengerpickupId/status/checkinrecord,cancel/refundchanges. Checkinphảiservervalidateassignment/role/tripstage/ticketstatus,atomicidempotencykey,queryoperationaftersendtimeout,khôngofflineoptimisticwrite. FEhiệnmocklocalJSONdriver-manifest.v1.json,khôngHTTP/APIthật. Hủy/hoànkháchvàcheckinDriverchưachungserver;developmentcancelđểreviewstale.


31/10/2026 — Frontend đề xuất profile update có email/phone/dateOfBirth (ISO date), tuổi suy ra; Driver không được đổi phone/dateOfBirth, server cần enforce role/ownership. Đổi định danh cần BE thống nhất xác minh email/phone, unique normalization và session policy; mock hiện cập nhật định danh local, không gửi OTP. Transition chuyến cần expectedVersion + targetStage + operation ID, kiểm phân công/role/time gate server và trả trạng thái mới sau ghi nhận; unknown cần query kết quả trước retry. Đây là handoff dự kiến, chưa phải endpoint/DTO đã duyệt; không triển khai BE trong Mobile.
