import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all pins with pagination, sorting, and filtering
// Also used to fetch top 10 pins for verification
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const year = searchParams.get('year') || '';
    const category = searchParams.get('category') || '';
    const origin = searchParams.get('origin') || '';
    const collected = searchParams.get('collected') || '';
    const wishlist = searchParams.get('wishlist') || '';
    const uncollected = searchParams.get('uncollected') || '';
    
    // Build the where clause for filtering
    const where = {
      AND: [] // Use AND to combine different filter types
    };
    
    // Status filters
    if (collected === 'true' || wishlist === 'true' || uncollected === 'true') {
      // If any status filter is active, build an OR condition for statuses
      const statusConditions = [];
      
      if (collected === 'true') {
        statusConditions.push({ isCollected: true, isDeleted: false });
      }
      
      if (uncollected === 'true') {
        // Uncollected pins are explicitly marked as uncollected (isDeleted=true but not wishlist)
        statusConditions.push({ isCollected: false, isDeleted: true, isWishlist: false });
      }
      
      if (wishlist === 'true') {
        statusConditions.push({ isDeleted: true, isWishlist: true });
      }

      where.AND.push({ OR: statusConditions });
    } else {
      // Default behavior - show pins that haven't been categorized yet
      where.AND.push({
        AND: [
          { isCollected: false },
          { isDeleted: false },
          { isWishlist: false }
        ]
      });
    }
    
    // Search functionality
    if (search) {
      where.AND.push({
        OR: [
          { pinName: { contains: search, mode: 'insensitive' } },
          { pinId: { contains: search, mode: 'insensitive' } },
          { series: { contains: search, mode: 'insensitive' } },
          { origin: { contains: search, mode: 'insensitive' } },
        ]
      });
    }
    
    // Filter by year
    if (year) {
      const years = year.split(',').filter(y => y);
      if (years.length > 0) {
        where.AND.push({
          year: {
            in: years.map(y => parseInt(y, 10))
          }
        });
      }
    }
    
    // Filter by category (tag)
    if (category) {
      const categories = category.split(',').filter(c => c);
      if (categories.length > 0) {
        where.AND.push({
          tags: {
            hasSome: categories
          }
        });
      }
    }
    
    // Filter by origin
    if (origin) {
      where.AND.push({
        origin: {
          contains: origin,
          mode: 'insensitive'
        }
      });
    }
    
    // Sorting
    let orderBy = {};
    
    if (sortBy) {
      switch (sortBy) {
        case 'pinName':
          orderBy = { pinName: sortOrder || 'asc' };
          break;
        case 'releaseDate':
          orderBy = { releaseDate: sortOrder || 'desc' };
          break;
        case 'updatedAt':
          orderBy = { updatedAt: sortOrder || 'desc' };
          break;
        case 'series':
          orderBy = { series: sortOrder || 'asc' };
          break;
        case 'origin':
          orderBy = { origin: sortOrder || 'asc' };
          break;
        case 'isCollected':
          orderBy = { isCollected: sortOrder || 'desc' };
          break;
        default:
          // Default sorting priority:
          // 1. updatedAt latest first
          // 2. release date newest first
          // 3. name alphabetical
          orderBy = [
            { updatedAt: 'desc' },
            { releaseDate: 'desc' },
            { pinName: 'asc' }
          ];
      }
    } else {
      // Default sorting priority:
      // 1. updatedAt latest first
      // 2. release date newest first
      // 3. name alphabetical
      orderBy = [
        { updatedAt: 'desc' },
        { releaseDate: 'desc' },
        { pinName: 'asc' }
      ];
    }
    
    // Get total count for pagination
    const total = await prisma.pin.count({ where });
    
    // Get pins with pagination
    const pins = await prisma.pin.findMany({
      where,
      orderBy,
      skip: (page - 1) * 100,
      take: 100,
    });
    
    // Clean up data
    const cleanedPins = pins.map(pin => {
      // Remove parentheses from origin and series
      const cleanOrigin = pin.origin ? pin.origin.replace(/\([^)]*\)/g, '').trim() : pin.origin;
      const cleanSeries = pin.series ? pin.series.replace(/\([^)]*\)/g, '').trim() : pin.series;
      
      // Extract integer from edition
      let editionNumber = null;
      if (pin.edition) {
        const match = pin.edition.match(/\d+/);
        if (match) {
          editionNumber = parseInt(match[0], 10);
        }
      }
      
      return {
        ...pin,
        origin: cleanOrigin,
        series: cleanSeries,
        edition: editionNumber
      };
    });
    
    // Get filter options based on current filters
    // Create a base filter that includes all current filters except the one we're getting options for
    const baseFilter = { ...where };
    
    // Get years without applying other filters if no category is selected
    const yearsFilter = category ? { ...baseFilter } : {};
    delete yearsFilter.year; // Remove year filter to get all available years
    
    const years = await prisma.pin.groupBy({
      by: ['year'],
      where: {
        ...yearsFilter,
        year: { not: null }
      },
      orderBy: {
        year: 'desc'
      }
    }).then(results => results.map(r => r.year));
    
    // Get series based on other filters
    const seriesFilter = { ...baseFilter };
    delete seriesFilter.series; // Remove series filter
    
    const series = await prisma.pin.groupBy({
      by: ['series'],
      where: {
        ...seriesFilter,
        series: { not: null }
      },
      orderBy: {
        series: 'asc'
      }
    }).then(results => results.map(r => r.series));
    
    // Get origins based on other filters
    const originsFilter = { ...baseFilter };
    delete originsFilter.origin; // Remove origin filter
    
    const origins = await prisma.pin.groupBy({
      by: ['origin'],
      where: {
        ...originsFilter,
        origin: { not: null }
      },
      orderBy: {
        origin: 'asc'
      }
    }).then(results => results.map(r => r.origin));
    
    // Get tags based on other filters
    const tagsFilter = { ...baseFilter };
    delete tagsFilter.tags; // Remove tags filter
    
    // For tags, we need a different approach since they're in an array
    const pinsWithTags = await prisma.pin.findMany({
      where: tagsFilter,
      select: {
        tags: true
      }
    });
    
    // Extract all unique tags
    const allTags = new Set();
    pinsWithTags.forEach(pin => {
      if (pin.tags && Array.isArray(pin.tags)) {
        pin.tags.forEach(tag => allTags.add(tag));
      }
    });
    const tags = Array.from(allTags).sort();
    
    // Clean up filter options
    const cleanedOrigins = origins.map(origin => 
      origin ? origin.replace(/\([^)]*\)/g, '').trim() : origin
    );
    
    const cleanedSeries = series.map(series => 
      series ? series.replace(/\([^)]*\)/g, '').trim() : series
    );
    
    return NextResponse.json({
      pins: cleanedPins,
      total,
      filterOptions: {
        years,
        series: cleanedSeries,
        origins: cleanedOrigins,
        tags
      }
    });
  } catch (error) {
    console.error('Error fetching pins:', error);
    return NextResponse.json({ error: 'Failed to fetch pins' }, { status: 500 });
  }
}

// POST - Add a new pin
export async function POST(req) {
  try {
    const pinData = await req.json();

    // Validate required fields
    if (!pinData.pinName) {
      return NextResponse.json({ error: 'Pin name is required' }, { status: 400 });
    }

    // Validate tags if they exist in the request
    if (pinData.tags && Array.isArray(pinData.tags) && pinData.tags.length > 0) {
      // Get all existing tags from the database
      const allTags = await prisma.pin.findMany({
        select: {
          tags: true
        }
      });
      
      // Create a set of all unique tags
      const existingTagsSet = new Set();
      allTags.forEach(pin => {
        if (pin.tags && Array.isArray(pin.tags)) {
          pin.tags.forEach(tag => existingTagsSet.add(tag));
        }
      });
      
      // Filter out tags that don't exist
      const validTags = pinData.tags.filter(tag => existingTagsSet.has(tag));
      
      // Log any invalid tags that were removed
      const invalidTags = pinData.tags.filter(tag => !existingTagsSet.has(tag));
      if (invalidTags.length > 0) {
        console.log(`Removed ${invalidTags.length} invalid tags during pin creation:`, invalidTags);
      }
      
      // Update the data object with only valid tags
      pinData.tags = validTags;
    }

    const pin = await prisma.pin.create({
      data: {
        pinId: pinData.pinId,
        pinName: pinData.pinName,
        imageUrl: pinData.imageUrl || '',
        releaseDate: pinData.releaseDate ? new Date(pinData.releaseDate) : null,
        series: pinData.series || '',
        origin: pinData.origin || '',
        edition: pinData.edition || '',
        isLimitedEdition: pinData.isLimitedEdition || false,
        isCollected: pinData.isCollected || false,
        tags: pinData.tags || [], // Add validated tags
      },
    });

    return NextResponse.json(pin, { status: 201 });
  } catch (error) {
    console.error('Error creating pin:', error);
    return NextResponse.json({ error: 'Failed to create pin' }, { status: 500 });
  }
}

// PUT - Update a pin
export async function PUT(req) {
  try {
    const pinData = await req.json();
    const { id, ...updateData } = pinData;

    if (!id) {
      return NextResponse.json({ error: 'Pin ID is required' }, { status: 400 });
    }

    // Handle date conversion for releaseDate
    if (updateData.releaseDate) {
      updateData.releaseDate = new Date(updateData.releaseDate);
    }

    const pin = await prisma.pin.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData, // Include all fields from the update data
        updatedAt: new Date(), // Always update timestamp
      },
    });

    return NextResponse.json(pin);
  } catch (error) {
    console.error('Error updating pin:', error);
    return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 });
  }
}

// DELETE - Clear all pins from the database
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';

    if (!all) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    await prisma.pin.deleteMany({});
    return NextResponse.json({ message: 'All pins deleted successfully' });
  } catch (error) {
    console.error('Error deleting pins:', error);
    return NextResponse.json({ error: 'Failed to delete pins' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
