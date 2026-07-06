"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSidebarStore, useAuthStore } from "@/store";
import {
  LayoutDashboard, Users, Building2, CreditCard, BarChart3, Settings, FileText,
  MessageSquare, Ticket, UserPlus, Brain, Palette, ChevronLeft, GraduationCap,
  LogOut, Menu, X
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const superAdminNav: NavItem[] = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/super-admin/clients", icon: Building2 },
  { label: "Users", href: "/super-admin/users", icon: Users },
  { label: "Subscriptions", href: "/super-admin/subscriptions", icon: CreditCard },
  { label: "Payments", href: "/super-admin/payments", icon: CreditCard },
  { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/super-admin/settings", icon: Settings },
];

const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { label: "Training", href: "/client/training", icon: Brain },
  { label: "Chatbot", href: "/client/chatbot", icon: MessageSquare },
  { label: "Tickets", href: "/client/tickets", icon: Ticket },
  { label: "Leads", href: "/client/leads", icon: UserPlus },
  { label: "Analytics", href: "/client/analytics", icon: BarChart3 },
  { label: "Settings", href: "/client/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, toggle, setMobileOpen } = useSidebarStore();
  const { user, logout } = useAuthStore();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const navItems = isSuperAdmin ? superAdminNav : clientNav;

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/[0.08] bg-[#111827]/95 backdrop-blur-xl transition-all duration-300",
          isCollapsed ? "w-[72px]" : "w-[260px]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/[0.08]">
          <Link href={isSuperAdmin ? "/super-admin/dashboard" : "/client/dashboard"} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary neon-glow-sm">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xl font-bold gradient-text"
              >
                EduAI
              </motion.span>
            )}
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-white/5 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "sidebar-link group",
                  isActive ? "sidebar-link-active" : "sidebar-link-inactive"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-violet-400/70 group-hover:text-violet-400")} />
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/[0.08] p-3 space-y-2">
          <button
            onClick={toggle}
            className="hidden lg:flex sidebar-link sidebar-link-inactive w-full"
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform text-slate-400", isCollapsed && "rotate-180")} />
            {!isCollapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
