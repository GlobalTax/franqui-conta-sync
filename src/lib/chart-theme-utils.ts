import { useTheme } from "next-themes";

export function useChartColors() {
  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  return {
    // Gradient definitions
    gradients: {
      gold: isDark
        ? { start: "rgba(252, 211, 77, 0.8)", end: "rgba(252, 211, 77, 0.2)" }
        : { start: "rgba(22, 105, 208, 0.8)", end: "rgba(22, 105, 208, 0.3)" },
      blue: isDark
        ? { start: "rgba(59, 130, 246, 0.8)", end: "rgba(59, 130, 246, 0.2)" }
        : { start: "rgba(59, 130, 246, 0.8)", end: "rgba(59, 130, 246, 0.3)" },
    },

    // Line colors (neon in dark mode)
    lines: {
      primary: isDark ? "hsl(46, 96%, 65%)" : "hsl(217, 91%, 40%)",
      secondary: isDark ? "hsl(210, 100%, 60%)" : "hsl(200, 100%, 60%)",
      success: isDark ? "hsl(142, 71%, 55%)" : "hsl(142, 71%, 45%)",
      warning: isDark ? "hsl(38, 92%, 60%)" : "hsl(38, 92%, 50%)",
    },

    // Grid color
    grid: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",

    // Stroke settings
    strokeWidth: 1.5,
    dotRadius: 3,

    // Axis colors
    axis: isDark ? "hsl(0, 0%, 60%)" : "hsl(217, 15%, 50%)",
  };
}
