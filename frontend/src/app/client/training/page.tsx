"use client";

import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, Trash2, RefreshCw, Search, Filter, CheckCircle, Clock, AlertCircle, Loader2, File, Image } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trainingService, tenantService } from "@/services/api";
import { useAuthStore } from "@/store";
import { Document } from "@/types";
import { formatDate, formatFileSize, getStatusColor } from "@/lib/utils";
import toast from "react-hot-toast";

const statusIcons: Record<string, React.ElementType> = {
  completed: CheckCircle,
  processing: Loader2,
  pending: Clock,
  failed: AlertCircle,
};

export default function TrainingPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  // Load tenants list for super-admin selector
  const { data: tenantsData } = useQuery({
    queryKey: ["tenants-list"],
    queryFn: () => tenantService.list({ page_size: 100 }),
    enabled: isSuperAdmin,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["documents", search, category, selectedTenantId],
    queryFn: () => trainingService.listDocuments({
      search,
      category: category || undefined,
      page_size: 50,
      ...(isSuperAdmin && selectedTenantId ? { tenant_id: selectedTenantId } : {}),
    }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => trainingService.uploadDocument(file, undefined, undefined, isSuperAdmin ? selectedTenantId : undefined),
    onSuccess: (doc: Document) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (doc.status === "failed") {
        toast.error(`Processing failed: ${doc.error_message || "Could not extract text from document"}`);
      } else {
        toast.success("Document uploaded and processing started");
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || "Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trainingService.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
  });

  const retrainMutation = useMutation({
    mutationFn: (id: string) => trainingService.retrainDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document queued for retraining");
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (isSuperAdmin && !selectedTenantId) {
      toast.error("Please select a client first before uploading");
      return;
    }
    acceptedFiles.forEach((file) => uploadMutation.mutate(file));
  }, [uploadMutation, isSuperAdmin, selectedTenantId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isSuperAdmin && !selectedTenantId,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  const getFileIcon = (type: string) => {
    if (["png", "jpg", "jpeg"].includes(type)) return Image;
    return File;
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">AI Training</h1>
        <p className="text-slate-400 mt-1">Upload documents to train your AI chatbot</p>
      </motion.div>

      {/* Super-admin tenant selector */}
      {isSuperAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
            <span className="text-sm font-medium text-violet-300 whitespace-nowrap">Upload for client:</span>
            <select
              className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
            >
              <option value="">— Select a client —</option>
              {tenantsData?.items?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </motion.div>
      )}

      {/* Upload Zone */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            isSuperAdmin && !selectedTenantId
              ? "border-white/[0.04] bg-white/[0.02] cursor-not-allowed opacity-50"
              : isDragActive
              ? "border-violet-500 bg-violet-500/10 cursor-pointer"
              : "border-white/[0.08] hover:border-primary-400 hover:bg-white/[0.05] cursor-pointer"
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className={`p-4 rounded-2xl transition-colors ${isDragActive ? "bg-violet-500/15" : "bg-white/[0.05]"}`}>
                <Upload className={`h-8 w-8 ${isDragActive ? "text-primary-600" : "text-gray-400"}`} />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-slate-100">
                {isSuperAdmin && !selectedTenantId
                  ? "Select a client above to enable upload"
                  : isDragActive ? "Drop files here" : "Drag & drop files here"}
              </p>
              <p className="text-sm text-slate-400 mt-1">or click to browse. Supports PDF, DOCX, TXT, PNG, JPG (max 50MB)</p>
            </div>
            {uploadMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-primary-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <select className="input-field w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          <option value="admissions">Admissions</option>
          <option value="courses">Courses</option>
          <option value="fees">Fees</option>
          <option value="policies">Policies</option>
          <option value="general">General</option>
        </select>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items?.map((doc: Document, i: number) => {
          const StatusIcon = statusIcons[doc.status] || Clock;
          const FileIcon = getFileIcon(doc.file_type);

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover:shadow-glass-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-violet-500/10">
                        <FileIcon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{doc.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{doc.file_name}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      <StatusIcon className={`h-3 w-3 ${doc.status === "processing" ? "animate-spin" : ""}`} />
                      {doc.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>{doc.chunk_count} chunks</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>

                  {doc.error_message && (
                    <p className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg">{doc.error_message}</p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => retrainMutation.mutate(doc.id)}
                      disabled={doc.status === "processing"}
                      className="flex-1"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />Retrain
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {(!data?.items || data.items.length === 0) && !isLoading && (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No documents uploaded yet</p>
          <p className="text-gray-400 text-sm mt-1">Upload your first document to start training your AI</p>
        </div>
      )}
    </div>
  );
}
