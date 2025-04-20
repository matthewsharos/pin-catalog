const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanInvalidTags() {
  console.log('Starting invalid tags cleanup...');
  
  try {
    // Get all pins with their tags
    const allPins = await prisma.pin.findMany({
      where: {
        tags: {
          isEmpty: false
        }
      },
      select: {
        id: true,
        tags: true
      }
    });

    console.log(`Found ${allPins.length} pins with tags`);

    // Get all valid tags from the Tag Management page
    // We'll consider a tag valid if it appears in the tags array of any pin
    // AND at least one other pin also has this tag (count >= 2)
    const tagCounts = new Map();
    allPins.forEach(pin => {
      pin.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // Only keep tags that appear in multiple pins (count >= 2)
    const validTagsSet = new Set(
      Array.from(tagCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([tag]) => tag)
    );

    console.log(`Found ${validTagsSet.size} valid tags`);

    // Track statistics
    let pinsUpdated = 0;
    let tagsRemoved = 0;

    // Process pins in batches to avoid memory issues
    const batchSize = 50;
    for (let i = 0; i < allPins.length; i += batchSize) {
      const batch = allPins.slice(i, Math.min(i + batchSize, allPins.length));
      
      const updatePromises = batch.map(async pin => {
        const originalTagCount = pin.tags.length;
        const validTags = pin.tags.filter(tag => validTagsSet.has(tag));
        
        if (validTags.length !== originalTagCount) {
          const removedCount = originalTagCount - validTags.length;
          tagsRemoved += removedCount;
          pinsUpdated++;
          
          return prisma.pin.update({
            where: { id: pin.id },
            data: { tags: validTags }
          });
        }
      }).filter(Boolean); // Remove undefined values (pins that don't need updating)

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`Processed ${i + batch.length} pins...`);
      }
    }

    console.log('\nCleanup completed successfully!');
    console.log(`Total pins updated: ${pinsUpdated}`);
    console.log(`Total invalid tags removed: ${tagsRemoved}`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanInvalidTags();
