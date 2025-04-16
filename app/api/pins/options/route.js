import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Get current filter values
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const origins = searchParams.get('origins')?.split(',').filter(Boolean) || [];
    const series = searchParams.get('series')?.split(',').filter(Boolean) || [];
    const isLimitedEdition = searchParams.get('isLimitedEdition') === 'true';
    const isMystery = searchParams.get('isMystery') === 'true';
    const searchQuery = searchParams.get('search') || '';
    
    // Get status filters
    const collected = searchParams.get('collected') === 'true';
    const uncollected = searchParams.get('uncollected') === 'true'; 
    const wishlist = searchParams.get('wishlist') === 'true';

    // Base query conditions
    const baseWhere = {
      AND: [],
    };

    // Add search query condition if present
    if (searchQuery) {
      baseWhere.AND.push({
        OR: [
          { pinName: { contains: searchQuery, mode: 'insensitive' } },
          { series: { contains: searchQuery, mode: 'insensitive' } },
          { origin: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { hasSome: [searchQuery] } }
        ]
      });
    }

    // Add filter conditions
    if (categories.length > 0) {
      baseWhere.AND.push({ tags: { hasSome: categories } });
    }
    if (origins.length > 0) {
      baseWhere.AND.push({ origin: { in: origins } });
    }
    if (series.length > 0) {
      baseWhere.AND.push({ series: { in: series } });
    }
    if (isLimitedEdition) {
      baseWhere.AND.push({ isLimitedEdition: true });
    }
    if (isMystery) {
      baseWhere.AND.push({ isMystery: true });
    }
    
    // Apply status filters
    if (collected || uncollected || wishlist) {
      const statusConditions = [];
      
      if (collected) {
        statusConditions.push({ 
          isCollected: true,
          isDeleted: false
        });
      }
      
      if (uncollected) {
        statusConditions.push({ 
          isCollected: false,
          isDeleted: true,
          isWishlist: false
        });
      }
      
      if (wishlist) {
        statusConditions.push({ 
          isCollected: false,
          isDeleted: true,
          isWishlist: true
        });
      }
      
      // Add OR condition for status filters
      if (statusConditions.length > 0) {
        baseWhere.AND.push({ OR: statusConditions });
      }
    }

    // Handle empty AND array to prevent Prisma errors
    if (baseWhere.AND.length === 0) {
      delete baseWhere.AND;
    }

    // Get all available options based on current filters
    try {
      const [availableCategories, availableOrigins, availableSeries, availableYears] = await Promise.all([
        prisma.pin.findMany({
          where: {
            ...baseWhere,
            AND: baseWhere.AND?.filter(condition => !('tags' in condition)) || []
          },
          select: { tags: true },
          distinct: ['tags'],
        }).then(pins => [...new Set(pins.flatMap(pin => pin.tags))].sort()),

        prisma.pin.findMany({
          where: {
            ...baseWhere,
            AND: baseWhere.AND?.filter(condition => !('origin' in condition)) || []
          },
          select: { origin: true },
          distinct: ['origin'],
        }).then(pins => [...new Set(pins.map(pin => pin.origin))].filter(Boolean).sort()),

        prisma.pin.findMany({
          where: {
            ...baseWhere,
            AND: baseWhere.AND?.filter(condition => !('series' in condition)) || []
          },
          select: { series: true },
          distinct: ['series'],
        }).then(pins => [...new Set(pins.map(pin => pin.series))].filter(Boolean).sort()),

        prisma.pin.findMany({
          where: {
            ...baseWhere,
            AND: baseWhere.AND?.filter(condition => !('year' in condition)) || []
          },
          select: { year: true },
          distinct: ['year'],
        }).then(pins => [...new Set(pins.map(pin => pin.year))]
          .filter(Boolean)
          .sort((a, b) => b - a)), // Sort years in descending order
      ]);

      return NextResponse.json({
        categories: availableCategories,
        origins: availableOrigins,
        series: availableSeries,
        years: availableYears,
      });
    } catch (prismaError) {
      console.error('Prisma error in filter options:', prismaError);
      return NextResponse.json({
        error: 'Database error',
        categories: [],
        origins: [],
        series: [],
        years: [],
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json({
      error: 'Server error',
      categories: [],
      origins: [],
      series: [],
      years: [],
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
