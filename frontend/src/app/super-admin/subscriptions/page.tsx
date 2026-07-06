"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: 0,
    icon: Sparkles,
    features: ["10 Documents", "100 Queries/day", "2 Users", "Basic Analytics", "Email Support"],
    popular: false,
  },
  {
    name: "Starter",
    price: 2999,
    icon: Zap,
    features: ["50 Documents", "1,000 Queries/day", "5 Users", "Advanced Analytics", "Priority Support", "Custom Branding"],
    popular: true,
  },
  {
    name: "Professional",
    price: 7999,
    icon: Crown,
    features: ["200 Documents", "10,000 Queries/day", "20 Users", "Full Analytics", "24/7 Support", "Custom Branding", "API Access", "Voice & OCR"],
    popular: false,
  },
  {
    name: "Enterprise",
    price: 19999,
    icon: Crown,
    features: ["Unlimited Documents", "Unlimited Queries", "Unlimited Users", "Full Analytics", "Dedicated Support", "White Label", "API Access", "All Features", "SLA"],
    popular: false,
  },
];

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <p className="text-slate-400 mt-1">Manage and configure subscription plans</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={plan.popular ? "border-primary-500 shadow-neon relative" : "relative"}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gradient-primary text-white border-0">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-2xl bg-violet-500/15">
                    <plan.icon className="h-6 w-6 text-violet-400" />
                  </div>
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">₹{plan.price.toLocaleString()}</span>
                  <span className="text-slate-400 text-sm">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-slate-400">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.popular ? "default" : "outline"} className="w-full">
                  {plan.price === 0 ? "Current Plan" : "Edit Plan"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
