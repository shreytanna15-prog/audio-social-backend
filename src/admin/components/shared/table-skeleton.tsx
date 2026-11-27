import { cn } from "@/admin/lib/cn";

type TableSkeletonProps = {
    columns: number;
    rows?: number;
    className?: string;
};

export function TableSkeleton({
    columns,
    rows = 8,
    className,
}: TableSkeletonProps) {
    return (
        <div
            className={cn(
                "overflow-hidden rounded-2xl border border-border bg-card",
                className
            )}
        >
            <div
                className="grid gap-3 border-b border-border bg-surface-lowest/80 px-3 py-2.5"
                style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
            >
                {Array.from({ length: columns }).map((_, index) => (
                    <div
                        key={`h-${index}`}
                        className="h-2.5 w-16 animate-pulse rounded bg-muted/50"
                    />
                ))}
            </div>
            <div className="divide-y divide-border/60">
                {Array.from({ length: rows }).map((_, row) => (
                    <div
                        key={`r-${row}`}
                        className="grid gap-3 px-3 py-3"
                        style={{
                            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        }}
                    >
                        {Array.from({ length: columns }).map((__, col) => (
                            <div
                                key={`c-${row}-${col}`}
                                className="h-3.5 w-full max-w-[140px] animate-pulse rounded bg-muted/35"
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
