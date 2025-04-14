const { PrismaClient } = require('@prisma/client');
const csv = require('csv-parse');
const fs = require('fs');

const prisma = new PrismaClient();

function parseTags(tagsString) {
  try {
    if (!tagsString) return [];
    // Remove curly braces and split by comma
    const cleanString = tagsString.replace(/[{}]/g, '');
    return cleanString.split(',').map(tag => tag.trim());
  } catch (err) {
    console.error('Error parsing tags:', tagsString);
    return [];
  }
}

function parseDate(dateStr) {
  if (!dateStr || dateStr === 'Unknown') return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

async function importPins() {
  const parser = fs
    .createReadStream('../pins_2025.csv')
    .pipe(csv.parse({
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true
    }));

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    for await (const record of parser) {
      try {
        // Skip records without a PinID
        if (!record.PinID?.trim()) {
          skipped++;
          continue;
        }

        // Check if pin with this PinID already exists
        const existingPin = await prisma.pin.findFirst({
          where: { pinId: record.PinID.trim() }
        });

        if (existingPin) {
          skipped++;
          continue;
        }

        const tags = parseTags(record.tags);
        const releaseDate = parseDate(record.release_date);
        
        // Log the first record to debug
        if (imported === 0) {
          console.log('First record:', record);
        }

        await prisma.pin.create({
          data: {
            pinId: record.PinID.trim(),
            pinName: record.pin_name?.trim(),
            imageUrl: record.image_url?.trim(),
            series: record.series?.trim(),
            origin: record.origin?.trim(),
            edition: record.edition?.trim(),
            releaseDate,
            tags,
            isCollected: record.is_collected?.toLowerCase() === 'true',
            isMystery: record.is_mystery?.toLowerCase() === 'true',
            isLimitedEdition: record.is_limited_edition?.toLowerCase() === 'true',
            rarity: record.rarity?.trim() || null,
            year: record.year ? parseInt(record.year) : null,
            pinpopUrl: `https://pinandpop.com/pins/${record.PinID.trim()}`,
            isDeleted: false
          }
        });
        imported++;
        if (imported % 10 === 0) {
          console.log(`Progress: Imported ${imported} pins, Skipped ${skipped}, Failed: ${failed}`);
        }
      } catch (err) {
        failed++;
        console.error(`Error importing pin ${record.PinID}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error reading CSV:', err);
  } finally {
    console.log(`\nImport complete!\nSuccessfully imported: ${imported} pins\nSkipped: ${skipped} pins\nFailed: ${failed} pins`);
    await prisma.$disconnect();
  }
}

importPins().catch(console.error);
