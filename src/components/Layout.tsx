import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart, Package, Barcode, DollarSign } from 'lucide-react';

export const Layout: React.FC = () => {
    const navItems = [
        { to: '/', icon: <ShoppingCart size={22} />, label: 'Venta' },
        { to: '/inventory', icon: <Package size={22} />, label: 'Inventario' },
        { to: '/sales', icon: <DollarSign size={22} />, label: 'Ventas / Corte' },
    ];

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-cream font-sans">
            {/* Sidebar */}
            <nav className="w-20 md:w-64 bg-white border-r border-gray-100 flex flex-col py-8 shrink-0 transition-all duration-300 shadow-sm z-10">
                <div className="flex items-center gap-3 px-4 md:px-8 mb-10">
                    <div className="bg-demon-red text-white p-2.5 rounded-xl shrink-0 shadow-lg shadow-red-500/20">
                        <Barcode size={24} />
                    </div>
                    <span className="font-heading font-bold text-2xl tracking-tight hidden md:block text-dark-red">POS Pro</span>
                </div>

                <div className="flex flex-col gap-3 px-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 group font-subheading font-medium
                ${isActive
                                    ? 'bg-cream text-demon-red shadow-sm'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-dark-gray'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span className={isActive ? 'text-demon-red' : 'text-gray-300 group-hover:text-gray-500 transition-colors'}>
                                        {item.icon}
                                    </span>
                                    <span className="hidden md:block">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative bg-cream">
                <div className="max-w-7xl mx-auto p-4 md:p-8 h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
