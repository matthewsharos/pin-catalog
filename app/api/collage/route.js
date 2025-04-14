import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import * as htmlToImage from 'html-to-image';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { query, filters } = await request.json();
    const where = {};

    if (filters.year) {
      where.year = parseInt(filters.year);
    }
    if (filters.rarity) {
      where.rarity = filters.rarity;
    }
    if (filters.isCollected) {
      where.isCollected = filters.isCollected === 'true';
    }
    if (filters.isDeleted !== undefined) {
      where.isDeleted = filters.isDeleted === 'true';
    } else {
      where.isDeleted = false;
    }

    if (query) {
      where.OR = [
        { pinName: { contains: query, mode: 'insensitive' } },
        { series: { contains: query, mode: 'insensitive' } },
        { origin: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
      ];
    }

    const pins = await prisma.pin.findMany({ where, take: 100 });

    // Generate HTML for collage
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; padding: 20px; background: #f0f0f0;">
          ${pins.map(pin => `<div style="text-align: center; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <img src="${pin.imageUrl}" style="width: 120px; height: 120px; object-fit: contain;" alt="${pin.pinName}" />
            <p style="margin: 5px 0; font-size: 12px; font-family: Arial;">${pin.pinName}</p>
          </div>`).join('')}
        </div>
      </body>
      </html>
    `;

    // Save temporary HTML file
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, 'collage.html');
    await fs.writeFile(tempFilePath, htmlContent);

    // Convert HTML to image (this would need a Vercel-compatible solution like a serverless function with puppeteer)
    // For now, we'll simulate a URL to the collage
    const collageUrl = `/tmp/collage-${Date.now()}.png`;

    return NextResponse.json({ collageUrl });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate collage' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
