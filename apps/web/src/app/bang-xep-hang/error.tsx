'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-bold text-red-600">Có lỗi xảy ra ở trang bảng xếp hạng</h2>
      <p className="mt-2 text-gray-700">{error.message}</p>
      <button className="mt-4 px-4 py-2 rounded bg-blue-600 text-white" onClick={() => reset()}>
        Thử lại
      </button>
    </div>
  );
}