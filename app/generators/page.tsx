'use client';

import { useState } from 'react';

import { Copy, FileText, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const generators = [
  {
    id: 'component',
    name: 'React Component',
    description: 'Generate a new React component with TypeScript',
    category: 'Frontend',
    icon: '⚛️',
    fields: [
      {
        name: 'componentName',
        label: 'Component Name',
        type: 'text',
        required: true,
      },
      {
        name: 'componentType',
        label: 'Component Type',
        type: 'select',
        options: ['Client Component', 'Server Component', 'Both'],
        required: true,
      },
      {
        name: 'withProps',
        label: 'Include Props Interface',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'withStyles',
        label: 'Include Styling',
        type: 'checkbox',
        default: true,
      },
    ],
  },
  {
    id: 'api',
    name: 'API Route',
    description: 'Generate a new API route with CRUD operations',
    category: 'Backend',
    icon: '🔗',
    fields: [
      { name: 'routeName', label: 'Route Name', type: 'text', required: true },
      {
        name: 'methods',
        label: 'HTTP Methods',
        type: 'multiselect',
        options: ['GET', 'POST', 'PUT', 'DELETE'],
        required: true,
      },
      {
        name: 'withAuth',
        label: 'Include Authentication',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'withValidation',
        label: 'Include Validation',
        type: 'checkbox',
        default: true,
      },
    ],
  },
  {
    id: 'model',
    name: 'Database Model',
    description: 'Generate a Drizzle ORM model with schema',
    category: 'Database',
    icon: '🗃️',
    fields: [
      { name: 'modelName', label: 'Model Name', type: 'text', required: true },
      {
        name: 'fields',
        label: 'Fields (JSON)',
        type: 'textarea',
        required: true,
        placeholder:
          '[{"name": "title", "type": "text"}, {"name": "userId", "type": "uuid", "references": "users"}]',
      },
      {
        name: 'withTimestamps',
        label: 'Include Timestamps',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'withRelations',
        label: 'Include Relations',
        type: 'checkbox',
        default: true,
      },
    ],
  },
  {
    id: 'test',
    name: 'Test Suite',
    description: 'Generate test files for components or functions',
    category: 'Testing',
    icon: '🧪',
    fields: [
      {
        name: 'testTarget',
        label: 'Test Target',
        type: 'text',
        required: true,
      },
      {
        name: 'testType',
        label: 'Test Type',
        type: 'select',
        options: ['Unit Test', 'Integration Test', 'E2E Test'],
        required: true,
      },
      {
        name: 'withMocks',
        label: 'Include Mocks',
        type: 'checkbox',
        default: true,
      },
      {
        name: 'withSetup',
        label: 'Include Test Setup',
        type: 'checkbox',
        default: true,
      },
    ],
  },
];

export default function GeneratorsPage() {
  const [selectedGenerator, setSelectedGenerator] = useState(generators[0]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const generateCode = async () => {
    setIsGenerating(true);

    // Simulate code generation
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate different code based on selected generator
    let code = '';
    switch (selectedGenerator.id) {
      case 'component':
        code = generateComponentCode(formData);
        break;
      case 'api':
        code = generateApiCode(formData);
        break;
      case 'model':
        code = generateModelCode(formData);
        break;
      case 'test':
        code = generateTestCode(formData);
        break;
    }

    setGeneratedCode(code);
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  return (
    <div className='mx-auto max-w-7xl'>
      <div className='mb-8'>
        <h1 className='mb-2 text-3xl font-bold'>Code Generators</h1>
        <p className='text-gray-600'>
          Boost your productivity with automated code generation for common
          patterns
        </p>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* Generator Selection */}
        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Zap className='h-5 w-5' />
                Available Generators
              </CardTitle>
              <CardDescription>
                Choose a generator to create boilerplate code
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 gap-3'>
                {generators.map(generator => (
                  <button
                    key={generator.id}
                    onClick={() => setSelectedGenerator(generator)}
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      selectedGenerator.id === generator.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className='flex items-start gap-3'>
                      <span className='text-2xl'>{generator.icon}</span>
                      <div>
                        <div className='mb-1 flex items-center gap-2'>
                          <h3 className='font-semibold'>{generator.name}</h3>
                          <Badge variant='secondary'>
                            {generator.category}
                          </Badge>
                        </div>
                        <p className='text-sm text-gray-600'>
                          {generator.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generator Form and Output */}
        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <span className='text-2xl'>{selectedGenerator.icon}</span>
                {selectedGenerator.name}
              </CardTitle>
              <CardDescription>{selectedGenerator.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {selectedGenerator.fields.map(field => (
                  <div key={field.name} className='space-y-2'>
                    <Label htmlFor={field.name}>
                      {field.label}
                      {field.required && (
                        <span className='text-red-500'>*</span>
                      )}
                    </Label>

                    {field.type === 'text' && (
                      <Input
                        id={field.name}
                        placeholder={field.label}
                        value={(formData[field.name] as string) || ''}
                        onChange={e =>
                          handleFieldChange(field.name, e.target.value)
                        }
                      />
                    )}

                    {field.type === 'textarea' && (
                      <Textarea
                        id={field.name}
                        placeholder={field.label}
                        value={(formData[field.name] as string) || ''}
                        onChange={e =>
                          handleFieldChange(field.name, e.target.value)
                        }
                        rows={3}
                      />
                    )}

                    {field.type === 'select' && 'options' in field && (
                      <Select
                        value={(formData[field.name] as string) || ''}
                        onChange={e =>
                          handleFieldChange(field.name, e.target.value)
                        }
                      >
                        <SelectContent>
                          <option value=''>Select {field.label}</option>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {(field as any).options.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {field.type === 'checkbox' && (
                      <div className='flex items-center space-x-2'>
                        <input
                          id={field.name}
                          type='checkbox'
                          checked={
                            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                            (formData[field.name] as boolean) ??
                            (field as any).default
                          }
                          onChange={e =>
                            handleFieldChange(field.name, e.target.checked)
                          }
                          className='h-4 w-4 rounded border-gray-300'
                        />
                        <Label htmlFor={field.name} className='text-sm'>
                          {field.label}
                        </Label>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  onClick={generateCode}
                  disabled={isGenerating}
                  className='w-full'
                >
                  {isGenerating ? 'Generating...' : 'Generate Code'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated Code Output */}
          {generatedCode && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                  <span className='flex items-center gap-2'>
                    <FileText className='h-5 w-5' />
                    Generated Code
                  </span>
                  <Button variant='outline' size='sm' onClick={copyToClipboard}>
                    <Copy className='mr-2 h-4 w-4' />
                    Copy
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className='overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm'>
                  <code>{generatedCode}</code>
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Code generation functions
function generateComponentCode(data: Record<string, unknown>) {
  const { componentName, componentType, withProps, withStyles } = data;

  let code = '';

  if (componentType === 'Client Component' || componentType === 'Both') {
    code += `'use client'\n\n`;
  }

  if (withProps) {
    code += `interface ${componentName}Props {\n  // Add your props here\n}\n\n`;
  }

  const propsParam = withProps ? `props: ${componentName}Props` : '';

  code += `export default function ${componentName}(${propsParam}) {\n`;
  code += `  return (\n`;
  code += `    <div${withStyles ? ' className="p-4"' : ''}>\n`;
  code += `      <h1>${componentName}</h1>\n`;
  code += `      {/* Add your content here */}\n`;
  code += `    </div>\n`;
  code += `  )\n`;
  code += `}\n`;

  return code;
}

function generateApiCode(data: Record<string, unknown>) {
  const { routeName, methods, withAuth, withValidation } = data;

  let code = '';

  if (withAuth) {
    code += `import { auth } from '@/lib/auth'\n`;
  }

  if (withValidation) {
    code += `import { z } from 'zod'\n`;
  }

  code += `import { NextRequest, NextResponse } from 'next/server'\n\n`;

  if (withValidation) {
    code += `const schema = z.object({\n`;
    code += `  // Add your validation schema here\n`;
    code += `})\n\n`;
  }

  if ((methods as string[])?.includes('GET')) {
    code += `export async function GET(request: NextRequest) {\n`;
    if (withAuth) {
      code += `  const session = await auth()\n`;
      code += `  if (!session) {\n`;
      code += `    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n`;
      code += `  }\n\n`;
    }
    code += `  // Add your GET logic here\n`;
    code += `  return NextResponse.json({ message: 'GET ${routeName}' })\n`;
    code += `}\n\n`;
  }

  if ((methods as string[])?.includes('POST')) {
    code += `export async function POST(request: NextRequest) {\n`;
    if (withAuth) {
      code += `  const session = await auth()\n`;
      code += `  if (!session) {\n`;
      code += `    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n`;
      code += `  }\n\n`;
    }
    code += `  const body = await request.json()\n`;
    if (withValidation) {
      code += `  const validatedData = schema.parse(body)\n`;
    }
    code += `  // Add your POST logic here\n`;
    code += `  return NextResponse.json({ message: 'POST ${routeName}' })\n`;
    code += `}\n\n`;
  }

  return code;
}

function generateModelCode(data: Record<string, unknown>) {
  const { modelName, fields, withTimestamps, withRelations } = data;

  let code = `import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'\n`;

  if (withRelations) {
    code += `import { relations } from 'drizzle-orm'\n`;
  }

  code += `\n`;
  code += `export const ${(modelName as string).toLowerCase()} = pgTable('${(modelName as string).toLowerCase()}', {\n`;
  code += `  id: uuid('id').primaryKey().defaultRandom(),\n`;

  try {
    const parsedFields = JSON.parse((fields as string) || '[]');
    parsedFields.forEach((field: Record<string, unknown>) => {
      let fieldDef = `  ${field.name}: `;
      switch (field.type) {
        case 'text':
          fieldDef += `text('${field.name}')`;
          break;
        case 'uuid':
          fieldDef += `uuid('${field.name}')`;
          break;
        case 'integer':
          fieldDef += `integer('${field.name}')`;
          break;
        case 'boolean':
          fieldDef += `boolean('${field.name}')`;
          break;
        default:
          fieldDef += `text('${field.name}')`;
      }

      if (field.required) {
        fieldDef += '.notNull()';
      }

      if (field.references) {
        fieldDef += `.references(() => ${field.references}.id)`;
      }

      code += fieldDef + ',\n';
    });
  } catch {
    code += `  // Add your fields here\n`;
  }

  if (withTimestamps) {
    code += `  createdAt: timestamp('created_at').defaultNow(),\n`;
    code += `  updatedAt: timestamp('updated_at').defaultNow(),\n`;
  }

  code += `})\n\n`;

  if (withRelations) {
    code += `export const ${(modelName as string).toLowerCase()}Relations = relations(${(modelName as string).toLowerCase()}, ({ one, many }) => ({\n`;
    code += `  // Add your relations here\n`;
    code += `}))\n\n`;
  }

  code += `export type ${modelName as string} = typeof ${(modelName as string).toLowerCase()}.$inferSelect\n`;
  code += `export type New${modelName as string} = typeof ${(modelName as string).toLowerCase()}.$inferInsert\n`;

  return code;
}

function generateTestCode(data: Record<string, unknown>) {
  const { testTarget, testType, withMocks, withSetup } = data;

  let code = `import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'\n`;

  if (testType === 'Unit Test') {
    code += `import { render, screen } from '@testing-library/react'\n`;
    code += `import '@testing-library/jest-dom'\n`;
  }

  if (withMocks) {
    code += `import { jest } from '@jest/globals'\n`;
  }

  code += `\n`;
  code += `describe('${testTarget}', () => {\n`;

  if (withSetup) {
    code += `  beforeEach(() => {\n`;
    code += `    // Setup before each test\n`;
    code += `  })\n\n`;
    code += `  afterEach(() => {\n`;
    code += `    // Cleanup after each test\n`;
    code += `  })\n\n`;
  }

  code += `  it('should work correctly', () => {\n`;
  code += `    // Add your test logic here\n`;
  code += `    expect(true).toBe(true)\n`;
  code += `  })\n`;
  code += `})\n`;

  return code;
}
