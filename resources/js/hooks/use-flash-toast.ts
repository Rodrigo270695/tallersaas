import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

function openWhatsAppUrl(url: unknown): void {
    if (typeof url !== 'string' || !url.startsWith('https://wa.me/')) {
        return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
}

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            openWhatsAppUrl(flash?.whatsapp_url);

            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            toast[data.type](data.message);
        });
    }, []);
}
