import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    // Neon serverless-optimized settings:
    // - In Vercel, each function instance may spin up/down rapidly.
    // - PgBouncer (via Neon pooler) handles connection multiplexing.
    // - Use datasourceUrl to override the URL from schema.prisma at runtime.
    datasourceUrl: process.env.DATABASE_URL,
    log: process.env.NODE_ENV === 'development'
      ? ['warn', 'error']
      : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ============ AUTO-MIGRATION ============
// Uses raw fetch() to the Neon HTTP SQL API.
// No libraries, no parameterization, no native bindings.
// This is the most basic approach guaranteed to work on Vercel serverless.

const MIGRATION_SQL = [
  `ALTER TABLE "BusinessConfig" ADD COLUMN IF NOT EXISTS "lunchBreakEnabled" BOOLEAN DEFAULT false`,
  `ALTER TABLE "BusinessConfig" ADD COLUMN IF NOT EXISTS "lunchBreakStart" TEXT DEFAULT '12:30'`,
  `ALTER TABLE "BusinessConfig" ADD COLUMN IF NOT EXISTS "lunchBreakEnd" TEXT DEFAULT '14:00'`,
  `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "cleanupMinutes" INTEGER DEFAULT 0`,
  `ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "bufferMinutes" INTEGER DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS "ClosedDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "configId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClosedDate_configId_fkey') THEN
      ALTER TABLE "ClosedDate" ADD CONSTRAINT "ClosedDate_configId_fkey"
        FOREIGN KEY ("configId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ClosedDate_configId_date_key" ON "ClosedDate"("configId", "date")`,
  // ============ MULTI-TENANCY MIGRATIONS ============
  `CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL DEFAULT '',
    "ownerEmail" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug")`,
  `ALTER TABLE "BusinessConfig" ADD COLUMN IF NOT EXISTS "tenantId" TEXT`,
  `ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "tenantId" TEXT`,
  // Data migration: create default tenant
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Tenant" LIMIT 1) THEN
      INSERT INTO "Tenant" ("id", "slug", "businessName", "ownerName", "ownerEmail", "active", "createdAt", "updatedAt")
      SELECT
        gen_random_uuid()::text,
        'default',
        COALESCE((SELECT "shopName" FROM "BusinessConfig" LIMIT 1), 'Il Mio Negozio'),
        '',
        '',
        true,
        NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "Tenant" LIMIT 1);
    END IF;
  END $$`,
  // Link existing BusinessConfig to default tenant
  `DO $$ BEGIN
    UPDATE "BusinessConfig" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'default' LIMIT 1)
    WHERE "tenantId" IS NULL AND EXISTS (SELECT 1 FROM "Tenant" WHERE "slug" = 'default' LIMIT 1);
  END $$`,
  // Link existing AdminUsers to default tenant
  `DO $$ BEGIN
    UPDATE "AdminUser" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'default' LIMIT 1)
    WHERE "tenantId" IS NULL AND EXISTS (SELECT 1 FROM "Tenant" WHERE "slug" = 'default' LIMIT 1);
  END $$`,
  // Foreign key constraints
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessConfig_tenantId_fkey') THEN
      ALTER TABLE "BusinessConfig" ADD CONSTRAINT "BusinessConfig_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminUser_tenantId_fkey') THEN
      ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BusinessConfig_tenantId_key" ON "BusinessConfig"("tenantId")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_tenantId_username_key" ON "AdminUser"("tenantId", "username")`,
  // ============ BILLING MIGRATIONS (Nexi XPay) ============
  `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial'`,
  `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "planEndDate" TIMESTAMP(3)`,
  `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "nexiCustomerId" TEXT`,
  `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "nexiSubscriptionId" TEXT`,
  `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT`,
  `ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3)`,
  // ============ ACTIVITY TYPE MIGRATION ============
  `ALTER TABLE "BusinessConfig" ADD COLUMN IF NOT EXISTS "activityType" TEXT NOT NULL DEFAULT 'ALTRO'`,
  // ============ MULTI-RESOURCE MIGRATIONS ============
  `CREATE TABLE IF NOT EXISTS "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "configId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Resource_configId_fkey') THEN
      ALTER TABLE "Resource" ADD CONSTRAINT "Resource_configId_fkey"
        FOREIGN KEY ("configId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "resourceId" TEXT`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_resourceId_fkey') THEN
      ALTER TABLE "Booking" ADD CONSTRAINT "Booking_resourceId_fkey"
        FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,
  // Auto-create default "Standard" resource for each config that has no resources yet
  `DO $$ BEGIN
    INSERT INTO "Resource" ("id", "name", "active", "sortOrder", "configId", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid()::text,
      'Standard',
      true,
      0,
      bc."id",
      NOW(), NOW()
    FROM "BusinessConfig" bc
    WHERE NOT EXISTS (
      SELECT 1 FROM "Resource" r WHERE r."configId" = bc."id"
    );
  END $$`,
  // ============ PERFORMANCE INDEXES ============
  // Composite index for calendar queries: filter bookings by config + time range
  `CREATE INDEX IF NOT EXISTS "Booking_configId_startTime_idx" ON "Booking"("configId", "startTime")`,
  // Index for status-based filtering (stats, cancelled bookings, etc.)
  `CREATE INDEX IF NOT EXISTS "Booking_status_startTime_idx" ON "Booking"("status", "startTime")`,
  // Index for active services lookup
  `CREATE INDEX IF NOT EXISTS "Service_configId_active_idx" ON "Service"("configId", "active")`,
  // Index for active resources lookup
  `CREATE INDEX IF NOT EXISTS "Resource_configId_active_idx" ON "Resource"("configId", "active")`,
  // Index for working hours lookup
  `CREATE INDEX IF NOT EXISTS "WorkingHours_configId_idx" ON "WorkingHours"("configId")`,
  // ============ MIN NOTICE HOURS ============
  `ALTER TABLE "BusinessConfig" ADD COLUMN IF NOT EXISTS "minNoticeHours" INTEGER NOT NULL DEFAULT 1`,
  // ============ CLOSED PERIODS (Vacations / Extraordinary Closures) ============
  `CREATE TABLE IF NOT EXISTS "ClosedPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "configId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClosedPeriod_configId_fkey') THEN
      ALTER TABLE "ClosedPeriod" ADD CONSTRAINT "ClosedPeriod_configId_fkey"
        FOREIGN KEY ("configId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE INDEX IF NOT EXISTS "ClosedPeriod_configId_idx" ON "ClosedPeriod"("configId")`,
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "remindedAt" TIMESTAMP(3)`,
  `ALTER TABLE "BusinessConfig" ADD COLUMN IF NOT EXISTS "shopDescription" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "BusinessConfig" ADD COLUMN IF NOT EXISTS "features" TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  // ============ PASSWORD RESET MIGRATIONS ============
  `ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "resetToken" TEXT`,
  `ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "resetTokenExpires" TIMESTAMP(3)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AdminUser_resetToken_key" ON "AdminUser"("resetToken") WHERE "resetToken" IS NOT NULL`,
  // ============ OWNER EMAIL UNIQUE (partial — skip empty strings) ============
  `CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_ownerEmail_key" ON "Tenant"("ownerEmail") WHERE "ownerEmail" != ''`,
  // ============ PLATFORM SETTINGS TABLE ============
  `CREATE TABLE IF NOT EXISTS "PlatformSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  // ============ ADMIN USER LAST LOGIN ============
  `ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`,
  // ============ COUPON TABLE ============
  `CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION,
    "extraTrialDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiryDate" TIMESTAMP(3),
    "usedByTenantId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code")`,
  // ============ SYSTEM SETTINGS TABLE ============
  `CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL DEFAULT ''
  )`,
  `DO $$ BEGIN
    INSERT INTO "SystemSetting" ("key", "value") VALUES ('maintenance_mode', 'false')
    ON CONFLICT ("key") DO NOTHING;
  END $$`,
  // ============ SPAM LOG TABLE ============
  `CREATE TABLE IF NOT EXISTS "SpamLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipAddress" TEXT NOT NULL,
    "tenantId" TEXT,
    "path" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "SpamLog_ipAddress_idx" ON "SpamLog"("ipAddress")`,
  `CREATE INDEX IF NOT EXISTS "SpamLog_createdAt_idx" ON "SpamLog"("createdAt")`,
  // ============ BANNED IP TABLE ============
  `CREATE TABLE IF NOT EXISTS "BannedIP" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BannedIP_ipAddress_key" ON "BannedIP"("ipAddress")`,
  // ============ RESOURCE-SERVICE MANY-TO-MANY (Operator-Service Assignment) ============
  // Table name MUST match Prisma's implicit M2M convention: _{RelationName}
  // Relation name = "ResourceServices" → table = "_ResourceServices"
  `CREATE TABLE IF NOT EXISTS "_ResourceServices" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_ResourceServices_AB_fkey') THEN
      ALTER TABLE "_ResourceServices" ADD CONSTRAINT "_ResourceServices_AB_fkey"
        FOREIGN KEY ("A") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_ResourceServices_BA_fkey') THEN
      ALTER TABLE "_ResourceServices" ADD CONSTRAINT "_ResourceServices_BA_fkey"
        FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "_ResourceServices_AB_unique" ON "_ResourceServices"("A", "B")`,
  // ============ CUSTOMER USER TABLE (OTP-based client auth) ============
  `CREATE TABLE IF NOT EXISTS "CustomerUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpCode" TEXT,
    "otpExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerUser_tenantId_fkey') THEN
      ALTER TABLE "CustomerUser" ADD CONSTRAINT "CustomerUser_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerUser_configId_fkey') THEN
      ALTER TABLE "CustomerUser" ADD CONSTRAINT "CustomerUser_configId_fkey"
        FOREIGN KEY ("configId") REFERENCES "BusinessConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  // ============ CUSTOMER PASSWORD COLUMN ============
  `ALTER TABLE "CustomerUser" ADD COLUMN IF NOT EXISTS "password" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CustomerUser_telefono_key" ON "CustomerUser"("telefono")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CustomerUser_email_key" ON "CustomerUser"("email")`,
  `CREATE INDEX IF NOT EXISTS "CustomerUser_configId_idx" ON "CustomerUser"("configId")`,
  `CREATE INDEX IF NOT EXISTS "CustomerUser_tenantId_idx" ON "CustomerUser"("tenantId")`,
  // ============ BOOKING → CUSTOMER USER LINK ============
  `ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerId" TEXT`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_customerId_fkey') THEN
      ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "CustomerUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE INDEX IF NOT EXISTS "Booking_customerId_idx" ON "Booking"("customerId")`,
  // ============ PERFORMANCE: Composite index for slot queries ============
  `CREATE INDEX IF NOT EXISTS "Booking_configId_status_startTime_idx" ON "Booking"("configId", "status", "startTime")`,
  // ============ ONE-TIME: REMOVE DEFAULT TEST TENANT ============
  `DELETE FROM "Tenant" WHERE "slug" = 'default'`,
]

/**
 * Execute a single DDL statement via the Neon HTTP SQL API.
 * Uses raw fetch() — zero libraries, zero parameterization.
 */
async function neonRawQuery(connectionString: string, sql: string): Promise<{ ok: boolean; msg: string }> {
  // Parse host from connection string
  // Format: postgresql://user:pass@host/db?params
  try {
    const asHttp = connectionString
      .replace(/^postgresql:\/\//, 'http://')
      .replace(/^postgres:\/\//, 'http://')
    const parsed = new URL(asHttp)
    const host = parsed.hostname // e.g. "epic-xyz.us-east-2.aws.neon.tech"

    const response = await fetch(`https://${host}/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': connectionString,
      },
      body: JSON.stringify({ query: sql }),
    })

    const text = await response.text()
    let data: Record<string, unknown>

    try {
      data = JSON.parse(text)
    } catch {
      return { ok: response.ok, msg: `HTTP ${response.status}: ${text.substring(0, 100)}` }
    }

    // Neon HTTP API returns errors in various fields
    const errorMsg = (data.error || data.message || data.detail || '') as string
    if (typeof errorMsg === 'string' && errorMsg.length > 0 && !response.ok) {
      return { ok: false, msg: errorMsg.substring(0, 150) }
    }

    return { ok: true, msg: 'OK' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, msg: msg.substring(0, 150) }
  }
}

// ============ LEAD TABLE (independent, created on demand) ============

let _leadTableEnsured = false

export async function ensureLeadTable(): Promise<void> {
  if (_leadTableEnsured) return

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('[ensureLeadTable] No DATABASE_URL')
    return
  }

  await neonRawQuery(connectionString, `CREATE TABLE IF NOT EXISTS "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'launch-discount',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`)

  await neonRawQuery(connectionString, `CREATE UNIQUE INDEX IF NOT EXISTS "Lead_email_key" ON "Lead"("email")`)

  _leadTableEnsured = true
  console.log('[ensureLeadTable] Lead table ready')
}

// ============ MAIN SCHEMA ENSURE ============

// Reset schema cache so the new _ResourceServices table gets created on next request
let _schemaEnsured = false

export async function ensureDbSchema(): Promise<{ ok: boolean; results: string[] }> {
  if (_schemaEnsured) return { ok: true, results: ['cached'] }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('[ensureDbSchema] No DATABASE_URL')
    return { ok: false, results: ['ERROR: No DATABASE_URL env var'] }
  }

  // Execute DDL in parallel batches of 10.
  // Neon HTTP /sql endpoint accepts ONE statement per request,
  // so we run them individually but in parallel batches.
  // This reduces ~60 sequential HTTP round-trips to 6 parallel batches.
  const BATCH_SIZE = 10
  let successCount = 0
  const results: string[] = []

  for (let i = 0; i < MIGRATION_SQL.length; i += BATCH_SIZE) {
    const batch = MIGRATION_SQL.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(ddl => neonRawQuery(connectionString, ddl))
    )
    for (let j = 0; j < batchResults.length; j++) {
      const r = batchResults[j]
      const short = batch[j].replace(/\s+/g, ' ').substring(0, 55)
      if (r.ok) {
        successCount++
        results.push(`OK: ${short}`)
      } else {
        results.push(`FAIL: ${r.msg}`)
        console.warn(`[ensureDbSchema] FAIL: ${short} → ${r.msg}`)
      }
    }
  }

  const allOk = successCount === MIGRATION_SQL.length
  const majorityOk = successCount >= Math.ceil(MIGRATION_SQL.length * 0.7)

  if (majorityOk) {
    _schemaEnsured = true
    console.log(`[ensureDbSchema] Done: ${successCount}/${MIGRATION_SQL.length} succeeded`)
    return { ok: true, results }
  }

  console.error(`[ensureDbSchema] Only ${successCount}/${MIGRATION_SQL.length} succeeded — will retry`)
  return { ok: false, results }
}
