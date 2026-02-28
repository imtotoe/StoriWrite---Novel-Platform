"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Users,
  BookOpen,
  Flag,
  Tags,
  Coins,
  Bell,
  Settings,
  Shield,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";

const adminNav = [
  { href: "/admin/dashboard", label: "ภาพรวม", icon: BarChart3 },
  { href: "/admin/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/admin/novels", label: "นิยาย", icon: BookOpen },
  { href: "/admin/reports", label: "รายงาน", icon: Flag },
  { href: "/admin/genres", label: "แนวนิยาย", icon: Tags },
  { href: "/admin/finance", label: "การเงิน", icon: Coins },
  { href: "/admin/notifications", label: "แจ้งเตือน", icon: Bell },
  { href: "/admin/settings", label: "ตั้งค่าระบบ", icon: Settings },
  { href: "/admin/security", label: "ความปลอดภัย", icon: Shield },
];

function SidebarNav({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        จัดการระบบ
      </p>
      {adminNav.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-7xl">
      {/* Mobile sidebar toggle */}
      <div className="fixed bottom-4 right-4 z-40 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetTitle className="sr-only">เมนูจัดการ</SheetTitle>
            <div className="mt-4">
              <SidebarNav onItemClick={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-52 shrink-0 border-r md:block">
        <div className="sticky top-14 p-4">
          <SidebarNav />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 p-4 md:p-6">{children}</div>
    </div>
  );
}
