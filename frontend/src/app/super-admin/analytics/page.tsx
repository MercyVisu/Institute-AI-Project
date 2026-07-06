"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const monthlyData = [
  { month: "Jan", conversations: 1200, documents: 45 },
  { month: "Feb", conversations: 1800, documents: 62 },
  { month: "Mar", conversations: 2400, documents: 89 },
  { month: "Apr", conversations: 3100, documents: 120 },
  { month: "May", conversations: 4200, documents: 156 },
  { month: "Jun", conversations: 5800, documents: 198 },
];

const planDistribution = [
  { name: "Free", value: 45, color: "#94A3B8" },
  { name: "Starter", value: 30, color: "#8B5CF6" },
  { name: "Professional", value: 18, color: "#6366F1" },
  { name: "Enterprise", value: 7, color: "#7C3AED" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-slate-400 mt-1">Comprehensive platform performance insights</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-violet-400" />Growth Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(30,41,59,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", color: "#F1F5F9" }} />
                <Area type="monotone" dataKey="conversations" stroke="#7C3AED" strokeWidth={2} fill="url(#colorConv)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-violet-400" />Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {planDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
