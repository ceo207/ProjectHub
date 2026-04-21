import { CheckCircle2, XCircle } from "lucide-react";
import { useToasts } from "@/hooks/use-toast";

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-in slide-in-from-bottom-2 duration-300
            ${t.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
        >
          {t.type === "success"
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <XCircle className="h-4 w-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
