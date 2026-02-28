"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  Menu,
  Search,
  PenTool,
  LogOut,
  User,
  Settings,
  Library,
  LayoutDashboard,
  Shield,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/community/NotificationBell";
import { CoinBalance } from "@/components/coin/CoinBalance";

const publicNav = [
  { href: "/", label: "หน้าแรก" },
  { href: "/explore", label: "สำรวจ" },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { theme, setTheme } = useTheme();
  const user = session?.user;
  const isWriter = user?.role === "WRITER" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        {/* Mobile menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetTitle className="sr-only">เมนู</SheetTitle>
            <nav className="mt-6 flex flex-col gap-2">
              {publicNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    pathname === item.href && "bg-accent"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link
                    href="/library"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    ชั้นหนังสือ
                  </Link>
                  {isWriter && (
                    <Link
                      href="/writer/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      เขียนนิยาย
                    </Link>
                  )}
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold">
          <BookOpen className="h-5 w-5" />
          <span className="hidden sm:inline">StoriWrite</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="ml-auto flex max-w-sm flex-1 items-center">
          <form action="/search" className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              placeholder="ค้นหานิยาย..."
              className="h-9 pl-8"
            />
          </form>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isWriter && (
                <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                  <Link href="/writer/dashboard">
                    <PenTool className="mr-1.5 h-4 w-4" />
                    เขียน
                  </Link>
                </Button>
              )}

              <CoinBalance />

              <Button variant="ghost" size="icon" onClick={cycleTheme} className="h-8 w-8">
                {theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : theme === "light" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
              </Button>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.image ?? undefined} />
                      <AvatarFallback>
                        {(user.name ?? user.username ?? "U")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name ?? user.username}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/author/${user.username}`}>
                      <User className="mr-2 h-4 w-4" />
                      โปรไฟล์
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/library">
                      <Library className="mr-2 h-4 w-4" />
                      ชั้นหนังสือ
                    </Link>
                  </DropdownMenuItem>
                  {isWriter && (
                    <DropdownMenuItem asChild>
                      <Link href="/writer/dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        แดชบอร์ดนักเขียน
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard">
                        <Shield className="mr-2 h-4 w-4" />
                        จัดการระบบ
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings/profile">
                      <Settings className="mr-2 h-4 w-4" />
                      ตั้งค่า
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">เข้าสู่ระบบ</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">สมัครสมาชิก</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
