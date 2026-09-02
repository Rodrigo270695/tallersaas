import { TALLERSAAS_DEFAULT_LOGO } from '@/lib/brand';
import { cn } from '@/lib/utils';

type Props = {
    logoUrl?: string | null;
    className?: string;
};

/**
 * Logo del taller o, si no hay uno propio, el logo TallerSaaS original.
 */
export function TallerLogoMark({ logoUrl, className }: Props) {
    const src = logoUrl?.trim() || TALLERSAAS_DEFAULT_LOGO;

    return (
        <img
            src={src}
            alt=""
            className={cn('shrink-0 object-contain', className)}
        />
    );
}
