# Hủy vé và hoàn tiền Mobile

Nguồn: Travel-v3 file OCkWSOZQ8Pq8AejXccajpO. Context+screenshot từng frame1110:4,1113:4,1113:205,1113:406,1113:607,1113:804 đã đọc. Hai màn bổ sung chưa cóFigma: chờBE xác nhận hủy và hoàn tiền thành công; dùng styleframe1113:804. Không sửaBE/VNPay thật.

## Mapping

TicketScreen -> nút Hủy vé (thay Tải riêngQR) -> CancellationFlow modal toàn màn. Vẫn giữ Tải ảnh vé kèmQR. Yêu cầu customerLogin, account/role lấy từ useSession. Reviewcase có reviewStage riêng bỏLogin để nhìnfixture, không phải luồng production.

src/features/cancellation/CancellationFlow.tsx dùng booking.styles.ts, BookingBackground/Header/TripHeading/PrimaryButton và nền ticketlocal của passenger. cancellationModel.ts tách state machine/quote khỏiUI; cancellationAssets.ts dùngassetcheckbox vàprocessing củaexactFigma local. Ledger artifacts/cancellation/assets.json. Thông tinhãng/giờ/giá từ bookingTrip, không cố định tiền320kframe nếu chuyếnNK380k.

## Các bước

1. select: chọn0/1/nhiều ghế trongbooking, đãhủy không chọn lại. Không chọn -> CTAxám,disabled,refund0.
2. preview: ghếchọn sáng, ghếgiữlại xám có Không hủy—Giữ nguyên vé. Quaylại sửa selection.
3. cancelling: bấmXác nhận chỉ gửi yêu cầu mock; chưa đánh dấu hủy, không tự chuyển do timeout.
4. backend-confirmed: cập nhật cancelledSeats đúng ghếchọn; ghếkhác giữnguyên, sangrefunding chờVNPay.
5. provider-confirmed: cập nhật refundedSeats đúngghế, sangrefunded. Eventlặp/sai thứtự không tạo lại kếtquả. Panelmock có2nútgiảlập event, không khẳngđịnh gọiBEthật.

Phí10% là chính sách fixtureMức1từ24h trongFigma, không chính sáchthựcđãxácnhận. Quote dùng sốghếunique,hợpbooking,chưahủy x giáchuyến; hoàn=gross-fee. Không tự so giờhost với ngàyfixture28/08để kếtluận eligibility. Vé đãđi vôhiệuHủyvé. HandoffBE cầnquote/servereligibility/idempotency vàstatus thật trướcproduction.

SauBEconfirmed véđãhủy không nằm trong QR/ảnhxuất hợp lệ; QRcủaghếcònlại sinh lại, hủyhết thì khôngQR và khôngtảiảnh. Trạngtháihủy/hoàn cậpnhật kho mocktheoaccount hiệncó; vẫn bộnhớ, không hứa persistencequaapprestart. Đóng/hoàntất -> Vé của tôi. Điều hướng hoàn tiền mock không gửi tiền thật.

## Đã đi

Empty state có cardtrắng, iconvé nềnxanhnhạt, tiêuđề Chưa có hành trình đã đi và hướngdẫn; không dùng dòngtrống đơnđiệu.

## Review links

bluemobile://debug/case/FIGMA-1110-4 (2selected)
bluemobile://debug/case/FIGMA-1113-4 (firstselected)
bluemobile://debug/case/FIGMA-1113-205 (secondselected)
bluemobile://debug/case/FIGMA-1113-406 (none)
bluemobile://debug/case/FIGMA-1113-607 (preview)
bluemobile://debug/case/NEW-CANCEL-PENDING
bluemobile://debug/case/FIGMA-1113-804
bluemobile://debug/case/NEW-REFUND-SUCCESS

Bằngchứng/test tại artifacts/cancellation. ReactNative layoutflex,safearea,max600dp,nộidungcuộn,checkboxa11y,CTA disabled thật; không tuyênbố toànmatrix/iOS/API đãpass.

Yêu cầuđangchờ được lưu refundRequest trongbookingmock: đóng/mởlại tiếp tục cancelling/refunding, không gửi mới; confirmedBE/provider cậpnhật stage.19testsbooking/cancellationPASS gồm resumeamount và không đổi cancelledSeats trướcBEconfirmed. Mởyêucầu sauhoàn tấtxong được hủyghếcònlại. Vẫn memoryonly nhưkhovéhiệntại.

Copy override: giao diện khách dùng VNPay đang xử lý / VNPay xử lý; không hiển thị thuật ngữ BE xác nhận. Logic hai event nội bộ giữ nguyên.
