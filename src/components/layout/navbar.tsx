"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Trophy,
  LayoutDashboard,
  Calendar,
  User,
  LogOut,
  PlusCircle,
  Menu,
  X,
  Sparkles,
  Archive,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = session?.user;
  const isAdmin = user && ["SUPER_ADMIN", "CAMPUS_ADMIN", "ORGANIZER"].includes(user.role);

  const navLinks = [
    { href: "/hackathons", label: "Hackathons", icon: Calendar },
    { href: "/archive", label: "Project Archive", icon: Archive },
    ...(user
      ? [
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/profile", label: "My Profile", icon: User },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Campus Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  JECRC Hackathons
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Multi-Campus
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                JECRC University & JECRC Foundation
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/hackathons/create"
                className="flex items-center gap-1.5 ml-2 px-3.5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-500 transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="w-4 h-4" />
                Create Hackathon
              </Link>
            )}
          </div>

          {/* User Section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-200 leading-none">
                    {user.name}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wider border border-slate-700">
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-700 flex items-center justify-center font-bold text-sm text-white shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-900 px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Icon className="w-5 h-5 text-indigo-400" />
                {link.label}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/hackathons/create"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium text-indigo-300 bg-indigo-600/20 border border-indigo-500/30"
            >
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              Create Hackathon
            </Link>
          )}

          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="px-3 py-1.5 rounded-lg text-sm bg-rose-500/20 text-rose-300 border border-rose-500/30"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
