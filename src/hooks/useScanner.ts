import { useEffect, useRef } from 'react';

interface UseScannerProps {
    onScan: (code: string) => void;
    minLength?: number;
    timeThreshold?: number; // Max time between keystrokes to consider it a scan
}

export const useScanner = ({ onScan, minLength = 3, timeThreshold = 100 }: UseScannerProps) => {
    // Use refs for buffer and timing to avoid re-renders and dependency issues
    const buffer = useRef<string>('');
    const lastKeyTime = useRef<number>(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            const isRapid = currentTime - lastKeyTime.current < timeThreshold;

            // Update last key time immediately
            lastKeyTime.current = currentTime;

            // Ignore special keys except Enter
            // We allow alphanumeric and standard symbols
            if (e.key.length > 1 && e.key !== 'Enter') return;

            // const target = e.target as HTMLElement;
            // const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            // If typing in an input, we generally want to let it happen, 
            // UNLESS it's clearly a rapid scan. 
            // But distinguishing is hard. 
            // Simple rule: If it's rapid, we assume it's a scanner and capture it, 
            // preventing it from going into the input if possible, or just handling the scan.

            if (e.key === 'Enter') {
                // If we have a valid buffer, treat as scan
                if (buffer.current.length >= minLength) {
                    // Prevent default to stop form submissions or button clicks
                    e.preventDefault();
                    e.stopPropagation();

                    onScan(buffer.current);
                    buffer.current = '';
                } else {
                    // Buffer too short, probably manual Enter or just clearing
                    buffer.current = '';
                }
                return;
            }

            // Logic for building buffer
            if (isRapid) {
                // If rapid, append to buffer
                buffer.current += e.key;
            } else {
                // If slow, reset buffer and start new (assume manual typing start)
                // But if we are NOT in an input, we might want to capture manual typing too?
                // For POS, usually we only care about rapid scans for the global listener.
                // Manual search is handled by the input field's onChange.
                buffer.current = e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept early
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [onScan, minLength, timeThreshold]);
};
