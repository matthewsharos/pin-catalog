import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

// GET - Fetch all pins matching filters for export (no pagination)
export async function GET(req) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const maxPins = parseInt(searchParams.get('maxPins')) || 250; // Limit to 250 pins max
    const collected = searchParams.get('collected');
    const wishlist = searchParams.get('wishlist');
    const uncollected = searchParams.get('uncollected');
    const underReview = searchParams.get('underReview');
    const searchQuery = searchParams.get('search');
    const sort = searchParams.get('sort');
    let sortField = 'updatedAt';
    let sortOrder = 'desc';
    
    // Process sort option
    if (sort) {
      switch (sort) {
        case 'Recently Updated':
          sortField = 'updatedAt';
          sortOrder = 'desc';
          break;
        case 'Name (A-Z)':
          sortField = 'pinName';
          sortOrder = 'asc';
          break;
        case 'Name (Z-A)':
          sortField = 'pinName';
          sortOrder = 'desc';
          break;
        case 'Newest First':
          sortField = 'releaseDate';
          sortOrder = 'desc';
          break;
        case 'Oldest First':
          sortField = 'releaseDate';
          sortOrder = 'asc';
          break;
        default:
          // Default to recently updated
          sortField = 'updatedAt';
          sortOrder = 'desc';
      }
    }
    
    const years = searchParams.get('years')?.split(',').filter(Boolean).map(Number);
    const series = searchParams.get('series')?.split(',').filter(Boolean);
    const origins = searchParams.get('origins')?.split(',').filter(Boolean);
    const categories = searchParams.get('categories')?.split(',').filter(Boolean);
    const isLimitedEdition = searchParams.get('isLimitedEdition') === 'true';
    const isMystery = searchParams.get('isMystery') === 'true';

    let where = {
      AND: []
    };

    // Status filters
    if (collected === 'true' || wishlist === 'true' || uncollected === 'true' || underReview === 'true') {
      const statusConditions = [];
      
      if (collected === 'true') {
        statusConditions.push({ isCollected: true });
      }
      
      if (wishlist === 'true') {
        statusConditions.push({ isWishlist: true });
      }
      
      if (uncollected === 'true') {
        statusConditions.push({ isDeleted: true });
      }
      
      if (underReview === 'true') {
        statusConditions.push({ isUnderReview: true });
      }
      
      if (statusConditions.length > 0) {
        where.AND.push({
          OR: statusConditions
        });
      }
    }
    
    // Search query
    if (searchQuery) {
      where.AND.push({
        OR: [
          { pinName: { contains: searchQuery, mode: 'insensitive' } },
          { series: { contains: searchQuery, mode: 'insensitive' } },
          { origin: { contains: searchQuery, mode: 'insensitive' } },
          { edition: { contains: searchQuery, mode: 'insensitive' } },
          { pinId: { contains: searchQuery, mode: 'insensitive' } }
        ]
      });
    }
    
    // Year filters
    if (years && years.length > 0) {
      where.AND.push({
        year: { in: years }
      });
    }
    
    // Series filters
    if (series && series.length > 0) {
      where.AND.push({
        series: { in: series }
      });
    }
    
    // Origin filters
    if (origins && origins.length > 0) {
      where.AND.push({
        origin: { in: origins }
      });
    }
    
    // Category filters (tags)
    if (categories && categories.length > 0) {
      where.AND.push({
        tags: {
          hasSome: categories
        }
      });
    }
    
    // Limited Edition filter
    if (isLimitedEdition) {
      where.AND.push({
        isLimitedEdition: true
      });
    }
    
    // Mystery filter
    if (isMystery) {
      where.AND.push({
        isMystery: true
      });
    }
    
    // If no filters are applied, use an empty where clause
    if (where.AND.length === 0) {
      where = {};
    }

    // Fetch pins with the applied filters
    const pins = await prisma.pin.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder
      },
      take: maxPins, // Limit to maxPins
    });

    return NextResponse.json({
      pins,
      total: pins.length,
      message: `Fetched ${pins.length} pins for export`
    });
  } catch (error) {
    console.error('Error fetching pins for export:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
