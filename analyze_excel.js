const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'resource', '견적포맷.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log(JSON.stringify(data, null, 2));
