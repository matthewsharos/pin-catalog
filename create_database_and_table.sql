-- Create the database
CREATE DATABASE everypinyoutake;

-- Connect to the database
\c everypinyoutake

-- Create the pins table
CREATE TABLE pins (
    id SERIAL PRIMARY KEY,
    pin_name VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    series VARCHAR(255),
    origin VARCHAR(255),
    edition VARCHAR(255),
    release_date DATE,
    tags TEXT[],
    is_collected BOOLEAN DEFAULT FALSE,
    is_mystery BOOLEAN DEFAULT FALSE,
    is_limited_edition BOOLEAN DEFAULT FALSE,
    pinpop_url TEXT NOT NULL,
    year INTEGER,
    rarity VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
