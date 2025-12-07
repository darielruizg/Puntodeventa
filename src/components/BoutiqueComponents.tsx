import React from 'react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    ...props
}) => {
    const baseStyles = "font-subheading font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";

    const variants = {
        primary: "bg-demon-red text-white hover:bg-red-700 shadow-red-500/20",
        secondary: "bg-white text-dark-gray border border-gray-200 hover:bg-cream hover:border-gray-300",
        danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
        success: "bg-green-600 text-white hover:bg-green-700"
    };

    const sizes = {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && <label className="font-subheading font-semibold text-sm text-dark-gray">{label}</label>}
            <input
                className={`
          w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-dark-gray font-sans
          placeholder-gray-400 shadow-sm transition-all duration-200
          focus:border-demon-red focus:outline-none focus:ring-1 focus:ring-demon-red
          disabled:bg-gray-50 disabled:text-gray-500
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
                {...props}
            />
            {error && <span className="text-xs text-red-500 font-sans">{error}</span>}
        </div>
    );
};

// --- Card ---
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) => {
    return (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-6 ${className}`} {...props}>
            {children}
        </div>
    );
};

// --- Modal ---
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-dark-gray/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-cream w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col rounded-3xl shadow-2xl scale-100 animate-in zoom-in-95 duration-300 border border-white/50">
                <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                    <h2 className="text-2xl font-heading font-bold text-dark-red">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-demon-red transition-colors p-2 rounded-full hover:bg-white/50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-8">
                    {children}
                </div>
            </div>
        </div>
    );
};
