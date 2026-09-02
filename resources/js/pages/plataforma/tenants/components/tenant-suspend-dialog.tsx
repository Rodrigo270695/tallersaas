import { router } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { FormField, FormModal } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import tenants from '@/routes/plataforma/tenants';
import type { PlataformaTenant } from '../types';

export function TenantSuspendDialog({
    open,
    onOpenChange,
    tenant,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenant: PlataformaTenant | null;
}) {
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!tenant) {
            return;
        }

        setProcessing(true);
        router.post(
            tenants.suspend(tenant.id).url,
            { reason },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setReason('');
                    onOpenChange(false);
                },
            },
        );
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title="Suspender taller"
            description={
                tenant
                    ? `El subdominio ${tenant.slug} dejará de aceptar ingresos.`
                    : undefined
            }
            onSubmit={onSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="destructive"
                        disabled={processing || reason.trim().length < 5}
                        className="cursor-pointer gap-2"
                    >
                        {processing && <Loader2 className="size-4 animate-spin" />}
                        Suspender
                    </Button>
                </>
            }
        >
            <FormField id="suspend-reason" label="Motivo" required>
                <Textarea
                    id="suspend-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Describe el motivo (mínimo 5 caracteres)."
                />
            </FormField>
        </FormModal>
    );
}
