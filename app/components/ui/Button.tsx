"use client";

import React from "react";

type ButtonVariant = "primary" | "ghost";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

export default function Button({
  variant = "primary",
  fullWidth,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const base: React.CSSProperties = {
    appearance: "none",
    border: "1px solid var(--border-0)",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.04,
    cursor: disabled ? "not-allowed" : "pointer",
    width: fullWidth ? "100%" : undefined,
    transition: "transform 120ms var(--ease-out), box-shadow 180ms var(--ease-out), background 180ms var(--ease-out), border-color 180ms var(--ease-out)",
    transform: "translateZ(0)",
  };

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background:
        "linear-gradient(135deg," +
        "color-mix(in srgb, var(--xom3-primary) 85%, #ffffff 0%) 0%," +
        "color-mix(in srgb, var(--xom3-primary) 55%, #1b2b4a 45%) 55%," +
        "#0b1222 100%)",
      color: "var(--text-0)",
      boxShadow: "0 12px 30px var(--glow-primary-1)",
      borderColor: "color-mix(in srgb, var(--xom3-primary) 35%, var(--border-0))",
    },
    ghost: {
      background: "rgba(255,255,255,0.03)",
      color: "var(--text-0)",
      boxShadow: "none",
      borderColor: "var(--border-0)",
    },
  };

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        ...base,
        ...variants[variant],
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseDown={(e) => {
        if (disabled) return;
        props.onMouseDown?.(e);
      }}
    />
  );
}
