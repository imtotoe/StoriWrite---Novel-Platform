"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookText, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const writerNav = [
  { href: "/writer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/writer/novels", label: "นิยายของฉัน", icon: BookText },
  { href: "/writer/novel/new", label: "สร้างนิยายใหม่", icon: PlusCircle },
];

export function WriterSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r md:block">
      <nav className="sticky top-14 space-y-1 p-4">
        <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Writer
        </h2>
        {writerNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/writer/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
