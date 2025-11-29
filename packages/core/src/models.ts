import { z } from 'zod';
import { 
  Industry, 
  BusinessType, 
  BusinessMode, 
  Ownership, 
  RevenueBand, 
  EmployeeBand 
} from './enums';

// Geospatial point schema
export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180)
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;

// Business search input schema
export const BusinessSearchInputSchema = z.object({
  // Basic search
  query: z.string().optional(),
  
  // Location-based search
  location: GeoPointSchema.optional(),
  radius: z.number().positive().optional(), // in kilometers
  
  // Business characteristics
  industries: z.array(z.nativeEnum(Industry)).optional(),
  businessTypes: z.array(z.nativeEnum(BusinessType)).optional(),
  businessModes: z.array(z.nativeEnum(BusinessMode)).optional(),
  ownership: z.array(z.nativeEnum(Ownership)).optional(),
  
  // Size filters
  revenueBands: z.array(z.nativeEnum(RevenueBand)).optional(),
  employeeBands: z.array(z.nativeEnum(EmployeeBand)).optional(),
  
  // Tech stack and tags
  techStack: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  
  // Pagination
  limit: z.number().positive().max(1000).default(20),
  offset: z.number().nonnegative().default(0),
  
  // Sorting
  sortBy: z.enum(['relevance', 'revenue', 'employees', 'distance']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type BusinessSearchInput = z.infer<typeof BusinessSearchInputSchema>;

// Business lead data schema for indexing
export const BusinessLeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  canonicalName: z.string(),
  alternateNames: z.array(z.string()).default([]),
  description: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  
  // Location
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  coordinates: GeoPointSchema.optional(),
  
  // Business classification
  industry: z.nativeEnum(Industry),
  businessType: z.nativeEnum(BusinessType),
  businessMode: z.nativeEnum(BusinessMode),
  ownership: z.nativeEnum(Ownership),
  
  // Size metrics
  revenue: z.number().nonnegative().optional(),
  revenueBand: z.nativeEnum(RevenueBand).optional(),
  employeeCount: z.number().nonnegative().optional(),
  employeeBand: z.nativeEnum(EmployeeBand).optional(),
  
  // Tags and classifications
  techStack: z.array(z.string()).default([]),
  industryTags: z.array(z.string()).default([]),
  specializations: z.array(z.string()).default([]),
  
  // Metadata
  foundedYear: z.number().int().positive().optional(),
  isVerified: z.boolean().default(false),
  confidence: z.number().min(0).max(1).optional(),
  
  // Timestamps
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type BusinessLead = z.infer<typeof BusinessLeadSchema>;

// Search result schema
export const SearchResultSchema = z.object({
  items: z.array(BusinessLeadSchema),
  total: z.number().nonnegative(),
  hasMore: z.boolean(),
  took: z.number().nonnegative() // milliseconds
});

export type SearchResult = z.infer<typeof SearchResultSchema>;