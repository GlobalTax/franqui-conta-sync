// ============================================================================
// INTEGRATION TEST SETUP
// Common setup and teardown for E2E integration tests
// ============================================================================

import { beforeEach, afterEach } from 'vitest';

/**
 * Setup mock database state before each test
 */
export function setupIntegrationTest() {
  beforeEach(() => {
    // Reset any global state
    // In a real scenario, you might:
    // - Clear test database
    // - Reset mocks
    // - Set up test fixtures
  });

  afterEach(() => {
    // Cleanup after each test
    // - Remove test data
    // - Reset connections
  });
}

/**
 * Mock current authenticated user
 */
export function mockAuthUser(userId: string, role: string) {
  // In real implementation, mock supabase.auth.getUser()
  return {
    id: userId,
    role,
    email: `${role}@test.com`,
  };
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(ms: number = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
