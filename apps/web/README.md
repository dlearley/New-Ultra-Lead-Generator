# Prospecting Search UI - Phase 6 Part 1

This is the web application for the prospecting platform, built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Features

### Smart Search Bar
- AI-powered natural language search input
- Calls backend `parseSearchQueryToFilters` API to interpret queries
- Sparkle icon indicates AI capabilities
- Real-time parsing of search intent

### Advanced Filter Sidebar
- **Industry Selector**: Filter by industry with NAICS/SIC code lookup
- **Ownership Types**: Public, Private, PE-backed, VC-backed
- **Business Types**: B2B, B2C, Marketplace, D2C
- **Geography Pickers**: Pre-populated city library with coordinates
- **Radius Slider**: 0-500 miles for location-based filtering
- **Revenue Bands**: $0-10M, $10M-50M, $50M-100M, $100M-500M, $500M+
- **Employee Bands**: 1-50, 51-200, 201-500, 501-1k, 1k+
- **Review Filters**: Filter by platform (G2, Capterra, Glassdoor, etc.)
- **Flags**: Currently Hiring, Has Website, Exclude Generic Emails, Recent Reviews
- **Tech Stack Tags**: React, Node.js, Python, AWS, GCP, Azure, etc.

### Results Layout
- **Table View**: Card-based layout with:
  - Company name, description, and industry
  - AI lead score badges (Hot Lead, Warm Lead, Cold Lead)
  - Revenue and employee ranges
  - Review ratings and counts
  - Location information
  - Tech stack tags
  - Quick action menu
- **Map View**: Interactive map powered by MapLibre GL with:
  - Smart clustering for dense areas
  - Click to expand clusters
  - Click individual markers to select prospects
  - Hover cards showing prospect details
  - Synchronized selection with table view

### Pagination & Sorting
- Paginated results (configurable page size, default 8)
- Sort by: AI Lead Score, Name, Revenue, Employees
- Visual indicators for current sort field and direction
- Page number navigation with ellipsis for large result sets

### Quick Actions
- **Save Search**: Save current filters with a custom name
- **Add to List**: Add all current results to a prospect list
- Success/error feedback messages

### Responsive Design
- Mobile-first approach
- Collapsible filter sidebar on mobile
- Touch-friendly controls
- Adaptive layouts for different screen sizes

### Loading States
- Skeleton loaders for table results
- Loading indicators in buttons
- Disabled states during API calls
- Smooth transitions

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript 5
- **Styling**: Tailwind CSS 4
- **Component Library**: Radix UI primitives
- **Icons**: Lucide React
- **Map**: MapLibre GL via react-map-gl
- **Testing**: Playwright

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build

```bash
npm run build
```

### Testing

Run Playwright e2e tests:

```bash
npm run test:e2e
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx             # Landing page
│   │   └── search/
│   │       └── page.tsx         # Main search page
│   ├── components/
│   │   ├── ui/                  # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── tabs.tsx
│   │   └── search/              # Search-specific components
│   │       ├── search-bar.tsx
│   │       ├── filter-sidebar.tsx
│   │       ├── results-table.tsx
│   │       ├── prospect-map.tsx
│   │       ├── pagination.tsx
│   │       └── quick-actions.tsx
│   ├── lib/
│   │   ├── utils.ts             # Utility functions
│   │   └── mock-data.ts         # Mock API service
│   ├── types/
│   │   └── prospect.ts          # TypeScript types
│   └── data/
│       └── reference-data.ts    # Static reference data
├── e2e/                         # Playwright tests
│   ├── search.spec.ts
│   └── map.spec.ts
└── playwright.config.ts
```

## API Integration

The application is designed to integrate with a backend API. Currently using mock data, but the following endpoints are expected:

- `POST /api/search/parse` - Parse natural language query to filters
- `POST /api/search/prospects` - Search prospects with filters
- `POST /api/search/save` - Save a search
- `POST /api/lists/:id/prospects` - Add prospects to a list

Configure the API base URL via the `NEXT_PUBLIC_API_URL` environment variable.

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Testing Strategy

### E2E Tests (Playwright)
- Search flows with different query types
- Filter combinations (single and multiple)
- Map interactions (clustering, selection)
- Table/map view toggling
- Pagination navigation
- Quick actions (save search, add to list)
- Responsive behavior on different viewport sizes

Run tests:
```bash
npm run test:e2e
```

## Future Enhancements

- Real-time collaboration on saved searches
- Export results to CSV/Excel
- Bulk actions on selected prospects
- Custom filter presets
- Search history
- Advanced analytics dashboard
