"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Shield, Bell, Globe } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-slate-400 mt-1">Configure global platform settings</p>
      </motion.div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-violet-400" />General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium">Platform Name</label><Input defaultValue="EduAI" /></div>
            <div><label className="text-sm font-medium">Support Email</label><Input defaultValue="support@eduai.com" /></div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-violet-400" />Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium">Max Login Attempts</label><Input type="number" defaultValue="5" /></div>
            <div><label className="text-sm font-medium">Session Timeout (minutes)</label><Input type="number" defaultValue="30" /></div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-violet-400" />Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Email notifications for new clients</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-violet-400 rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Payment alerts</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-violet-400 rounded" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
