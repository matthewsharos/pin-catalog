import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// GET - Fetch all pins with pagination, sorting, and filtering
// Also used to fetch top 10 pins for verification
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 100;
    const search = searchParams.get('search');
    const sort = searchParams.get('sort');
    const tag = searchParams.get('tag');
    const filtersOnly = searchParams.get('filtersOnly') === 'true';
    const categories = searchParams.get('categories')?.split(',').filter(Boolean);
    const origins = searchParams.get('origins')?.split(',').filter(Boolean);
    const series = searchParams.get('series')?.split(',').filter(Boolean);
    const years = searchParams.get('years')?.split(',').map(Number).filter(Boolean);
    const isLimitedEdition = searchParams.get('isLimitedEdition') === 'true';
    const isMystery = searchParams.get('isMystery') === 'true';

    // Status filters
    const all = searchParams.get('all') === 'true';
    const collected = searchParams.get('collected') === 'true';
    const uncollected = searchParams.get('uncollected') === 'true';
    const wishlist = searchParams.get('wishlist') === 'true';
    const underReview = searchParams.get('underReview') === 'true';

    // If filtersOnly is true, fetch available filters
    if (filtersOnly) {
      try {
        // Fetch distinct values for each filter type
        const [categoriesResult, originsResult, seriesResult, yearsResult] = await Promise.all([
          prisma.$queryRaw`SELECT DISTINCT unnest(categories) as value FROM "Pin" WHERE categories IS NOT NULL ORDER BY value`,
          prisma.$queryRaw`SELECT DISTINCT unnest(origins) as value FROM "Pin" WHERE origins IS NOT NULL ORDER BY value`,
          prisma.$queryRaw`SELECT DISTINCT unnest(series) as value FROM "Pin" WHERE series IS NOT NULL ORDER BY value`,
          prisma.$queryRaw`SELECT DISTINCT year FROM "Pin" WHERE year IS NOT NULL ORDER BY year DESC`
        ]);

        // Process the results safely
        const filters = {
          categories: categoriesResult.map(r => r.value).filter(Boolean),
          origins: originsResult.map(r => r.value).filter(Boolean),
          series: seriesResult.map(r => r.value).filter(Boolean),
          years: yearsResult.map(r => r.year).filter(Boolean)
        };

        return NextResponse.json(filters);
      } catch (error) {
        console.error('Error fetching filters:', error);
        // Return empty filters as fallback
        return NextResponse.json({
          categories: [],
          origins: [],
          series: [],
          years: []
        });
      }
    }

    // Build optimized where clause
    const whereConditions = [];

    // Handle status filters
    if (all) {
      // No status filter needed, show everything
    } else if (collected || uncollected || wishlist || underReview) {
      // If any specific status is selected, filter by those statuses
      const statusConditions = [];
      if (collected) statusConditions.push({ isCollected: true });
      if (uncollected) statusConditions.push({ isDeleted: true });
      if (wishlist) statusConditions.push({ isWishlist: true });
      if (underReview) statusConditions.push({ isUnderReview: true });
      
      if (statusConditions.length > 0) {
        whereConditions.push({ OR: statusConditions });
      }
    } else {
      // If no status is selected and all=false, show pins with no status
      whereConditions.push({
        AND: [
          { isCollected: false },
          { isDeleted: false },
          { isWishlist: false },
          { isUnderReview: false }
        ]
      });
    }

    // Add optimized search condition if search query exists
    if (search) {
      whereConditions.push({
        OR: [
          { pinName: { contains: search, mode: 'insensitive' } },
          { pinId: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    // Add remaining filters
    if (tag) whereConditions.push({ tags: { has: tag } });
    if (categories?.length) whereConditions.push({ categories: { hasSome: categories } });
    if (origins?.length) whereConditions.push({ origins: { hasSome: origins } });
    if (series?.length) whereConditions.push({ series: { hasSome: series } });
    if (years?.length) whereConditions.push({ year: { in: years } });
    if (isLimitedEdition === 'true') whereConditions.push({ isLimitedEdition: true });
    if (isMystery === 'true') whereConditions.push({ isMystery: true });

    // Combine all conditions
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Determine sort order
    let orderBy = [{ updatedAt: 'desc' }];
    switch (sort) {
      case 'Recently Added':
        orderBy = [{ createdAt: 'desc' }];
        break;
      case 'Name':
        orderBy = [{ pinName: 'asc' }];
        break;
      case 'Year':
        orderBy = [{ year: 'desc' }, { pinName: 'asc' }];
        break;
    }

    // Fetch total count and pins in parallel
    try {
      const [total, pins] = await Promise.all([
        prisma.pin.count({ where }),
        prisma.pin.findMany({
          where,
          select: {
            id: true,
            pinId: true,
            pinName: true,
            imageUrl: true,
            year: true,
            isCollected: true,
            isWishlist: true,
            isDeleted: true,
            isUnderReview: true,
            isLimitedEdition: true,
            isMystery: true,
            updatedAt: true,
            tags: true,
            series: true,
            origin: true,
            categories: true,
            releaseDate: true,
            pinpopUrl: true
          },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]).catch(error => {
        console.error('Database query error:', error);
        throw new Error(`Database error: ${error.message}`);
      });

      // Ensure tags are always an array
      const processedPins = pins.map(pin => ({
        ...pin,
        tags: Array.isArray(pin.tags) ? pin.tags : [],
        categories: Array.isArray(pin.categories) ? pin.categories : [],
        origins: Array.isArray(pin.origins) ? pin.origins : [],
        series: Array.isArray(pin.series) ? [pin.series] : []
      }));

      const totalPages = Math.ceil(total / pageSize);
      const hasMore = page < totalPages;

      return NextResponse.json({
        data: processedPins,
        pagination: {
          page,
          totalPages,
          total,
          hasMore
        }
      });
    } catch (error) {
      console.error('Error in pins query:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch pins',
        details: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in GET /api/pins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      
      // Get all valid tags from the database
      const validTags = [...new Set(allTags.reduce((acc, pin) => [...acc, ...pin.tags], []))];

      // Filter out invalid tags
      pinData.tags = pinData.tags.filter(tag => validTags.includes(tag));
    }

    // Create the pin
    const pin = await prisma.pin.create({
      data: {
        pinName: pinData.pinName,
        imageUrl: pinData.imageUrl || '',
        releaseDate: pinData.releaseDate ? new Date(pinData.releaseDate) : null,
        series: pinData.series || '',
        origin: pinData.origin || '',
        edition: pinData.edition || '',
        isLimitedEdition: pinData.isLimitedEdition || false,
        isMystery: pinData.isMystery || false,
        isCollected: false,
        isDeleted: false,
        isWishlist: false,
        isUnderReview: false,
        tags: pinData.tags || [],
        year: pinData.year || null,
        pinId: pinData.pinId || null, // Allow external pinId if provided
      },
    });

    // If no pinId was provided, use the pin's id as the pinId
    if (!pin.pinId) {
      const updatedPin = await prisma.pin.update({
        where: { id: pin.id },
        data: { pinId: pin.id.toString() }
      });
      return NextResponse.json(updatedPin);
    }

    return NextResponse.json(pin);
  } catch (error) {
    console.error('Error in POST /api/pins:', error);
    return NextResponse.json({ error: error.message || 'Failed to create pin' }, { status: 400 });
  }
}

// PUT - Update a pin
export async function PUT(req) {
  try {
    const data = await req.json();
    const { id, ...updates } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'Pin ID is required' }, { status: 400 });
    }

    // Ensure boolean fields are properly typed
    if (typeof updates.isCollected !== 'undefined') updates.isCollected = Boolean(updates.isCollected);
    if (typeof updates.isWishlist !== 'undefined') updates.isWishlist = Boolean(updates.isWishlist);
    if (typeof updates.isDeleted !== 'undefined') updates.isDeleted = Boolean(updates.isDeleted);
    if (typeof updates.isUnderReview !== 'undefined') updates.isUnderReview = Boolean(updates.isUnderReview);
    if (typeof updates.isLimitedEdition !== 'undefined') updates.isLimitedEdition = Boolean(updates.isLimitedEdition);
    if (typeof updates.isMystery !== 'undefined') updates.isMystery = Boolean(updates.isMystery);

    // Handle date conversion for releaseDate
    if (updates.releaseDate) {
      updates.releaseDate = new Date(updates.releaseDate);
    }

    const updatedPin = await prisma.pin.update({
      where: { id: parseInt(id) },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedPin);
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
