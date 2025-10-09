
const admin = require('firebase-admin');

try {
  admin.initializeApp({
    projectId: 'app-quan-ly-hs'
  });
} catch (e) {
    // App already initialized, which is fine.
}

const db = admin.firestore();

// Logic tính tuần, lấy từ frontend và điều chỉnh năm cứng thành 2025
// Tháng trong JS Date là 0-indexed, nên 8 tương ứng với tháng 9
const TERM_START = new Date(2025, 8, 8); 
const MS_DAY = 86400000; // 24 * 60 * 60 * 1000

const mid = (d) => {
    // Firestore Timestamp cần được chuyển đổi sang JS Date
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

async function realRun() {
    console.log("=========================================");
    console.log("--- BẮT ĐẦU CẬP NHẬT DỮ LIỆU (REAL RUN) ---");
    console.log("--- Dữ liệu sẽ được ghi vào Firestore. --- ");
    console.log("=========================================");

    const recordsRef = db.collection('records');
    const snapshot = await recordsRef.get();

    if (snapshot.empty) {
        console.log("Không tìm thấy vi phạm nào trong collection 'records'.");
        return;
    }

    const batch = db.batch();
    let recordsToUpdateCount = 0;
    let recordsScannedCount = 0;

    snapshot.forEach(doc => {
        recordsScannedCount++;
        const data = doc.data();

        // Chỉ xử lý những doc thiếu trường 'week'
        if (data.week === undefined || data.week === null) {
            const calculatedWeek = getWeekFromDate(data.recordDate);
            if (calculatedWeek !== null && calculatedWeek >= 1 && calculatedWeek <= 35) {
                recordsToUpdateCount++;
                batch.update(doc.ref, { week: calculatedWeek });
                console.log(`- Chuẩn bị cập nhật Doc ID: ${doc.id} với week = ${calculatedWeek}`);
            }
        }
    });

    if (recordsToUpdateCount === 0) {
        console.log("\n>>> Không có mục nào cần cập nhật. Mọi thứ đều đã ổn.");
        console.log("=========================================");
        return;
    }

    console.log(`\n>>> Chuẩn bị ghi ${recordsToUpdateCount} mục vào cơ sở dữ liệu...`);

    try {
        await batch.commit();
        console.log("\n>>> THÀNH CÔNG! Đã cập nhật thành công tất cả các mục.");
    } catch (error) {
        console.error("\n>>> LỖI KHI GHI DỮ LIỆU:", error);
        console.log(">>> Có lỗi xảy ra trong quá trình cập nhật. Một vài hoặc tất cả dữ liệu có thể chưa được ghi.");
    }

    console.log("\n=========================================");
    console.log("--- CẬP NHẬT DỮ LIỆU KẾT THÚC ---");
    console.log(`- Tổng cộng đã quét: ${recordsScannedCount} mục.`);
    console.log(`- Đã cập nhật: ${recordsToUpdateCount} mục.`);
    console.log("=========================================");
}

realRun().catch(error => {
    console.error("Đã xảy ra lỗi nghiêm trọng trong quá trình chạy:", error);
});
