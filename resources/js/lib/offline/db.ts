import type Dexie from 'dexie';
import type { Table } from 'dexie';

export type QueuedMutation = {
    id: string;
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    body: Record<string, unknown>;
    createdAt: number;
    attempts: number;
    lastError?: string;
};

export type PageSnapshot = {
    url: string;
    savedAt: number;
};

type OfflineDatabase = Dexie & {
    mutations: Table<QueuedMutation, string>;
    snapshots: Table<PageSnapshot, string>;
};

let instance: OfflineDatabase | null = null;
let loading: Promise<OfflineDatabase | null> | null = null;

export async function offlineDb(): Promise<OfflineDatabase | null> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
        return null;
    }

    if (instance) {
        return instance;
    }

    if (!loading) {
        loading = import('dexie')
            .then(({ default: DexieCtor }) => {
                class TallerOfflineDB extends DexieCtor {
                    mutations!: Table<QueuedMutation, string>;
                    snapshots!: Table<PageSnapshot, string>;

                    constructor() {
                        super('tallersaas-offline');

                        this.version(1).stores({
                            mutations: 'id, createdAt, url',
                            snapshots: 'url, savedAt',
                        });
                    }
                }

                instance = new TallerOfflineDB();

                return instance;
            })
            .catch(() => {
                loading = null;

                return null;
            });
    }

    return loading;
}
