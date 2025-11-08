import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const panelCardVariants = cva(
  "rounded-lg border-l-4 bg-muted/30 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-l-primary",
        success: "border-l-success",
        warning: "border-l-warning",
        danger: "border-l-destructive",
        info: "border-l-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface PanelCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof panelCardVariants> {}

const PanelCard = React.forwardRef<HTMLDivElement, PanelCardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(panelCardVariants({ variant }), className)}
      {...props}
    />
  )
);
PanelCard.displayName = "PanelCard";

const PanelCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
PanelCardHeader.displayName = "PanelCardHeader";

const PanelCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
));
PanelCardTitle.displayName = "PanelCardTitle";

const PanelCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
PanelCardDescription.displayName = "PanelCardDescription";

const PanelCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
PanelCardContent.displayName = "PanelCardContent";

const PanelCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
PanelCardFooter.displayName = "PanelCardFooter";

export {
  PanelCard,
  PanelCardHeader,
  PanelCardFooter,
  PanelCardTitle,
  PanelCardDescription,
  PanelCardContent,
};
