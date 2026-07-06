"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, MessageSquare, FileText, CreditCard, TrendingUp, Activity, BarChart3 } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyticsService } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

// Mock data for charts
const revenueData = [
  { month: "Jan", revenue: 12000 }, { month: "Feb", revenue: 15000 },
  { month: "Mar", revenue: 18000 }, { month: "Apr", revenue: 22000 },
  { month: "May", revenue: 28000 }, { month: "Jun", revenue: 35000 },
];

const usageData = [
  { day: "Mon", queries: 450 }, { day: "Tue", queries: 620 },
  { day: "Wed", queries: 580 }, { day: "Thu", queries: 710 },
  { day: "Fri", queries: 490 }, { day: "Sat", queries: 320 },
  { day: "Sun", queries: 280 },
];

export default function SuperAdminDashboard() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["super-admin-overview"],
    queryFn: analyticsService.getSuperAdminOverview,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-100">Platform Overview</h1>
        <p className="text-slate-400 mt-1">Monitor your entire EduAI platform</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clients"
          value={overview?.total_tenants || 0}
          change="+12% from last month"
          changeType="positive"
          icon={Building2}
          iconColor="from-purple-500 to-indigo-500"
          delay={0}
        />
        <StatCard
          title="Active Clients"
          value={overview?.active_tenants || 0}
          change="+8% from last month"
          changeType="positive"
          icon={Activity}
          iconColor="from-green-500 to-emerald-500"
          delay={0.1}
        />
        <StatCard
          title="Total Users"
          value={overview?.total_users || 0}
          change="+24% from last month"
          changeType="positive"
          icon={Users}
          iconColor="from-blue-500 to-cyan-500"
          delay={0.2}
        />
        <StatCard
          title="Total Messages"
          value={overview?.total_messages || 0}
          change="+45% from last month"
          changeType="positive"
          icon={MessageSquare}
          iconColor="from-orange-500 to-red-500"
          delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-400" />
                Revenue Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30,41,59,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      color: "#F1F5F9",
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-400" />
                Daily AI Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(30,41,59,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      color: "#F1F5F9",
                    }}
                  />
                  <Bar dataKey="queries" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { text: "New client 'ABC School' registered", time: "5 min ago", icon: Building2, color: "text-blue-500" },
                { text: "Payment received from 'XYZ College'", time: "1 hour ago", icon: CreditCard, color: "text-green-500" },
                { text: "15 new documents uploaded by 'DEF University'", time: "2 hours ago", icon: FileText, color: "text-purple-500" },
                { text: "3 new support tickets created", time: "3 hours ago", icon: MessageSquare, color: "text-orange-500" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <div className={`p-2 rounded-xl bg-white/[0.05] ${activity.color}`}>
                    <activity.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{activity.text}</p>
                    <p className="text-xs text-slate-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
