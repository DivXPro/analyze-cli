import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiGet } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet(`/api/tasks/${id}`)
      .then(setTask)
      .finally(() => setLoading(false));
  }, [id]);

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
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">任务详情</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>原始数据</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-muted p-4 overflow-auto text-sm">
            {JSON.stringify(task, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
