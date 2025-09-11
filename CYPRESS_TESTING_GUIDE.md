# Cypress Testing Guide for Factory Inventory Management System

This guide provides comprehensive information on how to use Cypress for testing both the frontend React application and backend Node.js API.

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Project Structure](#project-structure)
4. [Running Tests](#running-tests)
5. [Test Types](#test-types)
6. [Writing Tests](#writing-tests)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Overview

Cypress is a modern web testing framework that provides:
- **End-to-End (E2E) Testing**: Full application testing in a real browser
- **Component Testing**: Isolated React component testing
- **API Testing**: Backend API endpoint testing
- **Visual Testing**: Screenshot and video capture
- **Real-time Reloading**: Automatic test re-runs during development

## Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- MongoDB (for backend tests)

### Frontend Setup
```bash
cd frontend
npm install --save-dev cypress start-server-and-test
```

### Backend Setup
```bash
cd Backend
npm install --save-dev cypress
```

## Project Structure

```
├── frontend/
│   ├── cypress/
│   │   ├── e2e/                    # E2E test files
│   │   │   ├── auth/              # Authentication tests
│   │   │   ├── dashboard/         # Dashboard tests
│   │   │   └── pipes/             # Pipe management tests
│   │   ├── component/             # Component test files
│   │   ├── support/               # Support files
│   │   │   ├── e2e.js            # E2E support
│   │   │   ├── component.js      # Component support
│   │   │   └── commands.js       # Custom commands
│   │   └── fixtures/             # Test data files
│   └── cypress.config.js         # Frontend Cypress config
│
├── Backend/
│   ├── cypress/
│   │   ├── e2e/                   # API test files
│   │   │   └── api/              # API endpoint tests
│   │   ├── support/              # Support files
│   │   │   ├── e2e.js           # API testing support
│   │   │   └── commands.js      # API testing commands
│   │   └── fixtures/            # API test data
│   └── cypress.config.js        # Backend Cypress config
```

## Running Tests

### Frontend Tests

#### Open Cypress Test Runner (Interactive Mode)
```bash
cd frontend
npm run cypress:open
```

#### Run Tests in Headless Mode
```bash
cd frontend
npm run cypress:run
```

#### Run E2E Tests with Server
```bash
cd frontend
npm run test:e2e
```

### Backend Tests

#### Open Cypress Test Runner
```bash
cd Backend
npx cypress open
```

#### Run Tests in Headless Mode
```bash
cd Backend
npx cypress run
```

## Test Types

### 1. End-to-End (E2E) Tests
Test complete user workflows in a real browser environment.

**Example: Login Flow**
```javascript
describe('Login Page', () => {
  it('should successfully login with valid credentials', () => {
    cy.visit('/login')
    cy.get('[data-testid=email-input]').type('test@example.com')
    cy.get('[data-testid=password-input]').type('password123')
    cy.get('[data-testid=login-button]').click()
    cy.url().should('include', '/dashboard')
  })
})
```

### 2. Component Tests
Test individual React components in isolation.

**Example: PipeForm Component**
```javascript
import React from 'react'
import PipeForm from '../../src/components/pipes/PipeForm'

describe('PipeForm Component', () => {
  it('should render form fields correctly', () => {
    cy.mountComponent(<PipeForm onSubmit={cy.stub()} />)
    cy.get('[data-testid=pipe-form]').should('be.visible')
  })
})
```

### 3. API Tests
Test backend endpoints directly.

**Example: Pipes API**
```javascript
describe('Pipes API', () => {
  it('should create a new pipe', () => {
    cy.authenticatedRequest('POST', '/api/pipes', {
      type: 'Steel',
      diameter: '50mm',
      length: '6m'
    }).then((response) => {
      expect(response.status).to.eq(201)
    })
  })
})
```

## Writing Tests

### Test Structure
```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    cy.visit('/page')
  })

  it('should do something specific', () => {
    // Test implementation
    cy.get('[data-testid=element]').should('be.visible')
  })

  afterEach(() => {
    // Cleanup after each test
  })
})
```

### Custom Commands
The project includes several custom commands for common operations:

#### Frontend Commands
- `cy.login(email, password)` - Login user
- `cy.logout()` - Logout user
- `cy.fillForm(formData)` - Fill form fields
- `cy.mockApiResponse(method, url, response)` - Mock API responses

#### Backend Commands
- `cy.login(userType)` - Authenticate user
- `cy.authenticatedRequest(method, url, body)` - Make authenticated API calls
- `cy.createTestPipe(data)` - Create test pipe data
- `cy.cleanupTestData()` - Clean up test data

### Data Attributes
Use `data-testid` attributes for reliable element selection:

```html
<input data-testid="email-input" type="email" />
<button data-testid="submit-btn" type="submit">Submit</button>
```

### API Mocking
Mock API responses for consistent testing:

```javascript
cy.mockApiResponse('GET', '/api/pipes', [
  { id: '1', name: 'Test Pipe' }
])

cy.get('[data-testid=submit-btn]').click()
cy.wait('@get_api_pipes')
```

## Best Practices

### 1. Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names that explain the expected behavior
- Keep tests independent and isolated

### 2. Element Selection
- Prefer `data-testid` over CSS classes or IDs
- Use semantic selectors when possible
- Avoid brittle selectors that depend on text content

### 3. Test Data Management
- Use fixtures for consistent test data
- Clean up test data after tests
- Generate unique data for each test run

### 4. Assertions
- Make assertions specific and meaningful
- Test both positive and negative scenarios
- Verify the complete user experience

### 5. Performance
- Keep tests focused and fast
- Use `cy.wait()` sparingly
- Mock external dependencies when appropriate

## Configuration

### Frontend Configuration (`frontend/cypress.config.js`)
```javascript
module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack'
    }
  }
})
```

### Backend Configuration (`Backend/cypress.config.js`)
```javascript
module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'
  },
  env: {
    apiUrl: 'http://localhost:5000',
    testUser: {
      email: 'test@example.com',
      password: 'testpassword123'
    }
  }
})
```

## Environment Variables

### Frontend
Create `.env.local` in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENV=test
```

### Backend
Create `.env.test` in the Backend directory:
```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/factory_test
JWT_SECRET=test_secret_key
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Cypress Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run cypress:run
```

## Troubleshooting

### Common Issues

#### 1. Tests Failing Due to Timing
```javascript
// Use cy.wait() for API calls
cy.intercept('GET', '/api/data').as('getData')
cy.get('[data-testid=button]').click()
cy.wait('@getData')
```

#### 2. Element Not Found
- Verify `data-testid` attributes are present
- Check if element is rendered conditionally
- Use `cy.waitForElement()` for dynamic content

#### 3. API Tests Failing
- Ensure backend server is running
- Check authentication tokens
- Verify API endpoints are correct

#### 4. Component Tests Not Working
- Ensure component is properly imported
- Check for missing dependencies
- Verify component props are correct

### Debug Mode
Run tests with debug information:
```bash
DEBUG=cypress:* npm run cypress:run
```

### Screenshots and Videos
Cypress automatically captures:
- Screenshots on test failure
- Videos of test runs
- Console logs and network requests

## Additional Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [React Testing with Cypress](https://docs.cypress.io/guides/component-testing/react-overview)
- [API Testing with Cypress](https://docs.cypress.io/guides/end-to-end-testing/testing-strategies#API-Testing)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Cypress documentation
3. Check browser console for errors
4. Verify test environment setup
5. Review test data and fixtures

---

**Happy Testing! 🧪✨**
