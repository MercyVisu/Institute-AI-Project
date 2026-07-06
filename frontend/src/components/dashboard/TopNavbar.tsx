"use client";

import React from "react";
import { useAuthStore, useSidebarStore } from "@/store";
import { getInitials } from "@/lib/utils";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TopNavbar() {
  const { user } = useAuthStore();
  const { setMobileOpen } = useSidebarStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#0F172A]/70 backdrop-blur-xl px-4 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl hover:bg-white/5 text-slate-400"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden md:flex relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9 h-9"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative rounded-xl text-slate-400 hover:text-slate-100">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-violet-500 border-2 border-[#0F172A]" />
        </Button>

        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-100">{user?.full_name}</p>
            <p className="text-xs text-slate-400">{user?.role?.replace("_", " ")}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white text-sm font-semibold neon-glow-sm">
            {user ? getInitials(user.full_name) : "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
