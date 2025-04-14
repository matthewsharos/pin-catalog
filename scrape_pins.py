import requests
from bs4 import BeautifulSoup
import csv
from datetime import datetime
import json
import time
import random
import re
import os
import sys

# Headers to make the request look more like a browser
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://pinandpop.com/'
}

# Base URL for pin and pop
base_url = 'https://pinandpop.com'

# File to store the last processed ID
last_id_file = 'last_processed_id.txt'

# CSV file to store the data
csv_file = 'pins_2025.csv'

# Total pins to scrape
total_pins_to_scrape = 50000  # Target 50,000 unique pins

# Batch size for processing pins
batch_size = 100  # Increased batch size for efficiency

# Rate limiting
request_delay = 1  # Delay between requests in seconds
max_retries = 3    # Maximum number of retries for failed requests

# Starting ID if no last ID is found
start_id = 97374

# Set to store unique PinIDs
unique_pinids = set()

# Function to load the last processed ID
def load_last_id():
    if os.path.exists(last_id_file):
        with open(last_id_file, 'r') as f:
            try:
                return int(f.read().strip())
            except ValueError:
                return start_id
    return start_id

# Function to save the last processed ID
def save_last_id(pin_id):
    with open(last_id_file, 'w') as f:
        f.write(str(pin_id))

# Generate a list of potential pin URLs based on ID pattern (batch processing)
def generate_pin_urls_batch(start_id):
    pin_urls = []
    for i in range(start_id, start_id - batch_size, -1):
        pin_id = str(i)
        # Assuming a generic pattern for URLs based on ID
        pin_urls.append(f'https://pinandpop.com/pins/{pin_id}/pin-{pin_id}')
    return pin_urls

# Function to update progress bar
def update_progress_bar(current, total, prefix='Progress:', suffix='Complete', decimals=1, length=50, fill='█', print_end="\r"):
    percent = ("{0:." + str(decimals) + "f}").format(100 * (current / float(total)))
    filled_length = int(length * current // total)
    bar = fill * filled_length + '-' * (length - filled_length)
    sys.stdout.write(f'\r{prefix} |{bar}| {percent}% {suffix}')
    sys.stdout.flush()
    if current == total:
        print()

print(f"Loading last processed ID...")
last_processed_id = load_last_id()
print(f"Starting from ID: {last_processed_id}")

# Function to load existing PinIDs from CSV
def load_existing_pinids():
    if not os.path.exists(csv_file):
        return set()
    
    existing_ids = set()
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['PinID']:
                existing_ids.add(row['PinID'])
    return existing_ids

def scrape_pins():
    global unique_pinids
    pins = []
    total_processed = 0
    errors = []
    
    # Load existing PinIDs
    unique_pinids = load_existing_pinids()
    print(f"Loaded {len(unique_pinids)} existing PinIDs from CSV")
    
    while len(unique_pinids) < total_pins_to_scrape:
        current_batch_size = min(batch_size, total_pins_to_scrape - len(unique_pinids))
        pin_urls = generate_pin_urls_batch(last_processed_id - total_processed)
        
        print(f"\nProcessing batch of {current_batch_size} pins...")
        print(f"Total unique pins so far: {len(unique_pinids)} of {total_pins_to_scrape}")
        
        for i, url in enumerate(pin_urls[:current_batch_size]):
            pin_id = url.split('/')[-1].split('-')[-1]
            
            # Skip if we already have this PinID
            if pin_id in unique_pinids:
                print(f"\nSkipping duplicate pin {pin_id}")
                continue
            
            update_progress_bar(i + 1, current_batch_size)
            
            for retry in range(max_retries):
                try:
                    pin_data = scrape_pin_page(url)
                    if pin_data:
                        pins.append(pin_data)
                        unique_pinids.add(pin_id)
                        save_last_id(int(pin_id))  # Save progress after each successful scrape
                        break
                    else:
                        print(f"\nNo data found for pin {pin_id}, skipping...")
                        break
                except Exception as e:
                    if retry == max_retries - 1:
                        print(f"\nFailed to scrape pin {pin_id} after {max_retries} attempts: {str(e)}")
                        errors.append((pin_id, str(e)))
                    time.sleep(request_delay * (retry + 1))  # Exponential backoff
            
            time.sleep(request_delay)  # Rate limiting between requests
        
        # Export batch to CSV
        if pins:
            export_to_csv(pins, mode='a')
            pins = []  # Clear pins after export
        
        total_processed += current_batch_size
        
        # Save error log
        if errors:
            with open('scraping_errors.log', 'a') as f:
                for pin_id, error in errors:
                    f.write(f"{datetime.now()}: Pin {pin_id} - {error}\n")
            errors = []  # Clear errors after logging
        
        print(f"\nCompleted batch. Total unique pins: {len(unique_pinids)} of {total_pins_to_scrape}")
        time.sleep(request_delay * 2)  # Additional delay between batches
    
    return pins

# Function to convert thumbnail URL to actual image URL
def convert_to_actual_image_url(thumbnail_url):
    # Example transformation:
    # From: https://pinandpop.s3.amazonaws.com/images/pinails/97120_leQB_pinail.webp
    # To:   https://pinandpop.s3.amazonaws.com/images/pins/97120_leQB.jpg
    
    # Replace 'pinails' with 'pins'
    actual_url = thumbnail_url.replace('pinails', 'pins')
    
    # Remove '_pinail' from the filename
    actual_url = actual_url.replace('_pinail', '')
    
    # Change extension to '.jpg'
    if actual_url.endswith('.webp'):
        actual_url = actual_url[:-5] + '.jpg'
    elif actual_url.endswith('.jpg'):
        # Already jpg, just make sure there's no _pinail
        pass
    else:
        # For any other extension, replace with .jpg
        actual_url = re.sub(r'\.[^.]+$', '.jpg', actual_url)
    
    return actual_url

# Function to extract text from meta tags
def extract_meta_content(soup, property_name):
    meta_tag = soup.find('meta', property=property_name)
    if meta_tag and meta_tag.get('content'):
        return meta_tag['content']
    
    meta_tag = soup.find('meta', attrs={'name': property_name})
    if meta_tag and meta_tag.get('content'):
        return meta_tag['content']
    
    return None

# Function to scrape a single pin page
def scrape_pin_page(url):
    print(f"Scraping pin from {url}...")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Response status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Failed to fetch page: {url}")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract pin ID from URL
        pin_id = url.split('/')[4]  # Extract pin ID from URL
        
        # Extract pin name from the table - this is the most reliable source
        pin_name = None
        pin_row = soup.find('th', string='Pin')
        if pin_row and pin_row.find_next('td'):
            pin_name = pin_row.find_next('td').text.strip()
        
        # If not found in the table, try to extract from title
        if not pin_name:
            title_tag = soup.find('title')
            if title_tag:
                # Format: "97366 - Spider-Man - Marvel Superhero Transformations - Disneyland Resort Disney Pin"
                title_parts = title_tag.text.split(' - ')
                if len(title_parts) >= 2:
                    pin_name = title_parts[1].strip()
        
        # If still not found, extract from URL as fallback
        if not pin_name:
            pin_name = url.split('/')[-1].replace('-', ' ').title()
            # Clean up pin name - remove "Marvel Superhero Transformations" prefix if present
            if "Marvel Superhero Transformations" in pin_name:
                pin_name = pin_name.replace("Marvel Superhero Transformations", "").strip()
        
        # Try to find the thumbnail image URL in the page
        thumbnail_url = None
        
        # First check meta tags for the image
        og_image = extract_meta_content(soup, 'og:image')
        if og_image:
            thumbnail_url = og_image
        
        # If not found in meta tags, look for img tags
        if not thumbnail_url:
            img_elements = soup.find_all('img')
            for img in img_elements:
                if img.get('src') and pin_id in img['src'] and 'amazonaws' in img['src']:
                    thumbnail_url = img['src']
                    break
        
        # If we couldn't find the image in the page, look for it in the HTML source
        if not thumbnail_url:
            # Look for image URL pattern in the HTML source
            image_pattern = re.compile(r'https://pinandpop\.s3\.amazonaws\.com/images/pinails/' + pin_id + r'_[A-Za-z0-9]{4}_pinail\.(webp|jpg)')
            matches = image_pattern.findall(response.text)
            if matches:
                thumbnail_url = f"https://pinandpop.s3.amazonaws.com/images/pinails/{pin_id}_{matches[0][0]}_pinail.{matches[0][1]}"
        
        # Convert thumbnail URL to actual image URL
        if thumbnail_url:
            image_url = convert_to_actual_image_url(thumbnail_url)
            print(f"Found image URL: {image_url}")
        else:
            # If we still couldn't find the image, use the example pattern with a default code
            # Save the HTML for inspection
            with open(f'pin_{pin_id}_response.html', 'w', encoding='utf-8') as f:
                f.write(response.text)
            print(f"Couldn't find image URL. Saved HTML to pin_{pin_id}_response.html")
            
            # Use default pattern with the example code from Spider-Man
            image_url = f"https://pinandpop.s3.amazonaws.com/images/pins/{pin_id}_Wr4p.jpg"
        
        # Extract series from the table
        series = None
        series_row = soup.find('th', string='Series')
        if series_row and series_row.find_next('td'):
            series_td = series_row.find_next('td')
            # Check if there's a link in the td
            series_link = series_td.find('a')
            if series_link:
                series = series_link.text.strip()
            else:
                series = series_td.text.strip()
        
        # If not found in the table, try to extract from meta description
        if not series:
            meta_desc = extract_meta_content(soup, 'description')
            if meta_desc:
                series_match = re.search(r'from the (.*?) Disney pin series', meta_desc)
                if series_match:
                    series = series_match.group(1).strip()
        
        # If still not found, extract from title
        if not series:
            title_tag = soup.find('title')
            if title_tag:
                # Format: "97366 - Spider-Man - Marvel Superhero Transformations - Disneyland Resort Disney Pin"
                title_parts = title_tag.text.split(' - ')
                if len(title_parts) >= 3:
                    series = title_parts[2].strip()
        
        # Extract origin from the table
        origin = None
        origin_row = soup.find('th', string='Origin')
        if origin_row and origin_row.find_next('td'):
            origin_td = origin_row.find_next('td')
            # Check if there's a link in the td
            origin_link = origin_td.find('a')
            if origin_link:
                origin = origin_link.text.strip().replace('(DLR)', '').strip()
            else:
                origin = origin_td.text.strip()
        
        # If not found in the table, try to extract from meta description
        if not origin:
            meta_desc = extract_meta_content(soup, 'description')
            if meta_desc:
                origin_match = re.search(r'(\d{4}) (.*?) Limited Edition', meta_desc)
                if origin_match:
                    origin = origin_match.group(2).strip()
        
        # If still not found, extract from title
        if not origin:
            title_tag = soup.find('title')
            if title_tag:
                # Format: "97366 - Spider-Man - Marvel Superhero Transformations - Disneyland Resort Disney Pin"
                title_parts = title_tag.text.split(' - ')
                if len(title_parts) >= 4:
                    origin = title_parts[3].replace('Disney Pin', '').strip()
        
        # Check if the pin should be excluded based on origin or series
        if (origin and ('Loungefly' in origin or 'Hot Topic' in origin)) or (series and ('Loungefly' in series or 'Hot Topic' in series)):
            print(f"Skipping pin {pin_name} due to Loungefly or Hot Topic in origin ('{origin}') or series ('{series}').")
            return None
        
        # Extract edition from the table
        edition = None
        edition_row = soup.find('th', string='Edition')
        if edition_row and edition_row.find_next('td'):
            edition = edition_row.find_next('td').text.strip()
        
        # If not found in the table, try to extract from meta description
        if not edition:
            meta_desc = extract_meta_content(soup, 'description')
            if meta_desc:
                edition_match = re.search(r'Limited Edition \(LE\) (\d+)', meta_desc)
                if edition_match:
                    edition = f"Limited Edition {edition_match.group(1)}"
        
        # Extract release date from the table
        release_date = None
        date_row = soup.find('th', string='Release Date')
        if date_row and date_row.find_next('td'):
            release_date = date_row.find_next('td').text.strip()
        
        # Check if the pin is from 2025 if release date is available
        year = 2025
        if release_date:
            try:
                date_obj = datetime.strptime(release_date, '%Y-%m-%d')
                year = date_obj.year
            except ValueError:
                pass  # Keep default year if parsing fails
        else:
            print(f"No release date found for pin {pin_name}, assuming 2025")
        
        # Extract rarity from the table
        rarity = None
        rarity_row = soup.find('th', string='Rarity')
        if rarity_row and rarity_row.find_next('td'):
            rarity = rarity_row.find_next('td').text.strip()
        
        # Extract tags from the pin tags table
        tags = []
        tags_table = soup.find('th', string='Pin Tags')
        if tags_table and tags_table.find_parent('table'):
            tag_links = tags_table.find_parent('table').find_all('a', class_='badge')
            for tag_link in tag_links:
                tag = tag_link.text.strip()
                if tag and tag not in tags:
                    tags.append(tag)
        
        # If no tags found, add the pin name and series as tags
        if not tags:
            if pin_name:
                tags.append(pin_name)
            if series and series not in tags:
                tags.append(series)
        
        # Construct Pinpop URL
        pinpop_url = f"https://pinandpop.com/pins/{pin_id}"
        
        # Determine if it's a mystery pin by checking for 'mystery' in title or series
        is_mystery = False
        if pin_name and 'mystery' in pin_name.lower():
            is_mystery = True
        elif series and 'mystery' in series.lower():
            is_mystery = True
        
        # Create pin data dictionary
        pin_data = {
            'PinID': pin_id,   # The numeric pin ID from pinandpop
            'pin_name': pin_name,
            'image_url': image_url,
            'series': series,
            'origin': origin,
            'edition': edition,
            'release_date': release_date,
            'tags': tags,
            'is_collected': False,  # Default to False
            'is_mystery': is_mystery,
            'is_limited_edition': bool(edition and 'Limited Edition' in edition),
            'pinpop_url': pinpop_url,
            'year': year,
            'rarity': rarity
        }
        
        print(f"Successfully scraped pin {pin_name} (ID: {pin_id})")
        return pin_data
        
    except Exception as e:
        print(f"Error scraping pin page {url}: {e}")
        return None

# Helper function to extract text using multiple possible selectors
def extract_text(element, selectors):
    if isinstance(element, dict):
        return ''
    
    for selector in selectors:
        found_element = element.select_one(selector)
        if found_element:
            return found_element.text.strip()
    return ''

# Function to export to CSV
def export_to_csv(pins, filename='pins_2025.csv', mode='a'):
    print(f"Exporting {len(pins)} new pins to {filename}...")
    fieldnames = ['PinID', 'pin_name', 'image_url', 'series', 'origin', 'edition', 
                 'release_date', 'tags', 'is_collected', 'is_mystery', 'is_limited_edition', 'pinpop_url', 'year', 'rarity']
    
    # Check if file exists to determine if header is needed
    file_exists = os.path.isfile(filename)
    
    with open(filename, mode, newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists or mode == 'w':
            writer.writeheader()
        
        for pin in pins:
            # Convert tags list to PostgreSQL array format
            pin_copy = pin.copy()
            if isinstance(pin_copy['tags'], list):
                # Format as PostgreSQL array: {tag1,tag2,tag3}
                pin_copy['tags'] = '{' + ','.join(pin_copy['tags']) + '}'
            writer.writerow(pin_copy)
    
    print(f"Data exported to {filename}")

if __name__ == '__main__':
    pins = scrape_pins()
    if pins:
        export_to_csv(pins, mode='a')
    print('Scraping complete. Data exported to pins_2025.csv')
