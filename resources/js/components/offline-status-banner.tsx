import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { flushMutations, listMutations, MUTATIONS_EVENT } from '@/lib/offline/mutations';

export function OfflineStatusBanner() {
    const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
    const [pending, setPending] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const refresh = () => {
            void listMutations().then((items) => {
                setPending(items.length);
                setError(items.find((item) => item.lastError)?.lastError ?? null);
            });
        };

        const onOnline = () => {
            setOnline(true);
            refresh();
        };
        const onOffline = () => setOnline(false);

        refresh();
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        window.addEventListener(MUTATIONS_EVENT, refresh);

        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
            window.removeEventListener(MUTATIONS_EVENT, refresh);
        };
    }, []);

    if (online && pending === 0) {
        return null;
    }

    return (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
            <p className="flex items-center gap-2">
                <WifiOff className="size-4 shrink-0" />
                {online
                    ? `${pending} ${pending === 1 ? 'cambio' : 'cambios'} por enviar.`
                    : 'Sin internet. Puedes seguir trabajando: los cambios se guardan en esta tablet y se envían al reconectar.'}
                {error ? ` ${error}` : ''}
            </p>
            {online && pending > 0 ? (
                <Button type="button" size="sm" variant="outline" className="cursor-pointer" onClick={() => void flushMutations()}>
                    Enviar ahora
                </Button>
            ) : null}
        </div>
    );
}
