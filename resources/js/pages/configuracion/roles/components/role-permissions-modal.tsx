import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckSquare,
    ChevronDown,
    KeyRound,
    Loader2,
    Minus,
    Search,
    Square,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { actionLabel, moduleLabel } from '@/lib/permission-labels';
import { toastManager } from '@/lib/toast';
import { cn } from '@/lib/utils';
import roles from '@/routes/configuracion/roles';
import type {
    CatalogPermission,
    PermissionGroup,
    PermissionsCatalog,
    Role,
} from '../types';

export type RolePermissionsModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: Role | null;
    catalog: PermissionsCatalog;
};

export function RolePermissionsModal({
    open,
    onOpenChange,
    role,
    catalog,
}: RolePermissionsModalProps) {
    if (!open || role === null) {
        return null;
    }

    return (
        <RolePermissionsModalOpen
            key={role.id}
            role={role}
            catalog={catalog}
            onOpenChange={onOpenChange}
        />
    );
}

function initialSelectedModules(
    catalog: PermissionsCatalog,
    selected: Set<string>,
): Set<string> {
    const modules = new Set<string>();

    for (const group of catalog) {
        if (group.permissions.some((p) => selected.has(p.name))) {
            modules.add(group.module);
        }
    }

    return modules;
}

function RolePermissionsModalOpen({
    role,
    catalog,
    onOpenChange,
}: {
    role: Role;
    catalog: PermissionsCatalog;
    onOpenChange: (open: boolean) => void;
}) {
    const initialNames = new Set(role.permissions.map((p) => p.name));
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(initialNames),
    );
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState<Set<string>>(() =>
        initialSelectedModules(catalog, initialNames),
    );
    const [processing, setProcessing] = useState(false);
    const [initialSnapshot] = useState<Set<string>>(() => new Set(initialNames));

    const isSystem = role.is_system === true;

    const totalPermissions = useMemo(
        () => catalog.reduce((acc, g) => acc + g.permissions.length, 0),
        [catalog],
    );

    const filteredGroups = useMemo(() => {
        const q = query.trim().toLowerCase();

        if (q === '') {
            return catalog;
        }

        const result: PermissionGroup[] = [];

        for (const group of catalog) {
            const moduleMatches = moduleLabel(group.module)
                .toLowerCase()
                .includes(q);

            const matchedPerms = group.permissions.filter((perm) => {
                if (moduleMatches) {
                    return true;
                }

                return (
                    perm.name.toLowerCase().includes(q) ||
                    actionLabel(perm.action).toLowerCase().includes(q)
                );
            });

            if (matchedPerms.length > 0) {
                result.push({
                    module: group.module,
                    permissions: matchedPerms,
                });
            }
        }

        return result;
    }, [catalog, query]);

    const expandedSet = useMemo(() => {
        if (query.trim() !== '') {
            return new Set(filteredGroups.map((g) => g.module));
        }

        return expanded;
    }, [expanded, filteredGroups, query]);

    const toggleModule = (module: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);

            if (next.has(module)) {
                next.delete(module);
            } else {
                next.add(module);
            }

            return next;
        });
    };

    const togglePermission = (perm: CatalogPermission) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(perm.name)) {
                next.delete(perm.name);
            } else {
                next.add(perm.name);
            }

            return next;
        });
    };

    const toggleGroup = (group: PermissionGroup, select: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);

            for (const perm of group.permissions) {
                if (select) {
                    next.add(perm.name);
                } else {
                    next.delete(perm.name);
                }
            }

            return next;
        });
    };

    const expandAll = () => setExpanded(new Set(catalog.map((g) => g.module)));
    const collapseAll = () => setExpanded(new Set());

    const selectAll = () => {
        const next = new Set<string>();

        for (const group of catalog) {
            for (const perm of group.permissions) {
                next.add(perm.name);
            }
        }

        setSelected(next);
    };
    const clearAll = () => {
        setSelected(new Set());
    };

    const isDirty = useMemo(() => {
        if (selected.size !== initialSnapshot.size) {
            return true;
        }

        for (const name of selected) {
            if (!initialSnapshot.has(name)) {
                return true;
            }
        }

        return false;
    }, [selected, initialSnapshot]);

    const handleClose = (next: boolean) => {
        if (!next && isDirty) {
            if (
                !window.confirm(
                    'Hay cambios sin guardar. ¿Descartarlos y cerrar?',
                )
            ) {
                return;
            }
        }

        onOpenChange(next);
    };

    const onSave = () => {
        if (!role) {
            return;
        }

        if (isSystem && selected.size === 0) {
            toastManager.error({
                title: 'No puedes dejar sin permisos un rol protegido.',
            });

            return;
        }

        if (isSystem) {
            const ok = window.confirm(
                `Estás modificando permisos del rol protegido "${role.name}". Un cambio incorrecto puede dejar usuarios sin acceso. ¿Continuar?`,
            );

            if (!ok) {
                return;
            }
        }

        setProcessing(true);
        router.put(
            roles.updatePermissions(role.id).url,
            { permissions: Array.from(selected) },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => onOpenChange(false),
                onError: (errs) => {
                    const record = errs as Record<string, string | undefined>;
                    const specific =
                        record.permissions ??
                        Object.values(record).find(
                            (value) =>
                                typeof value === 'string' && value.length > 0,
                        );
                    toastManager.error({
                        title: specific ?? 'No se pudieron guardar los permisos.',
                    });
                },
            },
        );
    };

    return (
        <Dialog open onOpenChange={handleClose}>
            <DialogContent
                className={cn(
                    'flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg',
                    'shadow-2xl shadow-foreground/15 ring-1 ring-border/40',
                    'data-[state=open]:duration-400 data-[state=open]:ease-[cubic-bezier(0.16,1,0.3,1)]',
                    'data-[state=open]:slide-in-from-bottom-6 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                    'data-[state=closed]:duration-200 data-[state=closed]:ease-in',
                )}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader className="shrink-0 border-b border-border/60 px-5 pt-5 pb-3">
                    <div className="flex items-start gap-3">
                        <div
                            className={cn(
                                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                isSystem
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : 'bg-primary/10 text-primary',
                            )}
                        >
                            <KeyRound className="size-4" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-base font-semibold tracking-tight">
                                Gestionar permisos
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {role && (
                                    <span className="font-mono text-foreground/80">
                                        {role.name}
                                    </span>
                                )}
                                {role && ' · '}
                                Marca lo que este rol puede hacer.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {isSystem && (
                    <div className="shrink-0 border-b border-amber-500/40 bg-amber-500/10 px-5 py-3 text-xs">
                        <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                            <AlertTriangle
                                className="mt-0.5 size-4 shrink-0"
                                strokeWidth={2.5}
                                aria-hidden
                            />
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold">
                                    Rol protegido
                                </p>
                                <p className="text-amber-700/90 dark:text-amber-300/90">
                                    Puedes ajustar permisos, pero no dejarlo
                                    vacío. Un cambio incorrecto puede bloquear
                                    el acceso de usuarios existentes.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex shrink-0 flex-col gap-2 border-b border-border/60 bg-muted/20 px-5 py-3">
                    <div className="relative">
                        <Search
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3 z-10 size-3.5 -translate-y-1/2 text-muted-foreground/90"
                            strokeWidth={2.25}
                        />
                        <Input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar módulo o permiso…"
                            className="h-8 pl-9 text-xs"
                        />
                        {query.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label="Limpiar búsqueda"
                                className="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="size-3" strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[0.7rem] font-medium text-muted-foreground">
                            {selected.size}/{totalPermissions} seleccionados
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={
                                    expanded.size === 0 ? expandAll : collapseAll
                                }
                                disabled={filteredGroups.length === 0}
                                className="h-7 cursor-pointer px-2 text-[0.7rem]"
                            >
                                {expanded.size === 0
                                    ? 'Expandir todo'
                                    : 'Colapsar todo'}
                            </Button>
                            <span
                                aria-hidden
                                className="text-muted-foreground/40"
                            >
                                |
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={
                                    selected.size === totalPermissions
                                        ? clearAll
                                        : selectAll
                                }
                                className="h-7 cursor-pointer px-2 text-[0.7rem]"
                            >
                                {selected.size === totalPermissions
                                    ? 'Limpiar todo'
                                    : 'Seleccionar todo'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
                    {filteredGroups.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-xs text-muted-foreground">
                            Ningún permiso coincide con la búsqueda.
                        </div>
                    ) : (
                        <ul className="flex flex-col">
                            {filteredGroups.map((group) => (
                                <TreeModuleNode
                                    key={group.module}
                                    group={group}
                                    expanded={expandedSet.has(group.module)}
                                    onToggleModule={() =>
                                        toggleModule(group.module)
                                    }
                                    selected={selected}
                                    onTogglePermission={togglePermission}
                                    onToggleGroup={(select) =>
                                        toggleGroup(group, select)
                                    }
                                    disabled={false}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                <DialogFooter className="shrink-0 border-t border-border/60 px-5 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleClose(false)}
                        disabled={processing}
                        className="cursor-pointer"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={onSave}
                        disabled={processing || !isDirty}
                        className={cn(
                            'cursor-pointer gap-2 disabled:cursor-not-allowed',
                            isSystem &&
                                'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500/40',
                        )}
                    >
                        {processing && (
                            <Loader2
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        )}
                        {processing ? 'Guardando…' : 'Guardar permisos'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type TreeModuleNodeProps = {
    group: PermissionGroup;
    expanded: boolean;
    onToggleModule: () => void;
    selected: Set<string>;
    onTogglePermission: (perm: CatalogPermission) => void;
    onToggleGroup: (select: boolean) => void;
    disabled: boolean;
};

function TreeModuleNode({
    group,
    expanded,
    onToggleModule,
    selected,
    onTogglePermission,
    onToggleGroup,
    disabled,
}: TreeModuleNodeProps) {
    const total = group.permissions.length;
    const selectedInGroup = group.permissions.filter((p) =>
        selected.has(p.name),
    ).length;
    const state: 'all' | 'some' | 'none' =
        selectedInGroup === total
            ? 'all'
            : selectedInGroup > 0
              ? 'some'
              : 'none';

    return (
        <li className="flex flex-col">
            <div
                className={cn(
                    'group/node flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors',
                    'hover:bg-muted/60',
                )}
            >
                <button
                    type="button"
                    onClick={onToggleModule}
                    aria-label={expanded ? 'Colapsar módulo' : 'Expandir módulo'}
                    className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <ChevronDown
                        className={cn(
                            'size-3.5 transition-transform duration-200',
                            !expanded && '-rotate-90',
                        )}
                        strokeWidth={2.5}
                    />
                </button>

                <TreeCheckbox
                    state={state}
                    onClick={() => onToggleGroup(state !== 'all')}
                    disabled={disabled}
                    ariaLabel={`Seleccionar ${moduleLabel(group.module)}`}
                />

                <span className="flex-1 truncate text-xs font-medium text-foreground">
                    {moduleLabel(group.module)}
                </span>
                <span className="shrink-0 font-mono text-[0.65rem] tabular-nums text-muted-foreground">
                    {selectedInGroup}/{total}
                </span>
            </div>

            {expanded && (
                <ul className="relative ml-3 flex flex-col border-l border-border/50 pl-3">
                    {group.permissions.map((perm) => (
                        <li key={perm.id}>
                            <div
                                role="button"
                                tabIndex={disabled ? -1 : 0}
                                onClick={() => {
                                    if (!disabled) {
                                        onTogglePermission(perm);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (disabled) {
                                        return;
                                    }

                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onTogglePermission(perm);
                                    }
                                }}
                                aria-disabled={disabled || undefined}
                                className={cn(
                                    'relative flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors',
                                    'hover:bg-muted/60',
                                    'cursor-pointer',
                                    disabled && 'cursor-not-allowed opacity-50',
                                    selected.has(perm.name) && 'bg-primary/5',
                                )}
                            >
                                <span
                                    aria-hidden
                                    className="absolute top-1/2 -left-3 h-px w-2.5 bg-border/50"
                                />
                                <TreeCheckbox
                                    state={
                                        selected.has(perm.name) ? 'all' : 'none'
                                    }
                                    onClick={() => onTogglePermission(perm)}
                                    disabled={disabled}
                                    ariaLabel={perm.name}
                                />
                                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                                    <span className="truncate text-xs text-foreground">
                                        {actionLabel(perm.action)}
                                    </span>
                                    <span className="truncate font-mono text-[0.65rem] text-muted-foreground">
                                        {perm.name}
                                    </span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
}

type TreeCheckboxProps = {
    state: 'all' | 'some' | 'none';
    onClick: () => void;
    disabled?: boolean;
    ariaLabel: string;
};

function TreeCheckbox({
    state,
    onClick,
    disabled,
    ariaLabel,
}: TreeCheckboxProps) {
    const Icon =
        state === 'all' ? CheckSquare : state === 'some' ? Minus : Square;

    return (
        <span
            role="checkbox"
            aria-checked={
                state === 'all' ? true : state === 'some' ? 'mixed' : false
            }
            aria-label={ariaLabel}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            onClick={(e) => {
                e.stopPropagation();

                if (disabled) {
                    return;
                }

                onClick();
            }}
            onKeyDown={(e) => {
                if (disabled) {
                    return;
                }

                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onClick();
                }
            }}
            className={cn(
                'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors',
                'hover:text-foreground',
                state !== 'none' && 'text-primary',
                disabled && 'cursor-not-allowed opacity-50',
            )}
        >
            <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
        </span>
    );
}
