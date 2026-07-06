"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store";
import { authService } from "@/services/auth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "SUPER_ADMIN") {
        router.push("/super-admin/dashboard");
      } else {
        router.push("/client/dashboard");
      }
    }
  }, [isAuthenticated, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await authService.login(email, password);
      setAuth(data.user, data.access_token, data.refresh_token);
      toast.success("Welcome back!");

      if (data.user.role === "SUPER_ADMIN") {
        router.push("/super-admin/dashboard");
      } else {
        router.push("/client/dashboard");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  // Generate particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 10,
  }));

  return (
    <div className="min-h-screen flex bg-[#0F172A]">
      {/* Left Panel - Animated Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-bg">
        {/* Floating particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/20"
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-6"
          >
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg">
                <GraduationCap className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-5xl font-bold leading-tight">
              Welcome to
              <br />
              <span className="text-white/90">EduAI Platform</span>
            </h1>
            <p className="text-lg text-white/70 max-w-md">
              AI-powered educational chatbot platform for schools and colleges. Transform how students interact with your institution.
            </p>
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Powered by Advanced AI & RAG Technology</span>
            </div>
          </motion.div>

          {/* Floating cards */}
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-20 left-12 p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 max-w-xs"
          >
            <p className="text-sm text-white/80">&quot;EduAI increased student engagement by 300% at our institution&quot;</p>
            <p className="text-xs text-white/50 mt-2">— Delhi Public School</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-20 right-12 p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">10,000+</p>
                <p className="text-xs text-white/60">Queries Answered Daily</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0F172A]">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-3 rounded-xl gradient-primary neon-glow">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">EduAI</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-100">Sign in</h2>
            <p className="text-slate-400">Enter your credentials to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <Input
                type="email"
                placeholder="admin@eduai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <a href="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500">
            <p>Demo credentials: admin@eduai.com / admin123456</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
