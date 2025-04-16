import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { scrapePinDetails } from '@/lib/scraper';

export async function POST(req) {
  try {
    const body = await req.json();
    const pinIds = body.pinId.split(',').map(id => id.trim()).filter(Boolean);

    if (pinIds.length === 0) {
      return NextResponse.json({ error: 'Please enter at least one Pin&Pop ID' }, { status: 400 });
    }

    const results = {
      added: [],
      existing: [],
      failed: []
    };

    for (const pinId of pinIds) {
      try {
        // Check if pin already exists
        const existingPin = await prisma.pin.findFirst({
          where: { pinId: pinId }
        });

        if (existingPin) {
          results.existing.push({
            pinId,
            pin: existingPin
          });
          continue;
        }

        // Scrape pin details
        const pinDetails = await scrapePinDetails(pinId);
        const newPin = await prisma.pin.create({
          data: {
            pinId: pinId,
            pinName: pinDetails.pinName,
            imageUrl: pinDetails.imageUrl,
            series: pinDetails.series,
            origin: pinDetails.origin,
            year: pinDetails.year,
            tags: pinDetails.tags,
            isCollected: false,
            isDeleted: false,
            isWishlist: false,
            isLimitedEdition: pinDetails.isLimitedEdition,
            isMystery: pinDetails.isMystery
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
    console.error('Error in pin scraping:', error);
    return NextResponse.json({ error: 'Failed to process pins' }, { status: 500 });
  }
}
