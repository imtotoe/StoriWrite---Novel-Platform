import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <BookOpen className="h-5 w-5" />
              NovelSpace
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              แพลตฟอร์มอ่านและเขียนนิยายออนไลน์
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">สำรวจ</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/explore" className="hover:text-foreground">นิยายทั้งหมด</Link></li>
              <li><Link href="/explore?sort=popular" className="hover:text-foreground">ยอดนิยม</Link></li>
              <li><Link href="/explore?sort=latest" className="hover:text-foreground">อัพเดตล่าสุด</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">นักเขียน</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/register" className="hover:text-foreground">เริ่มเขียน</Link></li>
              <li><Link href="/writer/dashboard" className="hover:text-foreground">Writer Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">เกี่ยวกับ</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground">เงื่อนไขการใช้งาน</Link></li>
              <li><Link href="#" className="hover:text-foreground">นโยบายความเป็นส่วนตัว</Link></li>
              <li><Link href="#" className="hover:text-foreground">ติดต่อเรา</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} NovelSpace. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
