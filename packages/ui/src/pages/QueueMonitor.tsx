import { useEffect, useState } from 'react';
import { apiGet } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function QueueMonitor() {
  const [status, setStatus] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/daemon/status')
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">队列监控</h2>
      <Card>
        <CardHeader>
          <CardTitle>服务状态</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-muted p-4 overflow-auto text-sm">
            {JSON.stringify(status, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
