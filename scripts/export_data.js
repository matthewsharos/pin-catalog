// Export data from local database to JSON files for cloud import
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
  console.log('Starting data export...');
  
  try {
    // Create export directory if it doesn't exist
    const exportDir = path.join(process.cwd(), 'export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    // Export pins
    console.log('Exporting pins...');
    const pins = await prisma.pin.findMany();
    fs.writeFileSync(
      path.join(exportDir, 'pins.json'), 
      JSON.stringify(pins, null, 2)
    );
    console.log(`Exported ${pins.length} pins`);
    
    console.log('Data export completed successfully!');
  } catch (error) {
    console.error('Error exporting data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the export
exportData();
