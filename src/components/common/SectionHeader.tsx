interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="border-b border-border pb-4 mb-6">
      <h2 className="text-xl font-semibold text-foreground tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
