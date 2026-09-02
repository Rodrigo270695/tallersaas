import { useEffect, useState  } from 'react';
import type {RefObject} from 'react';

/**
 * Observa un contenedor scrolleable y reporta si hay contenido oculto
 * arriba/abajo para mostrar gradientes de scroll.
 */
export function useScrollHint(
    ref: RefObject<HTMLElement | null>,
    active: boolean = true,
) {
    const [overflowTop, setOverflowTop] = useState(false);
    const [overflowBottom, setOverflowBottom] = useState(false);

    useEffect(() => {
        if (!active) {
            setOverflowTop(false);
            setOverflowBottom(false);

            return;
        }

        const el = ref.current;

        if (!el) {
            return;
        }

        const update = () => {
            const hasOverflow = el.scrollHeight - el.clientHeight > 1;
            const atTop = el.scrollTop <= 1;
            const atBottom =
                el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
            setOverflowTop(hasOverflow && !atTop);
            setOverflowBottom(hasOverflow && !atBottom);
        };

        const raf = requestAnimationFrame(update);
        const timeouts = [50, 250, 600, 1000].map((ms) =>
            window.setTimeout(update, ms),
        );

        el.addEventListener('scroll', update, { passive: true });

        const ro = new ResizeObserver(update);
        ro.observe(el);
        const observeDescendants = (node: Element) => {
            ro.observe(node);
            Array.from(node.children).forEach((child) => observeDescendants(child));
        };
        Array.from(el.children).forEach(observeDescendants);

        return () => {
            cancelAnimationFrame(raf);
            timeouts.forEach((t) => window.clearTimeout(t));
            el.removeEventListener('scroll', update);
            ro.disconnect();
        };
    }, [ref, active]);

    return { overflowTop, overflowBottom };
}
