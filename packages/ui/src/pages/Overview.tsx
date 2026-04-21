import { useEffect, useState } from 'react';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { apiGet } from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatusData {
  queue_stats: { pending: number; processing: number; completed: number; failed: number };
}

function StatCard({ title, value, icon, loading }: { title: string; value: number; icon: React.ReactNode; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<StatusData>('/api/daemon/status')
      .then(setStatus)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        Error: {error}
      </div>
    );
  }

  const stats = status?.queue_stats ?? { pending: 0, processing: 0, completed: 0, failed: 0 };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">概览</h2>
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="待处理" value={stats.pending} icon={<Clock className="h-4 w-4 text-muted-foreground" />} loading={loading} />
        <StatCard title="处理中" value={stats.processing} icon={<Loader2 className="h-4 w-4 text-muted-foreground" />} loading={loading} />
        <StatCard title="已完成" value={stats.completed} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} loading={loading} />
        <StatCard title="失败" value={stats.failed} icon={<XCircle className="h-4 w-4 text-muted-foreground" />} loading={loading} />
      </div>
    </div>
  );
}
