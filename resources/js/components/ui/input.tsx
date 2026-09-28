import * as React from 'react';
import { soloDecimal, soloEntero } from '@/lib/numeros';
import { cn } from '@/lib/utils';

function decimalPlaces(step: string | number | undefined): number | null {
    if (step === undefined) {
        return null;
    }

    const text = String(step);
    const dot = text.indexOf('.');

    return dot === -1 ? 0 : text.length - dot - 1;
}

function sanitizeNumber(value: string, step: string | number | undefined): string {
    const places = decimalPlaces(step);

    if (places === null) {
        return value.includes('.') ? soloDecimal(value, 4, 10) : soloEntero(value, 10);
    }

    if (places === 0) {
        return soloEntero(value, 10);
    }

    return soloDecimal(value, places, 10);
}

function Input({ className, type, step, onChange, onKeyDown, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            type={type}
            step={step}
            data-slot="input"
            onKeyDown={(event) => {
                if (type === 'number' && (event.key === 'e' || event.key === 'E' || event.key === '+')) {
                    event.preventDefault();
                }

                onKeyDown?.(event);
            }}
            onChange={(event) => {
                if (type === 'number') {
                    const cleaned = sanitizeNumber(event.target.value, step);
                    if (cleaned !== event.target.value) {
                        event.target.value = cleaned;
                    }
                }

                onChange?.(event);
            }}
            className={cn(
                'border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
                className,
            )}
            {...props}
        />
    );
}

export { Input };
