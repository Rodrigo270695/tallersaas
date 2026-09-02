import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type DocumentTypeOption = {
    value: string;
    label: string;
};

export type DocumentTypeSelectProps = {
    id: string;
    value: string;
    onValueChange: (next: string) => void;
    /** Catálogo de tipos de documento a mostrar (DNI, RUC, CE, PAS…). */
    options: readonly DocumentTypeOption[];
    disabled?: boolean;
    invalid?: boolean;
    className?: string;
};

/**
 * Selector de tipo de documento reutilizable. El componente que lo use
 * decide el catálogo (`options`) para poder reutilizarlo en clientes,
 * proveedores, usuarios, etc.
 */
export function DocumentTypeSelect({
    id,
    value,
    onValueChange,
    options,
    disabled,
    invalid,
    className,
}: DocumentTypeSelectProps) {
    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger
                id={id}
                aria-invalid={invalid}
                className={cn('w-full cursor-pointer', invalid && 'border-destructive', className)}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
