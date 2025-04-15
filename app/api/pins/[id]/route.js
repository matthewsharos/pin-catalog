import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// Handle GET request to fetch a single pin by ID
export async function GET(req, { params }) {
  try {
    console.log('Fetching pin with ID:', params.id);
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      console.error('Invalid pin ID:', params.id);
      return NextResponse.json({ error: 'Invalid pin ID' }, { status: 400 });
    }

    // Get the pin without relations
    const pin = await prisma.pin.findUnique({
      where: { id }
    });

    if (!pin) {
      console.error('Pin not found:', id);
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 });
    }

    // Add empty arrays for userPhotos and comments
    pin.userPhotos = [];
    pin.comments = [];

    // Check if there's a JSON file with user photos for this pin
    try {
      const userDataDir = path.join(process.cwd(), 'public', 'data');
      const userDataFile = path.join(userDataDir, `pin_${pin.id}_data.json`);
      
      // Create directory if it doesn't exist
      await fs.mkdir(userDataDir, { recursive: true });
      
      // Try to read the file
      const fileData = await fs.readFile(userDataFile, 'utf8')
        .catch(() => JSON.stringify({ userPhotos: [], comments: [] }));
      
      const userData = JSON.parse(fileData);
      
      // Add user photos and comments to the pin
      pin.userPhotos = userData.userPhotos || [];
      pin.comments = userData.comments || [];
      
      console.log(`Loaded ${pin.userPhotos.length} photos and ${pin.comments.length} comments for pin ${pin.id}`);
    } catch (err) {
      console.error('Error loading user data for pin:', err);
      // Continue with empty arrays if there's an error
    }

    console.log('Found pin:', {
      id: pin.id,
      pinId: pin.pinId,
      pinName: pin.pinName,
      userPhotosCount: pin.userPhotos.length,
      commentsCount: pin.comments.length
    });
    
    return NextResponse.json(pin);
  } catch (error) {
    console.error('Error fetching pin:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch pin',
      details: error.message 
    }, { status: 500 });
  }
}

// Handle PUT request to update a pin
export async function PUT(req, { params }) {
  try {
    const id = parseInt(params.id);
    const data = await req.json();
    
    // Extract imageDataUrl if present
    const { imageDataUrl, ...pinData } = data;
    
    // Process data URL if present
    let imageUrl = pinData.imageUrl;
    
    if (imageDataUrl) {
      // Extract content type and base64 data
      const matches = imageDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const timestamp = Date.now();
        const extension = contentType.split('/')[1] || 'jpg';
        const filename = `${timestamp}_${id}.${extension}`;
        
        // Store in database
        const userPhoto = await prisma.userPhoto.create({
          data: {
            filename: filename,
            contentType: contentType,
            data: buffer,
            pin: { connect: { id } }
          }
        });
        
        // Create a URL for the image
        imageUrl = `/api/images/${userPhoto.id}`;
      }
    }
    
    // Update pin with new data
    const updatedPin = await prisma.pin.update({
      where: { id },
      data: {
        ...pinData,
        imageUrl: imageUrl || pinData.imageUrl,
        updatedAt: new Date()
      }
    });
    
    // Save user photos and comments to a JSON file
    try {
      const userDataDir = path.join(process.cwd(), 'public', 'data');
      const userDataFile = path.join(userDataDir, `pin_${id}_data.json`);
      
      // Create directory if it doesn't exist
      await fs.mkdir(userDataDir, { recursive: true });
      
      // Prepare user data
      const userData = {
        userPhotos: Array.isArray(pinData.userImages) 
          ? pinData.userImages.map(url => ({ url }))
          : [],
        comments: Array.isArray(pinData.comments)
          ? pinData.comments
          : []
      };
      
      // Write to file
      await fs.writeFile(userDataFile, JSON.stringify(userData, null, 2));
      
      console.log(`Saved ${userData.userPhotos.length} photos and ${userData.comments.length} comments for pin ${id}`);
      
      // Add the user data to the response
      updatedPin.userPhotos = userData.userPhotos;
      updatedPin.comments = userData.comments;
    } catch (err) {
      console.error('Error saving user data for pin:', err);
      // Continue with empty arrays if there's an error
      updatedPin.userPhotos = [];
      updatedPin.comments = [];
    }

    console.log('Updated pin:', {
      id: updatedPin.id,
      pinName: updatedPin.pinName,
      userPhotosCount: updatedPin.userPhotos.length,
      commentsCount: updatedPin.comments.length
    });

    return NextResponse.json(updatedPin);
  } catch (error) {
    console.error('Error updating pin:', error);
    return NextResponse.json({ 
      error: 'Failed to update pin',
      details: error.message 
    }, { status: 500 });
  }
}
