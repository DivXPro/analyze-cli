import { useEffect, useState } from 'react';
import { apiGet } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PostLibrary() {
  const [posts, setPosts] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<unknown[]>('/api/posts')
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">帖子库</h2>
      <Card>
        <CardHeader>
          <CardTitle>共 {posts.length} 条帖子</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-muted p-4 overflow-auto text-sm">
            {JSON.stringify(posts.slice(0, 5), null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
