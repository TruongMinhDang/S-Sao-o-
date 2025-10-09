
const admin = require('firebase-admin');

try {
  admin.initializeApp({
    projectId: 'app-quan-ly-hs'
  });
} catch (e) {
    // App already initialized, which is fine.
}

const db = admin.firestore();

const TERM_START = new Date(2025, 8, 8); 
const MS_DAY = 86400000;

const mid = (d) => {
    const jsDate = d.toDate ? d.toDate() : new Date(d);
    jsDate.setHours(0, 0, 0, 0);
    return jsDate;
};

const getWeekFromDate = (recordDate) => {
    if (!recordDate) return null;
    try {
        const diff = Math.floor((mid(recordDate).getTime() - mid(TERM_START).getTime()) / MS_DAY);
        const weekNumber = Math.floor(diff / 7) + 1;
        return weekNumber;
    } catch (e) {
        return null;
    }
};

async function dryRun() {
    console.log("=========================================");
    console.log("--- BẮT ĐẦU CHẠY THỬ (DRY RUN) ---");
    console.log("--- Sẽ chỉ đọc dữ liệu, không ghi bất cứ thứ gì. ---");
    console.log("=========================================");

    const recordsRef = db.collection('records');
    const snapshot = await recordsRef.get();

    if (snapshot.empty) {
        console.log("Không tìm thấy vi phạm nào trong collection 'records'.");
        return;
    }

    let recordsToUpdate = 0;
    let recordsScanned = 0;
    const updates = [];

    snapshot.forEach(doc => {
        recordsScanned++;
        const data = doc.data();

        if (data.week === undefined || data.week === null) {
            const calculatedWeek = getWeekFromDate(data.recordDate);
            if (calculatedWeek !== null && calculatedWeek >= 1 && calculatedWeek <= 35) {
                recordsToUpdate++;
                updates.push(`- Document ID: ${doc.id} | Ngày vi phạm: ${data.recordDate.toDate().toLocaleDateString('vi-VN')} | Tuần tính được: ${calculatedWeek}`);
            } else {
                 updates.push(`- [BỎ QUA] Document ID: ${doc.id} | Không thể tính tuần.`);
            }
        }
    });
    
    if (updates.length > 0) {
        console.log("Đã tìm thấy các mục sau đây cần được cập nhật:");
        console.log(""); // Adding a blank line
        updates.forEach(line => console.log(line));
    }

    console.log(""); // Adding a blank line
    console.log("=========================================");
    console.log("--- CHẠY THỬ KẾT THÚC ---");
    console.log(`- Tổng cộng đã quét: ${recordsScanned} mục.`);
    console.log(`- Số mục cần cập nhật (bị thiếu 'week'): ${recordsToUpdate} mục.`);
    console.log("=========================================");
    console.log(""); // Adding a blank line

    if (recordsToUpdate === 0) {
        console.log(">>> Tất cả các mục đều đã có thông tin tuần. Không cần cập nhật.");
    } else {
        console.log(">>> Vui lòng xem lại danh sách trên. Nếu bạn đồng ý, tôi sẽ tiến hành chạy thật để cập nhật các mục này.");
    }
}

dryRun().catch(error => {
    console.error("Đã xảy ra lỗi trong quá trình chạy thử:", error);
    console.error("Lỗi này có thể do bạn đang chạy script ở môi trường cục bộ mà chưa thiết lập file credentials. Hãy đảm bảo biến môi trường GOOGLE_APPLICATION_CREDENTIALS đã được trỏ đến file serviceAccountKey.json của bạn.");
});
