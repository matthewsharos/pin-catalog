import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(req, { params }) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('images');
    const pinId = parseInt(params.id);

    const uploadPromises = files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create unique filename
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const filename = `pin-${pinId}-${uniqueSuffix}${path.extname(file.name)}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      const filePath = path.join(uploadDir, filename);
      
      // Ensure upload directory exists
      await writeFile(filePath, buffer);
      
      // Save image record to database
      return prisma.image.create({
        data: {
          url: `/uploads/${filename}`,
          pinId: pinId
        }
      });
    });

    const images = await Promise.all(uploadPromises);
    return NextResponse.json(images);
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
