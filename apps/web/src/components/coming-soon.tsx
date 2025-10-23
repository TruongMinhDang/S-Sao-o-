
// apps/web/src/components/coming-soon.tsx
import Image from 'next/image';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export function ComingSoon({ 
  title = "Tính năng đang được xây dựng", 
  description = "Chúng tôi đang nỗ lực để sớm ra mắt tính năng này. Vui lòng quay lại sau!"
}: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10">
      <Image 
        src="https://firebasestorage.googleapis.com/v0/b/app-quan-ly-hs.firebasestorage.app/o/Icon%2Ficon%20coming%20soon.gif?alt=media&token=e686eb41-e18c-4953-9f59-053f5c5d1e3d" 
        alt={title} 
        width={300} 
        height={300} 
        unoptimized // Cần thiết cho ảnh GIF động từ nguồn bên ngoài
        className="mx-auto"
      />
      <h1 className="mt-8 text-3xl font-bold tracking-tight bg-gradient-to-r from-[#ff7a18] to-[#af002d] bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="mt-2 text-lg text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
