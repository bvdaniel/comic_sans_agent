import fs from 'fs';
import https from 'https';
import path from 'path';
import { elizaLogger } from '@ai16z/eliza';

export const downloadImage = async (url, filepath) => {
    try {
        // Ensure the directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download image: ${response.statusCode}`));
                    return;
                }

                const fileStream = fs.createWriteStream(filepath);
                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    elizaLogger.log(`Image downloaded successfully to ${filepath}`);
                    resolve(filepath);
                });

                fileStream.on('error', (err) => {
                    fs.unlink(filepath, () => reject(err));
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    } catch (error) {
        elizaLogger.error('Error downloading image:', error);
        throw error;
    }
};