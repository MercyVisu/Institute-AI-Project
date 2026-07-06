"use client";

import React, { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, X, Send, Mic, MicOff, ImageIcon, Loader2,
  LifeBuoy, ArrowLeft, CheckCircle2, UserPlus, Square,
} from "lucide-react";
import axios from "axios";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TicketForm {
  student_name: string;
  student_email: string;
  student_phone: string;
  subject: string;
  description: string;
  category: string;
}

interface LeadForm {
  name: string;
  email: string;
  phone: string;
  course_interest: string;
  message: string;
}

type ActiveForm = "chat" | "ticket" | "lead";

// ── WAV encoder (PCM 16-bit) — universally accepted by Whisper ───────────────
function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = 1; // mono is fine for speech
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0); // use channel 0
  const bytesPerSample = 2;
  const dataLen = samples.length * bytesPerSample;
  const ab = new ArrayBuffer(44 + dataLen);
  const view = new DataView(ab);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataLen, true);

  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
}

function WidgetContent() {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  // Form state
  const [activeForm, setActiveForm] = useState<ActiveForm>("chat");

  // Ticket state
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState<TicketForm>({
    student_name: "",
    student_email: "",
    student_phone: "",
    subject: "",
    description: "",
    category: "general",
  });

  // Lead state
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>({
    name: "",
    email: "",
    phone: "",
    course_interest: "",
    message: "",
  });

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get("tenant");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    if (!tenantSlug) return;
    axios.get(`${apiUrl}/widget/config/${tenantSlug}`).then((res) => {
      if (res.data.error) return;
      const flat = {
        tenant_id: res.data.tenant_id,
        tenant_name: res.data.tenant_name,
        chatbot_name: res.data.chatbot?.name,
        ...res.data.chatbot,
      };
      setConfig(flat);
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: res.data.chatbot?.welcome_message || "Hello! How can I help you today?",
        timestamp: new Date(),
      }]);
    }).catch(() => {});
  }, [tenantSlug, apiUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // ── Image / OCR ──────────────────────────────────────────────────────────
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!config) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: `📷 Image: ${file.name}`, timestamp: new Date() },
    ]);
    try {
      const formData = new FormData();
      formData.append("image", file, file.name);
      const sid = sessionStorage.getItem("chat_session") || "";
      const res = await axios.post(
        `${apiUrl}/chatbot/ocr?tenant_id=${config.tenant_id}${sid ? `&session_id=${sid}` : ""}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      if (res.data.session_id) sessionStorage.setItem("chat_session", res.data.session_id);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.data.message || res.data.response || "I analyzed the image.",
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Sorry, I couldn't analyze the image. Please try again.";
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: msg, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Voice Recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick best supported format in order of preference
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
      ];
      const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Microphone access denied. Please allow microphone permissions and try again.",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaRecorderRef.current.onstop = async () => {
      // Use the actual mimeType the browser chose
      const actualMime = mediaRecorderRef.current?.mimeType || "audio/webm";
      const rawBlob = new Blob(audioChunksRef.current, { type: actualMime });
      // Stop all tracks
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      setRecordingSeconds(0);
      if (!config) return;
      setLoading(true);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "user", content: "🎤 Voice message (processing...)", timestamp: new Date() },
      ]);
      const userMsgId = Date.now().toString();
      try {
        // Convert to WAV via Web Audio API — guaranteed to work with Whisper
        const arrayBuffer = await rawBlob.arrayBuffer();
        const audioCtx = new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        audioCtx.close();
        const wavBlob = encodeWav(audioBuffer);

        const formData = new FormData();
        formData.append("audio", wavBlob, "recording.wav");
        const sid = sessionStorage.getItem("chat_session") || "";
        const res = await axios.post(
          `${apiUrl}/chatbot/voice?tenant_id=${config.tenant_id}${sid ? `&session_id=${sid}` : ""}`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        if (res.data.session_id) sessionStorage.setItem("chat_session", res.data.session_id);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: res.data.message || res.data.response || "",
            timestamp: new Date(),
          },
        ]);
      } catch (err: any) {
        const detail: string = err?.response?.data?.detail || "";
        // Show user-friendly message, never raw API errors
        let msg = "Sorry, I couldn't process the voice message. Please try again.";
        if (detail.toLowerCase().includes("no speech") || detail.toLowerCase().includes("silent")) {
          msg = "No speech detected. Please speak clearly and try again.";
        } else if (detail.toLowerCase().includes("too short")) {
          msg = "Recording too short. Please hold the mic and speak, then tap stop.";
        }
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: "assistant", content: msg, timestamp: new Date() },
        ]);
      } finally {
        setLoading(false);
      }
    };
    mediaRecorderRef.current.stop();
  }, [config, apiUrl]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // ── Send Text Message ─────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || loading || !config) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post(
        `${apiUrl}/chatbot/chat?tenant_id=${config.tenant_id}`,
        { message: userMsg.content, session_id: sessionStorage.getItem("chat_session") || undefined }
      );
      if (res.data.session_id) sessionStorage.setItem("chat_session", res.data.session_id);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: res.data.message || res.data.response || "",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I'm having trouble responding right now. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Ticket Submit ─────────────────────────────────────────────────────────
  const submitTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim() || !config) return;
    setTicketSubmitting(true);
    try {
      const res = await axios.post(`${apiUrl}/tickets?tenant_id=${config.tenant_id}`, {
        subject: ticketForm.subject,
        description: ticketForm.description,
        student_name: ticketForm.student_name || undefined,
        student_email: ticketForm.student_email || undefined,
        student_phone: ticketForm.student_phone || undefined,
        category: ticketForm.category || undefined,
        priority: "MEDIUM",
      });
      setTicketSuccess(res.data.ticket_number);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, I couldn't submit your ticket. Please try again.",
          timestamp: new Date(),
        },
      ]);
      setActiveForm("chat");
    } finally {
      setTicketSubmitting(false);
    }
  };

  const resetTicketForm = () => {
    setActiveForm("chat");
    setTicketSuccess(null);
    setTicketForm({ student_name: "", student_email: "", student_phone: "", subject: "", description: "", category: "general" });
  };

  // ── Lead Submit ───────────────────────────────────────────────────────────
  const submitLead = async () => {
    if (!leadForm.name.trim() || !config) return;
    setLeadSubmitting(true);
    try {
      await axios.post(`${apiUrl}/leads?tenant_id=${config.tenant_id}`, {
        name: leadForm.name,
        email: leadForm.email || undefined,
        phone: leadForm.phone || undefined,
        course_interest: leadForm.course_interest || undefined,
        message: leadForm.message || undefined,
      });
      setLeadSuccess(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Sorry, I couldn't submit your details. Please try again.",
          timestamp: new Date(),
        },
      ]);
      setActiveForm("chat");
    } finally {
      setLeadSubmitting(false);
    }
  };

  const resetLeadForm = () => {
    setActiveForm("chat");
    setLeadSuccess(false);
    setLeadForm({ name: "", email: "", phone: "", course_interest: "", message: "" });
  };

  const primaryColor = config?.primary_color || "#7C3AED";

  if (!tenantSlug) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Missing tenant parameter
      </div>
    );
  }

  const headerTitle =
    activeForm === "ticket" ? "Need Help? We're Here!"
    : activeForm === "lead" ? "Enquire Now"
    : config?.chatbot_name || "AI Assistant";

  const headerSubtitle =
    activeForm === "ticket" ? "Fill the form — our staff will contact you"
    : activeForm === "lead" ? "Share your details, we'll call you back"
    : null;

  return (
    <div
      className="fixed inset-0 flex items-end justify-end p-4 pointer-events-none"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="pointer-events-auto w-full max-w-[400px] h-[600px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 25px 60px -12px rgba(0,0,0,0.25)",
              backdropFilter: "blur(20px)",
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            {/* ── Header ── */}
            <div
              className="p-4 flex items-center justify-between text-white relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="relative flex items-center gap-3">
                {activeForm !== "chat" ? (
                  <button
                    onClick={() => {
                      if (activeForm === "ticket") resetTicketForm();
                      else resetLeadForm();
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{headerTitle}</p>
                  <div className="flex items-center gap-1.5">
                    {headerSubtitle ? (
                      <span className="text-xs text-white/80">{headerSubtitle}</span>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-white/80">Online</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative flex items-center gap-1">
                {config?.enable_lead_capture && activeForm === "chat" && (
                  <button
                    onClick={() => setActiveForm("lead")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-white/20 transition-colors"
                    title="Enquire about admissions"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Enquiry</span>
                  </button>
                )}
                {config?.enable_tickets && activeForm === "chat" && (
                  <button
                    onClick={() => setActiveForm("ticket")}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-white/20 transition-colors"
                    title="Report a problem or ask for help"
                  >
                    <LifeBuoy className="h-4 w-4" />
                    <span>Help</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Ticket Form ── */}
            {activeForm === "ticket" && (
              <div className="flex-1 overflow-y-auto p-4">
                {ticketSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center gap-4 px-4"
                  >
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Ticket Submitted!</h3>
                    <p className="text-sm text-gray-500">Your ticket number is</p>
                    <p
                      className="text-lg font-mono font-bold px-4 py-2 rounded-lg bg-gray-100"
                      style={{ color: primaryColor }}
                    >
                      {ticketSuccess}
                    </p>
                    <p className="text-xs text-gray-400">Our team will review and respond soon.</p>
                    <button
                      onClick={resetTicketForm}
                      className="mt-2 text-sm px-6 py-2 rounded-xl text-white transition-all hover:shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Back to Chat
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Your Name</label>
                      <input
                        value={ticketForm.student_name}
                        onChange={(e) => setTicketForm({ ...ticketForm, student_name: e.target.value })}
                        placeholder="Enter your name"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                      <input
                        type="email"
                        value={ticketForm.student_email}
                        onChange={(e) => setTicketForm({ ...ticketForm, student_email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Phone <span className="text-gray-400">(optional)</span>
                      </label>
                      <input
                        value={ticketForm.student_phone}
                        onChange={(e) => setTicketForm({ ...ticketForm, student_phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all bg-white text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      >
                        <option value="general">General Inquiry</option>
                        <option value="admission">Admission</option>
                        <option value="fees">Fees & Payments</option>
                        <option value="academic">Academic</option>
                        <option value="technical">Technical Issue</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Subject <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        placeholder="Brief summary of your issue"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Description <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        placeholder="Describe your issue in detail..."
                        rows={3}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all resize-none text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <button
                      onClick={submitTicket}
                      disabled={!ticketForm.subject.trim() || !ticketForm.description.trim() || ticketSubmitting}
                      className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 hover:shadow-lg flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {ticketSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                      ) : (
                        "Submit Ticket"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Lead Form ── */}
            {activeForm === "lead" && (
              <div className="flex-1 overflow-y-auto p-4">
                {leadSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center gap-4 px-4"
                  >
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}15` }}
                    >
                      <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Details Submitted!</h3>
                    <p className="text-sm text-gray-500">
                      Thank you! Our team will reach out to you shortly.
                    </p>
                    <button
                      onClick={resetLeadForm}
                      className="mt-2 text-sm px-6 py-2 rounded-xl text-white transition-all hover:shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Back to Chat
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Your Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        value={leadForm.name}
                        onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                        placeholder="Enter your full name"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Email</label>
                      <input
                        type="email"
                        value={leadForm.email}
                        onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                        placeholder="your@email.com"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                      <input
                        value={leadForm.phone}
                        onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Course / Program Interest
                      </label>
                      <input
                        value={leadForm.course_interest}
                        onChange={(e) => setLeadForm({ ...leadForm, course_interest: e.target.value })}
                        placeholder="e.g. Computer Science, MBA..."
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Message</label>
                      <textarea
                        value={leadForm.message}
                        onChange={(e) => setLeadForm({ ...leadForm, message: e.target.value })}
                        placeholder="Anything else you'd like to share..."
                        rows={3}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 transition-all resize-none text-gray-900"
                        style={{ "--tw-ring-color": primaryColor } as any}
                      />
                    </div>
                    <button
                      onClick={submitLead}
                      disabled={!leadForm.name.trim() || leadSubmitting}
                      className="w-full py-2.5 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 hover:shadow-lg flex items-center justify-center gap-2"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {leadSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                      ) : (
                        "Submit Details"
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Chat ── */}
            {activeForm === "chat" && (
              <>
                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "text-white rounded-br-md"
                            : "bg-gray-100 text-gray-800 rounded-bl-md"
                        }`}
                        style={msg.role === "user" ? { backgroundColor: primaryColor } : undefined}
                      >
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggested Prompts */}
                {messages.length <= 1 && config?.suggested_prompts?.length > 0 && (
                  <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                    {config.suggested_prompts.map((prompt: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                        className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:bg-gray-50"
                        style={{ borderColor: primaryColor, color: primaryColor }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Recording indicator */}
                {isRecording && (
                  <div className="px-4 pb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-red-500 font-medium">
                      Recording... {recordingSeconds}s — tap mic to send
                    </span>
                  </div>
                )}

                {/* Input bar */}
                <div className="p-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {config?.enable_image && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading || isRecording}
                          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
                          title="Upload image"
                        >
                          <ImageIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    {config?.enable_voice && (
                      <button
                        onClick={toggleRecording}
                        disabled={loading}
                        className={`p-2 rounded-xl transition-colors disabled:opacity-40 ${
                          isRecording
                            ? "text-red-500 bg-red-50 hover:bg-red-100"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        title={isRecording ? "Stop recording" : "Start voice message"}
                      >
                        {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                      </button>
                    )}
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder={
                        isRecording
                          ? "Recording voice..."
                          : config?.placeholder_text || "Type your question..."
                      }
                      className="flex-1 text-sm px-3 py-2.5 rounded-xl bg-gray-50 border-0 outline-none focus:ring-2 transition-all text-gray-900 placeholder-gray-400"
                      style={{ "--tw-ring-color": primaryColor } as any}
                      disabled={loading || isRecording}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || loading || isRecording}
                      className="p-2.5 rounded-xl text-white transition-all disabled:opacity-50 hover:shadow-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-gray-400 mt-2">Powered by EduAI</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button when closed */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto h-14 w-14 rounded-full text-white shadow-2xl flex items-center justify-center"
          style={{ backgroundColor: primaryColor, boxShadow: `0 8px 32px ${primaryColor}66` }}
        >
          <MessageSquare className="h-6 w-6" />
        </motion.button>
      )}
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center text-gray-400 text-sm">
          Loading...
        </div>
      }
    >
      <WidgetContent />
    </Suspense>
  );
}
