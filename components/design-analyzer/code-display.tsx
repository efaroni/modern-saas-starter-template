'use client';

import { useState } from 'react';

import { Copy, Check, Download } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CodeDisplayProps {
  title: string;
  code: string;
  language: string;
  filename?: string;
  description?: string;
}

export function CodeDisplay({
  title,
  code,
  language,
  filename,
  description,
}: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      filename || `${title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getLanguageForHighlighter = (lang: string): string => {
    switch (lang) {
      case 'js':
      case 'javascript':
        return 'javascript';
      case 'ts':
      case 'typescript':
        return 'typescript';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
      case 'markdown':
        return 'markdown';
      default:
        return 'text';
    }
  };

  return (
    <Card className='w-full'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-lg'>{title}</CardTitle>
            {filename && (
              <p className='mt-1 text-sm text-gray-500'>{filename}</p>
            )}
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleCopy}
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className='mr-1 h-4 w-4' />
                  Copied
                </>
              ) : (
                <>
                  <Copy className='mr-1 h-4 w-4' />
                  Copy
                </>
              )}
            </Button>
            <Button variant='outline' size='sm' onClick={handleDownload}>
              <Download className='mr-1 h-4 w-4' />
              Download
            </Button>
          </div>
        </div>
        {description && (
          <p className='mt-2 text-sm text-gray-600'>{description}</p>
        )}
      </CardHeader>
      <CardContent className='p-0'>
        <div className='relative'>
          <SyntaxHighlighter
            language={getLanguageForHighlighter(language)}
            style={oneDark}
            customStyle={{
              margin: 0,
              borderRadius: '0 0 8px 8px',
              fontSize: '14px',
              lineHeight: '1.5',
            }}
            showLineNumbers
            wrapLines
            wrapLongLines
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </CardContent>
    </Card>
  );
}
