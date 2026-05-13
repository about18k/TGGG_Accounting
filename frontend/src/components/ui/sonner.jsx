"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      modal={false}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
      toastOptions={{
        style: {
          zIndex: 99999,
          pointerEvents: 'auto',
        },
        className: 'z-[99999]',
      }}
      {...props}
    />
  );
};

export { Toaster };
