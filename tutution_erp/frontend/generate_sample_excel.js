import fs from 'fs';
import * as XLSX from 'xlsx';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const sampleData = [
    {
        name: 'Rishabh Kumar',
        dob: '15-05-2010',
        gender: 'Male',
        phone: '9876543210',
        email: 'rishabh.test@example.com',
        address: '123 Test Street, New Delhi',
        className: 'Class 10',
        batchName: 'Morning Batch',
        admissionDate: '01-03-2026',
        session: '2026-2027',
        fees: 5000,
        status: 'Active'
    },
    {
        name: 'Priya Sharma',
        dob: '22-08-2011',
        gender: 'Female',
        phone: '9123456780',
        email: 'priya.sharma@example.com',
        address: '456 Sample Lane, Mumbai',
        className: 'Class 9',
        batchName: 'Evening Batch',
        admissionDate: '01-03-2026',
        session: '2026-2027',
        fees: 4500,
        status: 'Active'
    },
    {
        name: 'Amit Singh',
        dob: '10-01-2010',
        gender: 'Male',
        phone: '9888123456',
        email: 'amit.singh@example.com',
        address: '789 Demo Ave, Bangalore',
        className: 'Class 10',
        batchName: 'Morning Batch',
        admissionDate: '05-03-2026',
        session: '2026-2027',
        fees: 5000,
        status: 'Inactive'
    }
];

const ws = XLSX.utils.json_to_sheet(sampleData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Students");

XLSX.writeFile(wb, "Sample_Students_Import.xlsx");
console.log("Updated Sample_Students_Import.xlsx with all 12 fields created successfully!");
