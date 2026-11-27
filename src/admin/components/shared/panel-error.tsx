import { Button } from "@/admin/components/ui/button";

type PanelErrorProps = {
    message: string;
    onRetry?: () => void;
};

export function PanelError({ message, onRetry }: PanelErrorProps) {
    return (
        <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">{message}</p>
            {onRetry ? (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={onRetry}
                >
                    Retry
                </Button>
            ) : null}
        </div>
    );
}
