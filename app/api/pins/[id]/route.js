import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import path from 'path';
import fs from 'fs/promises';

// Handle GET request to fetch a single pin by ID
export async function GET(req, { params }) {
  try {
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

    // Try to fetch user data from the JSON file
    try {
      const userDataDir = path.join(process.cwd(), 'public', 'data');
      const userDataFile = path.join(userDataDir, `pin_${pin.id}_data.json`);
      
      const userData = JSON.parse(await fs.readFile(userDataFile, 'utf8'));
      
      // Add user data to the pin
      pin.userPhotos = userData.userPhotos || [];
      pin.comments = userData.comments || [];
    } catch (err) {
      // If the file doesn't exist or can't be read, use empty arrays
      pin.userPhotos = [];
      pin.comments = [];
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
    return NextResponse.json({ error: 'Failed to fetch pin' }, { status: 500 });
  }
}

// Handle PUT request to update a pin
export async function PUT(req, { params }) {
  try {
    const id = parseInt(params.id);
    const data = await req.json();
    
    console.log('Updating pin:', id);
    console.log('Received data:', JSON.stringify({
      ...data,
      imageDataUrl: data.imageDataUrl ? '[DATA_URL_TRUNCATED]' : undefined
    }));
    
    // Extract imageDataUrl if present
    const { imageDataUrl, ...pinData } = data;
    
    // Process data URL if present
    let imageUrl = pinData.imageUrl;
    
    if (imageDataUrl) {
      console.log('Processing image data URL');
      // Extract content type and base64 data
      const matches = imageDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        console.log('Image data extracted:', {
          contentType,
          dataLength: buffer.length
        });
        
        // Generate unique filename
        const timestamp = Date.now();
        const extension = contentType.split('/')[1] || 'jpg';
        const filename = `${timestamp}_${id}.${extension}`;
        
        // Store in database
        try {
          const userPhoto = await prisma.userPhoto.create({
            data: {
              filename: filename,
              contentType: contentType,
              data: buffer,
              pin: { connect: { id } }
            }
          });
          
          console.log('Image stored in database:', userPhoto.id);
          
          // Create a URL for the image
          imageUrl = `/api/images/${userPhoto.id}`;
          console.log('Image URL created:', imageUrl);
        } catch (imageError) {
          console.error('Error storing image:', imageError);
          throw new Error(`Failed to store image: ${imageError.message}`);
        }
      } else {
        console.error('Invalid data URL format');
      }
    }
    
    // Update pin with new data
    try {
      const updatedPin = await prisma.pin.update({
        where: { id },
        data: {
          ...pinData,
          imageUrl: imageUrl || pinData.imageUrl,
          updatedAt: new Date()
        }
      });
      
      console.log('Pin updated successfully:', updatedPin.id);
      
      // Try to save user photos and comments to a JSON file
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

      return NextResponse.json(updatedPin);
    } catch (updateError) {
      console.error('Error updating pin in database:', updateError);
      throw new Error(`Failed to update pin: ${updateError.message}`);
    }
  } catch (error) {
    console.error('Error updating pin:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pin' },
      { status: 500 }
    );
  }
}
