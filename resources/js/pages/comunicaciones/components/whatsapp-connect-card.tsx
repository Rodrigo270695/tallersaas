import { router } from '@inertiajs/react';
import { Loader2, LogOut, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatBadge } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WhatsAppProps } from '../types';
import { WhatsAppDisconnectDialog } from './whatsapp-disconnect-dialog';
import { WhatsAppTestMessageDialog } from './whatsapp-test-message-dialog';

export function WhatsAppConnectCard({
    whatsapp,
    canManage,
}: {
    whatsapp: WhatsAppProps;
    canManage: boolean;
}) {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loadingQr, setLoadingQr] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [disconnectOpen, setDisconnectOpen] = useState(false);
    const [testOpen, setTestOpen] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPoll = useCallback(() => {
        if (pollRef.current !== null) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    useEffect(() => () => stopPoll(), [stopPoll]);

    const fetchQr = useCallback(async () => {
        setLoadingQr(true);
        try {
            const res = await fetch('/comunicaciones/whatsapp/qr', {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            const data = (await res.json()) as { ready?: boolean; qr_code?: string };
            if (data.ready) {
                setQrCode(null);
                router.reload({ only: ['whatsapp'] });
                stopPoll();
            } else if (data.qr_code) {
                setQrCode(data.qr_code);
            }
        } finally {
            setLoadingQr(false);
        }
    }, [stopPoll]);

    const handleConnect = useCallback(() => {
        if (!canManage) {
            return;
        }

        setSyncing(true);
        router.post(
            '/comunicaciones/whatsapp/sync',
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncing(false),
                onSuccess: () => {
                    void fetchQr();
                    stopPoll();
                    pollRef.current = setInterval(() => {
                        void fetchQr();
                    }, 4000);
                },
            },
        );
    }, [canManage, fetchQr, stopPoll]);

    if (!whatsapp.configured) {
        return (
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MessageCircle className="size-5" />
                        Sinc. WhatsApp
                    </CardTitle>
                    <CardDescription>
                        OpenWA no está configurado en el servidor. Define OPENWA_ENABLED y
                        OPENWA_API_KEY para vincular un número.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const session = whatsapp.session;
    const isReady = session?.is_ready === true;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MessageCircle className="size-5 text-emerald-600" />
                            Sinc. WhatsApp
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Un solo número para recordatorios, cola saliente y aviso de OT lista.
                        </CardDescription>
                    </div>
                    <StatBadge
                        label={
                            isReady
                                ? 'Conectado'
                                : session?.last_error
                                  ? 'Error'
                                  : 'Pendiente'
                        }
                        value=""
                        variant={isReady ? 'success' : session?.last_error ? 'danger' : 'warning'}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {isReady && session?.phone ? (
                    <p className="text-sm text-muted-foreground">
                        Número vinculado:{' '}
                        <span className="font-medium text-foreground">{session.phone}</span>
                    </p>
                ) : null}

                {session?.last_error ? (
                    <p className="text-sm text-destructive">{session.last_error}</p>
                ) : null}

                {session?.last_synced_at ? (
                    <p className="text-xs text-muted-foreground">
                        Última sincronización:{' '}
                        {new Date(session.last_synced_at).toLocaleString('es-PE')}
                    </p>
                ) : null}

                {!isReady && qrCode ? (
                    <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4">
                        <p className="text-sm font-medium">Escanea el QR con WhatsApp</p>
                        <img src={qrCode} alt="QR WhatsApp" className="max-w-[220px] rounded-md" />
                    </div>
                ) : null}

                {canManage ? (
                    <div className="flex flex-wrap gap-2">
                        {!isReady ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleConnect}
                                disabled={syncing || loadingQr}
                                className="cursor-pointer"
                            >
                                {syncing || loadingQr ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                    <MessageCircle className="mr-2 size-4" />
                                )}
                                Vincular WhatsApp
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setTestOpen(true)}
                                    disabled={syncing}
                                    className="cursor-pointer"
                                >
                                    <Send className="mr-2 size-4" />
                                    Enviar prueba
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleConnect}
                                    disabled={syncing || disconnectOpen}
                                    className="cursor-pointer"
                                >
                                    {syncing ? (
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 size-4" />
                                    )}
                                    Sincronizar estado
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="cursor-pointer text-destructive hover:text-destructive"
                                    onClick={() => setDisconnectOpen(true)}
                                    disabled={syncing}
                                >
                                    <LogOut className="mr-2 size-4" />
                                    Cerrar sesión
                                </Button>
                            </>
                        )}
                    </div>
                ) : null}
            </CardContent>

            <WhatsAppDisconnectDialog
                open={disconnectOpen}
                onOpenChange={setDisconnectOpen}
                phone={session?.phone ?? null}
                onSuccess={() => {
                    setQrCode(null);
                    stopPoll();
                }}
            />

            <WhatsAppTestMessageDialog open={testOpen} onOpenChange={setTestOpen} />
        </Card>
    );
}
