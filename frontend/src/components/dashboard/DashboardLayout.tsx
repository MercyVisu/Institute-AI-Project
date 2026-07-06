"use client";

import React from "react";
import { useSidebarStore } from "@/store";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebarStore();

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Sidebar />
      <div className={cn("transition-all duration-300", isCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]")}>
        <TopNavbar />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
