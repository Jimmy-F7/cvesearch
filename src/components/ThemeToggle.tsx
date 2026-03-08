"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "light" ? "dark" : "light";
  const label = "Toggle color theme";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] text-[color:rgb(var(--color-foreground-rgb)/0.72)] transition-all duration-200 hover:border-[color:var(--color-border-hover)] hover:bg-[color:var(--color-nav-hover-bg)] hover:text-[color:var(--color-foreground)]"
    >
      <span className="sr-only">{label}</span>
      <span className="hidden dark:inline">
        <SunIcon className="h-4 w-4" />
      </span>
      <span className="dark:hidden">
        <MoonIcon className="h-4 w-4" />
      </span>
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23L5.46 5.46" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 14.25A8.25 8.25 0 119.75 3a6.75 6.75 0 1011.25 11.25z"
      />
    </svg>
  );
}
