"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Search, Phone, Mail, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { leadService } from "@/services/api";
import { Lead } from "@/types";
import { formatDate, getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["leads", search, statusFilter],
    queryFn: () => leadService.list({ search, status: statusFilter || undefined, page_size: 50 }),
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => leadService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated");
    },
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Lead Management</h1>
        <p className="text-slate-400 mt-1">Manage leads captured from the chatbot</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select className="input-field w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="enrolled">Enrolled</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Contact</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Interest</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={6} className="p-3">
                        <div className="h-10 bg-white/[0.05] rounded-lg animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : data?.items?.map((lead: Lead) => (
                  <motion.tr key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/[0.08] hover:bg-white/[0.05] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-sm font-semibold">
                          {lead.name[0]}
                        </div>
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-slate-400">{lead.source}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {lead.email && <div className="flex items-center gap-1 text-xs text-slate-400"><Mail className="h-3 w-3" />{lead.email}</div>}
                        {lead.phone && <div className="flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" />{lead.phone}</div>}
                      </div>
                    </td>
                    <td className="p-4">
                      {lead.course_interest && (
                        <div className="flex items-center gap-1 text-sm"><BookOpen className="h-3 w-3 text-violet-400" />{lead.course_interest}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <select className={`text-xs font-medium px-2 py-1 rounded-full border-0 ${getStatusColor(lead.status)}`}
                        value={lead.status}
                        onChange={(e) => updateMutation.mutate({ id: lead.id, data: { status: e.target.value } })}>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="p-4 text-sm text-slate-400">{formatDate(lead.created_at)}</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm">View</Button>
                    </td>
                  </motion.tr>
                ))}
                {!isLoading && (!data?.items || data.items.length === 0) && (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400">No leads captured yet. Leads from the chatbot widget will appear here.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
