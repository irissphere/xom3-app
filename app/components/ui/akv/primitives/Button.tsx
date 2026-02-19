"use client";

import React from "react";

import styles from "./Button.module.css";

export type AkvButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";
export type AkvButtonSize = "sm" | "md" | "lg";

export type AkvButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "color"
> & {
  variant?: AkvButtonVariant;
  size?: AkvButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const AkvButton = React.forwardRef<HTMLButtonElement, AkvButtonProps>(
  function AkvButton(
    {
      variant = "primary",
      size = "md",
      fullWidth,
      loading,
      loadingLabel = "Loading",
      className,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = Boolean(disabled || loading);
    return (
      <button
        ref={ref}
        {...props}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={cx(
          styles.root,
          variant === "primary" && styles.primary,
          variant === "secondary" && styles.secondary,
          variant === "ghost" && styles.ghost,
          variant === "danger" && styles.danger,
          variant === "icon" && styles.icon,
          size === "sm" && styles.sizeSm,
          size === "lg" && styles.sizeLg,
          fullWidth && styles.fullWidth,
          loading && styles.loading,
          className,
        )}
      >
        <span className={styles.content}>
          <span className={styles.contentInner}>{children}</span>
          <span
            className={styles.loadingOverlay}
            aria-hidden={loading ? undefined : "true"}
          >
            <span className={styles.spinner} aria-hidden="true" />
            {variant !== "icon" && (
              <span className={styles.loadingText}>{loadingLabel}</span>
            )}
          </span>
        </span>
      </button>
    );
  },
);

AkvButton.displayName = "AkvButton";
