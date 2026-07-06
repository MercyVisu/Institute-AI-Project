"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth";
import toast from "react-hot-toast";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success("Reset link sent if the email exists");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-xl gradient-primary shadow-neon">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">EduAI</span>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Check your email</h2>
              <p className="text-slate-400">If an account with that email exists, we sent a password reset link.</p>
              <Link href="/login">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Forgot password?</h2>
                <p className="text-slate-400 text-sm">Enter your email to receive a reset link</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
                <Button type="submit" className="w-full h-12" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              <div className="text-center">
                <Link href="/login" className="text-sm text-violet-400 hover:text-violet-300 flex items-center justify-center gap-1">
                  <ArrowLeft className="h-4 w-4" /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
