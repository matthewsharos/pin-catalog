import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';
import { put } from '@vercel/blob';
import { createCanvas, loadImage } from 'canvas';

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

    // Generate a collage using canvas
    const pinsPerRow = 5;
    const pinSize = 150;
    const padding = 10;
    const rows = Math.ceil(pins.length / pinsPerRow);
    
    const canvasWidth = pinsPerRow * (pinSize + padding) + padding;
    const canvasHeight = rows * (pinSize + padding) + padding;
    
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Pin Collage - ${pins.length} pins`, padding, padding + 20);
    
    // Draw pins
    const drawPins = async () => {
      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i];
        const row = Math.floor(i / pinsPerRow);
        const col = i % pinsPerRow;
        
        const x = col * (pinSize + padding) + padding;
        const y = row * (pinSize + padding) + padding + 40; // Add space for title
        
        // Draw pin background
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, pinSize, pinSize);
        
        try {
          if (pin.imageUrl) {
            const img = await loadImage(pin.imageUrl);
            // Draw image maintaining aspect ratio
            const aspectRatio = img.width / img.height;
            let drawWidth, drawHeight;
            
            if (aspectRatio > 1) {
              drawWidth = pinSize - 20;
              drawHeight = drawWidth / aspectRatio;
            } else {
              drawHeight = pinSize - 20;
              drawWidth = drawHeight * aspectRatio;
            }
            
            const drawX = x + (pinSize - drawWidth) / 2;
            const drawY = y + (pinSize - drawHeight) / 2;
            
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
          }
        } catch (err) {
          console.error(`Failed to load image for pin ${pin.pinId}:`, err);
          // Draw placeholder
          ctx.fillStyle = '#ddd';
          ctx.fillRect(x + 10, y + 10, pinSize - 20, pinSize - 20);
        }
      }
    };
    
    await drawPins();
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');
    
    // Upload to Vercel Blob Storage
    const filename = `collage-${Date.now()}.png`;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png'
    });

    return NextResponse.json({ collageUrl: blob.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate collage' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
