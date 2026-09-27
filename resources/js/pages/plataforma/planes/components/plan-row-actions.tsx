import { MoreHorizontal, Pencil, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    if (!canUpdate) {
        return null;
    }

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
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                    onSelect={() => onEdit(plan)}
                    className="cursor-pointer gap-2"
                >
                    <Pencil className="size-4" strokeWidth={2.25} />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={() => onFeatures(plan)}
                    className="cursor-pointer gap-2"
                >
                    <SlidersHorizontal className="size-4" strokeWidth={2.25} />
                    Límites del plan
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
