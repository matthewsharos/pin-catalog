import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { scrapePinDetails } from '../../../../lib/scraper';

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
        // First check if pin already exists
        const existingPin = await prisma.pin.findUnique({
          where: { pinId }
        });
        
        if (existingPin) {
          // If pin already exists, add to existing results and skip
          results.existing.push({
            pinId,
            pin: existingPin
          });
          continue;
        }

        // Scrape pin details only if pin doesn't exist
        const pinDetails = await scrapePinDetails(pinId);
        
        // Create the new pin with the Pin&Pop URL
        const newPin = await prisma.pin.create({
          data: {
            pinName: pinDetails.pinName || 'Unknown Pin',
            imageUrl: pinDetails.imageUrl || '',
            series: pinDetails.series || '',
            origin: pinDetails.origin || '',
            year: pinDetails.year || null,
            tags: pinDetails.tags || [],
            isCollected: false,
            isDeleted: false,
            isWishlist: false,
            isLimitedEdition: pinDetails.isLimitedEdition || false,
            isMystery: pinDetails.isMystery || false,
            pinId,
            pinpopUrl: `https://pinandpop.com/pins/${pinId}/`
          }
        });
        
        results.added.push({
          pinId,
          pin: newPin
        });
      } catch (error) {
        console.error(`Error processing pin ${pinId}:`, error);
        results.failed.push({
          pinId,
          error: error.message || 'Failed to create pin'
        });
      }
    }

    // Calculate summary
    const summary = {
      total: pinIds.length,
      added: results.added.length,
      existing: results.existing.length,
      failed: results.failed.length
    };

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
          error: results.failed[0].error || 'Failed to create pin'
        }, { status: 400 });
      }
      if (results.added.length > 0) {
        return NextResponse.json(results.added[0].pin);
      }
    }

    // Return full results for multiple pins
    return NextResponse.json({
      summary,
      results
    });
  } catch (error) {
    console.error('Error in POST /api/pins/import:', error);
    return NextResponse.json({ error: error.message || 'Failed to process pins' }, { status: 500 });
  }
}
