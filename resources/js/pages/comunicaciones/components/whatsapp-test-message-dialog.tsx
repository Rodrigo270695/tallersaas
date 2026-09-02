import { router, usePage } from '@inertiajs/react';
import { Loader2, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function WhatsAppTestMessageDialog({
    open,
    onOpenChange,
    defaultPhone,
    testUrl = '/comunicaciones/whatsapp/test',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultPhone?: string | null;
    testUrl?: string;
}) {
    const errors = usePage().props.errors as Record<string, string> | undefined;
    const [destinatario, setDestinatario] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (open) {
            setDestinatario(defaultPhone ?? '');
            setMensaje('Mensaje de prueba desde TallerSaaS.');
        }
    }, [open, defaultPhone]);

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        router.post(
            testUrl,
            { destinatario, mensaje },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => onOpenChange(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={onSubmit}>
                    <DialogHeader>
                        <DialogTitle>Enviar prueba</DialogTitle>
                        <DialogDescription>
                            Envía un mensaje corto para comprobar que OpenWA está conectado. No uses el
                            mismo número vinculado al taller.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp-test-phone">WhatsApp destino</Label>
                            <Input
                                id="whatsapp-test-phone"
                                type="tel"
                                value={destinatario}
                                onChange={(e) => setDestinatario(e.target.value)}
                                placeholder="987654321"
                                autoComplete="tel"
                                required
                            />
                            {errors?.destinatario ? (
                                <p className="text-sm text-destructive">{errors.destinatario}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    9 dígitos empezando en 9, o con código 51.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="whatsapp-test-message">Mensaje</Label>
                            <Textarea
                                id="whatsapp-test-message"
                                value={mensaje}
                                onChange={(e) => setMensaje(e.target.value)}
                                rows={4}
                                maxLength={1000}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={processing}
                            className="cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing} className="cursor-pointer gap-2">
                            {processing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Send className="size-4" />
                            )}
                            Enviar prueba
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
