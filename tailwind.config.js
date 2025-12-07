/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'cream': '#F9F5F2',
                'demon-red': '#E22B2B',
                'dark-red': '#761512',
                'dark-gray': '#333333',
            },
            fontFamily: {
                sans: ['"Noto Sans"', 'sans-serif'],
                serif: ['"Playfair Display"', 'serif'],
                heading: ['"Playfair Display"', 'serif'],
                subheading: ['"Raleway"', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
