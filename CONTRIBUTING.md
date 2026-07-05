# Contributing to casuya-media

Thank you for your interest in contributing to casuya-media! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)

---

## Code of Conduct

We expect all contributors to follow our Code of Conduct. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

---

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- FFmpeg (for video/audio processing tests)
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/casuya-media.git
   cd casuya-media
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Process

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

Example:
```bash
git checkout -b feature/add-webp-support
git checkout -b fix/cache-eviction-bug
```

### Development Workflow

1. Make your changes in the `src/` directory
2. Write or update tests in `src/__tests__/`
3. Run tests to ensure they pass:
   ```bash
   npm test
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Commit your changes with a descriptive message

---

## Pull Request Process

### Before Submitting

- [ ] Code compiles without errors (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] New code has accompanying tests
- [ ] Documentation is updated if needed
- [ ] No console.log statements left in code
- [ ] No secrets or credentials committed

### PR Title Format

Use clear, descriptive titles:

```
feat: Add WebP image format support
fix: Resolve cache memory leak issue
docs: Update API documentation
refactor: Simplify video compression logic
```

### PR Description

Include in your PR description:

1. **What** - Summary of changes
2. **Why** - Reason for the changes
3. **How** - Implementation approach
4. **Testing** - How to test the changes
5. **Screenshots** - If applicable

### Review Process

1. All PRs require at least one review
2. Address review feedback promptly
3. Squash commits before merging
4. Delete your branch after merging

---

## Coding Standards

### TypeScript Style

```typescript
// Use explicit types
function processImage(buffer: Buffer, options: ProcessingOptions): Promise<Buffer> {
  // Implementation
}

// Use interfaces for objects
interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

// Use enums for constants
enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
}
```

### File Organization

- One class/interface per file
- Export from index.ts files
- Group related functionality
- Keep files under 300 lines

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `media-storage.ts`)
- **Classes**: `PascalCase` (e.g., `MediaStorage`)
- **Functions**: `camelCase` (e.g., `processImage`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)
- **Interfaces**: `PascalCase` with `I` prefix optional (e.g., `StorageItem`)

### Error Handling

```typescript
// Use custom error classes
import { ProcessingError } from '../errors';

async function process(buffer: Buffer): Promise<Buffer> {
  try {
    // Processing logic
  } catch (error) {
    if (error instanceof ProcessingError) throw error;
    throw new ProcessingError(`Processing failed: ${(error as Error).message}`);
  }
}
```

---

## Testing Requirements

### Test File Location

- Tests go in `src/__tests__/`
- Test files use `.test.ts` suffix
- Mirror source structure

### Test Structure

```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle normal case', async () => {
      // Arrange
      const input = createTestData();
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it('should handle error case', async () => {
      // Test error scenarios
      await expect(functionUnderTest(invalidInput))
        .rejects.toThrow(ErrorType);
    });
  });
});
```

### Coverage Requirements

- Minimum 80% coverage for new code
- 100% coverage for error handling
- Test both success and failure paths

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
git commit -m "feat(image): Add AVIF format support"
git commit -m "fix(cache): Resolve memory leak in LRU eviction"
git commit -m "docs(readme): Update installation instructions"
git commit -m "test(caching): Add edge case tests for TTL expiration"
```

### Commit Best Practices

- Keep commits atomic (one change per commit)
- Write clear, concise commit messages
- Reference issue numbers when applicable
- Don't commit generated files (dist/, node_modules/)

---

## Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search existing issues
3. Create a new issue with the `question` label

Thank you for contributing to casuya-media!
