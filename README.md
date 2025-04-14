# Disney Pin Collection

A web application to manage your Disney pin collection, powered by a PostgreSQL database.

## Features

- **Pin Catalog**: Responsive table with thumbnails, sorting, and filtering.
- **Bulk Actions**: Multi-select to mark pins as collected or soft-delete.
- **Tag Management**: Create, assign, and manage tags for pins.
- **Pin Search**: Filter by tags or keywords.
- **Pin Collages**: Generate and download image grids based on search queries.
- **Add Pins**: Scrape data from Pin and Pop URLs and add to database.
- **Edit Pin Data**: Modify pin details and upload photos.
- **Upload Photos & Comments**: Add photos and comments to pins with gallery view.
- **Soft Delete Pins**: Mark pins as deleted without removing data.
- **Mobile Optimized**: Responsive design for both desktop and mobile devices.

## Tech Stack

- **Next.js**: Frontend and backend API routes.
- **Prisma**: PostgreSQL ORM.
- **Tailwind CSS**: Styling.
- **Vercel**: Deployment platform.

## Setup

1. Install dependencies: `npm install`
2. Set up environment variables for database connection.
3. Run migrations: `npx prisma migrate dev`
4. Start development server: `npm run dev`

## Deployment

Deploy on Vercel with environment variables for database and storage configuration.
