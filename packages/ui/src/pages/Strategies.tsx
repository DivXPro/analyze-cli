import { useEffect, useState } from 'react';
import { apiGet } from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function Strategies() {
  const [strategies, setStrategies] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<unknown[]>('/api/strategies')
      .then(setStrategies)
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
      <h2 className="text-3xl font-bold tracking-tight">策略管理</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>目标</TableHead>
              <TableHead>版本</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {strategies.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.target}</TableCell>
                <TableCell>{s.version}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
