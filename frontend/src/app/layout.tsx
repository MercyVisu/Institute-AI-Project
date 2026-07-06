import type { Metadata } from "next";
import "@/styles/globals.css";
import { Toaster } from "react-hot-toast";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "EduAI - AI-Powered Education Platform",
  description: "Multi-tenant AI chatbot SaaS platform for educational institutions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#0F172A] text-slate-100">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              className: "!bg-[#1E293B] !text-slate-100 !border !border-white/10 !rounded-xl",
              style: { boxShadow: "0 8px 32px rgba(0,0,0,0.4)" },
              duration: 4000,
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
