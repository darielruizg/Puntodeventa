import { db } from './src/db/db';

async function debugDB() {
    console.log('--- DEBUGGING DB ---');
    const allSales = await db.sales.toArray();
    console.log(`Total Sales: ${allSales.length}`);
    allSales.forEach(s => {
        console.log(`Sale ID: ${s.id}, Date: ${s.date} (${typeof s.date}), Local: ${s.date.toLocaleString()}`);
    });

    const now = new Date();
    console.log(`Current Time: ${now.toLocaleString()}`);

    // Simulate the query
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    const start = new Date(year, month, day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month, day);
    end.setHours(23, 59, 59, 999);

    console.log(`Query Range: ${start.toLocaleString()} - ${end.toLocaleString()}`);

    const querySales = await db.sales.where('date').between(start, end).toArray();
    console.log(`Query Results: ${querySales.length}`);
}

debugDB();
