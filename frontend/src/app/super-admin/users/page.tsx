"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { userService } from "@/services/api";
import { User, UserRole } from "@/types";
import { formatDate, getInitials } from "@/lib/utils";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "CLIENT_ADMIN", label: "Client Admin" },
  { value: "CLIENT_USER", label: "Client User" },
];

interface AddUserForm {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
}

const DEFAULT_FORM: AddUserForm = {
  full_name: "",
  email: "",
  password: "",
  role: "CLIENT_ADMIN",
  phone: "",
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddUserForm>(DEFAULT_FORM);
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => userService.list({ search, page_size: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: AddUserForm) => userService.create(payload as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setForm(DEFAULT_FORM);
      setError("");
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to create user. Please try again.";
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.full_name || !form.email || !form.password) {
      setError("Name, email and password are required.");
      return;
    }
    createMutation.mutate(form);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-slate-400 mt-1">Manage platform users</p>
        </div>
        <Button onClick={() => { setOpen(true); setForm(DEFAULT_FORM); setError(""); }}>
          <Plus className="h-4 w-4 mr-2" />Add User
        </Button>
      </motion.div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">User</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Role</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : data?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">No users found.</td>
                  </tr>
                ) : (
                  data?.items?.map((user: User) => (
                    <tr key={user.id} className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white text-sm font-semibold">
                            {getInitials(user.full_name)}
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge>{user.role.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={user.is_active ? "success" : "destructive"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-slate-400">{formatDate(user.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Full Name *</label>
              <Input
                name="full_name"
                placeholder="John Doe"
                value={form.full_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Email *</label>
              <Input
                name="email"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Password *</label>
              <Input
                name="password"
                type="password"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Phone</label>
              <Input
                name="phone"
                placeholder="+91 9999999999"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Role *</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-slate-900">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
                <X className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
