"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      closeButtonAriaLabel="Close"
      offset={{ bottom: "4.5rem" }}
      mobileOffset={{ bottom: "4.5rem" }}
      toastOptions={{
        classNames: {
          error:
            "!border-red-800 !bg-red-600 !text-white !shadow-xl !text-[15px] !font-semibold",
          closeButton: "!border-gray-300 !bg-white !text-gray-900",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
