const XLSX = require('d:/Certificates-despro/Certificates-despro/client/node_modules/xlsx/xlsx.js');
const path = require('path');

const filePath = 'd:/Certificates-despro/Certificates-despro/الشهادات_2026-02-19.xlsx';
try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('HEADERS_START');
    console.log(JSON.stringify(data[0]));
    console.log('HEADERS_END');
    console.log('DATA_START');
    console.log(JSON.stringify(data.slice(1, 4)));
    console.log('DATA_END');
} catch (e) {
    console.error(e);
}
