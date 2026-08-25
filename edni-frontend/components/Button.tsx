import React from "react";
import { COLORS, GRADIENTS } from "@/lib/colors";

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export function Button({
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    children,
    disabled,
    ...props
}: ButtonProps) {
    const baseStyle: React.CSSProperties = {
        border: "none",
        borderRadius: 10,
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: disabled || loading ? 0.6 : 1,
    };

    const sizeStyles = {
        sm: { padding: "8px 16px", fontSize: 12 },
        md: { padding: "10px 20px", fontSize: 14 },
        lg: { padding: "12px 24px", fontSize: 16 },
    };

    const variantStyles = {
        primary: {
            background: GRADIENTS.primary,
            color: "#FFFFFF",
            boxShadow: "0 4px 15px rgba(108, 99, 255, 0.3)",
        },
        secondary: {
            background: COLORS.secondary,
            color: "#FFFFFF",
            boxShadow: "0 4px 15px rgba(168, 85, 247, 0.3)",
        },
        outline: {
            background: "transparent",
            border: `1.5px solid ${COLORS.borderLight}`,
            color: COLORS.textPrimary,
        },
        ghost: {
            background: "transparent",
            color: COLORS.primary,
        },
    };

    return (
        <button
            {...props}
            disabled={disabled || loading}
            style={{
                ...baseStyle,
                ...sizeStyles[size],
                ...variantStyles[variant],
            }}
            onMouseEnter={(e) => {
                if (!disabled && !loading) {
                    e.currentTarget.style.opacity = "0.9";
                    if (variant !== "ghost") {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                            variant === "primary"
                                ? "0 8px 20px rgba(108, 99, 255, 0.4)"
                                : "0 8px 20px rgba(168, 85, 247, 0.4)";
                    }
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
                if (variant === "primary") {
                    e.currentTarget.style.boxShadow =
                        "0 4px 15px rgba(108, 99, 255, 0.3)";
                }
            }}
        >
            {loading && <span style={{ animation: "spin 0.8s linear infinite" }}>✦</span>}
            {icon && !loading && icon}
            <span>{children}</span>
        </button>
    );
}