import { ToastProvider } from "@/design-system/components";
import { DsShell } from "./shell";

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DsShell>{children}</DsShell>
    </ToastProvider>
  );
}
