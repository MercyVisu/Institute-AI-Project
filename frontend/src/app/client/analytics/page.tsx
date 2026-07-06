"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, MessageSquare, Users, Brain, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyticsService } from "@/services/api";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

export default function ClientAnalyticsPage() {
  const [period, setPeriod] = useState("30");

  const { data: summary } = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: analyticsService.getSummary,
  });

  const { data: dailyConversations } = useQuery({
    queryKey: ["daily-conversations", period],
    queryFn: () => analyticsService.getDailyConversations(Number(period)),
  });

  const { data: dailyMessages } = useQuery({
    queryKey: ["daily-messages", period],
    queryFn: () => analyticsService.getDailyMessages(Number(period)),
  });

  const stats = [
    { title: "Total Conversations", value: summary?.total_conversations || 0, icon: MessageSquare, color: "from-purple-500 to-indigo-500" },
    { title: "Total Messages", value: summary?.total_messages || 0, icon: BarChart3, color: "from-blue-500 to-cyan-500" },
    { title: "Avg Response Time", value: `${summary?.avg_response_time || 0}s`, icon: TrendingUp, color: "from-green-500 to-emerald-500" },
    { title: "AI Accuracy", value: `${summary?.ai_accuracy || 95}%`, icon: Brain, color: "from-orange-500 to-amber-500" },
  ];

  const topQueries = summary?.top_queries || [
    { query: "Admission process", count: 120 },
    { query: "Fee structure", count: 95 },
    { query: "Course details", count: 88 },
    { query: "Scholarship info", count: 65 },
    { query: "Contact details", count: 52 },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-slate-400 mt-1">Monitor your AI chatbot performance</p>
        </div>
        <select className="input-field w-auto" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="hover:shadow-glass-lg transition-all duration-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Conversation Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyConversations || []}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748B" />
                <Tooltip contentStyle={{ background: "rgba(30,41,59,0.95)", color: "#F1F5F9", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Area type="monotone" dataKey="count" stroke="#7C3AED" fill="url(#colorConv)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Message Volume</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyMessages || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748B" />
                <Tooltip contentStyle={{ background: "rgba(30,41,59,0.95)", color: "#F1F5F9", border: "1px solid rgba(255,255,255,0.1)" }} />
                <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Queries</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topQueries.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm font-mono text-gray-400 w-6">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{item.query}</span>
                      <span className="text-sm text-slate-400">{item.count}</span>
                    </div>
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400" style={{ width: `${(item.count / topQueries[0].count) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Query Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={topQueries} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="count" nameKey="query" label={(entry: any) => entry.query}>
                  {topQueries.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(30,41,59,0.95)", color: "#F1F5F9", border: "1px solid rgba(255,255,255,0.1)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
