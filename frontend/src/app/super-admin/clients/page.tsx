"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search, MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { tenantService } from "@/services/api";
import { Tenant } from "@/types";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", slug: "", institution_type: "school", email: "",
    phone: "", city: "", state: "", country: "India",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tenants", search],
    queryFn: () => tenantService.list({ search, page_size: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Tenant>) => tenantService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setIsCreateOpen(false);
      toast.success("Client created successfully");
      setFormData({ name: "", slug: "", institution_type: "school", email: "", phone: "", city: "", state: "", country: "India" });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Failed to create client"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Client Management</h1>
          <p className="text-slate-400 mt-1">Manage schools and colleges on the platform</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Client</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Institution Name</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} required />
                </div>
                <div><label className="text-sm font-medium">Slug</label>
                  <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Type</label>
                  <select className="input-field" value={formData.institution_type} onChange={(e) => setFormData({ ...formData, institution_type: e.target.value })}>
                    <option value="school">School</option>
                    <option value="college">College</option>
                    <option value="university">University</option>
                  </select>
                </div>
                <div><label className="text-sm font-medium">Email</label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">City</label>
                  <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div><label className="text-sm font-medium">State</label>
                  <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Institution</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Type</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Location</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Created</th>
                  <th className="text-right p-4 text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((tenant: Tenant) => (
                  <motion.tr key={tenant.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                          {tenant.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-100">{tenant.name}</p>
                          <p className="text-xs text-slate-400">{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Badge variant="secondary">{tenant.institution_type}</Badge></td>
                    <td className="p-4 text-sm text-slate-400">{[tenant.city, tenant.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="p-4"><Badge variant={tenant.is_active ? "success" : "destructive"}>{tenant.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td className="p-4 text-sm text-slate-400">{formatDate(tenant.created_at)}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {(!data?.items || data.items.length === 0) && !isLoading && (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400">No clients found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
