import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type Sale } from '../db/db';

interface TicketProps {
    sale: Sale;
    onAfterPrint: () => void;
}

export const Ticket: React.FC<TicketProps> = ({ sale, onAfterPrint }) => {
    useEffect(() => {
        // Auto print when mounted
        const timer = setTimeout(() => {
            window.print();
            // Allow some time for the print dialog to initiate before triggering callback
            setTimeout(onAfterPrint, 500);
        }, 500);

        return () => clearTimeout(timer);
    }, [onAfterPrint]);

    return createPortal(
        <div className="print-only bg-white w-[55mm] mx-auto text-black font-mono leading-tight">
            <div className="flex flex-col w-full">
                {/* Header */}
                <div className="text-center mb-2">
                    <img src="/ticket-logo.png" alt="Logo" className="w-24 mx-auto mb-2" />
                    <h2 className="font-bold text-xl mb-1">Demons & Angels</h2>
                    <p className="text-[10px] mb-0.5">Insurgentes norte 783 Local C</p>
                    <p className="text-[10px]">Whats: 5568073438</p>

                    <div className="mt-2 text-[10px]">
                        <p>{sale.date.toLocaleString()}</p>
                        <p>Ticket #{sale.id}</p>
                    </div>
                </div>

                <div className="border-b border-black border-dashed my-1"></div>

                {/* Column Headers */}
                <div className="flex text-[9px] font-bold mb-1">
                    <span className="w-[15%] text-center">CANT</span>
                    <span className="w-[55%] text-left pl-1">DESCRIPCION</span>
                    <span className="w-[30%] text-right">IMPORTE</span>
                </div>

                <div className="border-b border-black border-dashed my-1"></div>

                {/* Items */}
                <div className="flex flex-col gap-2 text-[10px]">
                    {sale.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col">
                            <div className="flex justify-between items-start">
                                <span className="w-[15%] text-center">{item.quantity}</span>
                                <span className="w-[55%] text-left pl-1 leading-tight">{item.name}</span>
                                <span className="w-[30%] text-right">${(item.quantity * item.price).toFixed(2)}</span>
                            </div>
                            {/* Optional: Show unit price if qty > 1 */}
                            {item.quantity > 1 && (
                                <div className="text-[9px] text-gray-500 pl-[15%]">
                                    (Unit: ${item.price.toFixed(2)})
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="border-t border-black border-dashed my-2"></div>

                {/* Totals */}
                <div className="flex flex-col gap-1 text-right text-sm">
                    <div className="flex justify-between font-bold text-lg">
                        <span>TOTAL:</span>
                        <span>${sale.total.toFixed(2)}</span>
                    </div>

                    {/* Payment Details */}
                    <div className="text-[10px] mt-2 text-center">
                        <p className="uppercase">FORMA DE PAGO: {sale.paymentMethod === 'cash' ? 'EFECTIVO' : sale.paymentMethod === 'card' ? 'TARJETA' : sale.paymentMethod === 'rappi' ? 'RAPPI' : 'TRANSFERENCIA'}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs font-bold mt-6 mb-8">
                    <p>¡GRACIAS POR SU COMPRA!</p>
                    <p>¡VUELVA PRONTO!</p>
                    <p className="text-[9px] font-normal mt-2">PARA FACTURAR, PEDIDOS Y COTIZACIONES COMUNICARSE VIA WHATS APP</p>
                </div>
            </div>
        </div>,
        document.body
    );
};
