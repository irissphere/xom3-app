"use client";

import React from "react";

import styles from "./Input.module.css";

export type AkvInputTone = "default" | "ritual";
export type AkvInputSize = "sm" | "md" | "lg";

export type AkvInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "color"
> & {
  tone?: AkvInputTone;
  size?: AkvInputSize;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const AkvInput = React.forwardRef<HTMLInputElement, AkvInputProps>(
  function AkvInput(
    { tone = "default", size = "md", className, ...props },
    ref,
  ) {
    return (
      <input
        ref={ref}
        {...props}
        className={cx(
          styles.root,
          tone === "default" && styles.toneDefault,
          tone === "ritual" && styles.toneRitual,
          size === "sm" && styles.sizeSm,
          size === "lg" && styles.sizeLg,
          className,
        )}
      />
    );
  },
);
