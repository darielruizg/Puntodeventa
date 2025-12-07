import Dexie, { type Table } from 'dexie';

export interface Product {
    id?: number;
    sku: string;
    name: string;
    price: number;
    stock: number;
    stockDetails?: {
        store: number;
        warehouse: number;
        display: number;
    };
}

export interface SaleItem {
    sku: string;
    name: string;
    price: number;
    quantity: number;
}

export interface Sale {
    id?: number;
    date: Date;
    items: SaleItem[];
    total: number;
    paymentMethod: 'cash' | 'card' | 'transfer' | 'rappi';
}

export interface DailyClosing {
    date: string; // YYYY-MM-DD
    initialCash: number;
    finalCashActual?: number;
    isClosed: boolean;
}

export class POSDatabase extends Dexie {
    products!: Table<Product>;
    sales!: Table<Sale>;
    dailyClosings!: Table<DailyClosing>;

    constructor() {
        super('POSDB');
        this.version(1).stores({
            products: '++id, &sku, name',
            sales: '++id, date',
            dailyClosings: '&date'
        });
    }
}

export const db = new POSDatabase();
