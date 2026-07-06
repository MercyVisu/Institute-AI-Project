"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ticket as TicketIcon, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ticketService } from "@/services/api";
import { Ticket } from "@/types";
import { formatDateTime, getStatusColor, getPriorityColor } from "@/lib/utils";
import toast from "react-hot-toast";

export default function TicketsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", search, statusFilter],
    queryFn: () => ticketService.list({ search, status: statusFilter || undefined, page_size: 50 }),
    staleTime: 30000,
  });

  const { data: replies } = useQuery({
    queryKey: ["ticket-replies", selectedTicket?.id],
    queryFn: () => selectedTicket ? ticketService.getReplies(selectedTicket.id) : [],
    enabled: !!selectedTicket,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ticket> }) => ticketService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket updated");
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) => ticketService.addReply(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies"] });
      setReplyText("");
      toast.success("Reply sent");
    },
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-slate-400 mt-1">Manage student support tickets</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select className="input-field w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Kanban-style cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/[0.08] bg-white/[0.05] h-40 animate-pulse" />
          ))}
        </div>
      ) : !data?.items?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <TicketIcon className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-base font-medium">No tickets found</p>
          <p className="text-sm mt-1 opacity-60">Tickets raised from the chatbot widget will appear here.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.items.map((ticket: Ticket, i: number) => (
          <motion.div key={ticket.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="hover:shadow-glass-lg transition-all duration-300 cursor-pointer hover:-translate-y-1" onClick={() => setSelectedTicket(ticket)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-mono text-slate-400">{ticket.ticket_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                </div>
                <h3 className="font-medium text-sm mb-2 line-clamp-2">{ticket.subject}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3">{ticket.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>{ticket.status.replace("_", " ")}</span>
                  <span className="text-xs text-gray-400">{formatDateTime(ticket.created_at)}</span>
                </div>
                {ticket.student_name && <p className="text-xs text-gray-400 mt-2">From: {ticket.student_name}</p>}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-violet-400" />
                  {selectedTicket.ticket_number} - {selectedTicket.subject}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                </div>

                <div className="bg-white/[0.05] rounded-xl p-4">
                  <p className="text-sm">{selectedTicket.description}</p>
                  {selectedTicket.student_name && <p className="text-xs text-slate-400 mt-2">From: {selectedTicket.student_name} ({selectedTicket.student_email})</p>}
                </div>

                <div className="flex gap-2">
                  {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => (
                    <Button key={status} variant={selectedTicket.status === status ? "default" : "outline"} size="sm"
                      onClick={() => updateMutation.mutate({ id: selectedTicket.id, data: { status } as any })}>
                      {status.replace("_", " ")}
                    </Button>
                  ))}
                </div>

                {/* Replies */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Replies</h4>
                  {(replies || []).map((reply: any) => (
                    <div key={reply.id} className={`p-3 rounded-xl text-sm ${reply.is_internal ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/[0.05]"}`}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-xs">{reply.replied_by_name || "System"}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(reply.created_at)}</span>
                      </div>
                      <p>{reply.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div className="flex gap-2">
                  <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type a reply..." className="flex-1" onKeyDown={(e) => e.key === "Enter" && replyText && replyMutation.mutate({ id: selectedTicket.id, message: replyText })} />
                  <Button onClick={() => replyText && replyMutation.mutate({ id: selectedTicket.id, message: replyText })} disabled={!replyText}>Send</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
