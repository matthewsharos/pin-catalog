import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// Create a fresh Prisma client for this API route
// const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Handle multiple pin IDs separated by commas or new lines
    const pinIds = body.pinId
      .split(/[\n,]/) // Split by newlines or commas
      .map(id => id.trim())
      .filter(Boolean)
      .map(id => id.replace(/\D/g, '')); // Remove any non-digit characters
    
    if (pinIds.length === 0) {
      return NextResponse.json({ error: 'Please enter at least one Pin&Pop ID' }, { status: 400 });
    }

    const results = {
      added: [],
      existing: [],
      failed: []
    };

    // Process each pin ID
    for (const pinId of pinIds) {
      try {
        // First check if pin already exists using a direct database query
        const existingPins = await prisma.$queryRaw`
          SELECT * FROM "Pin" WHERE "pinId" = ${pinId} LIMIT 1
        `;
        
        if (existingPins && existingPins.length > 0) {
          // If pin already exists, add to existing results and skip
          results.existing.push({
            pinId,
            pin: existingPins[0]
          });
          continue;
        }

        // Scrape pin details only if pin doesn't exist
        const pinDetails = await scrapePinDetails(pinId);
        
        // Create the new pin
        const newPin = await prisma.$executeRaw`
          INSERT INTO "Pin" (
            "pinName", "imageUrl", "series", "origin", "year", 
            "tags", "isCollected", "isDeleted", "isWishlist", 
            "isLimitedEdition", "isMystery", "createdAt", "updatedAt", "pinId"
          ) 
          VALUES (
            ${pinDetails.pinName || 'Unknown Pin'}, 
            ${pinDetails.imageUrl || ''}, 
            ${pinDetails.series || ''}, 
            ${pinDetails.origin || ''}, 
            ${pinDetails.year || null}, 
            ${pinDetails.tags || []}, 
            false, false, false, 
            ${pinDetails.isLimitedEdition || false}, 
            ${pinDetails.isMystery || false}, 
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
            ${pinId}
          )
        `;
        
        // Fetch the newly created pin
        const newPins = await prisma.$queryRaw`
          SELECT * FROM "Pin" WHERE "pinId" = ${pinId} LIMIT 1
        `;
        
        if (newPins && newPins.length > 0) {
          results.added.push({
            pinId,
            pin: newPins[0]
          });
        } else {
          throw new Error('Failed to create pin');
        }
      } catch (error) {
        console.error(`Error processing pin ${pinId}:`, error);
        results.failed.push({
          pinId,
          error: error.message
        });
      }
    }

    // If only one pin was processed, maintain backward compatibility
    if (pinIds.length === 1) {
      if (results.existing.length > 0) {
        return NextResponse.json({ 
          error: 'Pin already exists in your collection',
          pin: results.existing[0].pin 
        }, { status: 400 });
      }
      if (results.failed.length > 0) {
        return NextResponse.json({ 
          error: results.failed[0].error 
        }, { status: 400 });
      }
      return NextResponse.json(results.added[0].pin);
    }

    // For multiple pins, return summary
    return NextResponse.json({
      summary: {
        total: pinIds.length,
        added: results.added.length,
        existing: results.existing.length,
        failed: results.failed.length
      },
      results
    });

  } catch (error) {
    console.error('Error in pin importing:', error);
    return NextResponse.json({ error: 'Failed to process pins' }, { status: 500 });
  } finally {
    // Disconnect Prisma client to prevent connection leaks
    // await prisma.$disconnect();
  }
}
