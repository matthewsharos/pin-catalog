import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

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

    // Extract and flatten all tags, ensuring we handle null/undefined tags
    const allTags = pins.reduce((acc, pin) => {
      if (pin.tags && Array.isArray(pin.tags)) {
        // Filter out any null/undefined/empty tags
        const validTags = pin.tags.filter(tag => tag && typeof tag === 'string' && tag.trim());
        return [...acc, ...validTags];
      }
      return acc;
    }, []);

    // Count occurrences of each tag
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    // Convert to array of objects with tag name and count
    const tagsWithCounts = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        name: tag.trim(),
        count
      }))
      .filter(tag => tag.name) // Remove any empty tags
      .sort((a, b) => a.name.localeCompare(b.name));

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
    
    if (!tags || !Array.isArray(tags)) {
      return NextResponse.json({ error: 'Tags array is required' }, { status: 400 });
    }

    // Extract tag names from the request
    const tagNames = tags.map(tag => typeof tag === 'string' ? tag : tag.name);

    // Get all pins that have any tags if tagNames is empty, or pins with specific tags
    const pins = await prisma.pin.findMany({
      where: tagNames.length === 0 ? {
        tags: { isEmpty: false }
      } : {
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

    // Update each pin to remove either all tags or specific tags
    const updatePromises = pins.map(pin => {
      const updatedTags = tagNames.length === 0 ? [] : pin.tags.filter(tag => !tagNames.includes(tag));
      return prisma.pin.update({
        where: { id: pin.id },
        data: { tags: updatedTags }
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      message: `Removed ${tagNames.length === 0 ? 'all' : 'specified'} tags from ${pins.length} pins`,
      tagsRemoved: tagNames.length === 0 ? 'all' : tagNames
    });
  } catch (error) {
    console.error('Error removing tags:', error);
    return NextResponse.json({ error: 'Failed to remove tags' }, { status: 500 });
  }
}

// PUT - Update a tag name across all pins
export async function PUT(req) {
  try {
    const { oldTag, newTag } = await req.json();
    
    if (!oldTag || !newTag || typeof oldTag !== 'string' || typeof newTag !== 'string') {
      return NextResponse.json({ error: 'Old tag and new tag are required and must be strings' }, { status: 400 });
    }

    if (oldTag === newTag) {
      return NextResponse.json({ error: 'Old tag and new tag cannot be the same' }, { status: 400 });
    }

    // Get all pins that have the old tag
    const pins = await prisma.pin.findMany({
      where: {
        tags: {
          has: oldTag
        }
      },
      select: {
        id: true,
        tags: true
      }
    });

    console.log(`Found ${pins.length} pins with tag "${oldTag}" to update`);

    // Check if new tag already exists in the system
    const allPins = await prisma.pin.findMany({
      select: {
        tags: true
      }
    });

    // Extract and flatten all tags
    const allTags = allPins.reduce((acc, pin) => {
      if (pin.tags && Array.isArray(pin.tags)) {
        return [...acc, ...pin.tags];
      }
      return acc;
    }, []);

    // Get unique tags
    const uniqueTags = [...new Set(allTags)];
    
    // If new tag already exists, we'll merge the old tag into it
    // If not, we'll simply rename the old tag to the new tag
    
    // Update each pin to replace the old tag with the new tag
    const updatePromises = pins.map(pin => {
      const updatedTags = pin.tags.map(tag => tag === oldTag ? newTag : tag);
      
      // Remove duplicates that might occur if the pin already had the new tag
      const uniqueUpdatedTags = [...new Set(updatedTags)];
      
      return prisma.pin.update({
        where: { id: pin.id },
        data: { tags: uniqueUpdatedTags }
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ 
      message: `Updated tag "${oldTag}" to "${newTag}" in ${pins.length} pins`,
      pinsUpdated: pins.length
    });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}
