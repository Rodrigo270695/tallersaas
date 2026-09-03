import { TZDate } from '@date-fns/tz';
import {
    endOfMonth,
    endOfWeek,
    endOfYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
    subDays,
    subMonths,
    subWeeks,
} from 'date-fns';

function nowTz(timeZone: string): TZDate {
    return new TZDate(Date.now(), timeZone);
}

export function rangeToday(timeZone: string): { from: Date; to: Date } {
    const n = startOfDay(nowTz(timeZone));

    return { from: n, to: n };
}

export function rangeYesterday(timeZone: string): { from: Date; to: Date } {
    const n = startOfDay(subDays(nowTz(timeZone), 1));

    return { from: n, to: n };
}

export function rangeThisWeek(timeZone: string): { from: Date; to: Date } {
    const n = nowTz(timeZone);

    return {
        from: startOfWeek(n, { weekStartsOn: 1 }),
        to: endOfWeek(n, { weekStartsOn: 1 }),
    };
}

export function rangeLastWeek(timeZone: string): { from: Date; to: Date } {
    const n = nowTz(timeZone);
    const ref = subWeeks(n, 1);

    return {
        from: startOfWeek(ref, { weekStartsOn: 1 }),
        to: endOfWeek(ref, { weekStartsOn: 1 }),
    };
}

export function rangeThisMonth(timeZone: string): { from: Date; to: Date } {
    const n = nowTz(timeZone);

    return {
        from: startOfMonth(n),
        to: endOfMonth(n),
    };
}

export function rangeLastMonth(timeZone: string): { from: Date; to: Date } {
    const n = nowTz(timeZone);
    const ref = subMonths(n, 1);

    return {
        from: startOfMonth(ref),
        to: endOfMonth(ref),
    };
}

export function rangeThisYear(timeZone: string): { from: Date; to: Date } {
    const n = nowTz(timeZone);

    return {
        from: startOfYear(n),
        to: endOfYear(n),
    };
}
