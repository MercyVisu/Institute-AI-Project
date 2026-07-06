"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, FileText, Users, Ticket, UserPlus, Clock, Brain, TrendingUp } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyticsService } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ClientDashboard() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: analyticsService.getSummary,
  });

  const { data: dailyConversations } = useQuery({
    queryKey: ["daily-conversations"],
    queryFn: () => analyticsService.getDailyConversations(30),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-32 rounded-2xl" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your AI chatbot performance</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Conversations" value={summary?.total_conversations || 0} icon={MessageSquare} iconColor="from-purple-500 to-indigo-500" delay={0} />
        <StatCard title="Documents Trained" value={summary?.total_documents || 0} icon={FileText} iconColor="from-blue-500 to-cyan-500" delay={0.1} />
        <StatCard title="Open Tickets" value={summary?.total_tickets || 0} icon={Ticket} iconColor="from-orange-500 to-red-500" delay={0.2} />
        <StatCard title="Leads Captured" value={summary?.total_leads || 0} icon={UserPlus} iconColor="from-green-500 to-emerald-500" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-violet-400" />Conversation Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyConversations || []}>
                  <defs>
                    <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(30,41,59,0.95)", color: "#F1F5F9", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }} />
                  <Area type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} fill="url(#colorConversations)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-violet-400" />AI Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Avg Response Time</span><span className="font-semibold">{summary?.avg_response_time || 0}s</span></div>
                <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full gradient-primary rounded-full" style={{ width: `${Math.min((summary?.avg_response_time || 0) * 20, 100)}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Total Messages</span><span className="font-semibold">{summary?.total_messages || 0}</span></div>
                <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" style={{ width: "65%" }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-400">Documents Processed</span><span className="font-semibold">{summary?.total_documents || 0}</span></div>
                <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: "80%" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
