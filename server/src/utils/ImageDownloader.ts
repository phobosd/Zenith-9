import fs from 'fs';
import path from 'path';
import { Logger } from './Logger';

export class ImageDownloader {
    private static CLIENT_PUBLIC_DIR = path.join(process.cwd(), '..', 'client', 'public');
    private static ASSETS_DIR = path.join(ImageDownloader.CLIENT_PUBLIC_DIR, 'assets', 'portraits');

    static async downloadImage(url: string, filename: string): Promise<string | null> {
        try {
            // Ensure directory exists
            if (!fs.existsSync(this.ASSETS_DIR)) {
                fs.mkdirSync(this.ASSETS_DIR, { recursive: true });
            }

            const response = await fetch(url);
            if (!response.ok) {
                Logger.error('ImageDownloader', `Failed to fetch image from ${url}: ${response.statusText}`);
                return null;
            }

            // Verify it's actually an image
            const contentType = response.headers.get('content-type');
            if (contentType && !contentType.startsWith('image/')) {
                Logger.error('ImageDownloader', `URL did not return an image. Content-Type: ${contentType}`);
                return null;
            }

            const buffer = await response.arrayBuffer();

            // If the buffer is suspiciously small (e.g., < 5KB), it might be an error page
            if (buffer.byteLength < 5000) {
                Logger.warn('ImageDownloader', `Downloaded file is suspiciously small (${buffer.byteLength} bytes). It might be a placeholder or error.`);
            }

            const filePath = path.join(this.ASSETS_DIR, filename);
            fs.writeFileSync(filePath, Buffer.from(buffer));

            Logger.info('ImageDownloader', `Downloaded image to ${filePath}`);

            // Return relative path for client
            return `/assets/portraits/${filename}`;
        } catch (error) {
            Logger.error('ImageDownloader', `Error downloading image: ${error}`);
            return null;
        }
    }
}
