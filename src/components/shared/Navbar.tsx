"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Brain,
  LayoutDashboard,
  LogOut,
  MessageSquare,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      href: "/setup",
      label: "Interview",
      icon: <Brain className="w-4 h-4" />,
    },
    {
      href: "/english/setup",
      label: "English Practice",
      icon: <MessageSquare className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">IntelliView</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={pathname.startsWith(link.href) ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
              >
                {link.icon}
                {link.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* User + Sign Out */}
        <div className="flex items-center gap-3">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt={session.user.name ?? "User"}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-muted-foreground hidden md:block">
            {session?.user?.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:block">Sign Out</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}