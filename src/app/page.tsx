import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      <header className="px-6 py-4 border-b border-stone-200 bg-white flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <h1 className="text-xl font-bold font-serif text-stone-800">
          Cội Nguồn (Gia Phả)
        </h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-sm border-stone-300">
            Cài đặt PWA
          </Button>
          <Button className="bg-[#4285F4] hover:bg-[#3367D6] text-white">
            Đăng nhập Google
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col sm:flex-row">
        {/* Canvas vẽ cây d3-flextree */}
        <section className="flex-1 p-6 flex flex-col items-center justify-center bg-stone-100/50 relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots pattern-stone-300 pattern-bg-transparent pattern-size-4 opacity-50"></div>
          <div className="z-10 text-center">
            <h2 className="text-2xl font-serif text-stone-400 mb-4">
              Chưa có dữ liệu Cây Gia Phả
            </h2>
            <p className="text-stone-500 max-w-sm mb-6">
              Vui lòng đăng nhập Google Drive để tải/tạo Cây Gia Phả. Mọi dữ
              liệu được lưu cục bộ và đồng bộ riêng tư vào Drive của bạn.
            </p>
          </div>
        </section>

        {/* Panel Chi tiết Form (Progressive Disclosure) */}
        <aside className="w-full sm:w-80 lg:w-96 bg-white border-l border-stone-200 p-6 shadow-xl z-20 transition-transform">
          <h3 className="font-semibold text-lg border-b pb-3 mb-4">
            Thêm thành viên
          </h3>
          <p className="text-sm text-stone-500 italic">
            Form Quick Add sẽ ở đây...
          </p>
        </aside>
      </main>
    </div>
  );
}
