"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { paymentService } from "@/services/api";
import { Payment } from "@/types";
import { formatDate, getStatusColor } from "@/lib/utils";

export default function PaymentsPage() {
  const { data } = useQuery({
    queryKey: ["all-payments"],
    queryFn: () => paymentService.getAllPayments({ page_size: 50 }),
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Payment History</h1>
        <p className="text-slate-400 mt-1">All platform payments</p>
      </motion.div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Transaction</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Amount</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Method</th>
                  <th className="text-left p-4 text-sm font-medium text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((payment: Payment) => (
                  <tr key={payment.id} className="border-b border-white/[0.08] hover:bg-white/[0.03] transition-colors">
                    <td className="p-4 text-sm font-mono">{payment.transaction_id || payment.id.slice(0, 8)}</td>
                    <td className="p-4 font-semibold">₹{payment.amount.toLocaleString()}</td>
                    <td className="p-4"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>{payment.status}</span></td>
                    <td className="p-4 text-sm text-slate-400">{payment.payment_method}</td>
                    <td className="p-4 text-sm text-slate-400">{formatDate(payment.created_at)}</td>
                  </tr>
                ))}
                {(!data?.items || data.items.length === 0) && (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400">No payments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
