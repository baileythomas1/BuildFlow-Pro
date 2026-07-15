"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/files", label: "Files" },
  { href: "/portal/invoices", label: "Invoices" },
  { href: "/portal/messages", label: "Updates" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate/10 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 border-t-2 py-3 text-xs font-medium ${
                active ? "border-orange text-orange" : "border-transparent text-slate/50"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
