-- This script initializes the 'everypinyoutake' database for the Disney Pin Collection app

-- Connect to PostgreSQL (you might need to adjust the connection string or use psql command)
-- \c postgres

-- Create the database if it doesn't exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'everypinyoutake') THEN
      CREATE DATABASE everypinyoutake;
   END IF;
END
$$;

-- Connect to the new database
-- \c everypinyoutake

-- Optionally, create a user with a password (adjust username and password as needed)
-- CREATE USER pin_manager WITH PASSWORD 'secure_password_here';
-- GRANT ALL PRIVILEGES ON DATABASE everypinyoutake TO pin_manager;

-- Note: After running this script, update your .env file with the correct DATABASE_URL
-- DATABASE_URL="postgresql://pin_manager:secure_password_here@localhost:5432/everypinyoutake?schema=public"

-- Then, run 'npx prisma migrate dev --name init' to apply the schema
