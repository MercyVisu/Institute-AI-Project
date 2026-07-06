"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
