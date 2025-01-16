import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STORAGE_DIR = path.join(__dirname, '../../data');
export const DB_DIR = path.join(STORAGE_DIR, 'db');

// Asegurar que los directorios existan
if (!fs.existsSync(STORAGE_DIR)) {
    console.log('Creating storage directory at:', STORAGE_DIR);
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(DB_DIR)) {
    console.log('Creating db directory at:', DB_DIR);
    fs.mkdirSync(DB_DIR, { recursive: true });
}