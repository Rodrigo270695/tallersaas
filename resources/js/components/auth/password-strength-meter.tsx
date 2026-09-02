import { Check, Circle } from 'lucide-react';
import { useMemo } from 'react';
import { evaluatePassword, type PasswordStrengthLevel } from '@/lib/passwordPolicy';
import { cn } from '@/lib/utils';

type PasswordStrengthMeterProps = {
    password: string;
    className?: string;
};

const LEVEL_SEGMENT_CLASS: Record<Exclude<PasswordStrengthLevel, 'empty'>, string> = {
    weak: 'bg-destructive',
    fair: 'bg-warning',
    good: 'bg-amber-400',
    strong: 'bg-brand-500',
};

const LEVEL_LABEL_CLASS: Record<Exclude<PasswordStrengthLevel, 'empty'>, string> = {
    weak: 'text-destructive',
    fair: 'text-warning',
    good: 'text-amber-400',
    strong: 'text-brand-600 dark:text-brand-300',
};

const LEVEL_LABEL_TEXT: Record<Exclude<PasswordStrengthLevel, 'empty'>, string> = {
    weak: 'Débil',
    fair: 'Regular',
    good: 'Buena',
    strong: 'Fuerte',
};

const REQUIREMENT_LABEL: Record<string, string> = {
    length: 'Al menos 12 caracteres',
    mixed: 'Mayúsculas y minúsculas',
    number: 'Al menos un número',
    symbol: 'Al menos un símbolo',
};

export default function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
    const analysis = useMemo(() => evaluatePassword(password), [password]);

    const filledSegments = analysis.level === 'empty' ? 0 : analysis.metCount;

    return (
        <div className={cn('space-y-3', className)} aria-live="polite" aria-atomic="true">
            <div className="space-y-2">
                <div
                    className="grid grid-cols-4 gap-1.5"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={analysis.totalCount}
                    aria-valuenow={filledSegments}
                    aria-label="Fortaleza de la contraseña"
                >
                    {Array.from({ length: analysis.totalCount }).map((_, index) => {
                        const isFilled = index < filledSegments;
                        const segmentLevel = analysis.level === 'empty' ? 'weak' : analysis.level;

                        return (
                            <span
                                key={index}
                                className={cn(
                                    'h-1.5 rounded-full transition-all duration-300',
                                    isFilled
                                        ? LEVEL_SEGMENT_CLASS[segmentLevel]
                                        : 'bg-muted-foreground/20',
                                )}
                            />
                        );
                    })}
                </div>

                {analysis.level !== 'empty' && (
                    <p
                        className={cn(
                            'text-xs font-semibold tracking-wide uppercase',
                            LEVEL_LABEL_CLASS[analysis.level],
                        )}
                    >
                        {LEVEL_LABEL_TEXT[analysis.level]}
                    </p>
                )}
            </div>

            <ul className="space-y-1.5 text-sm">
                {analysis.requirements.map((requirement) => (
                    <li
                        key={requirement.id}
                        className={cn(
                            'flex items-start gap-2',
                            requirement.met
                                ? 'text-brand-700 dark:text-brand-300'
                                : 'text-muted-foreground',
                        )}
                    >
                        {requirement.met ? (
                            <Check
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-brand-600 dark:text-brand-400"
                                strokeWidth={2.5}
                            />
                        ) : (
                            <Circle
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 opacity-40"
                                strokeWidth={2}
                            />
                        )}
                        <span>{REQUIREMENT_LABEL[requirement.id]}</span>
                    </li>
                ))}
            </ul>

            <p className="text-xs leading-relaxed text-muted-foreground">
                También verificamos que no esté en filtraciones conocidas al guardarla.
            </p>
        </div>
    );
}
