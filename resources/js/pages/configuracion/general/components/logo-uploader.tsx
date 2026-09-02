import { ImagePlus, RotateCcw, Sparkles, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 2 * 1024 * 1024;

export type LogoUploaderProps = {
    currentUrl: string | null;
    file: File | null;
    pendingRemoval: boolean;
    error?: string;
    canUpdate: boolean;
    onSelect: (file: File) => void;
    onClearSelection: () => void;
    onTogglePendingRemoval: () => void;
};

export function LogoUploader({
    currentUrl,
    file,
    pendingRemoval,
    error,
    canUpdate,
    onSelect,
    onClearSelection,
    onTogglePendingRemoval,
}: LogoUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);

            return;
        }

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const handleFiles = (files: FileList | null) => {
        setLocalError(null);
        if (!files || files.length === 0) {
            return;
        }

        const candidate = files[0];

        if (!ACCEPTED_MIME.includes(candidate.type)) {
            setLocalError('Usa JPG, PNG, WEBP o SVG de hasta 2 MB.');

            return;
        }

        if (candidate.size > MAX_BYTES) {
            setLocalError('Usa JPG, PNG, WEBP o SVG de hasta 2 MB.');

            return;
        }

        onSelect(candidate);
    };

    const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setIsDragging(false);
        if (!canUpdate) {
            return;
        }
        handleFiles(event.dataTransfer.files);
    };

    const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        if (canUpdate) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = () => setIsDragging(false);

    const openPicker = () => {
        if (canUpdate) {
            inputRef.current?.click();
        }
    };

    const hasNewFile = file !== null;
    const hasExistingLogo = currentUrl !== null;
    const showPreview = hasNewFile || hasExistingLogo;
    const previewSrc = previewUrl ?? currentUrl;
    const effectiveError = error ?? localError;

    useEffect(() => {
        if (!file && inputRef.current) {
            inputRef.current.value = '';
        }
    }, [file]);

    return (
        <div className="flex flex-col gap-2">
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_MIME.join(',')}
                className="sr-only"
                onChange={(event) => handleFiles(event.target.files)}
                disabled={!canUpdate}
            />

            {showPreview ? (
                <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:gap-5">
                    <div
                        className={cn(
                            'flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40 p-2',
                            pendingRemoval && !hasNewFile && 'opacity-40 grayscale',
                        )}
                    >
                        {previewSrc && (
                            <img
                                src={previewSrc}
                                alt="Vista previa del logo"
                                className="size-full object-contain"
                            />
                        )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex min-w-0 flex-col gap-0.5">
                            {hasNewFile && file && (
                                <>
                                    <span className="truncate text-sm font-medium">
                                        Pendiente: {file.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                </>
                            )}
                            {!hasNewFile && pendingRemoval && (
                                <span className="text-sm font-medium text-destructive">
                                    Se quitará al guardar
                                </span>
                            )}
                            {!hasNewFile && !pendingRemoval && (
                                <span className="text-sm text-muted-foreground">
                                    Logo actual del taller
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={openPicker}
                                disabled={!canUpdate}
                                className="h-8 cursor-pointer gap-1.5 text-xs"
                            >
                                <Upload className="size-3.5" strokeWidth={2.25} />
                                {hasNewFile ? 'Elegir otro' : 'Reemplazar'}
                            </Button>

                            {hasNewFile ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={onClearSelection}
                                    disabled={!canUpdate}
                                    className="h-8 cursor-pointer gap-1.5 text-xs"
                                >
                                    <X className="size-3.5" strokeWidth={2.25} />
                                    Cancelar
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={pendingRemoval ? 'outline' : 'ghost'}
                                    onClick={onTogglePendingRemoval}
                                    disabled={!canUpdate}
                                    className={cn(
                                        'h-8 cursor-pointer gap-1.5 text-xs',
                                        !pendingRemoval &&
                                            'text-destructive hover:text-destructive',
                                    )}
                                >
                                    {pendingRemoval ? (
                                        <>
                                            <RotateCcw
                                                className="size-3.5"
                                                strokeWidth={2.25}
                                            />
                                            Deshacer
                                        </>
                                    ) : (
                                        <>
                                            <X className="size-3.5" strokeWidth={2.25} />
                                            Quitar
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <label
                    onClick={openPicker}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-8 text-center transition-colors hover:bg-muted/40',
                        isDragging && 'border-primary/60 bg-primary/5',
                        !canUpdate && 'cursor-not-allowed opacity-60',
                    )}
                >
                    <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                        {isDragging ? (
                            <Sparkles className="size-5" strokeWidth={2.25} />
                        ) : (
                            <ImagePlus className="size-5" strokeWidth={2.25} />
                        )}
                    </span>
                    <span className="text-sm font-medium">
                        Arrastra el logo o haz clic para subirlo
                    </span>
                    <span className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP o SVG · máximo 2 MB
                    </span>
                </label>
            )}

            {effectiveError && (
                <p className="text-xs text-destructive" role="alert">
                    {effectiveError}
                </p>
            )}
        </div>
    );
}
