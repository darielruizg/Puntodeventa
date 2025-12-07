import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Sale } from '../db/db';
import { Button, Input, Card } from '../components/BoutiqueComponents';
import { Ticket } from '../components/Ticket';
import { Calendar, DollarSign, CreditCard, ArrowRightLeft, Save, Printer, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export const SalesHistory: React.FC = () => {
    // Fix: Use local date instead of UTC to prevent "yesterday" issue
    const getLocalDate = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
    const [selectedDate, setSelectedDate] = useState(getLocalDate()); // YYYY-MM-DD
    const [selectedMonth, setSelectedMonth] = useState(getLocalDate().substring(0, 7)); // YYYY-MM
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString()); // YYYY

    const [initialCash, setInitialCash] = useState<string>('1000');
    const [reprintSale, setReprintSale] = useState<Sale | null>(null);

    // Fetch sales based on view mode
    const sales = useLiveQuery(async () => {
        let start: Date, end: Date;

        if (viewMode === 'day') {
            const [year, month, day] = selectedDate.split('-').map(Number);
            start = new Date(year, month - 1, day);
            start.setHours(0, 0, 0, 0);
            end = new Date(year, month - 1, day);
            end.setHours(23, 59, 59, 999);
        } else if (viewMode === 'month') {
            const [year, month] = selectedMonth.split('-').map(Number);
            start = new Date(year, month - 1, 1);
            start.setHours(0, 0, 0, 0);
            // Last day of month
            end = new Date(year, month, 0);
            end.setHours(23, 59, 59, 999);
        } else {
            const year = parseInt(selectedYear);
            start = new Date(year, 0, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(year, 11, 31);
            end.setHours(23, 59, 59, 999);
        }

        return await db.sales
            .where('date')
            .between(start, end)
            .toArray();
    }, [viewMode, selectedDate, selectedMonth, selectedYear]);

    // Fetch daily closing data (only relevant for 'day' view)
    const dailyClosing = useLiveQuery(() => {
        if (viewMode === 'day') {
            return db.dailyClosings.get(selectedDate);
        }
        return undefined;
    }, [viewMode, selectedDate]);

    // Initialize or update local state when dailyClosing loads
    useEffect(() => {
        if (viewMode === 'day') {
            if (dailyClosing) {
                setInitialCash(dailyClosing.initialCash.toString());
            } else {
                setInitialCash('1000'); // Default
            }
        }
    }, [dailyClosing, viewMode]);

    const handleSaveInitialCash = async () => {
        if (viewMode !== 'day') return;

        const cashValue = parseFloat(initialCash) || 0;
        const existing = await db.dailyClosings.get(selectedDate);

        if (existing) {
            await db.dailyClosings.update(selectedDate, { initialCash: cashValue });
        } else {
            await db.dailyClosings.add({
                date: selectedDate,
                initialCash: cashValue,
                isClosed: false
            });
        }
        alert('Fondo de caja actualizado');
    };

    const handleDownloadExcel = () => {
        if (!sales || sales.length === 0) {
            alert('No hay ventas para exportar');
            return;
        }

        // Flatten data for Excel
        const data = sales.flatMap(sale =>
            sale.items.map(item => ({
                'ID Venta': sale.id,
                'Fecha': sale.date.toLocaleDateString(),
                'Hora': sale.date.toLocaleTimeString(),
                'Producto': item.name,
                'SKU': item.sku,
                'Cantidad': item.quantity,
                'Precio Unitario': item.price,
                'Total Línea': item.price * item.quantity,
                'Método de Pago': sale.paymentMethod === 'cash' ? 'Efectivo' :
                    sale.paymentMethod === 'card' ? 'Tarjeta' :
                        sale.paymentMethod === 'rappi' ? 'Rappi' : 'Transferencia'
            }))
        );

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");

        let filename = `ventas_${viewMode}_`;
        if (viewMode === 'day') filename += selectedDate;
        else if (viewMode === 'month') filename += selectedMonth;
        else filename += selectedYear;

        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    // Calculations
    const cashSales = sales?.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0) || 0;
    const cardSales = sales?.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0) || 0;
    const transferSales = sales?.filter(s => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0) || 0;
    const rappiSales = sales?.filter(s => s.paymentMethod === 'rappi').reduce((sum, s) => sum + s.total, 0) || 0;
    const totalSales = (sales?.reduce((sum, s) => sum + s.total, 0) || 0);

    const expectedCash = (parseFloat(initialCash) || 0) + cashSales;

    return (
        <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold text-dark-gray">Ventas y Corte</h1>
                    <p className="text-gray-500 font-sans">Historial de ventas y reportes</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Mode Selector */}
                    <div className="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-demon-red text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Día
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-demon-red text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Mes
                        </button>
                        <button
                            onClick={() => setViewMode('year')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'year' ? 'bg-demon-red text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Año
                        </button>
                    </div>

                    {/* Date Picker */}
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                        <Calendar className="text-demon-red" size={20} />
                        {viewMode === 'day' && (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="outline-none text-dark-gray font-sans font-medium"
                            />
                        )}
                        {viewMode === 'month' && (
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="outline-none text-dark-gray font-sans font-medium"
                            />
                        )}
                        {viewMode === 'year' && (
                            <input
                                type="number"
                                min="2024"
                                max="2030"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="outline-none text-dark-gray font-sans font-medium w-20"
                            />
                        )}
                    </div>

                    <Button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
                        <Download size={18} /> Excel
                    </Button>
                </div>
            </div>

            {/* Cash Control Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Initial Cash - Only visible in Day view */}
                {viewMode === 'day' ? (
                    <Card className="flex flex-col gap-2 border-l-4 border-l-blue-500">
                        <span className="text-gray-500 font-subheading text-sm font-bold uppercase tracking-wider">Fondo Inicial</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-heading font-bold text-dark-gray">$</span>
                            <Input
                                type="number"
                                value={initialCash}
                                onChange={(e) => setInitialCash(e.target.value)}
                                className="text-2xl font-heading font-bold text-dark-gray !border-0 !border-b !border-dashed !border-gray-300 !rounded-none !px-0 !py-1 focus:!ring-0"
                            />
                            <Button size="sm" onClick={handleSaveInitialCash} className="!p-2">
                                <Save size={20} />
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <Card className="flex flex-col gap-2 border-l-4 border-gray-300 bg-gray-50 opacity-50">
                        <span className="text-gray-400 font-subheading text-sm font-bold uppercase tracking-wider">Fondo Inicial</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-heading font-bold text-gray-400">N/A</span>
                        </div>
                        <p className="text-xs text-gray-400">Solo disponible en vista diaria</p>
                    </Card>
                )}

                {/* Cash Sales */}
                <Card className="flex flex-col gap-2 border-l-4 border-l-green-500">
                    <span className="text-gray-500 font-subheading text-sm font-bold uppercase tracking-wider">Ventas Efectivo</span>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-3xl font-heading font-bold text-dark-gray">${cashSales.toFixed(2)}</span>
                    </div>
                </Card>

                {/* Expected Cash - Only visible in Day view */}
                {viewMode === 'day' ? (
                    <Card className="flex flex-col gap-2 border-l-4 border-l-demon-red bg-red-50/30">
                        <span className="text-demon-red font-subheading text-sm font-bold uppercase tracking-wider">Total en Caja (Esperado)</span>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-heading font-bold text-demon-red">${expectedCash.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-400">Fondo Inicial + Ventas Efectivo</p>
                    </Card>
                ) : (
                    <Card className="flex flex-col gap-2 border-l-4 border-gray-300 bg-gray-50 opacity-50">
                        <span className="text-gray-400 font-subheading text-sm font-bold uppercase tracking-wider">Total en Caja</span>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-heading font-bold text-gray-400">N/A</span>
                        </div>
                        <p className="text-xs text-gray-400">Solo disponible en vista diaria</p>
                    </Card>
                )}

                {/* Total Sales */}
                <Card className="flex flex-col gap-2 border-l-4 border-l-purple-500">
                    <span className="text-gray-500 font-subheading text-sm font-bold uppercase tracking-wider">Venta Total</span>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-heading font-bold text-dark-gray">${totalSales.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><CreditCard size={12} /> Tarjeta: ${cardSales.toFixed(2)}</span>
                        <span className="flex items-center gap-1"><ArrowRightLeft size={12} /> Transfer: ${transferSales.toFixed(2)}</span>
                        <span className="flex items-center gap-1 text-orange-500 font-bold">RAPPI: ${rappiSales.toFixed(2)}</span>
                    </div>
                </Card>
            </div>

            {/* Transactions List */}
            <Card className="flex-1 flex flex-col gap-4 overflow-hidden min-h-[400px]">
                <h3 className="font-heading font-bold text-xl text-dark-gray">
                    {viewMode === 'day' ? 'Transacciones del Día' :
                        viewMode === 'month' ? 'Transacciones del Mes' : 'Transacciones del Año'}
                </h3>

                <div className="overflow-y-auto flex-1 pr-2">
                    {!sales || sales.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 py-10">
                            <p>No hay ventas registradas para este periodo.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr className="text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                                    <th className="pb-3 pl-2">Fecha/Hora</th>
                                    <th className="pb-3">Productos</th>
                                    <th className="pb-3">Método</th>
                                    <th className="pb-3 text-right pr-2">Total</th>
                                    <th className="pb-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sales.map(sale => (
                                    <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-3 pl-2 text-gray-500 font-mono text-sm">
                                            <div className="flex flex-col">
                                                <span>{sale.date.toLocaleDateString()}</span>
                                                <span className="text-xs text-gray-400">{sale.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-dark-gray text-sm line-clamp-1">
                                                    {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                                                </span>
                                                <span className="text-xs text-gray-400">Ticket #{sale.id}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <span className={`
                                                px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                                                ${sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' :
                                                    sale.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' :
                                                        sale.paymentMethod === 'rappi' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-purple-100 text-purple-700'}
                                            `}>
                                                {sale.paymentMethod === 'cash' ? 'Efectivo' :
                                                    sale.paymentMethod === 'card' ? 'Tarjeta' :
                                                        sale.paymentMethod === 'rappi' ? 'Rappi' : 'Transfer'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right pr-2 font-bold text-dark-gray font-mono">
                                            ${sale.total.toFixed(2)}
                                        </td>
                                        <td className="py-3 text-center">
                                            <button
                                                onClick={() => setReprintSale(sale)}
                                                className="p-1.5 text-gray-400 hover:text-demon-red hover:bg-red-50 rounded-lg transition-all"
                                                title="Reimprimir Ticket"
                                            >
                                                <Printer size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>

            {/* Reprint Ticket Portal */}
            {reprintSale && (
                <Ticket
                    sale={reprintSale}
                    onAfterPrint={() => setReprintSale(null)}
                />
            )}
        </div>
    );
};
