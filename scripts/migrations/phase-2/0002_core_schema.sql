-- Phase 2: Core business schema for lead generation platform
-- Organizations (tenants)
CREATE TABLE IF NOT EXISTS app_public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    industry TEXT,
    employee_count INTEGER,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON app_public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON app_public.organizations(status);

-- Users
CREATE TABLE IF NOT EXISTS app_public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES app_public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON app_public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON app_public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON app_public.users(status);

-- Businesses/Leads
CREATE TABLE IF NOT EXISTS app_public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT,
    sub_industry TEXT,
    employee_count INTEGER,
    annual_revenue NUMERIC(15, 2),
    website TEXT,
    phone TEXT,
    email TEXT,
    
    -- Location
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT NOT NULL DEFAULT 'US',
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    
    -- Business details
    year_founded INTEGER,
    business_type TEXT,
    certifications TEXT[],
    specialties TEXT[],
    
    -- Metadata
    source TEXT,
    source_id TEXT,
    quality_score NUMERIC(3, 2),
    last_verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Vector embedding for similarity search
    embedding vector(1536),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_industry ON app_public.businesses(industry);
CREATE INDEX IF NOT EXISTS idx_businesses_city_state ON app_public.businesses(city, state);
CREATE INDEX IF NOT EXISTS idx_businesses_quality_score ON app_public.businesses(quality_score);
CREATE INDEX IF NOT EXISTS idx_businesses_embedding ON app_public.businesses USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON app_public.businesses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Contacts
CREATE TABLE IF NOT EXISTS app_public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES app_public.businesses(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    role TEXT,
    is_decision_maker BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON app_public.contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON app_public.contacts(email) WHERE email IS NOT NULL;

-- Social Profiles
CREATE TABLE IF NOT EXISTS app_public.social_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES app_public.businesses(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    profile_url TEXT NOT NULL,
    handle TEXT,
    follower_count INTEGER,
    engagement_rate NUMERIC(5, 2),
    last_post_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_profiles_business_id ON app_public.social_profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_social_profiles_platform ON app_public.social_profiles(platform);

-- Lead Lists
CREATE TABLE IF NOT EXISTS app_public.lead_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES app_public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_lists_organization_id ON app_public.lead_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_lead_lists_user_id ON app_public.lead_lists(user_id);

-- Lead List Items (many-to-many)
CREATE TABLE IF NOT EXISTS app_public.lead_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_list_id UUID NOT NULL REFERENCES app_public.lead_lists(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES app_public.businesses(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'new',
    metadata JSONB DEFAULT '{}'::jsonb,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lead_list_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_list_items_lead_list_id ON app_public.lead_list_items(lead_list_id);
CREATE INDEX IF NOT EXISTS idx_lead_list_items_business_id ON app_public.lead_list_items(business_id);

-- Saved Searches
CREATE TABLE IF NOT EXISTS app_public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES app_public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    query_params JSONB NOT NULL,
    result_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ,
    is_favorite BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_organization_id ON app_public.saved_searches(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON app_public.saved_searches(user_id);

-- Alerts
CREATE TABLE IF NOT EXISTS app_public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES app_public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app_public.users(id) ON DELETE CASCADE,
    saved_search_id UUID REFERENCES app_public.saved_searches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    alert_type TEXT NOT NULL,
    trigger_conditions JSONB NOT NULL,
    notification_channels TEXT[] DEFAULT ARRAY['email']::TEXT[],
    is_enabled BOOLEAN DEFAULT true,
    frequency TEXT DEFAULT 'daily',
    last_triggered_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_organization_id ON app_public.alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON app_public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_enabled ON app_public.alerts(is_enabled);

-- Organization ICP (Ideal Customer Profile) Configurations
CREATE TABLE IF NOT EXISTS app_public.org_icp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES app_public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Industry criteria
    target_industries TEXT[],
    excluded_industries TEXT[],
    
    -- Size criteria
    min_employees INTEGER,
    max_employees INTEGER,
    min_revenue NUMERIC(15, 2),
    max_revenue NUMERIC(15, 2),
    
    -- Location criteria
    target_locations JSONB,
    excluded_locations JSONB,
    
    -- Other criteria
    required_technologies TEXT[],
    required_certifications TEXT[],
    keywords TEXT[],
    
    -- Scoring
    score_weights JSONB DEFAULT '{}'::jsonb,
    
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_icp_configs_organization_id ON app_public.org_icp_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_icp_configs_is_active ON app_public.org_icp_configs(is_active);
