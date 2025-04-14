import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch all unique tags from non-deleted pins with counts
export async function GET(req) {
  try {
    // Get all non-deleted pins to extract tags
    const pins = await prisma.pin.findMany({
      where: {
        isDeleted: false
      },
      select: {
        tags: true
      }
    });

    // Extract and flatten all tags
    const allTags = pins.reduce((acc, pin) => {
      if (pin.tags && Array.isArray(pin.tags)) {
        return [...acc, ...pin.tags];
      }
      return acc;
    }, []);

    // Count occurrences of each tag
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    // Convert to array of objects with tag name and count
    const tagsWithCounts = Object.entries(tagCounts).map(([tag, count]) => ({
      name: tag,
      count
    })).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(tagsWithCounts);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST - Create a new tag
export async function POST(req) {
  try {
    const { tag } = await req.json();
    
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag is required and must be a string' }, { status: 400 });
    }

    // Get all pins to extract existing tags
    const pins = await prisma.pin.findMany({
      select: {
        tags: true
      }
    });

    // Extract and flatten all tags
    const allTags = pins.reduce((acc, pin) => {
      if (pin.tags && Array.isArray(pin.tags)) {
        return [...acc, ...pin.tags];
      }
      return acc;
    }, []);

    // Check if tag already exists
    const uniqueTags = [...new Set(allTags)];
    if (uniqueTags.includes(tag)) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400 });
    }

    // Since we don't have a separate tags table, we'll just return the new tag
    // It will be used when pins are updated
    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

// DELETE - Remove tags from all pins
export async function DELETE(req) {
  try {
    const { tags } = await req.json();
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'Tags array is required' }, { status: 400 });
    }

    // Extract tag names from the request
    const tagNames = tags.map(tag => typeof tag === 'string' ? tag : tag.name);

    // Get all pins that have any of the tags
    const pins = await prisma.pin.findMany({
      where: {
        tags: {
          hasSome: tagNames
        }
      },
      select: {
        id: true,
        tags: true
      }
    });

    console.log(`Found ${pins.length} pins with tags to remove`);

    // Update each pin to remove the specified tags
    const updatePromises = pins.map(pin => {
      const updatedTags = pin.tags.filter(tag => !tagNames.includes(tag));
      return prisma.pin.update({
        where: { id: pin.id },
        data: { tags: updatedTags }
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      message: `Removed tags from ${pins.length} pins`,
      tagsRemoved: tagNames
    });
  } catch (error) {
    console.error('Error removing tags:', error);
    return NextResponse.json({ error: 'Failed to remove tags' }, { status: 500 });
  }
}
