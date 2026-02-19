"use client";

import React from "react";

import styles from "./Select.module.css";

export type AkvSelectTone = "default" | "ritual";
export type AkvSelectSize = "sm" | "md" | "lg";

export type AkvSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size" | "color"
> & {
  tone?: AkvSelectTone;
  size?: AkvSelectSize;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const AkvSelect = React.forwardRef<HTMLSelectElement, AkvSelectProps>(
  function AkvSelect(
    { tone = "default", size = "md", className, ...props },
    ref,
  ) {
    return (
      <select
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

AkvSelect.displayName = "AkvSelect";
