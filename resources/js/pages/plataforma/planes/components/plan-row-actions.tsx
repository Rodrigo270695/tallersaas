import { Copy, KeyRound, Lock, MoreHorizontal, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toastManager } from '@/lib/toast';
import type { Plan } from '../types';

export function PlanRowActions({
    plan,
    onEdit,
    onFeatures,
    canUpdate = true,
}: {
    plan: Plan;
    onEdit: (plan: Plan) => void;
    onFeatures: (plan: Plan) => void;
    canUpdate?: boolean;
}) {
    const subscriptions = plan.subscriptions_count ?? 0;

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(plan.codigo);
            toastManager.success({ title: 'Código copiado', description: plan.codigo, duration: 2000 });
        } catch {
            toastManager.error({ title: 'No se pudo copiar el código' });
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 cursor-pointer"
                    aria-label={`Acciones para ${plan.nombre}`}
                >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={copyCode} className="cursor-pointer gap-2">
                    <Copy className="size-4" strokeWidth={2.25} />
                    Copiar código
                </DropdownMenuItem>
                {canUpdate ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onEdit(plan)} className="cursor-pointer gap-2">
                            <Pencil className="size-4" strokeWidth={2.25} />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onSelect={() => onFeatures(plan)}
                            className="cursor-pointer gap-2 text-primary focus:text-primary"
                        >
                            <KeyRound className="size-4" strokeWidth={2.25} />
                            Gestionar features
                        </DropdownMenuItem>
                    </>
                ) : null}
                {subscriptions > 0 ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled className="gap-2 text-xs text-muted-foreground">
                            <Lock className="size-3.5" strokeWidth={2.25} />
                            {subscriptions === 1
                                ? '1 suscripción asociada'
                                : `${subscriptions} suscripciones asociadas`}
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
