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

    // If filtersOnly is true, return cached filters if available
    if (filtersOnly) {
      const cacheKey = 'filters';
      const cachedFilters = await prisma.filterCache.findUnique({
        where: { id: cacheKey },
        select: { data: true, updatedAt: true }
      });

      // Return cached filters if they're less than 1 hour old
      if (cachedFilters && Date.now() - cachedFilters.updatedAt < 3600000) {
        return NextResponse.json(JSON.parse(cachedFilters.data));
      }

      // Otherwise fetch and cache new filters
      const [categories, origins, series, years] = await Promise.all([
        prisma.pin.findMany({
          select: { categories: true },
          distinct: ['categories']
        }),
        prisma.pin.findMany({
          select: { origins: true },
          distinct: ['origins']
        }),
        prisma.pin.findMany({
          select: { series: true },
          distinct: ['series']
        }),
        prisma.pin.findMany({
          select: { year: true },
          distinct: ['year'],
          where: { year: { not: null } }
        })
      ]);

      const filters = {
        categories: [...new Set(categories.flatMap(p => p.categories))].sort(),
        origins: [...new Set(origins.flatMap(p => p.origins))].sort(),
        series: [...new Set(series.flatMap(p => p.series))].sort(),
        years: [...new Set(years.map(p => p.year))].sort((a, b) => b - a)
      };

      // Cache the filters
      await prisma.filterCache.upsert({
        where: { id: cacheKey },
        create: { id: cacheKey, data: JSON.stringify(filters) },
        update: { data: JSON.stringify(filters) }
      });

      return NextResponse.json(filters);
    }

    // Build optimized where clause
    const whereConditions = [];

    // Optimize status filters to use fewer OR conditions
    if (!all) {
      const statusConditions = {};
      if (collected) statusConditions.isCollected = true;
      if (uncollected) statusConditions.isDeleted = true;
      if (wishlist) statusConditions.isWishlist = true;
      if (underReview) statusConditions.isUnderReview = true;
      
      if (Object.keys(statusConditions).length > 0) {
        whereConditions.push({ OR: Object.entries(statusConditions).map(([key, value]) => ({ [key]: value })) });
      }
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

    // Add remaining filters with index hints
    if (tag) whereConditions.push({ tags: { has: tag } });
    if (categories?.length) whereConditions.push({ categories: { hasSome: categories } });
    if (origins?.length) whereConditions.push({ origins: { hasSome: origins } });
    if (series?.length) whereConditions.push({ series: { hasSome: series } });
    if (years?.length) whereConditions.push({ year: { in: years } });
    if (isLimitedEdition) whereConditions.push({ isLimitedEdition: true });
    if (isMystery) whereConditions.push({ isMystery: true });

    // Combine all conditions
    const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

    // Determine sort order with index hints
    let orderBy = [];
    switch (sort) {
      case 'Recently Updated':
        orderBy.push({ updatedAt: 'desc' });
        break;
      case 'Recently Added':
        orderBy.push({ createdAt: 'desc' });
        break;
      case 'Name':
        orderBy.push({ pinName: 'asc' });
        break;
      case 'Year':
        orderBy.push({ year: 'desc' }, { pinName: 'asc' });
        break;
      default:
        orderBy.push({ updatedAt: 'desc' });
    }

    // Fetch total count and pins in parallel with optimized select
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
          updatedAt: true
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    return NextResponse.json({
      data: pins,
      pagination: {
        page,
        totalPages,
        total,
        hasMore
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
