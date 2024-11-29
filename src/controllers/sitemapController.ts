import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SitemapStream, streamToPromise, SitemapIndexStream } from 'sitemap';
import { Readable } from 'stream';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();
const SITEMAP_DIR = path.join(__dirname, '../../public/sitemaps');
const URLS_PER_FILE = 10000; // Maximum URLs per sitemap file
const BASE_URL = process.env.HOSTED_URL || 'https://www.bondle.xyz'; // Fallback URL if env not set

// Ensure sitemaps directory exists
async function ensureSitemapDir() {
    try {
        await fs.access(SITEMAP_DIR);
    } catch {
        await fs.mkdir(SITEMAP_DIR, { recursive: true });
    }
}

async function generateStaticPages(): Promise<any[]> {
    return [
        { url: `${BASE_URL}/`, changefreq: 'daily', priority: 1.0 },
        { url: `${BASE_URL}/about`, changefreq: 'monthly', priority: 0.4 },
        { url: `${BASE_URL}/FAQ`, changefreq: 'monthly', priority: 0.4 }
    ];
}

async function generateTokenPages(): Promise<any[]> {
    const tokens = await prisma.token.findMany({
        select: {
            address: true,
            creatorAddress: true,
            updatedAt: true
        }
    });

    return tokens.map(token => ({
        url: `${BASE_URL}/token/${token.address}`,
        changefreq: 'daily',
        lastmod: token.updatedAt.toISOString(),
        priority: 0.8
    }));
}

async function generateCreatorPages(): Promise<any[]> {
    const tokens = await prisma.token.findMany({
        select: { creatorAddress: true }
    });

    const uniqueCreators = [...new Set(tokens.map(token => token.creatorAddress))];
    return uniqueCreators.map(creatorAddress => ({
        url: `${BASE_URL}/profile/${creatorAddress}`,
        changefreq: 'daily',
        priority: 0.6
    }));
}

async function createSitemapFile(urls: any[], index: number): Promise<string> {
    const filename = `sitemap-${index}.xml`;
    const filepath = path.join(SITEMAP_DIR, filename);
    
    const stream = new SitemapStream({ hostname: BASE_URL });
    const data = await streamToPromise(Readable.from(urls).pipe(stream));
    
    await fs.writeFile(filepath, data);
    return filename;
}

async function createSitemapIndex(sitemapFiles: string[]): Promise<Buffer> {
    const sitemapIndex = new SitemapIndexStream();
    const currentDate = new Date().toISOString();

    sitemapFiles.forEach(filename => {
        sitemapIndex.write({
            url: `${process.env.BACKEND_URL}/sitemaps/${filename}`,
            lastmod: currentDate
        });
    });
    sitemapIndex.end();

    return await streamToPromise(sitemapIndex);
}

export const generateSitemap = async (req: Request, res: Response) => {
    try {
        if (!BASE_URL) {
            throw new Error('HOSTED_URL environment variable is not set');
        }

        await ensureSitemapDir();

        // Generate all URLs
        const staticPages = await generateStaticPages();
        const tokenPages = await generateTokenPages();
        const creatorPages = await generateCreatorPages();
        
        const allUrls = [...staticPages, ...tokenPages, ...creatorPages];
        const sitemapFiles: string[] = [];

        // Split URLs into chunks and create sitemap files
        for (let i = 0; i < allUrls.length; i += URLS_PER_FILE) {
            const chunk = allUrls.slice(i, i + URLS_PER_FILE);
            const filename = await createSitemapFile(chunk, Math.floor(i / URLS_PER_FILE) + 1);
            sitemapFiles.push(filename);
        }

        // Create sitemap index
        const sitemapIndex = await createSitemapIndex(sitemapFiles);

        // Send response
        res.header('Content-Type', 'application/xml');
        res.send(sitemapIndex);

    } catch (error) {
        console.error('Sitemap generation error:', error);
        res.status(500).json({ error: 'Error generating sitemap' });
    }
};

// Serve individual sitemap files
export const serveSitemapFile = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(SITEMAP_DIR, filename);
        
        const data = await fs.readFile(filepath);
        res.header('Content-Type', 'application/xml');
        res.send(data);
    } catch (error) {
        console.error('Error serving sitemap file:', error);
        res.status(404).json({ error: 'Sitemap file not found' });
    }
};

// Schedule daily sitemap regeneration at 1:00 AM
cron.schedule('0 1 * * *', async () => {
    try {
        console.log('Regenerating sitemaps...');
        const mockRes = {
            header: () => {},
            send: () => {
                console.log('Sitemaps regenerated successfully');
            },
            status: () => ({ json: () => {} })
        };
        
        await generateSitemap({} as Request, mockRes as any);
    } catch (error) {
        console.error('Failed to regenerate sitemaps:', error);
    }
});

// Generate initial sitemaps on startup
(async () => {
    try {
        const mockRes = {
            header: () => {},
            send: () => {
                console.log('Initial sitemaps generated successfully');
            },
            status: () => ({ json: () => {} })
        };
        
        await generateSitemap({} as Request, mockRes as any);
    } catch (error) {
        console.error('Failed to generate initial sitemaps:', error);
    }
})(); 