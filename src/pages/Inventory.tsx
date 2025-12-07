import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Product } from '../db/db';
import { Button, Input, Card, Modal } from '../components/IndustrialComponents';
import { Plus, Upload, Search, Barcode, Trash2, AlertTriangle, Download, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { useScanner } from '../hooks/useScanner';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

export const Inventory: React.FC = () => {
    const products = useLiveQuery(() => db.products.toArray());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bulkInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Product>>({
        sku: '', name: '', price: 0, stock: 0,
        stockDetails: { store: 0, warehouse: 0, display: 0 }
    });

    // Scanner Hook for "Query Mode"
    useScanner({
        onScan: async (code) => {
            const product = await db.products.where('sku').equals(code).first();
            if (product) {
                handleEdit(product);
            } else {
                // Optional: Prompt to create new product with this SKU
                setFormData({ ...formData, sku: code });
                setIsModalOpen(true);
            }
        }
    });

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        // Ensure stockDetails exists
        setFormData({
            ...product,
            stockDetails: product.stockDetails || { store: product.stock, warehouse: 0, display: 0 }
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('¿Eliminar producto?')) {
            await db.products.delete(id);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) return alert('Nombre y Precio requeridos');

        const productToSave = {
            ...formData,
            sku: formData.sku || uuidv4().slice(0, 8).toUpperCase(), // Auto-generate SKU if empty
            price: Number(formData.price),
            stock: Number(formData.stock),
            stockDetails: formData.stockDetails || { store: Number(formData.stock), warehouse: 0, display: 0 }
        } as Product;

        if (editingProduct && editingProduct.id) {
            await db.products.update(editingProduct.id, productToSave);
        } else {
            await db.products.add(productToSave);
        }

        closeModal();
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData({ sku: '', name: '', price: 0, stock: 0, stockDetails: { store: 0, warehouse: 0, display: 0 } });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (results: any) => {
                const newProducts: Product[] = [];
                for (const row of results.data) {
                    if (row.Nombre && row.Precio) {
                        newProducts.push({
                            sku: row.SKU || uuidv4().slice(0, 8).toUpperCase(),
                            name: row.Nombre,
                            price: Number(row.Precio),
                            stock: Number(row.Stock || 0),
                            stockDetails: {
                                store: Number(row.Stock || 0),
                                warehouse: 0,
                                display: 0
                            }
                        });
                    }
                }
                if (newProducts.length > 0) {
                    await db.products.bulkAdd(newProducts);
                    alert(`${newProducts.length} productos importados.`);
                }
            }
        });
    };

    const handleBulkUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            let updatedCount = 0;
            const productsToUpsert: Product[] = [];

            for (const row of data as any[]) {
                // Required fields check (loose check)
                if (!row['SKU'] && !row['sku']) continue;

                const sku = (row['SKU'] || row['sku']).toString();
                const name = row['Nombre'] || row['nombre'] || 'Producto Sin Nombre';
                const price = Number(row['Precio'] || row['precio'] || 0);

                // Stocks
                const stockStore = Number(row['Stock Tienda'] || row['stock tienda'] || 0);
                const stockWarehouse = Number(row['Stock Bodega'] || row['stock bodega'] || 0);
                const stockDisplay = Number(row['Stock Exhibición'] || row['stock exhibición'] || row['Stock Exhibicion'] || 0);

                // If "Stock Total" is provided, use it, otherwise sum up details
                // Ideally, we trust the details if provided.
                const stockTotal = Number(row['Stock Total'] || row['stock total'] || (stockStore + stockWarehouse + stockDisplay));

                // Check if product exists to preserve ID
                const existingProduct = await db.products.where('sku').equals(sku).first();

                const productData: Product = {
                    id: existingProduct?.id, // Preserve ID if exists
                    sku,
                    name,
                    price,
                    stock: stockTotal,
                    stockDetails: {
                        store: stockStore,
                        warehouse: stockWarehouse,
                        display: stockDisplay
                    }
                };

                productsToUpsert.push(productData);
                updatedCount++;
            }

            if (productsToUpsert.length > 0) {
                await db.products.bulkPut(productsToUpsert);
                alert(`Se han actualizado/creado ${updatedCount} productos exitosamente.`);
            } else {
                alert('No se encontraron datos válidos en el archivo.');
            }

            // Reset input
            if (bulkInputRef.current) bulkInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleExport = () => {
        if (!products || products.length === 0) return alert('No hay productos para exportar');

        const csvData = products.map(p => ({
            SKU: p.sku,
            Nombre: p.name,
            Precio: p.price,
            'Stock Total': p.stock,
            'Stock Tienda': p.stockDetails?.store || 0,
            'Stock Bodega': p.stockDetails?.warehouse || 0,
            'Stock Exhibición': p.stockDetails?.display || 0
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `inventario_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const printLabels = (productsToPrint?: Product[]) => {
        try {
            const targetProducts = productsToPrint || products;
            if (!targetProducts || targetProducts.length === 0) return;

            // 55mm width, dynamic height (approx 30-40mm depending on content)
            // jsPDF units: mm
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [55, 35] // 55mm width x 35mm height (standard small label)
            });

            targetProducts.forEach((p, index) => {
                if (index > 0) doc.addPage();

                const pageWidth = 55;
                const centerX = pageWidth / 2;

                // 1. Product Name (Top, truncated if too long)
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                const splitTitle = doc.splitTextToSize(p.name, 50); // Wrap at 50mm
                // Limit to 2 lines max
                const titleLines = splitTitle.length > 2 ? splitTitle.slice(0, 2) : splitTitle;
                doc.text(titleLines, centerX, 5, { align: 'center' });

                // 2. Price (Below name)
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text(`$${p.price.toFixed(2)}`, centerX, 12, { align: 'center' });

                // 3. Barcode (Bottom)
                const canvas = document.createElement('canvas');
                try {
                    JsBarcode(canvas, p.sku, {
                        format: "CODE128",
                        displayValue: true,
                        fontSize: 10,
                        height: 30,
                        width: 2, // Thinner bars to fit
                        margin: 0
                    });
                    const imgData = canvas.toDataURL("image/png");
                    // Center image: (PageWidth - ImageWidth) / 2
                    // We force image width to be max 45mm to leave margin
                    doc.addImage(imgData, 'PNG', 5, 14, 45, 15);
                } catch (e) {
                    console.error("Barcode error", e);
                    doc.setFontSize(8);
                    doc.text(p.sku, centerX, 20, { align: 'center' });
                }
            });

            // Determine filename
            let filename = `etiquetas_${new Date().toISOString().slice(0, 10)}.pdf`;
            if (targetProducts.length === 1) {
                // Sanitize product name for filename
                const safeName = targetProducts[0].name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                filename = `etiqueta_${safeName}.pdf`;
            }

            // Save using Blob to ensure correct filename and type
            const blob = doc.output('blob');
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const url = URL.createObjectURL(pdfBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error al generar PDF: " + error);
        }
    };

    const filteredProducts = products?.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter for "Products to Restock"
    const productsToRestock = products?.filter(p => p.stock < 3).sort((a, b) => a.stock - b.stock);

    return (
        <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inventario</h1>
                    <p className="text-gray-500">Gestiona tus productos y existencias</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                    />
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleBulkUpdate}
                        ref={bulkInputRef}
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={18} /> Importar CSV
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                        onClick={() => bulkInputRef.current?.click()}
                    >
                        <FileSpreadsheet size={18} /> Actualizar en masa
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2"
                        onClick={handleExport}
                    >
                        <Download size={18} /> Exportar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => printLabels()} className="flex items-center gap-2">
                        <Barcode size={18} /> Etiquetas
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-blue-500/20">
                        <Plus size={18} /> Nuevo Producto
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    placeholder="Buscar por nombre o SKU..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Products to Restock Section */}
            {productsToRestock && productsToRestock.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 text-amber-600">
                        <AlertTriangle size={24} />
                        <h2 className="text-xl font-bold">Productos por Surtir</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {productsToRestock.map(product => (
                            <div
                                key={product.id}
                                className={`
                                    flex justify-between items-center p-4 rounded-xl border-l-4 shadow-sm
                                    ${product.stock === 0
                                        ? 'bg-red-50 border-l-red-500 border border-red-100'
                                        : 'bg-yellow-50 border-l-yellow-500 border border-yellow-100'}
                                `}
                            >
                                <div>
                                    <h3 className="font-bold text-gray-800 line-clamp-1">{product.name}</h3>
                                    <span className="text-xs text-gray-500 font-mono">{product.sku}</span>
                                </div>
                                <div className={`
                                    px-3 py-1 rounded-full font-bold text-sm
                                    ${product.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}
                                `}>
                                    {product.stock === 0 ? 'AGOTADO' : `${product.stock} pzas`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Product List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {filteredProducts?.map(product => (
                    <Card key={product.id} className="flex flex-col gap-3 group hover:shadow-md transition-all duration-300 border-transparent hover:border-blue-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 line-clamp-1" title={product.name}>{product.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">{product.sku}</span>
                                </div>
                            </div>
                            <span className="font-mono font-bold text-xl text-blue-600">${product.price.toFixed(2)}</span>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                            <div className={`flex flex-col gap-1 text-sm font-medium ${product.stock < 5 ? 'text-red-600' : 'text-green-600'}`}>
                                <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${product.stock < 5 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    Stock Total: {product.stock}
                                </div>
                                <div className="text-xs text-gray-400 font-mono pl-3.5">
                                    T: {product.stockDetails?.store || product.stock} | B: {product.stockDetails?.warehouse || 0} | E: {product.stockDetails?.display || 0}
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="sm" variant="secondary" onClick={() => handleEdit(product)}>Editar</Button>
                                <button onClick={() => handleDelete(product.id!)} className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
            >
                <div className="flex flex-col gap-4">
                    <Input
                        label="Nombre"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <div className="flex gap-4">
                        <Input
                            label="Precio"
                            type="number"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                        />
                    </div>

                    {/* Stock Distribution Inputs */}
                    <div className="grid grid-cols-3 gap-2">
                        <Input
                            label="Tienda"
                            type="number"
                            value={formData.stockDetails?.store || 0}
                            onChange={e => {
                                const val = Number(e.target.value);
                                const newDetails = { ...formData.stockDetails!, store: val };
                                setFormData({
                                    ...formData,
                                    stockDetails: newDetails,
                                    stock: val + (newDetails.warehouse || 0) + (newDetails.display || 0)
                                });
                            }}
                        />
                        <Input
                            label="Bodega"
                            type="number"
                            value={formData.stockDetails?.warehouse || 0}
                            onChange={e => {
                                const val = Number(e.target.value);
                                const newDetails = { ...formData.stockDetails!, warehouse: val };
                                setFormData({
                                    ...formData,
                                    stockDetails: newDetails,
                                    stock: (newDetails.store || 0) + val + (newDetails.display || 0)
                                });
                            }}
                        />
                        <Input
                            label="Exhibición"
                            type="number"
                            value={formData.stockDetails?.display || 0}
                            onChange={e => {
                                const val = Number(e.target.value);
                                const newDetails = { ...formData.stockDetails!, display: val };
                                setFormData({
                                    ...formData,
                                    stockDetails: newDetails,
                                    stock: (newDetails.store || 0) + (newDetails.warehouse || 0) + val
                                });
                            }}
                        />
                    </div>
                    <Input
                        label="Stock Total (Auto)"
                        type="number"
                        value={formData.stock}
                        disabled
                        className="bg-gray-100"
                    />

                    <Input
                        label="SKU (Opcional - Auto si vacío)"
                        value={formData.sku}
                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Dejar vacío para generar auto"
                    />
                    <div className="flex justify-between items-center mt-4">
                        {editingProduct && (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const count = prompt("¿Cuántas etiquetas deseas imprimir?", "1");
                                    if (count) {
                                        const num = parseInt(count, 10);
                                        if (num > 0) {
                                            const labelsToPrint = Array(num).fill(formData as Product);
                                            printLabels(labelsToPrint);
                                        } else {
                                            alert("Por favor ingresa un número válido.");
                                        }
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Barcode size={18} /> Imprimir Etiqueta
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button onClick={handleSave}>Guardar</Button>
                        </div >
                    </div >
                </div >
            </Modal >
        </div >
    );
};
