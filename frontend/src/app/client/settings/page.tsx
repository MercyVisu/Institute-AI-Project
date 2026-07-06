"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Building, Shield, Bell, Palette, Bot, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store";
import toast from "react-hot-toast";
import axios from "@/lib/api";

export default function ClientSettingsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [general, setGeneral] = useState({
    institution_name: "",
    institution_type: "college",
    website: "",
    email: "",
    phone: "",
    address: "",
  });

  const [security, setSecurity] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [notifications, setNotifications] = useState({
    email_tickets: true,
    email_leads: true,
    email_weekly_report: true,
    email_ai_alerts: false,
  });

  const [aiSettings, setAiSettings] = useState({
    ai_provider: "openai",
    openai_api_key: "",
    ollama_base_url: "http://localhost:11434/v1",
    chat_model: "",
    embedding_model: "",
    vision_model: "",
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);

  // Load existing AI settings
  useQuery({
    queryKey: ["ai-settings"],
    queryFn: async () => {
      const res = await axios.get("/tenants/me/ai-settings");
      const d = res.data;
      setApiKeySet(d.openai_api_key_set);
      setAiSettings((prev) => ({
        ...prev,
        ai_provider: d.ai_provider,
        ollama_base_url: d.ollama_base_url,
        chat_model: d.chat_model,
        embedding_model: d.embedding_model,
        vision_model: d.vision_model,
      }));
      return d;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => axios.put("/auth/profile", data),
    onSuccess: () => toast.success("Settings saved"),
    onError: () => toast.error("Failed to save"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => axios.post("/auth/change-password", data),
    onSuccess: () => {
      toast.success("Password changed");
      setSecurity({ current_password: "", new_password: "", confirm_password: "" });
    },
    onError: () => toast.error("Failed to change password"),
  });

  const saveAiSettingsMutation = useMutation({
    mutationFn: (data: any) => axios.put("/tenants/me/ai-settings", data),
    onSuccess: (res) => {
      toast.success("AI settings saved");
      setApiKeySet(res.data.openai_api_key_set);
      setAiSettings((prev) => ({ ...prev, openai_api_key: "" }));
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: () => toast.error("Failed to save AI settings"),
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your institution settings</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5 text-violet-400" />Institution Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium">Institution Name</label>
              <Input value={general.institution_name} onChange={(e) => setGeneral({ ...general, institution_name: e.target.value })} />
            </div>
            <div><label className="text-sm font-medium">Type</label>
              <select className="input-field" value={general.institution_type} onChange={(e) => setGeneral({ ...general, institution_type: e.target.value })}>
                <option value="school">School</option>
                <option value="college">College</option>
                <option value="university">University</option>
                <option value="coaching">Coaching Institute</option>
              </select>
            </div>
            <div><label className="text-sm font-medium">Website</label>
              <Input value={general.website} onChange={(e) => setGeneral({ ...general, website: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Email</label>
                <Input value={general.email} onChange={(e) => setGeneral({ ...general, email: e.target.value })} />
              </div>
              <div><label className="text-sm font-medium">Phone</label>
                <Input value={general.phone} onChange={(e) => setGeneral({ ...general, phone: e.target.value })} />
              </div>
            </div>
            <div><label className="text-sm font-medium">Address</label>
              <textarea className="input-field min-h-[80px] resize-none" value={general.address} onChange={(e) => setGeneral({ ...general, address: e.target.value })} />
            </div>
            <Button onClick={() => updateProfileMutation.mutate(general)} className="w-full">Save Details</Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-violet-400" />Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm font-medium">Current Password</label>
                <Input type="password" value={security.current_password} onChange={(e) => setSecurity({ ...security, current_password: e.target.value })} />
              </div>
              <div><label className="text-sm font-medium">New Password</label>
                <Input type="password" value={security.new_password} onChange={(e) => setSecurity({ ...security, new_password: e.target.value })} />
              </div>
              <div><label className="text-sm font-medium">Confirm Password</label>
                <Input type="password" value={security.confirm_password} onChange={(e) => setSecurity({ ...security, confirm_password: e.target.value })} />
              </div>
              <Button variant="outline" className="w-full" onClick={() => {
                if (security.new_password !== security.confirm_password) { toast.error("Passwords don't match"); return; }
                changePasswordMutation.mutate(security);
              }}>Change Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-violet-400" />Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { key: "email_tickets", label: "New ticket notifications" },
                { key: "email_leads", label: "New lead notifications" },
                { key: "email_weekly_report", label: "Weekly analytics report" },
                { key: "email_ai_alerts", label: "AI performance alerts" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-sm">{label}</span>
                  <input type="checkbox" checked={(notifications as any)[key]} onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })} className="h-4 w-4 text-violet-400 rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-violet-400" />AI Configuration</CardTitle>
          <p className="text-sm text-slate-400 mt-1">
            Choose your AI provider. Use <strong>OpenAI</strong> with your own API key for best quality, or
            <strong> Ollama</strong> for a completely free offline setup (no internet required).
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Provider toggle */}
          <div>
            <label className="text-sm font-medium block mb-2">AI Provider</label>
            <div className="flex gap-3">
              {["openai", "ollama"].map((p) => (
                <button
                  key={p}
                  onClick={() => setAiSettings((prev) => ({ ...prev, ai_provider: p }))}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    aiSettings.ai_provider === p
                      ? "border-violet-500 bg-violet-500/10 text-violet-400"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {p === "openai" ? "OpenAI (Cloud)" : "Ollama (Offline / Free)"}
                </button>
              ))}
            </div>
          </div>

          {aiSettings.ai_provider === "openai" ? (
            <div>
              <label className="text-sm font-medium block mb-1">OpenAI API Key</label>
              <div className="relative">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder={apiKeySet ? "••••••••  (key already saved — enter new to replace)" : "sk-..."}
                  value={aiSettings.openai_api_key}
                  onChange={(e) => setAiSettings((prev) => ({ ...prev, openai_api_key: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  onClick={() => setShowApiKey((v) => !v)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {apiKeySet && <p className="text-xs text-green-400 mt-1">API key is saved. Leave blank to keep the existing key.</p>}
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium block mb-1">Ollama Base URL</label>
              <Input
                value={aiSettings.ollama_base_url}
                onChange={(e) => setAiSettings((prev) => ({ ...prev, ollama_base_url: e.target.value }))}
                placeholder="http://localhost:11434/v1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Make sure Ollama is running locally.{" "}
                <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-violet-400 underline">
                  Download Ollama
                </a>
              </p>
            </div>
          )}

          {/* Model overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Chat Model</label>
              <Input
                value={aiSettings.chat_model}
                onChange={(e) => setAiSettings((prev) => ({ ...prev, chat_model: e.target.value }))}
                placeholder={aiSettings.ai_provider === "ollama" ? "tinyllama" : "gpt-3.5-turbo"}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Embedding Model</label>
              <Input
                value={aiSettings.embedding_model}
                onChange={(e) => setAiSettings((prev) => ({ ...prev, embedding_model: e.target.value }))}
                placeholder={aiSettings.ai_provider === "ollama" ? "nomic-embed-text" : "text-embedding-3-small"}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Vision Model</label>
              <Input
                value={aiSettings.vision_model}
                onChange={(e) => setAiSettings((prev) => ({ ...prev, vision_model: e.target.value }))}
                placeholder={aiSettings.ai_provider === "ollama" ? "llava" : "gpt-4o-mini"}
              />
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => saveAiSettingsMutation.mutate(aiSettings)}
            disabled={saveAiSettingsMutation.isPending}
          >
            {saveAiSettingsMutation.isPending ? "Saving…" : "Save AI Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
