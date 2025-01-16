import Database from 'better-sqlite3';
import path from 'path';
import { DB_DIR } from './config.js';

export interface ComicSansEntry {
    userId: string;
    status: 'pending_wallet' | 'completed' | 'failed';
    createdAt: number;
    walletAddress?: string;
    lastRewardAt?: number;
}

const dbPath = path.join(DB_DIR, 'comic-sans.sqlite');
const db = new Database(dbPath);

export const comicSans = {
    init() {
        console.log('Initializing Comic Sans DB at:', dbPath);
        try {
            db.exec(`
                CREATE TABLE IF NOT EXISTS comic_sans_entries (
                    userId TEXT PRIMARY KEY,
                    status TEXT NOT NULL,
                    createdAt INTEGER NOT NULL,
                    walletAddress TEXT,
                    lastRewardAt INTEGER
                )
            `);
            console.log('Comic Sans DB initialized successfully');
        } catch (error) {
            console.error('Error initializing Comic Sans DB:', error);
            throw error;
        }
    },

    addPendingUser(userId: string) {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO comic_sans_entries 
            (userId, status, createdAt)
            VALUES (@userId, 'pending_wallet', @createdAt)
        `);
        
        return stmt.run({
            userId,
            createdAt: Date.now()
        });
    },

    getUserStatus(userId: string): ComicSansEntry | undefined {
        const stmt = db.prepare(`
            SELECT * FROM comic_sans_entries 
            WHERE userId = ?
        `);
        
        return stmt.get(userId) as ComicSansEntry | undefined;
    },

    getPendingUsers(): ComicSansEntry[] {
        const stmt = db.prepare(`
            SELECT * FROM comic_sans_entries 
            WHERE status = 'pending_wallet'
        `);
        
        return stmt.all() as ComicSansEntry[];
    },

    completeUserReward(userId: string, walletAddress: string) {
        const stmt = db.prepare(`
            UPDATE comic_sans_entries 
            SET status = 'completed', 
                walletAddress = ?, 
                lastRewardAt = ?
            WHERE userId = ?
        `);
        
        return stmt.run(walletAddress, Date.now(), userId);
    }
};

// Inicializar la base de datos al importar
comicSans.init();