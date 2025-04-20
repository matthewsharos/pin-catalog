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
        // Use a transaction to ensure database consistency
        await prisma.$transaction(async (tx) => {
          // First check if pin already exists
          const existingPin = await tx.pin.findUnique({
            where: { pinId: pinId }
          });

          if (existingPin) {
            // If pin already exists, add to existing results and skip
            results.existing.push({
              pinId,
              pin: existingPin
            });
            return; // Exit the transaction callback early
          }

          // Scrape pin details only if pin doesn't exist
          const pinDetails = await scrapePinDetails(pinId);
          
          // Create the new pin using the transaction
          const newPin = await tx.pin.create({
            data: {
              pinId: pinId,
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
              isMystery: pinDetails.isMystery || false
            }
          });
          
          results.added.push({
            pinId,
            pin: newPin
          });
        });
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
    console.error('Error in pin adding:', error);
    return NextResponse.json({ error: 'Failed to process pins' }, { status: 500 });
  }
}
