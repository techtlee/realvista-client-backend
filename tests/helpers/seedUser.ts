import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'dev@payloadcms.com',
  password: 'test',
}

/**
 * The admin-panel specs navigate collection list views, which requires a platform
 * admin. Nothing promotes users implicitly — there is deliberately no
 * "first user becomes admin" hook — so the role is set explicitly here.
 */
const testUserData = { ...testUser, platformRole: 'platform-admin' as const }

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  // Delete existing test user if any
  await payload.delete({
    overrideAccess: true,
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })

  // Create fresh test user
  await payload.create({
    overrideAccess: true,
    collection: 'users',
    data: testUserData,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    overrideAccess: true,
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
  })
}
