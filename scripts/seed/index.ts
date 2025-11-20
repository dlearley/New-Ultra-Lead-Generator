#!/usr/bin/env tsx

/**
 * Comprehensive seed script for demo data
 * Generates diverse, realistic data across all entities
 */

import { PoolClient } from 'pg';
import {
  getPool,
  closePool,
  withTransaction,
  truncateTables,
  testConnection,
} from './lib/database';
import { ensureBusinessesIndex, bulkIndexBusinesses } from './lib/opensearch';
import { generateBusinessEmbedding, formatEmbeddingForPostgres } from './lib/embeddings';

// Factories
import { createOrganizations } from './factories/organization.factory';
import { createUsers } from './factories/user.factory';
import { createBusinesses } from './factories/business.factory';
import { createContacts } from './factories/contact.factory';
import { createSocialProfiles } from './factories/social-profile.factory';
import { createLeadLists, createLeadListItem } from './factories/lead-list.factory';
import { createSavedSearches } from './factories/saved-search.factory';
import { createAlerts } from './factories/alert.factory';
import { createOrgICPConfigs } from './factories/org-icp-config.factory';
import { INDUSTRY_KEYS, IndustryKey } from './lib/industries';

// Configuration
const CONFIG = {
  RESET_DATA: process.env.RESET_DATA === 'true',
  ORGANIZATIONS_COUNT: parseInt(process.env.ORGS_COUNT || '5', 10),
  USERS_PER_ORG: parseInt(process.env.USERS_PER_ORG || '3', 10),
  BUSINESSES_PER_INDUSTRY: parseInt(process.env.BUSINESSES_PER_INDUSTRY || '50', 10),
  CONTACTS_PER_BUSINESS: parseInt(process.env.CONTACTS_PER_BUSINESS || '2', 10),
  SOCIAL_PROFILES_PROBABILITY: parseFloat(process.env.SOCIAL_PROFILES_PROB || '0.6'),
  LEAD_LISTS_PER_USER: parseInt(process.env.LEAD_LISTS_PER_USER || '2', 10),
  SAVED_SEARCHES_PER_USER: parseInt(process.env.SAVED_SEARCHES_PER_USER || '3', 10),
  ALERTS_PER_USER: parseInt(process.env.ALERTS_PER_USER || '2', 10),
  ICP_CONFIGS_PER_ORG: parseInt(process.env.ICP_CONFIGS_PER_ORG || '2', 10),
  ITEMS_PER_LEAD_LIST: parseInt(process.env.ITEMS_PER_LEAD_LIST || '25', 10),
};

async function seedOrganizations(client: PoolClient) {
  console.log(`\n📊 Seeding ${CONFIG.ORGANIZATIONS_COUNT} organizations...`);
  const organizations = createOrganizations(CONFIG.ORGANIZATIONS_COUNT);

  for (const org of organizations) {
    await client.query(
      `INSERT INTO app_public.organizations (id, name, slug, industry, employee_count, website, status, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        org.id,
        org.name,
        org.slug,
        org.industry,
        org.employee_count,
        org.website,
        org.status,
        JSON.stringify(org.metadata),
        org.created_at,
        org.updated_at,
      ]
    );
  }

  console.log(`✅ Created ${organizations.length} organizations`);
  return organizations;
}

async function seedUsers(client: PoolClient, organizations: any[]) {
  console.log(`\n👥 Seeding users (${CONFIG.USERS_PER_ORG} per org)...`);
  const allUsers: any[] = [];

  for (const org of organizations) {
    const users = createUsers(org.id, CONFIG.USERS_PER_ORG);

    for (const user of users) {
      await client.query(
        `INSERT INTO app_public.users (id, organization_id, email, name, role, status, last_login_at, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          user.id,
          user.organization_id,
          user.email,
          user.name,
          user.role,
          user.status,
          user.last_login_at,
          JSON.stringify(user.metadata),
          user.created_at,
          user.updated_at,
        ]
      );
    }

    allUsers.push(...users);
  }

  console.log(`✅ Created ${allUsers.length} users`);
  return allUsers;
}

async function seedBusinesses(client: PoolClient) {
  console.log(
    `\n🏢 Seeding businesses (${CONFIG.BUSINESSES_PER_INDUSTRY} per industry)...`
  );
  const allBusinesses: any[] = [];

  for (const industryKey of INDUSTRY_KEYS) {
    const businesses = createBusinesses(
      CONFIG.BUSINESSES_PER_INDUSTRY,
      industryKey as IndustryKey
    );

    for (const business of businesses) {
      // Generate embedding
      const embedding = generateBusinessEmbedding(business);
      const embeddingStr = formatEmbeddingForPostgres(embedding);

      await client.query(
        `INSERT INTO app_public.businesses (
          id, name, description, industry, sub_industry, employee_count, annual_revenue,
          website, phone, email, street_address, city, state, zip_code, country,
          latitude, longitude, year_founded, business_type, certifications, specialties,
          source, source_id, quality_score, last_verified_at, metadata, embedding,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        )`,
        [
          business.id,
          business.name,
          business.description,
          business.industry,
          business.sub_industry,
          business.employee_count,
          business.annual_revenue,
          business.website,
          business.phone,
          business.email,
          business.street_address,
          business.city,
          business.state,
          business.zip_code,
          business.country,
          business.latitude,
          business.longitude,
          business.year_founded,
          business.business_type,
          business.certifications,
          business.specialties,
          business.source,
          business.source_id,
          business.quality_score,
          business.last_verified_at,
          JSON.stringify(business.metadata),
          embeddingStr,
          business.created_at,
          business.updated_at,
        ]
      );
    }

    allBusinesses.push(...businesses);
    console.log(`   ✓ Created ${businesses.length} ${industryKey} businesses`);
  }

  console.log(`✅ Created ${allBusinesses.length} total businesses`);
  return allBusinesses;
}

async function seedContacts(client: PoolClient, businesses: any[]) {
  console.log(`\n👤 Seeding contacts (${CONFIG.CONTACTS_PER_BUSINESS} per business)...`);
  let totalContacts = 0;

  for (const business of businesses) {
    const contacts = createContacts(business.id, CONFIG.CONTACTS_PER_BUSINESS);

    for (const contact of contacts) {
      await client.query(
        `INSERT INTO app_public.contacts (
          id, business_id, first_name, last_name, title, email, phone, linkedin_url,
          role, is_decision_maker, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          contact.id,
          contact.business_id,
          contact.first_name,
          contact.last_name,
          contact.title,
          contact.email,
          contact.phone,
          contact.linkedin_url,
          contact.role,
          contact.is_decision_maker,
          JSON.stringify(contact.metadata),
          contact.created_at,
          contact.updated_at,
        ]
      );
    }

    totalContacts += contacts.length;
  }

  console.log(`✅ Created ${totalContacts} contacts`);
}

async function seedSocialProfiles(client: PoolClient, businesses: any[]) {
  console.log(
    `\n📱 Seeding social profiles (${Math.round(CONFIG.SOCIAL_PROFILES_PROBABILITY * 100)}% of businesses)...`
  );
  let totalProfiles = 0;

  for (const business of businesses) {
    if (Math.random() > CONFIG.SOCIAL_PROFILES_PROBABILITY) {
      continue;
    }

    const profiles = createSocialProfiles(business.id, business.name, 2);

    for (const profile of profiles) {
      await client.query(
        `INSERT INTO app_public.social_profiles (
          id, business_id, platform, profile_url, handle, follower_count,
          engagement_rate, last_post_at, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          profile.id,
          profile.business_id,
          profile.platform,
          profile.profile_url,
          profile.handle,
          profile.follower_count,
          profile.engagement_rate,
          profile.last_post_at,
          JSON.stringify(profile.metadata),
          profile.created_at,
          profile.updated_at,
        ]
      );
    }

    totalProfiles += profiles.length;
  }

  console.log(`✅ Created ${totalProfiles} social profiles`);
}

async function seedLeadLists(
  client: PoolClient,
  organizations: any[],
  users: any[],
  businesses: any[]
) {
  console.log(`\n📋 Seeding lead lists (${CONFIG.LEAD_LISTS_PER_USER} per user)...`);
  let totalLists = 0;
  let totalItems = 0;

  for (const user of users) {
    const lists = createLeadLists(user.organization_id, user.id, CONFIG.LEAD_LISTS_PER_USER);

    for (const list of lists) {
      await client.query(
        `INSERT INTO app_public.lead_lists (
          id, organization_id, user_id, name, description, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          list.id,
          list.organization_id,
          list.user_id,
          list.name,
          list.description,
          list.status,
          JSON.stringify(list.metadata),
          list.created_at,
          list.updated_at,
        ]
      );

      // Add random businesses to the list
      const selectedBusinesses = businesses
        .sort(() => Math.random() - 0.5)
        .slice(0, CONFIG.ITEMS_PER_LEAD_LIST);

      for (let i = 0; i < selectedBusinesses.length; i++) {
        const item = createLeadListItem(list.id, selectedBusinesses[i].id, i);

        await client.query(
          `INSERT INTO app_public.lead_list_items (
            id, lead_list_id, business_id, position, notes, status, metadata, added_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            item.id,
            item.lead_list_id,
            item.business_id,
            item.position,
            item.notes,
            item.status,
            JSON.stringify(item.metadata),
            item.added_at,
          ]
        );

        totalItems++;
      }

      totalLists++;
    }
  }

  console.log(`✅ Created ${totalLists} lead lists with ${totalItems} items`);
}

async function seedSavedSearches(client: PoolClient, users: any[]) {
  console.log(`\n🔍 Seeding saved searches (${CONFIG.SAVED_SEARCHES_PER_USER} per user)...`);
  let total = 0;

  for (const user of users) {
    const searches = createSavedSearches(
      user.organization_id,
      user.id,
      CONFIG.SAVED_SEARCHES_PER_USER
    );

    for (const search of searches) {
      await client.query(
        `INSERT INTO app_public.saved_searches (
          id, organization_id, user_id, name, description, query_params, result_count,
          last_run_at, is_favorite, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          search.id,
          search.organization_id,
          search.user_id,
          search.name,
          search.description,
          JSON.stringify(search.query_params),
          search.result_count,
          search.last_run_at,
          search.is_favorite,
          JSON.stringify(search.metadata),
          search.created_at,
          search.updated_at,
        ]
      );
    }

    total += searches.length;
  }

  console.log(`✅ Created ${total} saved searches`);
  return total;
}

async function seedAlerts(client: PoolClient, users: any[]) {
  console.log(`\n🔔 Seeding alerts (${CONFIG.ALERTS_PER_USER} per user)...`);
  let total = 0;

  for (const user of users) {
    const alerts = createAlerts(user.organization_id, user.id, CONFIG.ALERTS_PER_USER);

    for (const alert of alerts) {
      await client.query(
        `INSERT INTO app_public.alerts (
          id, organization_id, user_id, saved_search_id, name, description, alert_type,
          trigger_conditions, notification_channels, is_enabled, frequency, last_triggered_at,
          metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          alert.id,
          alert.organization_id,
          alert.user_id,
          alert.saved_search_id,
          alert.name,
          alert.description,
          alert.alert_type,
          JSON.stringify(alert.trigger_conditions),
          alert.notification_channels,
          alert.is_enabled,
          alert.frequency,
          alert.last_triggered_at,
          JSON.stringify(alert.metadata),
          alert.created_at,
          alert.updated_at,
        ]
      );
    }

    total += alerts.length;
  }

  console.log(`✅ Created ${total} alerts`);
}

async function seedOrgICPConfigs(client: PoolClient, organizations: any[]) {
  console.log(`\n🎯 Seeding ICP configs (${CONFIG.ICP_CONFIGS_PER_ORG} per org)...`);
  let total = 0;

  for (const org of organizations) {
    const configs = createOrgICPConfigs(org.id, CONFIG.ICP_CONFIGS_PER_ORG);

    for (const config of configs) {
      await client.query(
        `INSERT INTO app_public.org_icp_configs (
          id, organization_id, name, description, target_industries, excluded_industries,
          min_employees, max_employees, min_revenue, max_revenue, target_locations,
          excluded_locations, required_technologies, required_certifications, keywords,
          score_weights, is_active, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          config.id,
          config.organization_id,
          config.name,
          config.description,
          config.target_industries,
          config.excluded_industries,
          config.min_employees,
          config.max_employees,
          config.min_revenue,
          config.max_revenue,
          JSON.stringify(config.target_locations),
          JSON.stringify(config.excluded_locations),
          config.required_technologies,
          config.required_certifications,
          config.keywords,
          JSON.stringify(config.score_weights),
          config.is_active,
          JSON.stringify(config.metadata),
          config.created_at,
          config.updated_at,
        ]
      );
    }

    total += configs.length;
  }

  console.log(`✅ Created ${total} ICP configs`);
}

async function main() {
  console.log('🌱 Starting seed process...\n');
  console.log('Configuration:', CONFIG);

  // Test database connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Could not connect to database. Exiting.');
    process.exit(1);
  }

  try {
    // Ensure OpenSearch index exists
    await ensureBusinessesIndex();

    await withTransaction(async (client) => {
      // Optionally reset data
      if (CONFIG.RESET_DATA) {
        await truncateTables(client);
      }

      // Seed in order (respecting foreign keys)
      const organizations = await seedOrganizations(client);
      const users = await seedUsers(client, organizations);
      const businesses = await seedBusinesses(client);

      // Seed related entities
      await seedContacts(client, businesses);
      await seedSocialProfiles(client, businesses);
      await seedLeadLists(client, organizations, users, businesses);
      await seedSavedSearches(client, users);
      await seedAlerts(client, users);
      await seedOrgICPConfigs(client, organizations);

      // Index businesses in OpenSearch
      await bulkIndexBusinesses(businesses);
    });

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Organizations: ${CONFIG.ORGANIZATIONS_COUNT}`);
    console.log(`   Users: ${CONFIG.ORGANIZATIONS_COUNT * CONFIG.USERS_PER_ORG}`);
    console.log(`   Businesses: ${INDUSTRY_KEYS.length * CONFIG.BUSINESSES_PER_INDUSTRY}`);
    console.log(`   Lead Lists: ${CONFIG.ORGANIZATIONS_COUNT * CONFIG.USERS_PER_ORG * CONFIG.LEAD_LISTS_PER_USER}`);
    console.log(`   Saved Searches: ${CONFIG.ORGANIZATIONS_COUNT * CONFIG.USERS_PER_ORG * CONFIG.SAVED_SEARCHES_PER_USER}`);
    console.log(`   Alerts: ${CONFIG.ORGANIZATIONS_COUNT * CONFIG.USERS_PER_ORG * CONFIG.ALERTS_PER_USER}`);
    console.log(`   ICP Configs: ${CONFIG.ORGANIZATIONS_COUNT * CONFIG.ICP_CONFIGS_PER_ORG}`);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
