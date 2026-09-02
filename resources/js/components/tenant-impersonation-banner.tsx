import { router, usePage } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import impersonate from '@/routes/impersonate';

export function TenantImpersonationBanner() {
    const { tenant_impersonation: imp } = usePage().props;

    if (!imp || typeof imp !== 'object' || !('tenant_label' in imp)) {
        return null;
    }

    const label =
        typeof imp.tenant_label === 'string' && imp.tenant_label.trim() !== ''
            ? imp.tenant_label
            : 'este taller';

    return (
        <div className="shrink-0 border-b border-destructive/40 bg-destructive/15 px-4 py-2.5">
            <Alert
                variant="destructive"
                className="border-destructive/60 bg-transparent py-2 shadow-none"
            >
                <ShieldAlert className="size-4 text-destructive" aria-hidden />
                <AlertTitle className="text-sm font-semibold">Modo soporte</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Estás operando en <strong>{label}</strong> como superadmin. Los
                        cambios afectan datos reales del taller.
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer whitespace-nowrap border-destructive/70 bg-background text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => router.post(impersonate.leave.url())}
                    >
                        Salir del taller
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    );
}
