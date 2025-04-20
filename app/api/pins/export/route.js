import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const fetchCache = 'force-no-store';

// GET - Fetch all pins matching filters for export (no pagination)
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    
    // Get filter parameters
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'Recently Updated';
    const tag = searchParams.get('tag');
    const years = searchParams.get('years')?.split(',').map(Number) || [];
    
    // Build where clause
    let where = {};
    
    // Add search filter
    if (search) {
      where.OR = [
        { pinName: { contains: search, mode: 'insensitive' } },
        { series: { contains: search, mode: 'insensitive' } },
        { pinId: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Add status filter
    if (status === 'collected') {
      where.isCollected = true;
    } else if (status === 'uncollected') {
      where.isDeleted = true;
    } else if (status === 'wishlist') {
      where.isWishlist = true;
    } else if (status === 'underReview') {
      where.isUnderReview = true;
    }
    
    // Add tag filter
    if (tag) {
      where.tags = {
        has: tag
      };
    }
    
    // Add year filter
    if (years.length > 0) {
      where.year = {
        in: years
      };
    }
    
    // Get pins for export
    const pins = await prisma.pin.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' }
      ],
      take: 250
    });
    
    return NextResponse.json(pins);
  } catch (error) {
    console.error('Error fetching pins for export:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
