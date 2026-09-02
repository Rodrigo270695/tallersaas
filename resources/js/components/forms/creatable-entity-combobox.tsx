import { router } from '@inertiajs/react';
import { useState } from 'react';
import { Combobox  } from '@/components/ui/combobox';
import type {ComboboxOption} from '@/components/ui/combobox';

/**
 * Entidad simple con `id` + `nombre`, tal como se guardan los catálogos
 * de marca/modelo (y cualquier catálogo similar) en el backend.
 */
export type EntityOption = {
    id: string;
    nombre: string;
};

export type CreatableEntityComboboxProps = {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    /** Catálogo ya cargado en las props de Inertia de la página actual. */
    options: readonly EntityOption[];
    /** URL del endpoint que crea la entidad (ej. `taller/marcas`). */
    createUrl: string;
    /**
     * Datos extra a enviar junto al nombre al crear (ej. `{ marca_id }`
     * para crear un modelo en cascada bajo una marca).
     */
    extraPayload?: Record<string, string>;
    /** Prop de Inertia que contiene el catálogo, para recargarla parcialmente. */
    optionsPropKey: string;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    createOptionLabel?: (query: string) => string;
    disabled?: boolean;
    clearable?: boolean;
    invalid?: boolean;
    className?: string;
};

/**
 * Combobox reutilizable con "crear al vuelo": si el usuario escribe un
 * valor que no existe en el catálogo, lo envía de inmediato al backend
 * (`router.post`) y, al recibir la respuesta, selecciona la entidad
 * recién creada. Solo recarga la prop de Inertia indicada
 * (`optionsPropKey`), sin refrescar el resto de la página.
 *
 * Pensado para catálogos "en cascada" y creables por tenant, como
 * Marca → Modelo de vehículo.
 */
export function CreatableEntityCombobox({
    id,
    value,
    onChange,
    options,
    createUrl,
    extraPayload,
    optionsPropKey,
    placeholder = 'Busca o selecciona…',
    searchPlaceholder = 'Buscar…',
    emptyMessage = 'Sin resultados.',
    createOptionLabel,
    disabled = false,
    clearable = true,
    invalid = false,
    className,
}: CreatableEntityComboboxProps) {
    const [creating, setCreating] = useState(false);

    const comboboxOptions: ComboboxOption[] = options.map((option) => ({
        value: option.id,
        label: option.nombre,
    }));

    const handleCreateOption = (query: string) => {
        const nombre = query.trim();

        if (nombre === '' || creating) {
            return;
        }

        const antes = new Set(options.map((option) => option.id));
        setCreating(true);

        router.post(
            createUrl,
            { ...extraPayload, nombre },
            {
                preserveScroll: true,
                preserveState: true,
                only: [optionsPropKey],
                onSuccess: (page) => {
                    const next = (page.props[optionsPropKey] as EntityOption[] | undefined) ?? options;
                    const nueva = next.find((option) => !antes.has(option.id));

                    if (nueva) {
                        onChange(nueva.id);
                    }
                },
                onFinish: () => setCreating(false),
            },
        );
    };

    return (
        <Combobox
            id={id}
            options={comboboxOptions}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
            disabled={disabled || creating}
            loading={creating}
            clearable={clearable}
            creatable={false}
            onCreateOption={handleCreateOption}
            createOptionLabel={createOptionLabel ?? ((query) => `Usar «${query.toUpperCase()}»`)}
            className={className}
            aria-invalid={invalid}
        />
    );
}
