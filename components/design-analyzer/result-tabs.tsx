'use client';

import React from 'react';

import { FileText, Settings, Palette } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DesignAnalysisResult } from '@/lib/ai/vision/types';

import { CodeDisplay } from './code-display';

interface ResultTabsProps {
  result: DesignAnalysisResult;
}

export function ResultTabs({ result }: ResultTabsProps) {
  const tabs = [
    {
      id: 'style-guide',
      label: 'STYLE_GUIDE.md',
      icon: <FileText className='h-4 w-4' />,
      content: result.styleGuide,
      language: 'markdown',
      filename: 'STYLE_GUIDE.md',
      description:
        'Complete design system documentation with patterns, colors, and typography guidelines.',
    },
    {
      id: 'tailwind-config',
      label: 'tailwind.config.js',
      icon: <Settings className='h-4 w-4' />,
      content: result.tailwindConfig,
      language: 'javascript',
      filename: 'tailwind.config.js',
      description:
        'Tailwind CSS configuration with custom design tokens extracted from your screenshots.',
    },
    {
      id: 'globals-css',
      label: 'app/globals.css',
      icon: <Palette className='h-4 w-4' />,
      content: result.globalsCss,
      language: 'css',
      filename: 'globals.css',
      description:
        'Global CSS with custom properties, base styles, and utility classes.',
    },
  ];

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>Generated Files</h2>
          <p className='mt-1 text-gray-600'>
            Your custom design system files are ready
          </p>
        </div>
        <Badge variant='outline' className='border-green-200 text-green-600'>
          Analysis Complete
        </Badge>
      </div>

      {result.metadata && (
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Design Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {result.metadata.primaryColor && (
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Primary Color</p>
                  <div className='flex items-center gap-2'>
                    <div
                      className='h-6 w-6 rounded border'
                      style={{ backgroundColor: result.metadata.primaryColor }}
                    />
                    <span className='font-mono text-sm'>
                      {result.metadata.primaryColor}
                    </span>
                  </div>
                </div>
              )}

              {result.metadata.theme && (
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Theme</p>
                  <Badge variant='secondary' className='capitalize'>
                    {result.metadata.theme}
                  </Badge>
                </div>
              )}

              {result.metadata.fonts && result.metadata.fonts.length > 0 && (
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Fonts</p>
                  <div className='space-y-1'>
                    {result.metadata.fonts.slice(0, 2).map(font => (
                      <Badge key={font} variant='outline' className='text-xs'>
                        {font}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {result.metadata.colors && (
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Color Palette</p>
                  <div className='flex flex-wrap gap-1'>
                    {Object.entries(result.metadata.colors)
                      .slice(0, 6)
                      .map(([name, color]) => (
                        <div
                          key={name}
                          className='h-4 w-4 rounded border'
                          style={{ backgroundColor: color }}
                          title={`${name}: ${color}`}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue='style-guide' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className='flex items-center gap-2'
            >
              {tab.icon}
              <span className='hidden sm:inline'>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map(tab => (
          <TabsContent key={tab.id} value={tab.id} className='mt-6'>
            <CodeDisplay
              title={tab.label}
              code={tab.content}
              language={tab.language}
              filename={tab.filename}
              description={tab.description}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
