"use client";

import React from "react";

import styles from "./Card.module.css";

export type AkvCardVariant = "glass" | "solid";
export type AkvCardPadding = "none" | "sm" | "md" | "lg";

export type AkvCardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AkvCardVariant;
  padding?: AkvCardPadding;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const AkvCard = React.forwardRef<HTMLDivElement, AkvCardProps>(
  function AkvCard(
    { variant = "glass", padding = "md", className, ...props },
    ref,
  ) {
    return (
      <div
        ref={ref}
        {...props}
        className={cx(
          styles.root,
          variant === "glass" && styles.variantGlass,
          variant === "solid" && styles.variantSolid,
          padding === "none" && styles.paddingNone,
          padding === "sm" && styles.paddingSm,
          padding === "md" && styles.paddingMd,
          padding === "lg" && styles.paddingLg,
          className,
        )}
      />
    );
  },
);

AkvCard.displayName = "AkvCard";
