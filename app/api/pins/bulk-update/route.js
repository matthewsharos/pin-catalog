import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Bulk update pins (for tags, collection status, and other fields)
export async function POST(req) {
  try {
    const { pinIds, updates } = await req.json();
    
    if (!pinIds || !Array.isArray(pinIds) || pinIds.length === 0) {
      return NextResponse.json({ error: 'Pin IDs are required' }, { status: 400 });
    }
    
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Updates are required' }, { status: 400 });
    }
    
    // Validate updates
    if (updates.tags && !Array.isArray(updates.tags)) {
      return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 });
    }
    
    // Validate tags if they exist in the request
    if (updates.tags && Array.isArray(updates.tags) && updates.tags.length > 0) {
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
      const validTags = updates.tags.filter(tag => existingTagsSet.has(tag));
      
      // Log any invalid tags that were removed
      const invalidTags = updates.tags.filter(tag => !existingTagsSet.has(tag));
      if (invalidTags.length > 0) {
        console.log(`Removed ${invalidTags.length} invalid tags during bulk update:`, invalidTags);
      }
      
      // Update the data object with only valid tags
      updates.tags = validTags;
    }
    
    // Update each pin
    const updatePromises = pinIds.map(async (id) => {
      try {
        // Get the current pin to merge tags
        const currentPin = await prisma.pin.findUnique({
          where: { id: parseInt(id) },
          select: { tags: true }
        });
        
        // Prepare update data
        const updateData = {};
        
        // Handle tags update - add new tags to existing ones
        if (updates.tags) {
          // Get current tags or empty array
          const currentTags = currentPin?.tags || [];
          
          // Merge tags and remove duplicates
          updateData.tags = [...new Set([...currentTags, ...updates.tags])];
        }
        
        // Handle isCollected update
        if (updates.isCollected !== undefined) {
          updateData.isCollected = updates.isCollected;
          
          // If marking as collected, ensure it's not in wishlist or deleted
          if (updates.isCollected === true) {
            updateData.isDeleted = false;
            updateData.isWishlist = false;
          }
        }
        
        // Handle isLimitedEdition update
        if (updates.isLimitedEdition !== undefined) {
          updateData.isLimitedEdition = updates.isLimitedEdition;
        }
        
        // Handle isMystery update
        if (updates.isMystery !== undefined) {
          updateData.isMystery = updates.isMystery;
        }
        
        // Handle isDeleted update
        if (updates.isDeleted !== undefined) {
          updateData.isDeleted = updates.isDeleted;
        }
        
        // Handle isWishlist update
        if (updates.isWishlist !== undefined) {
          updateData.isWishlist = updates.isWishlist;
          
          // If adding to wishlist, mark as deleted
          if (updates.isWishlist === true) {
            updateData.isDeleted = true;
            updateData.isCollected = false;
          }
        }
        
        // Update the pin
        return await prisma.pin.update({
          where: { id: parseInt(id) },
          data: updateData
        });
      } catch (error) {
        console.error(`Error updating pin ${id}:`, error);
        throw error;
      }
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true, message: `Updated ${pinIds.length} pins` });
  } catch (error) {
    console.error('Error in bulk update:', error);
    return NextResponse.json({ error: 'Failed to update pins' }, { status: 500 });
  }
}

// DELETE - Remove tags from multiple pins
export async function DELETE(req) {
  try {
    const { pinIds, tags } = await req.json();
    
    if (!pinIds || !Array.isArray(pinIds) || pinIds.length === 0) {
      return NextResponse.json({ error: 'Pin IDs are required' }, { status: 400 });
    }
    
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ error: 'Tags are required' }, { status: 400 });
    }
    
    // Update each pin
    const updatePromises = pinIds.map(async (id) => {
      try {
        // Get the current pin
        const currentPin = await prisma.pin.findUnique({
          where: { id: parseInt(id) },
          select: { tags: true }
        });
        
        if (!currentPin) {
          throw new Error(`Pin with ID ${id} not found`);
        }
        
        // Filter out the tags to remove
        const updatedTags = (currentPin.tags || []).filter(tag => !tags.includes(tag));
        
        // Update the pin
        return await prisma.pin.update({
          where: { id: parseInt(id) },
          data: { tags: updatedTags }
        });
      } catch (error) {
        console.error(`Error removing tags from pin ${id}:`, error);
        throw error;
      }
    });
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    return NextResponse.json({ success: true, message: `Removed tags from ${pinIds.length} pins` });
  } catch (error) {
    console.error('Error in bulk tag removal:', error);
    return NextResponse.json({ error: 'Failed to remove tags' }, { status: 500 });
  }
}
