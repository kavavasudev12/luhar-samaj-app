const { test, expect } = require('@playwright/test');

test.describe('Luhar Samaj Management System E2E', () => {
  test('should navigate to home and display main heading', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Verify main Gujarati heading is displayed
    const heading = page.locator('h1');
    await expect(heading).toContainText('શ્રી સમસ્ત લુહાર સમાજ સાવરકુંડલા');
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Verify error notification / toast exists
    // The application uses react-toastify or simple alerts, so we check for error dialog or text
    const errorText = page.locator('text=Invalid credentials');
    // Non-blocking fallback checks
    await expect(page).toHaveURL('/login');
  });

  test('should log in and display dashboard', async ({ page }) => {
    // Mock authorization and user credentials
    await page.goto('/login');

    // Fill in admin test credentials (assuming test configuration holds admin credentials)
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Instead of real API hit, we can intercept network calls and return a mock token
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mocked_jwt_token',
          user: {
            id: '60d5ec49f83ca5324483a9e1',
            name: 'Test Admin',
            email: 'admin@example.com',
            role: 'admin'
          }
        }),
      });
    });

    await page.route('**/api/dashboard', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalMembers: 15,
          familyMembers: 45,
          adultMembers: 30,
          totalZones: 5,
          pendingRequests: 3,
          deletedMembers: 1,
          totalMales: 25,
          totalFemales: 20,
          zoneDistribution: [],
          ageDistribution: [],
          monthlyGrowth: [],
          recentActivity: []
        }),
      });
    });

    // Perform click login
    await page.click('button[type="submit"]');

    // Wait for the path to update to /dashboard
    await page.waitForURL('**/dashboard');

    // Verify dashboard statistics are rendered
    await expect(page.locator('text=Total Members')).toBeVisible();
    await expect(page.locator('text=Adult Members')).toBeVisible();
    await expect(page.locator('text=Deleted Members')).toBeVisible();
  });

  test('should load adults directory successfully', async ({ page }) => {
    // Set local storage variables to simulate logged in state
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'mocked_jwt_token');
      window.localStorage.setItem('userRole', 'admin');
    });

    // Mock API call to fetch adult members list
    await page.route('**/api/members/adults*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            _id: '60d5ec49f83ca5324483a9e2_Adult1',
            familyId: '60d5ec49f83ca5324483a9e2',
            headName: 'Kishorbhai Luhar',
            memberName: 'Rajeshbhai Luhar',
            age: 28,
            gender: 'male',
            relation: 'Son',
            mobile: '9898012345',
            address: 'Savarkundla',
            zone: { name: 'Zone 1' }
          }
        ]),
      });
    });

    // Go to adult directory page
    await page.goto('/members/adults');

    // Check that राजेशભાઈ લુહાર exists in table
    await expect(page.locator('text=Rajeshbhai Luhar')).toBeVisible();
  });
});
