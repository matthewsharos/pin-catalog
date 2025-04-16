import fetch from 'node-fetch';
import cheerio from 'cheerio';

export async function scrapePinDetails(pinId) {
  // Fetch the webpage content
  const url = `https://pinandpop.com/pins/${pinId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://pinandpop.com/'
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Pin not found on Pin&Pop');
    }
    throw new Error(`Failed to fetch pin data: ${response.status}`);
  }
  
  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract pin name from the table - this is the most reliable source
  let pinName = null;
  const pinRow = $('th:contains("Pin")');
  if (pinRow.length && pinRow.next('td').length) {
    pinName = pinRow.next('td').text().trim();
  }

  // If not found in the table, try to extract from title
  if (!pinName) {
    const titleTag = $('title');
    if (titleTag.length) {
      // Format: "97366 - Spider-Man - Marvel Superhero Transformations - Disneyland Resort Disney Pin"
      const titleParts = titleTag.text().split(' - ');
      if (titleParts.length >= 2) {
        pinName = titleParts[1].trim();
      }
    }
  }

  // If still not found, extract from URL as fallback
  if (!pinName) {
    pinName = url.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Try to find the thumbnail image URL in the page
  let thumbnailUrl = null;
  
  // First check meta tags for the image
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogImage) {
    thumbnailUrl = ogImage;
  }
  
  // If not found in meta tags, look for img tags
  if (!thumbnailUrl) {
    $('img').each((i, img) => {
      const src = $(img).attr('src');
      if (src && src.includes(pinId) && src.includes('amazonaws')) {
        thumbnailUrl = src;
        return false; // break the loop
      }
    });
  }
  
  // Convert thumbnail URL to actual image URL or use default pattern
  let imageUrl = thumbnailUrl;
  if (!imageUrl) {
    // Use default pattern with example code
    imageUrl = `https://pinandpop.s3.amazonaws.com/images/pins/${pinId}_Wr4p.jpg`;
  }
  
  // Extract series from the table
  let series = null;
  const seriesRow = $('th:contains("Series")');
  if (seriesRow.length && seriesRow.next('td').length) {
    const seriesTd = seriesRow.next('td');
    const seriesLink = seriesTd.find('a');
    if (seriesLink.length) {
      series = seriesLink.text().trim();
    } else {
      series = seriesTd.text().trim();
    }
  }
  
  // If not found in the table, try to extract from title
  if (!series) {
    const titleTag = $('title');
    if (titleTag.length) {
      const titleParts = titleTag.text().split(' - ');
      if (titleParts.length >= 3) {
        series = titleParts[2].trim();
      }
    }
  }
  
  // Extract origin from the table
  let origin = null;
  const originRow = $('th:contains("Origin")');
  if (originRow.length && originRow.next('td').length) {
    const originTd = originRow.next('td');
    const originLink = originTd.find('a');
    if (originLink.length) {
      origin = originLink.text().trim().replace('(DLR)', '').trim();
    } else {
      origin = originTd.text().trim();
    }
  }
  
  // If not found in the table, try to extract from title
  if (!origin) {
    const titleTag = $('title');
    if (titleTag.length) {
      const titleParts = titleTag.text().split(' - ');
      if (titleParts.length >= 4) {
        origin = titleParts[3].replace('Disney Pin', '').trim();
      }
    }
  }
  
  // Extract edition from the table
  let edition = null;
  const editionRow = $('th:contains("Edition")');
  if (editionRow.length && editionRow.next('td').length) {
    edition = editionRow.next('td').text().trim();
  }
  
  // Extract release date from the table
  let releaseDate = null;
  const dateRow = $('th:contains("Release Date")');
  if (dateRow.length && dateRow.next('td').length) {
    const dateText = dateRow.next('td').text().trim();
    if (dateText) {
      try {
        const parsedDate = new Date(dateText);
        // Only set the date if it's valid
        if (!isNaN(parsedDate.getTime())) {
          releaseDate = parsedDate;
        }
      } catch (e) {
        console.error('Error parsing date:', e);
      }
    }
  }
  
  // Extract year from release date or default to current year
  let year = new Date().getFullYear();
  if (releaseDate && !isNaN(releaseDate.getTime())) {
    year = releaseDate.getFullYear();
  }
  
  // Extract rarity from the table
  let rarity = 'common';
  const rarityRow = $('th:contains("Rarity")');
  if (rarityRow.length && rarityRow.next('td').length) {
    rarity = rarityRow.next('td').text().trim().toLowerCase();
  }
  
  // Extract tags from the pin tags table
  const tags = [];
  const tagsTable = $('th:contains("Pin Tags")');
  if (tagsTable.length && tagsTable.parent('tr').length) {
    tagsTable.parent('tr').parent('tbody').find('a.badge').each((i, tag) => {
      const tagText = $(tag).text().trim();
      if (tagText && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });
  }
  
  // If no tags found, add the pin name and series as tags
  if (tags.length === 0) {
    if (pinName) {
      tags.push(pinName);
    }
    if (series && !tags.includes(series)) {
      tags.push(series);
    }
  }
  
  // Determine if it's a mystery pin
  const isMystery = (pinName && pinName.toLowerCase().includes('mystery')) || 
                   (series && series.toLowerCase().includes('mystery'));
  
  // Determine if it's a limited edition
  const isLimitedEdition = edition && edition.toLowerCase().includes('limited edition');
  
  return {
    pinId: pinId.toString(),
    pinName,
    imageUrl,
    series: series || '',
    origin: origin || '',
    edition: edition || '',
    releaseDate,
    year: year || null,
    rarity: rarity || 'common',
    tags,
    isMystery,
    isLimitedEdition,
    pinpopUrl: `https://pinandpop.com/pins/${pinId}`
  };
}
