import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product, type SaleItem, type Sale } from '../db/db';
import { Button, Input, Modal } from '../components/BoutiqueComponents';
import { Ticket } from '../components/Ticket';
import { ShoppingCart, Trash2, CreditCard, Search, Plus, Minus } from 'lucide-react';
import { useScanner } from '../hooks/useScanner';

export const POS: React.FC = () => {
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'rappi'>('cash');
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [showPrintTicket, setShowPrintTicket] = useState(false);

    // Fetch products for manual search
    const products = useLiveQuery(() => db.products.toArray());

    // Scanner Hook for "Sales Mode"
    useScanner({
        onScan: async (code) => {
            const product = await db.products.where('sku').equals(code).first();
            if (product) {
                addToCart(product);
                playBeep();
            } else {
                alert('Producto no encontrado');
            }
        }
    });

    const playBeep = () => {
        // Simple beep sound
        console.log('BEEP');
    };

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.sku === product.sku);
            if (existing) {
                return prev.map(item =>
                    item.sku === product.sku ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { sku: product.sku, name: product.name, price: product.price, quantity: 1 }];
        });
    };

    const removeFromCart = (sku: string) => {
        setCart(prev => prev.filter(item => item.sku !== sku));
    };

    const updateQuantity = (sku: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.sku === sku) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        const saleData: Sale = {
            date: new Date(),
            items: [...cart],
            total: total,
            paymentMethod: paymentMethod
        };

        const saleId = await db.sales.add(saleData);
        const fullSale = { ...saleData, id: saleId as number };

        // Update stock
        for (const item of cart) {
            const product = await db.products.where('sku').equals(item.sku).first();
            if (product) {
                const currentDetails = product.stockDetails || { store: product.stock, warehouse: 0, display: 0 };
                const newStoreStock = currentDetails.store - item.quantity;

                await db.products.update(product.id!, {
                    stock: product.stock - item.quantity,
                    stockDetails: {
                        ...currentDetails,
                        store: newStoreStock
                    }
                });
            }
        }

        setLastSale(fullSale);
        setIsCheckoutOpen(false);
        setAmountPaid('');
        setShowPrintTicket(true);

        // Auto print ticket
        setTimeout(() => {
            // window.print(); // Handled by Ticket component
            setCart([]);
            // Hide ticket after a delay to allow printing to finish (user interaction)
            // setTimeout(() => setShowPrintTicket(false), 2000); // Handled by onAfterPrint
        }, 500);
    };

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.includes(searchQuery)
    );

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6 max-w-7xl mx-auto">
            {/* Left: Product Catalog */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                <div className="relative shrink-0">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                        placeholder="Buscar producto..."
                        className="pl-11"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 overflow-y-auto content-start pb-20 pr-2">
                    {filteredProducts?.map(product => (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="bg-white rounded-2xl border border-gray-100 p-5 text-left hover:border-demon-red/30 hover:shadow-lg hover:shadow-red-500/5 transition-all duration-300 flex flex-col gap-3 active:scale-95 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-cream rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                            <span className="font-heading font-bold text-dark-gray line-clamp-2 group-hover:text-demon-red transition-colors z-10 text-lg leading-tight">{product.name}</span>
                            <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded w-fit z-10">{product.sku}</span>
                            <span className="font-subheading font-bold text-xl text-demon-red mt-auto z-10">${product.price.toFixed(2)}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: Cart */}
            <div className="w-full lg:w-96 bg-white rounded-3xl border border-gray-100 flex flex-col h-[calc(100vh-100px)] lg:h-full shadow-xl shadow-gray-200/50 overflow-hidden">
                <div className="p-6 bg-white border-b border-gray-100 text-dark-red font-heading font-bold text-xl flex items-center gap-2">
                    <ShoppingCart size={24} className="text-demon-red" />
                    <span>Ticket Actual</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-cream/30">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
                            <ShoppingCart size={64} className="opacity-20" />
                            <p className="font-subheading text-lg">Carrito vacío</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.sku} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                                <div className="flex-1">
                                    <div className="font-bold text-base text-dark-gray line-clamp-1 font-heading">{item.name}</div>
                                    <div className="text-xs text-gray-500 mt-1 font-mono">${item.price} x {item.quantity}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-subheading font-bold text-dark-gray text-lg">${(item.price * item.quantity).toFixed(2)}</span>
                                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(item.sku, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-white hover:text-demon-red rounded-md shadow-sm transition-all"><Minus size={14} /></button>
                                        <button onClick={() => updateQuantity(item.sku, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-white hover:text-green-600 rounded-md shadow-sm transition-all"><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => removeFromCart(item.sku)} className="text-gray-300 hover:text-demon-red transition-colors ml-1 p-1">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-end mb-6">
                        <span className="text-gray-400 font-medium font-subheading">Total a Pagar</span>
                        <span className="text-4xl font-bold font-heading text-dark-red tracking-tight">${total.toFixed(2)}</span>
                    </div>
                    <Button
                        className="w-full py-4 text-lg shadow-red-500/30 hover:shadow-red-500/40"
                        size="lg"
                        disabled={cart.length === 0}
                        onClick={() => setIsCheckoutOpen(true)}
                    >
                        <CreditCard size={24} /> COBRAR
                    </Button>
                </div>
            </div>

            {/* Checkout Modal */}
            <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Finalizar Venta">
                <div className="flex flex-col gap-6">
                    <div className="text-center">
                        <div className="text-gray-500 uppercase text-sm">Total a Pagar</div>
                        <div className="text-4xl font-bold font-mono">${total.toFixed(2)}</div>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setPaymentMethod('cash')}
                            className={`p-3 rounded-lg border text-sm font-bold transition-all ${paymentMethod === 'cash' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            EFECTIVO
                        </button>
                        <button
                            onClick={() => setPaymentMethod('card')}
                            className={`p-3 rounded-lg border text-sm font-bold transition-all ${paymentMethod === 'card' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            TARJETA
                        </button>
                        <button
                            onClick={() => setPaymentMethod('transfer')}
                            className={`p-3 rounded-lg border text-sm font-bold transition-all ${paymentMethod === 'transfer' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            TRANSFER
                        </button>
                        <button
                            onClick={() => setPaymentMethod('rappi')}
                            className={`p-3 rounded-lg border text-sm font-bold transition-all ${paymentMethod === 'rappi' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            RAPPI
                        </button>
                    </div>

                    {/* Amount Paid Input - Only for Cash */}
                    {paymentMethod === 'cash' && (
                        <Input
                            label="Monto Recibido"
                            type="number"
                            autoFocus
                            value={amountPaid}
                            onChange={e => setAmountPaid(e.target.value)}
                            className="text-2xl text-center"
                        />
                    )}

                    {/* Change Display - Only for Cash */}
                    {paymentMethod === 'cash' && Number(amountPaid) >= total && (
                        <div className="text-center p-4 bg-green-50 border border-green-200 rounded">
                            <div className="text-green-800 uppercase text-sm font-bold">Cambio</div>
                            <div className="text-3xl font-bold font-mono text-green-700">
                                ${(Number(amountPaid) - total).toFixed(2)}
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleCheckout}
                        disabled={paymentMethod === 'cash' && (!amountPaid || Number(amountPaid) < total)}
                        className="w-full"
                    >
                        CONFIRMAR E IMPRIMIR
                    </Button>
                </div>
            </Modal>

            {/* Print Portal: Renders directly into body, bypassing main app layout constraints */}
            {showPrintTicket && lastSale && (
                <Ticket
                    sale={lastSale}
                    onAfterPrint={() => setShowPrintTicket(false)}
                />
            )}
        </div>
    );
};
