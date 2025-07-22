import { config } from '@/lib/config';

export default function DebugPage() {
  return (
    <div className="p-8">
      <h1>Debug Page</h1>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  );
}