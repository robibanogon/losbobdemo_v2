# Test Execution Guide - Create Application Feature

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git repository cloned

---

## Backend Tests

### Installation
```bash
cd backend
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Specific test file
npm test -- tests/unit/applicationService.test.js
```

### Watch Mode (Auto-rerun on changes)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

**Coverage Output Location:** `backend/coverage/`

---

## Frontend Tests

### Installation
```bash
cd frontend
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- tests/ApplicationForm.test.jsx
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

**Coverage Output Location:** `frontend/coverage/`

---

## Test Results Interpretation

### Successful Test Run
```
PASS  tests/unit/applicationService.test.js
  ✓ should create a new application with valid data (15ms)
  ✓ should generate unique application numbers (8ms)
  ...

Test Suites: 2 passed, 2 total
Tests:       24 passed, 24 total
Snapshots:   0 total
Time:        2.456s
```

### Failed Test Example
```
FAIL  tests/unit/applicationService.test.js
  ✕ should create a new application with valid data (25ms)

  ● ApplicationService › create() › should create a new application

    expect(received).toHaveProperty(path)

    Expected path: "id"
    Received value: undefined
```

### Coverage Report
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.23 |    78.45 |   82.67 |   85.89 |
 applicationService |   92.15 |    85.71 |   90.00 |   92.50 |
--------------------|---------|----------|---------|---------|
```

---

## Debugging Failed Tests

### Enable Verbose Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- -t "should create a new application"
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## Common Issues & Solutions

### Issue: "Cannot find module"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Jest cache issues"
```bash
npm test -- --clearCache
```

### Issue: "Tests timeout"
```bash
# Increase timeout in test file
jest.setTimeout(10000); // 10 seconds
```

### Issue: "Mock not working"
```bash
# Ensure mock is before imports
jest.mock('./module');
const module = require('./module');
```

---

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm install && npm test
      - run: cd frontend && npm install && npm test
```

---

## Test Coverage Requirements

### Minimum Thresholds
- **Statements:** 70%
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%

### Check Coverage
```bash
npm run test:coverage
```

If coverage is below threshold, tests will fail.

---

## Best Practices

1. **Run tests before committing**
   ```bash
   npm test
   ```

2. **Keep tests fast**
   - Mock external dependencies
   - Use test databases
   - Avoid unnecessary delays

3. **Write descriptive test names**
   ```javascript
   test('should create application with valid data', ...)
   ```

4. **One assertion per test** (when possible)
   - Makes failures easier to debug
   - Tests are more maintainable

5. **Clean up after tests**
   ```javascript
   afterEach(() => {
     jest.clearAllMocks();
   });
   ```

---

## Test File Locations

```
backend/
├── tests/
│   ├── unit/
│   │   └── applicationService.test.js
│   └── integration/
│       └── applications.test.js

frontend/
├── tests/
│   ├── setup.js
│   └── ApplicationForm.test.jsx
```

---

## Quick Reference Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Generate coverage |
| `npm test -- --verbose` | Verbose output |
| `npm test -- -t "test name"` | Run specific test |
| `npm test -- --clearCache` | Clear Jest cache |

---

## Next Steps

After running tests successfully:

1. ✅ Review coverage report
2. ✅ Fix any failing tests
3. ✅ Add tests for uncovered code
4. ✅ Commit changes
5. ✅ Push to repository

---

**For detailed test documentation, see:** [`CREATE_APPLICATION_UNIT_TESTS.md`](./CREATE_APPLICATION_UNIT_TESTS.md)