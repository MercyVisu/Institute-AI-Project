"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Eye, Code, Save, MessageSquare, ExternalLink, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatbotService, tenantService } from "@/services/api";
import { useAuthStore } from "@/store";
import toast from "react-hot-toast";

export default function ChatbotSettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: config, isLoading } = useQuery({
    queryKey: ["chatbot-config"],
    queryFn: chatbotService.getConfig,
  });

  // Fetch current tenant to get slug for widget URL
  const { data: tenant } = useQuery({
    queryKey: ["my-tenant", user?.tenant_id],
    queryFn: () => tenantService.get(user!.tenant_id!),
    enabled: !!user?.tenant_id,
  });

  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
  const widgetUrl = tenant?.slug ? `${frontendUrl}/widget?tenant=${tenant.slug}` : null;

  const [formData, setFormData] = useState({
    name: "",
    welcome_message: "",
    placeholder_text: "",
    primary_color: "#7C3AED",
    position: "bottom-right",
    ai_tone: "professional",
    enable_voice: true,
    enable_image: true,
    enable_tickets: true,
    enable_lead_capture: true,
    suggested_prompts: [] as string[],
  });

  React.useEffect(() => {
    if (config) {
      setFormData({
        name: config.name,
        welcome_message: config.welcome_message,
        placeholder_text: config.placeholder_text,
        primary_color: config.primary_color,
        position: config.position,
        ai_tone: config.ai_tone,
        enable_voice: config.enable_voice,
        enable_image: config.enable_image,
        enable_tickets: config.enable_tickets,
        enable_lead_capture: config.enable_lead_capture,
        suggested_prompts: config.suggested_prompts,
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => config ? chatbotService.updateConfig(data) : chatbotService.createConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-config"] });
      toast.success("Chatbot settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const [newPrompt, setNewPrompt] = useState("");
  const addPrompt = () => {
    if (newPrompt.trim()) {
      setFormData({ ...formData, suggested_prompts: [...formData.suggested_prompts, newPrompt.trim()] });
      setNewPrompt("");
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Chatbot Builder</h1>
        <p className="text-slate-400 mt-1">Customize your AI chatbot appearance and behavior</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-violet-400" />Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm font-medium">Bot Name</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div><label className="text-sm font-medium">Welcome Message</label>
                <textarea className="input-field min-h-[80px] resize-none" value={formData.welcome_message} onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })} />
              </div>
              <div><label className="text-sm font-medium">Placeholder Text</label>
                <Input value={formData.placeholder_text} onChange={(e) => setFormData({ ...formData, placeholder_text: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">Primary Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={formData.primary_color} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} className="h-10 w-16 rounded-lg cursor-pointer" />
                    <Input value={formData.primary_color} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div><label className="text-sm font-medium">Position</label>
                  <select className="input-field" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })}>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-violet-400" />AI Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><label className="text-sm font-medium">AI Tone</label>
                <select className="input-field" value={formData.ai_tone} onChange={(e) => setFormData({ ...formData, ai_tone: e.target.value })}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="academic">Academic</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Features</label>
                {[
                  { key: "enable_voice", label: "Voice Input" },
                  { key: "enable_image", label: "Image Upload (OCR)" },
                  { key: "enable_tickets", label: "Support Tickets" },
                  { key: "enable_lead_capture", label: "Lead Capture" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-400">{label}</span>
                    <input type="checkbox" checked={(formData as any)[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })} className="h-4 w-4 text-violet-400 rounded" />
                  </div>
                ))}
              </div>

              <div><label className="text-sm font-medium">Suggested Prompts</label>
                <div className="flex gap-2 mt-1">
                  <Input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} placeholder="Add a prompt..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPrompt())} />
                  <Button variant="outline" onClick={addPrompt}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.suggested_prompts.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-violet-500/15 text-violet-300 text-xs px-2.5 py-1 rounded-full">
                      {p}
                      <button onClick={() => setFormData({ ...formData, suggested_prompts: formData.suggested_prompts.filter((_, j) => j !== i) })} className="hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => updateMutation.mutate(formData)} disabled={updateMutation.isPending} className="w-full">
            <Save className="h-4 w-4 mr-2" />{updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-violet-400" />Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white/[0.05] rounded-2xl p-6 min-h-[500px] relative">
                {/* Chat widget preview */}
                <div className="absolute bottom-4 right-4 w-[340px]">
                  <div className="bg-white/[0.05] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.25)] overflow-hidden border border-white/[0.08]">
                    <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.primary_color}dd)` }}>
                      <p className="font-semibold">{formData.name || "AI Assistant"}</p>
                      <p className="text-xs text-white/70">Online</p>
                    </div>
                    <div className="p-4 space-y-3 min-h-[200px]">
                      <div className="flex gap-2">
                        <div className="h-7 w-7 rounded-full flex-shrink-0" style={{ backgroundColor: formData.primary_color }}>
                          <span className="flex items-center justify-center h-full text-white text-xs">AI</span>
                        </div>
                        <div className="bg-white/[0.05] rounded-2xl rounded-tl-md px-3 py-2 max-w-[240px]">
                          <p className="text-sm">{formData.welcome_message || "Hello! How can I help?"}</p>
                        </div>
                      </div>
                      {formData.suggested_prompts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 ml-9">
                          {formData.suggested_prompts.slice(0, 3).map((p, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full border" style={{ borderColor: formData.primary_color, color: formData.primary_color }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-3 border-t border-white/[0.08]">
                      <div className="flex gap-2">
                        <input className="flex-1 text-sm px-3 py-2 rounded-xl bg-white/[0.05] border-0 outline-none" placeholder={formData.placeholder_text || "Type your question..."} readOnly />
                        <button className="p-2 rounded-xl text-white" style={{ backgroundColor: formData.primary_color }}>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating chat button */}
                <div className="absolute bottom-4 right-4 hidden">
                  <button className="h-14 w-14 rounded-full shadow-neon-lg text-white flex items-center justify-center" style={{ backgroundColor: formData.primary_color }}>
                    <MessageSquare className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-violet-400" />Student Widget URL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-400">Share this link with your students so they can chat with the AI assistant.</p>
              {widgetUrl ? (
                <>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 text-xs bg-gray-900 text-green-400 px-3 py-2.5 rounded-xl break-all">{widgetUrl}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(widgetUrl); toast.success("URL copied!"); }}>
                      <Copy className="h-4 w-4 mr-2" />Copy Link
                    </Button>
                    <Button className="flex-1" onClick={() => window.open(widgetUrl, "_blank")}>
                      <ExternalLink className="h-4 w-4 mr-2" />Test Live
                    </Button>
                  </div>
                  <div className="border-t border-white/[0.08] pt-3">
                    <p className="text-xs text-slate-500 mb-2">Or embed in your school website:</p>
                    <pre className="bg-gray-900 text-green-400 p-3 rounded-xl text-xs overflow-x-auto whitespace-pre-wrap">{`<iframe
  src="${widgetUrl}"
  width="420" height="640"
  style="border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2)"
  allow="microphone"
></iframe>`}</pre>
                    <Button variant="outline" className="mt-2 w-full text-xs" onClick={() => {
                      navigator.clipboard.writeText(`<iframe src="${widgetUrl}" width="420" height="640" style="border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.2)" allow="microphone"></iframe>`);
                      toast.success("Embed code copied!");
                    }}>
                      <Copy className="h-3 w-3 mr-1.5" />Copy iframe Code
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Loading tenant info...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
