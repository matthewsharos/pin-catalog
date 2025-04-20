import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all pins with pagination, sorting, and filtering
// Also used to fetch top 10 pins for verification
export async function GET(req) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 30;
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
    
    const year = searchParams.get('year');
    const years = searchParams.get('years')?.split(',').filter(Boolean).map(Number);
    const series = searchParams.get('series');
    const origin = searchParams.get('origin');
    const edition = searchParams.get('edition');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const categories = searchParams.get('categories')?.split(',').filter(Boolean);
    const isLimitedEdition = searchParams.get('isLimitedEdition') === 'true';
    const isMystery = searchParams.get('isMystery') === 'true';
    const getFiltersOnly = searchParams.get('filtersOnly') === 'true';

    let where = {
      AND: []
    };

    // Status filters
    if (collected === 'true' || wishlist === 'true' || uncollected === 'true' || underReview === 'true' || searchParams.get('all') === 'true') {
      const statusConditions = [];
      
      if (collected === 'true') {
        statusConditions.push({ isCollected: true });
      }
      
      if (uncollected === 'true') {
        statusConditions.push({ 
          AND: [
            { isCollected: false },
            { isDeleted: false },
            { isWishlist: false },
            { isUnderReview: false }
          ]
        });
      }
      
      if (wishlist === 'true') {
        statusConditions.push({ isWishlist: true });
      }

      if (underReview === 'true') {
        statusConditions.push({ isUnderReview: true });
      }

      if (searchParams.get('all') === 'true') {
        statusConditions.push({ 
          AND: [
            { isCollected: false },
            { isDeleted: false },
            { isWishlist: false },
            { isUnderReview: false }
          ]
        });
      }

      if (statusConditions.length > 0) {
        where.AND.push({ OR: statusConditions });
      }
    }

    // Get available filters based on current status selection
    if (getFiltersOnly) {
      try {
        // If no where conditions, don't apply any filters
        if (where.AND.length === 0) {
          where = {};
        }

        // Add additional filters for dynamic dropdowns
        // Series filter
        if (series) {
          where.AND.push({ series: { equals: series, mode: 'insensitive' } });
        }

        // Origin filter
        if (origin) {
          where.AND.push({ origin: { equals: origin, mode: 'insensitive' } });
        }

        // Categories filter
        if (categories && categories.length > 0) {
          where.AND.push({
            tags: {
              hasSome: categories
            }
          });
        }

        // Origins filter from params
        const origins = searchParams.get('origins')?.split(',').filter(Boolean);
        if (origins && origins.length > 0) {
          where.AND.push({ 
            origin: { 
              in: origins 
            } 
          });
        }

        // Series filter from params
        const seriesArray = searchParams.get('series')?.split(',').filter(Boolean);
        if (seriesArray && seriesArray.length > 0) {
          where.AND.push({ 
            series: { 
              in: seriesArray 
            } 
          });
        }
        
        // Limited Edition filter
        if (isLimitedEdition) {
          where.AND.push({ isLimitedEdition: true });
        }
        
        // Mystery filter
        if (isMystery) {
          where.AND.push({ isMystery: true });
        }

        console.log('Fetching filters with where:', JSON.stringify(where, null, 2)); // Debug log

        const pins = await prisma.pin.findMany({
          where,
          select: {
            year: true,
            series: true,
            origin: true,
            edition: true,
            tags: true
          }
        });

        console.log('Found pins for filters:', pins.length); // Debug log

        // Extract unique values
        const filters = {
          years: [...new Set(pins.map(pin => pin.year).filter(Boolean))],
          series: [...new Set(pins.map(pin => pin.series).filter(Boolean))],
          origins: [...new Set(pins.map(pin => pin.origin).filter(Boolean))],
          tags: [...new Set(pins.flatMap(pin => pin.tags || []))]
        };

        console.log('Processed filters:', filters); // Debug log

        // Sort filters
        filters.years.sort((a, b) => b - a); // Years descending
        filters.series.sort();
        filters.origins.sort();
        filters.tags.sort();

        return NextResponse.json(filters);
      } catch (error) {
        console.error('Error in filter processing:', error);
        return NextResponse.json({ error: 'Failed to process filters' }, { status: 500 });
      }
    }

    // Search filter
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

    // Year filter
    if (year) {
      where.AND.push({ year: parseInt(year) });
    }
    
    // Multiple years filter
    if (years && years.length > 0) {
      where.AND.push({ 
        year: {
          in: years
        }
      });
    }

    // Series filter
    if (series) {
      where.AND.push({ series: { equals: series, mode: 'insensitive' } });
    }

    // Origin filter
    if (origin) {
      where.AND.push({ origin: { equals: origin, mode: 'insensitive' } });
    }

    // Edition filter
    if (edition) {
      where.AND.push({ edition: { equals: edition, mode: 'insensitive' } });
    }

    // Tags filter
    if (tags && tags.length > 0) {
      where.AND.push({
        tags: {
          hasSome: tags
        }
      });
    }
    
    // Categories filter
    if (categories && categories.length > 0) {
      where.AND.push({
        tags: {
          hasSome: categories
        }
      });
    }
    
    // Limited Edition filter
    if (isLimitedEdition) {
      where.AND.push({ isLimitedEdition: true });
    }
    
    // Mystery filter
    if (isMystery) {
      where.AND.push({ isMystery: true });
    }

    // Get pins with pagination
    const [pins, totalCount] = await prisma.$transaction([
      prisma.pin.findMany({
        where,
        orderBy: {
          [sortField]: sortOrder
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.pin.count({ where })
    ]);

    return NextResponse.json({
      pins,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / pageSize)
    });

  } catch (error) {
    console.error('Error in GET /api/pins:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch pins' }, { status: 500 });
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

    // Create the pin without pinId first
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
      },
    });

    // Update the pin to set pinId equal to id for manually added pins
    const updatedPin = await prisma.pin.update({
      where: { id: pin.id },
      data: { pinId: pin.id.toString() }
    });

    return NextResponse.json(updatedPin, { status: 201 });
  } catch (error) {
    console.error('Error creating pin:', error);
    return NextResponse.json({ error: 'Failed to create pin' }, { status: 500 });
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
