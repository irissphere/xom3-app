"use client";

import React from "react";

import styles from "./Toggle.module.css";

export type AkvToggleSize = "sm" | "md" | "lg";

export type AkvToggleProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange"
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  size?: AkvToggleSize;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const AkvToggle = React.forwardRef<HTMLButtonElement, AkvToggleProps>(
  function AkvToggle(
    { checked, onCheckedChange, size = "md", className, disabled, ...props },
    ref,
  ) {
    return (
      <span
        className={cx(
          styles.root,
          checked && styles.checked,
          size === "sm" && styles.sizeSm,
          size === "lg" && styles.sizeLg,
          disabled && styles.disabled,
          className,
        )}
      >
        <button
          ref={ref}
          {...props}
          type={props.type ?? "button"}
          className={styles.track}
          role="switch"
          aria-checked={checked}
          aria-disabled={disabled || undefined}
          disabled={disabled}
          onClick={(e) => {
            if (disabled) return;
            props.onClick?.(e);
            onCheckedChange(!checked);
          }}
        >
          <span className={styles.thumb} aria-hidden="true" />
        </button>
      </span>
    );
  },
);

AkvToggle.displayName = "AkvToggle";
