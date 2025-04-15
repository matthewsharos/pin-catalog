import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Get current filter values
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const origins = searchParams.get('origins')?.split(',').filter(Boolean) || [];
    const series = searchParams.get('series')?.split(',').filter(Boolean) || [];
    const isLimitedEdition = searchParams.get('isLimitedEdition') === 'true';
    const isMystery = searchParams.get('isMystery') === 'true';

    // Base query conditions
    const baseWhere = {
      AND: [],
    };

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

    // Get all available options based on current filters
    const [availableCategories, availableOrigins, availableSeries] = await Promise.all([
      prisma.pin.findMany({
        where: {
          ...baseWhere,
          AND: baseWhere.AND.filter(condition => !('tags' in condition))
        },
        select: { tags: true },
        distinct: ['tags'],
      }).then(pins => [...new Set(pins.flatMap(pin => pin.tags))].sort()),

      prisma.pin.findMany({
        where: {
          ...baseWhere,
          AND: baseWhere.AND.filter(condition => !('origin' in condition))
        },
        select: { origin: true },
        distinct: ['origin'],
      }).then(pins => [...new Set(pins.map(pin => pin.origin))].sort()),

      prisma.pin.findMany({
        where: {
          ...baseWhere,
          AND: baseWhere.AND.filter(condition => !('series' in condition))
        },
        select: { series: true },
        distinct: ['series'],
      }).then(pins => [...new Set(pins.map(pin => pin.series))].filter(Boolean).sort()),
    ]);

    return NextResponse.json({
      categories: availableCategories,
      origins: availableOrigins,
      series: availableSeries,
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
