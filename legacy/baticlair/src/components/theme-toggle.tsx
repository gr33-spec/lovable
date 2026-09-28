"use client";

import { Moon, Sun } from "lucide-react";

/** Bascule entre mode jour et mode nuit, mémorisée dans le navigateur. */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer de thème"
      className="tap-target flex items-center justify-center text-ink"
    >
      <Sun className="h-6 w-6 dark:hidden" aria-hidden="true" />
      <Moon className="hidden h-6 w-6 dark:block" aria-hidden="true" />
    </button>
  );
}
