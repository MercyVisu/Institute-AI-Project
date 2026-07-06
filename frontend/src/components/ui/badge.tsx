import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
    secondary: "bg-white/10 text-slate-300 border border-white/10",
    destructive: "bg-red-500/15 text-red-300 border border-red-500/20",
    outline: "border border-white/20 text-slate-300",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    warning: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
