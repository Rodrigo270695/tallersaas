import { Head, router } from '@inertiajs/react';
import { Phone, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Siniestro = {
    numero: string;
    estado: string;
    aseguradora: string | null;
    monto_reclamado: string;
    monto_seguro: string;
    monto_cliente: string;
};

type Orden = {
    numero: string;
    estado: string;
    total: string;
    ingreso_at: string | null;
    url: string | null;
    siniestro: Siniestro | null;
};

type Presupuesto = {
    numero: string;
    estado: string;
    total: string;
    created_at: string | null;
    url: string | null;
};

type Vehiculo = {
    id: string;
    placa: string;
    label: string;
    cliente: string;
    poliza: string | null;
    cobertura_pct: string | null;
    aseguradora: string | null;
    ordenes: Orden[];
    presupuestos: Presupuesto[];
};

type Props = {
    placa: string;
    taller: { nombre: string; telefono: string | null; logo_url: string | null };
    vehiculos: Vehiculo[];
};

const estadoOrden: Record<string, string> = {
    abierta: 'Recepcionada',
    en_proceso: 'En taller',
    lista: 'Lista para recoger',
    entregada: 'Entregada',
};

const estadoPresupuesto: Record<string, string> = {
    borrador: 'Borrador',
    enviado: 'Enviado',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    vencido: 'Vencido',
    convertido: 'Convertido en orden',
};

const estadoSiniestro: Record<string, string> = {
    abierto: 'Abierto',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    cerrado: 'Cerrado',
};

const money = (value: string | number | null): string =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value ?? 0));

const when = (iso: string | null): string => {
    if (!iso) {
        return '';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function PlacaPortal({ placa, taller, vehiculos }: Props) {
    const [value, setValue] = useState(placa);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const next = value.trim();
        router.get('/placa', next === '' ? {} : { placa: next }, { preserveState: true });
    };

    return (
        <>
            <Head title="Consulta por placa" />
            <div className="min-h-dvh bg-stone-100">
                <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
                    <header className="mb-5 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
                                    {taller.nombre}
                                </p>
                                <h1 className="mt-1 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                                    Consulta por placa
                                </h1>
                                <p className="mt-1 text-sm text-stone-600">
                                    Historial, presupuestos y estado de las órdenes.
                                </p>
                            </div>
                            {taller.telefono ? (
                                <a
                                    href={`tel:${taller.telefono}`}
                                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-stone-900 px-3.5 text-sm font-medium text-white hover:bg-stone-800"
                                >
                                    <Phone className="size-4" />
                                    {taller.telefono}
                                </a>
                            ) : null}
                        </div>
                        <form onSubmit={submit} className="mt-4 flex gap-2">
                            <Input
                                value={value}
                                onChange={(event) => setValue(event.target.value.toUpperCase())}
                                placeholder="ABC-123"
                                aria-label="Placa"
                                className="h-11 font-mono text-base uppercase"
                                autoComplete="off"
                            />
                            <Button type="submit" className="h-11 cursor-pointer gap-2 px-4">
                                <Search className="size-4" />
                                Buscar
                            </Button>
                        </form>
                    </header>

                    {placa !== '' && vehiculos.length === 0 ? (
                        <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
                            No encontramos un vehículo con la placa {placa}.
                        </div>
                    ) : null}

                    <div className="space-y-4">
                        {vehiculos.map((vehiculo) => (
                            <article
                                key={vehiculo.id}
                                className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-6"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-mono text-2xl font-semibold tracking-tight text-stone-900">
                                            {vehiculo.placa}
                                        </p>
                                        <p className="text-sm text-stone-600">
                                            {vehiculo.label}
                                            {vehiculo.cliente ? ` · ${vehiculo.cliente}` : ''}
                                        </p>
                                    </div>
                                    {vehiculo.aseguradora ? (
                                        <div className="rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-900 ring-1 ring-orange-200">
                                            <p className="font-semibold">{vehiculo.aseguradora}</p>
                                            <p>
                                                {vehiculo.poliza ? `Póliza ${vehiculo.poliza}` : 'Sin número de póliza'}
                                                {vehiculo.cobertura_pct
                                                    ? ` · cobertura ${Number(vehiculo.cobertura_pct)}%`
                                                    : ''}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>

                                <section className="mt-5">
                                    <h2 className="text-sm font-semibold text-stone-900">Órdenes</h2>
                                    {vehiculo.ordenes.length === 0 ? (
                                        <p className="mt-2 text-sm text-stone-500">Sin órdenes registradas.</p>
                                    ) : (
                                        <ul className="mt-2 divide-y divide-stone-100">
                                            {vehiculo.ordenes.map((orden) => (
                                                <li key={orden.numero} className="py-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="font-medium text-stone-900">{orden.numero}</p>
                                                            <p className="text-xs text-stone-500">
                                                                {estadoOrden[orden.estado] ?? orden.estado}
                                                                {orden.ingreso_at ? ` · ${when(orden.ingreso_at)}` : ''}
                                                                {` · ${money(orden.total)}`}
                                                            </p>
                                                        </div>
                                                        {orden.url ? (
                                                            <a
                                                                href={orden.url}
                                                                className="text-sm font-medium text-orange-700 hover:underline"
                                                            >
                                                                Ver seguimiento
                                                            </a>
                                                        ) : null}
                                                    </div>
                                                    {orden.siniestro ? (
                                                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                                            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-950 ring-1 ring-emerald-200">
                                                                <p className="text-xs font-medium tracking-wide uppercase">
                                                                    Paga el seguro
                                                                </p>
                                                                <p className="text-lg font-semibold">
                                                                    {money(orden.siniestro.monto_seguro)}
                                                                </p>
                                                                <p className="text-xs">
                                                                    {orden.siniestro.aseguradora ?? 'Aseguradora'} ·{' '}
                                                                    {orden.siniestro.numero} ·{' '}
                                                                    {estadoSiniestro[orden.siniestro.estado] ??
                                                                        orden.siniestro.estado}
                                                                </p>
                                                            </div>
                                                            <div className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-900 ring-1 ring-stone-200">
                                                                <p className="text-xs font-medium tracking-wide uppercase">
                                                                    Paga el cliente
                                                                </p>
                                                                <p className="text-lg font-semibold">
                                                                    {money(orden.siniestro.monto_cliente)}
                                                                </p>
                                                                <p className="text-xs">
                                                                    Reclamado {money(orden.siniestro.monto_reclamado)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>

                                <section className="mt-4">
                                    <h2 className="text-sm font-semibold text-stone-900">Presupuestos</h2>
                                    {vehiculo.presupuestos.length === 0 ? (
                                        <p className="mt-2 text-sm text-stone-500">Sin presupuestos.</p>
                                    ) : (
                                        <ul className="mt-2 divide-y divide-stone-100">
                                            {vehiculo.presupuestos.map((presupuesto) => (
                                                <li
                                                    key={presupuesto.numero}
                                                    className="flex flex-wrap items-center justify-between gap-2 py-3"
                                                >
                                                    <div>
                                                        <p className="font-medium text-stone-900">{presupuesto.numero}</p>
                                                        <p className="text-xs text-stone-500">
                                                            {estadoPresupuesto[presupuesto.estado] ?? presupuesto.estado}
                                                            {presupuesto.created_at
                                                                ? ` · ${when(presupuesto.created_at)}`
                                                                : ''}
                                                            {` · ${money(presupuesto.total)}`}
                                                        </p>
                                                    </div>
                                                    {presupuesto.url ? (
                                                        <a
                                                            href={presupuesto.url}
                                                            className="text-sm font-medium text-orange-700 hover:underline"
                                                        >
                                                            Ver presupuesto
                                                        </a>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
