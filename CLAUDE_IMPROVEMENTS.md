# Claude Code Improvements & MCP Tools Recommendations

This document outlines recommended improvements to make Claude Code even more effective with your SaaS template.

## 1. MCP (Model Context Protocol) Tools

### Recommended MCP Servers for SaaS Development

#### 1. **PostgreSQL MCP Server**

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://localhost/saas_dev"
      ],
      "description": "Direct database access for schema exploration and queries"
    }
  }
}
```

Benefits:

- Direct database queries without writing SQL
- Schema exploration and table introspection
- Quick data verification during development

#### 2. **Stripe MCP Server** (when available)

Would enable:

- Direct Stripe API access
- Customer and subscription management
- Webhook simulation and testing

#### 3. **GitHub MCP Server**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

Benefits:

- Issue and PR management
- Code review workflows
- Automated release notes

## 2. Additional Context Files

### A. Create `ARCHITECTURE.md`

Document high-level architecture decisions:

- Why custom auth provider vs Auth.js defaults
- Service layer abstraction rationale
- Testing strategy decisions
- Performance optimization approaches

### B. Create `DEPLOYMENT.md`

Deployment-specific context:

- Environment variables checklist
- Pre-deployment verification steps
- Rollback procedures
- Monitoring setup

### C. Create `PATTERNS.md`

Code pattern library with examples:

- Complex form handling patterns
- Data fetching patterns (server vs client)
- Error boundary implementations
- Loading state management

## 3. Claude Code Settings Enhancements

### Custom Command Shortcuts

Add to your Claude Code settings:

```json
{
  "customCommands": {
    "test:auth": "npm run test tests/lib/auth",
    "test:api": "npm run test tests/api",
    "db:reset": "npm run db:drop && npm run db:push && npm run db:seed",
    "dev:clean": "rm -rf .next && npm run dev"
  }
}
```

### Auto-run Commands

```json
{
  "autoRun": {
    "onSave": ["npm run type-check"],
    "beforeCommit": ["npm run test", "npm run lint"]
  }
}
```

## 4. Development Workflow Improvements

### A. Git Hooks Enhancement

```bash
# .husky/pre-commit
#!/bin/sh
npm run lint
npm run type-check
npm run test:changed  # Only test changed files
```

### B. VS Code / Cursor Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true,
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/.next": true,
    "**/node_modules": true
  }
}
```

### C. Snippets for Common Patterns

Create `.vscode/snippets/typescript.json`:

```json
{
  "Server Action": {
    "prefix": "sa",
    "body": [
      "'use server';",
      "",
      "import { auth } from '@/lib/auth';",
      "import { ${1:schema}Schema } from '@/lib/schemas';",
      "",
      "export async function ${2:actionName}(data: unknown) {",
      "  const session = await auth();",
      "  if (!session) throw new Error('Unauthorized');",
      "  ",
      "  const validated = ${1:schema}Schema.parse(data);",
      "  ",
      "  // TODO: Implement",
      "  $0",
      "}"
    ]
  }
}
```

## 5. Testing Improvements

### A. Test Data Factories

Create `tests/factories/`:

```typescript
// tests/factories/user.factory.ts
export const userFactory = {
  build: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User',
    ...overrides,
  }),

  buildMany: (count: number, overrides = {}) =>
    Array.from({ length: count }, (_, i) =>
      userFactory.build({
        ...overrides,
        email: `test-${i}-${Date.now()}@example.com`,
      }),
    ),
};
```

### B. Custom Test Matchers

```typescript
// tests/matchers/index.ts
expect.extend({
  toBeValidEmail(received: string) {
    const pass = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(received);
    return {
      pass,
      message: () => `expected ${received} to be a valid email`,
    };
  },
});
```

## 6. Performance Monitoring

### A. Custom Performance Tracking

```typescript
// lib/utils/performance.ts
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    if (duration > 100) {
      console.warn(`Slow operation: ${name} took ${duration}ms`);
    }
  });
}
```

### B. Database Query Logging

```typescript
// lib/db/logging.ts
export const dbLogger = {
  logQuery: (query: string, params: any[], duration: number) => {
    if (process.env.DB_LOG === 'true') {
      console.log({
        query,
        params,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  },
};
```

## 7. Security Enhancements

### A. Security Headers Middleware

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}
```

### B. Input Sanitization Helper

```typescript
// lib/utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}
```

## 8. Documentation Automation

### A. API Documentation Generation

```bash
# Generate API docs from TypeScript
npx typedoc --out docs/api src/lib
```

### B. Component Documentation

```typescript
// Use TSDoc comments
/**
 * User profile form component
 * @param onSubmit - Callback when form is submitted
 * @param initialData - Pre-populate form fields
 * @example
 * <UserForm
 *   onSubmit={handleSubmit}
 *   initialData={{ name: 'John' }}
 * />
 */
```

## 9. Debugging Helpers

### A. Debug Mode Toggle

```typescript
// lib/debug/index.ts
export const debug = {
  log: (...args: any[]) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('[DEBUG]', ...args);
    }
  },

  table: (data: any) => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.table(data);
    }
  },
};
```

### B. Request Logging Middleware

```typescript
// lib/middleware/logging.ts
export function logRequests(handler: Function) {
  return async (req: NextRequest) => {
    const start = Date.now();
    const response = await handler(req);

    console.log({
      method: req.method,
      url: req.url,
      status: response.status,
      duration: Date.now() - start,
    });

    return response;
  };
}
```

## 10. Claude Code Workflow Tips

### A. Effective Context Management

1. Keep CLAUDE.md under 1000 lines
2. Move completed features to CLAUDE_ARCHIVE.md
3. Update "Current Sprint" section frequently
4. Use CLAUDE.local.md for machine-specific items

### B. Prompt Patterns for Speed

```
"Implement [feature] following the patterns in lib/auth/providers/database.ts"
"Add [endpoint] similar to app/api/users/route.ts with proper validation"
"Create [component] using the pattern from components/forms/user-form.tsx"
```

### C. Testing Workflow

1. Always ask Claude to run tests after changes
2. Use "npm run test:watch" during development
3. Have Claude check test coverage for new features
4. Ask for test cases before implementation

## Implementation Priority

1. **High Priority** (Do immediately):
   - Add PostgreSQL MCP server
   - Create CLAUDE.local.md from template
   - Set up git hooks

2. **Medium Priority** (This week):
   - Add custom VS Code settings
   - Create test factories
   - Implement security headers

3. **Low Priority** (As needed):
   - Documentation automation
   - Performance monitoring
   - Additional MCP servers

## Summary

These improvements will help Claude Code:

- Access your database directly via MCP
- Have better context about your specific setup
- Follow your patterns more consistently
- Catch errors earlier in development
- Build features faster with less back-and-forth

Remember: The goal is to reduce friction and increase velocity while maintaining code quality.
