type ToastProps = { message: string; icon?: string };

export function Toast({ message, icon = '✓' }: ToastProps) {
  return (
    <div className="animate-toast-in pointer-events-none absolute bottom-24 inset-x-4 z-50 flex items-center gap-3 rounded-2xl bg-hippo-fg px-4 py-3.5 shadow-xl">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-hippo-success text-sm font-semibold text-white">
        {icon}
      </div>
      <span className="text-sm font-medium text-hippo-bg">{message}</span>
    </div>
  );
}
