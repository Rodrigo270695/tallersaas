import { router } from '@inertiajs/react';
import { FilterChips } from '@/components/data-page';
import type { FilterChip } from '@/components/data-page';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type ReportePeriodo = 'hoy' | 'semana' | 'mes' | 'mes_pasado';

export type SedeOption = {
    id: string;
    nombre: string;
    codigo: string;
};

const ALL = '__all__';

const PERIODOS: FilterChip<ReportePeriodo>[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Este mes' },
    { value: 'mes_pasado', label: 'Mes pasado' },
];

export function ReporteFilters({
    routeUrl,
    periodo,
    sedeId,
    sedes,
}: {
    routeUrl: string;
    periodo: ReportePeriodo;
    sedeId: string | null;
    sedes: readonly SedeOption[];
}) {
    const apply = (next: { periodo?: ReportePeriodo; sede_id?: string | null }) => {
        const nextPeriodo = next.periodo ?? periodo;
        const nextSede = next.sede_id !== undefined ? next.sede_id : sedeId;

        router.get(
            routeUrl,
            {
                periodo: nextPeriodo,
                ...(nextSede ? { sede_id: nextSede } : {}),
            },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterChips
                ariaLabel="Filtrar por periodo"
                value={periodo}
                onChange={(value) => apply({ periodo: value })}
                options={PERIODOS}
            />
            {sedes.length > 0 && (
                <Select
                    value={sedeId ?? ALL}
                    onValueChange={(value) => apply({ sede_id: value === ALL ? null : value })}
                >
                    <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por sede">
                        <SelectValue placeholder="Todas las sedes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Todas las sedes</SelectItem>
                        {sedes.map((sede) => (
                            <SelectItem key={sede.id} value={sede.id}>
                                {sede.nombre}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
