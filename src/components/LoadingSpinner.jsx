export default function LoadingSpinner({ fullscreen = false, size = 'md' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };

  const spinner = (
    <div className={`relative ${sizes[size]}`}>
      <div className="absolute inset-0 rounded-full border-2 border-primary-200 dark:border-primary-900" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-600 animate-spin" />
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-3 border-primary-100 dark:border-primary-900" />
            <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-primary-600 animate-spin" style={{ borderWidth: 3 }} />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium animate-pulse">
            Loading Smart Reminder...
          </p>
        </div>
      </div>
    );
  }

  return spinner;
}
