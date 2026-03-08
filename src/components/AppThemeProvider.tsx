"use client";

import { Theme } from "@radix-ui/themes";
import { ThemeProvider } from "next-themes";

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="cve-search-theme"
    >
      <Theme
        appearance="inherit"
        accentColor="cyan"
        grayColor="slate"
        radius="large"
        panelBackground="translucent"
        scaling="100%"
      >
        {children}
      </Theme>
    </ThemeProvider>
  );
}
