"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncRules = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
exports.syncRules = (0, https_1.onRequest)(async (request, response) => {
    try {
        const rulesCollection = db.collection('rules');
        // Step 1: Delete all existing documents in the "rules" collection
        const existingRulesSnapshot = await rulesCollection.get();
        if (!existingRulesSnapshot.empty) {
            const deleteBatch = db.batch();
            existingRulesSnapshot.docs.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });
            await deleteBatch.commit();
        }
        // Step 2: Add the new, correct rules
        const addBatch = db.batch();
        const correctRules = [
            { "code": "KT001", "category": "Nề nếp", "description": "Hoàn thành tốt nhiệm vụ sao đỏ", "points": 5, "type": "merit" },
            { "code": "KT002", "category": "Nề nếp", "description": "Hoàn thành công tác được phân công", "points": 5, "type": "merit" },
            { "code": "KT003", "category": "Đạo đức", "description": "Nhặt được của rơi trả lại người mất", "points": 10, "type": "merit" },
            { "code": "KT004", "category": "Hoạt động", "description": "Mua báo Đội", "points": 5, "type": "merit" },
            { "code": "KT005", "category": "Hoạt động", "description": "Làm bài Xoắn não", "points": 5, "type": "merit" },
            { "code": "KT006", "category": "Hoạt động", "description": "Làm bài Lê Quý Đôn", "points": 10, "type": "merit" },
            { "code": "KT007", "category": "Hoạt động", "description": "Tham gia sinh hoạt CLB", "points": 10, "type": "merit" },
            { "code": "VP001", "category": "Nề nếp", "description": "Đi trễ", "points": -5, "type": "demerit" },
            { "code": "VP002", "category": "Nề nếp", "description": "Đi trễ không trình diện giám thị", "points": -5, "type": "demerit" },
            { "code": "VP003", "category": "Nề nếp", "description": "Điểm danh trễ (lớp trưởng)", "points": -5, "type": "demerit" },
            { "code": "VP004", "category": "Chuyên cần", "description": "Nghỉ học không phép (1 buổi)", "points": -15, "type": "demerit" },
            { "code": "VP005", "category": "Chuyên cần", "description": "Trốn tiết", "points": -10, "type": "demerit" },
            { "code": "VP006", "category": "Chuyên cần", "description": "Nghỉ có phép nhưng quá 3 ngày không giấy HT", "points": -5, "type": "demerit" },
            { "code": "VP007", "category": "Hoạt động", "description": "Không tham dự lễ chào cờ, sinh hoạt tập thể", "points": -10, "type": "demerit" },
            { "code": "VP008", "category": "An ninh", "description": "Tự ý rời trường trong giờ học", "points": -15, "type": "demerit" },
            { "code": "VP009", "category": "Học tập", "description": "Không thuộc bài/không làm bài tập", "points": -5, "type": "demerit" },
            { "code": "VP010", "category": "Học tập", "description": "Không có chữ ký phụ huynh trong sổ báo bài", "points": -5, "type": "demerit" },
            { "code": "VP011", "category": "Học tập", "description": "Không mang tập vở, SGK, dụng cụ", "points": -5, "type": "demerit" },
            { "code": "VP012", "category": "Kỷ luật", "description": "Ngồi sai sơ đồ, không tập trung", "points": -5, "type": "demerit" },
            { "code": "VP013", "category": "Kỷ luật", "description": "Không chép bài/ăn uống trong lớp", "points": -5, "type": "demerit" },
            { "code": "VP014", "category": "Kỷ luật", "description": "Sử dụng bút xóa sai quy định", "points": -5, "type": "demerit" },
            { "code": "VP015", "category": "Kỷ luật", "description": "Mất trật tự trong giờ học", "points": -10, "type": "demerit" },
            { "code": "VP016", "category": "Học tập", "description": "Bỏ kiểm tra thường xuyên/định kỳ không lý do", "points": -15, "type": "demerit" },
            { "code": "VP017", "category": "Học tập", "description": "Gian lận trong kiểm tra/thi", "points": -20, "type": "demerit" },
            { "code": "VP018", "category": "Đạo đức", "description": "Bao che, tiếp tay gian lận", "points": -20, "type": "demerit" },
            { "code": "VP019", "category": "Đạo đức", "description": "Giả mạo chữ ký, sửa điểm, tráo bài", "points": -20, "type": "demerit" },
            { "code": "VP020", "category": "Nề nếp", "description": "Đồng phục sai quy định (khung)", "points": -5, "type": "demerit" },
            { "code": "VP021", "category": "Nề nếp", "description": "Không phù hiệu, khăn quàng, huy hiệu", "points": -5, "type": "demerit" },
            { "code": "VP022", "category": "Nề nếp", "description": "Không thắt lưng (nam), áo bỏ ngoài quần", "points": -5, "type": "demerit" },
            { "code": "VP023", "category": "Nề nếp", "description": "Váy nữ không đúng quy định", "points": -5, "type": "demerit" },
            { "code": "VP024", "category": "Nề nếp", "description": "Giày dép sai (dép lê, guốc, giày bánh xe)", "points": -5, "type": "demerit" },
            { "code": "VP025", "category": "Nề nếp", "description": "Mặc đồng phục thể dục trong tiết văn hóa", "points": -5, "type": "demerit" },
            { "code": "VP026", "category": "Nề nếp", "description": "Đầu tóc nhuộm, bôi keo, không gọn gàng", "points": -5, "type": "demerit" },
            { "code": "VP027", "category": "Nề nếp", "description": "Trang điểm, son môi, sơn móng tay", "points": -5, "type": "demerit" },
            { "code": "VP028", "category": "Nề nếp", "description": "Nam đeo khuyên tai; nữ đeo quá 2 khuyên/1 tai", "points": -5, "type": "demerit" },
            { "code": "VP029", "category": "Nề nếp", "description": "Balô/cặp sai quy định", "points": -5, "type": "demerit" },
            { "code": "VP030", "category": "Nề nếp", "description": "Đeo phụ kiện phản cảm", "points": -5, "type": "demerit" },
            { "code": "VP031", "category": "Kỷ luật", "description": "Đội mũ/nón, trùm hood trong lớp", "points": -5, "type": "demerit" },
            { "code": "VP032", "category": "Nề nếp", "description": "Mang áo khoác/áo mưa không gọn", "points": -5, "type": "demerit" },
            { "code": "VP033", "category": "Đạo đức", "description": "Thiếu lễ phép (không chào, cãi lời…)", "points": -5, "type": "demerit" },
            { "code": "VP034", "category": "Nề nếp", "description": "Đeo khẩu trang che kín mặt không đúng", "points": -5, "type": "demerit" },
            { "code": "VP035", "category": "Kỷ luật", "description": "Đeo tai nghe trong khuôn viên", "points": -10, "type": "demerit" },
            { "code": "VP036", "category": "Kỷ luật", "description": "Dùng đồng hồ thông minh bật thông báo", "points": -5, "type": "demerit" },
            { "code": "VP037", "category": "Kỷ luật", "description": "Dùng thiết bị để gian lận", "points": -20, "type": "demerit" },
            { "code": "VP038", "category": "Đạo đức", "description": "Nói tục, chửi thề", "points": -10, "type": "demerit" },
            { "code": "VP039", "category": "Đạo đức", "description": "Thiếu lễ phép (thầy cô, bạn, khách)", "points": -5, "type": "demerit" },
            { "code": "VP040", "category": "Hoạt động", "description": "Không tham gia hoạt động tập thể", "points": -10, "type": "demerit" },
            { "code": "VP041", "category": "Nề nếp", "description": "Không xếp hàng, chen lấn, leo lan can", "points": -5, "type": "demerit" },
            { "code": "VP042", "category": "Nề nếp", "description": "La cà dọc đường, ăn quà trước cổng", "points": -5, "type": "demerit" },
            { "code": "VP043", "category": "Đạo đức", "description": "Vay mượn tiền, đồ cá nhân", "points": -5, "type": "demerit" },
            { "code": "VP044", "category": "Đạo đức", "description": "Xúc phạm nhân phẩm bạn", "points": -10, "type": "demerit" },
            { "code": "VP045", "category": "An ninh mạng", "description": "Đăng tải nội dung không phù hợp", "points": -10, "type": "demerit" },
            { "code": "VP046", "category": "An ninh", "description": "Tụ tập cản trở giao thông", "points": -15, "type": "demerit" },
            { "code": "VP047", "category": "An ninh", "description": "Chọc ghẹo, xúi giục đánh nhau", "points": -15, "type": "demerit" },
            { "code": "VP048", "category": "An ninh mạng", "description": "Tung tin giả, chia rẽ trên MXH", "points": -15, "type": "demerit" },
            { "code": "VP049", "category": "An ninh", "description": "Đánh nhau, gây thương tích", "points": -20, "type": "demerit" },
            { "code": "VP050", "category": "An ninh", "description": "Trấn lột, chiếm đoạt tài sản", "points": -20, "type": "demerit" },
            { "code": "VP051", "category": "An ninh", "description": "Tham gia băng nhóm gây rối", "points": -20, "type": "demerit" },
            { "code": "VP052", "category": "Đạo đức", "description": "Văn hóa phẩm đồi trụy, độc hại", "points": -20, "type": "demerit" },
            { "code": "VP053", "category": "Kỷ luật", "description": "Hút thuốc lá, thuốc lá điện tử", "points": -20, "type": "demerit" },
            { "code": "VP054", "category": "Kỷ luật", "description": "Uống rượu bia, chất kích thích, ma túy", "points": -20, "type": "demerit" },
            { "code": "VP055", "category": "Tệ nạn xã hội", "description": "Đánh bài, cá độ nhỏ lẻ", "points": -15, "type": "demerit" },
            { "code": "VP056", "category": "Tệ nạn xã hội", "description": "Tổ chức bài bạc, cá độ ăn tiền", "points": -20, "type": "demerit" },
            { "code": "VP057", "category": "Vệ sinh", "description": "Không trực nhật đúng khu vực", "points": -5, "type": "demerit" },
            { "code": "VP058", "category": "Vệ sinh", "description": "Không bỏ rác đúng nơi", "points": -5, "type": "demerit" },
            { "code": "VP059", "category": "Vệ sinh", "description": "Không dội nước sau vệ sinh", "points": -5, "type": "demerit" },
            { "code": "VP060", "category": "Tài sản", "description": "Quên tắt điện, khóa cửa", "points": -5, "type": "demerit" },
            { "code": "VP061", "category": "Tài sản", "description": "Ngồi, bước lên bàn ghế, chạy nhảy bồn cây", "points": -5, "type": "demerit" },
            { "code": "VP062", "category": "Tài sản", "description": "Viết, vẽ bậy lên bàn ghế, tường", "points": -10, "type": "demerit" },
            { "code": "VP063", "category": "Tài sản", "description": "Nghịch phá rèm, quạt, loa, kính", "points": -10, "type": "demerit" },
            { "code": "VP064", "category": "Tài sản", "description": "Bẻ cây, hái hoa", "points": -10, "type": "demerit" },
            { "code": "VP065", "category": "Tài sản", "description": "Không báo cáo sự cố", "points": -10, "type": "demerit" },
            { "code": "VP066", "category": "Tài sản", "description": "Xịt nước, bóng nước, ném bột trong lớp/vệ sinh", "points": -10, "type": "demerit" },
            { "code": "VP067", "category": "An ninh", "description": "Tạt nước, ném bột vào bạn/giáo viên", "points": -15, "type": "demerit" },
            { "code": "VP068", "category": "An toàn", "description": "Sạc pin xe điện, thiết bị công suất lớn", "points": -15, "type": "demerit" },
            { "code": "VP069", "category": "An toàn", "description": "Nghịch phá hệ thống PCCC", "points": -15, "type": "demerit" },
            { "code": "VP070", "category": "An toàn", "description": "Đùa nghịch gây hư hại lớn", "points": -15, "type": "demerit" },
            { "code": "VP071", "category": "Tài sản", "description": "Cố tình phá hoại tài sản", "points": -20, "type": "demerit" },
            { "code": "VP072", "category": "An toàn", "description": "Phun bình chữa cháy trái phép", "points": -20, "type": "demerit" },
            { "code": "VP073", "category": "An toàn", "description": "Gây cháy nổ, hỏng hóc nặng", "points": -20, "type": "demerit" },
            { "code": "VP074", "category": "Tài sản", "description": "Lợi dụng bóng nước, bột để phá hoại", "points": -20, "type": "demerit" },
            { "code": "VP075", "category": "An toàn giao thông", "description": "Điều khiển xe đạp, xe đạp điện trong trường", "points": -15, "type": "demerit" },
            { "code": "VP076", "category": "An toàn giao thông", "description": "Không đội mũ bảo hiểm (xe đạp điện, ngồi sau xe)", "points": -10, "type": "demerit" },
            { "code": "VP077", "category": "An toàn giao thông", "description": "Điều khiển xe máy chưa đủ tuổi", "points": -20, "type": "demerit" },
            { "code": "VP078", "category": "Tài sản", "description": "Tổ trực không tắt đèn, quạt trước khi ra về, trong giờ ra chơi", "points": -10, "type": "demerit" },
            { "code": "VP079", "category": "Nề nếp", "description": "Tổ trực không trực lớp", "points": -10, "type": "demerit" },
            { "code": "VP080", "category": "Tài sản", "description": "Tổ trực không khóa cửa lớp giờ ra chơi; ra về (buổi chiều)", "points": -10, "type": "demerit" },
            { "code": "VP081", "category": "Nề nếp", "description": "Lớp không tập trung theo hiệu lệnh", "points": -20, "type": "demerit" },
            { "code": "VP082", "category": "Nề nếp", "description": "Di chuyển không đúng mục đích, lang thang trong trường, la cà trong giờ học/giờ ra chơi mà không thực hiện nhiệm vụ", "points": -5, "type": "demerit" },
            { "code": "VP083", "category": "Kỷ luật/An ninh", "description": "Đánh nhau/xô xát mức nhẹ, đùa nghịch quá trớn gây va chạm nhưng chưa gây thương tích", "points": -10, "type": "demerit" }
        ];
        correctRules.forEach(rule => {
            // Use the 'code' as the document ID
            const docRef = rulesCollection.doc(rule.code);
            addBatch.set(docRef, rule);
        });
        await addBatch.commit();
        response.status(200).send('Rules have been successfully reset and synced with the correct data structure.');
    }
    catch (error) {
        console.error('Error syncing rules:', error);
        response.status(500).send('Error syncing rules.');
    }
});
//# sourceMappingURL=index.js.map