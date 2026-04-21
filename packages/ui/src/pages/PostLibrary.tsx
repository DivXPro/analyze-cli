import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Eye } from 'lucide-react';
import { apiGet } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface Post {
  id: string;
  title: string | null;
  content: string;
  author_name: string | null;
  platform_id: string;
  post_type: string | null;
  like_count: number;
  collect_count: number;
  comment_count: number;
  share_count: number;
  play_count: number;
  url: string | null;
  cover_url: string | null;
  published_at: string | null;
  fetched_at: string;
}

function PlatformBadge({ platformId }: { platformId: string }) {
  const name = platformId.includes('xhs') ? '小红书'
    : platformId.includes('twitter') ? 'Twitter'
    : platformId.includes('bilibili') ? 'B站'
    : platformId.includes('weibo') ? '微博'
    : platformId;

  const color = platformId.includes('xhs') ? 'bg-red-50 text-red-700 border-red-200'
    : platformId.includes('twitter') ? 'bg-blue-50 text-blue-700 border-blue-200'
    : platformId.includes('bilibili') ? 'bg-pink-50 text-pink-700 border-pink-200'
    : 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <Badge variant="outline" className={color}>
      {name}
    </Badge>
  );
}

function PostCard({ post }: { post: Post }) {
  const contentPreview = post.content?.slice(0, 120) + (post.content?.length > 120 ? '...' : '') || '无内容';

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4 space-y-3">
        {/* 标题行 */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">
            {post.title || contentPreview}
          </h3>
          <PlatformBadge platformId={post.platform_id} />
        </div>

        {/* 作者 */}
        <p className="text-xs text-muted-foreground">
          {post.author_name ? `@${post.author_name}` : '匿名用户'}
        </p>

        {/* 内容摘要 - 仅当标题存在时显示 */}
        {post.title && post.content && post.content !== post.title && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {contentPreview}
          </p>
        )}

        {/* 内容摘要 */}
        {post.title && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {contentPreview}
          </p>
        )}

        {/* 统计数据 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {post.like_count?.toLocaleString() ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="h-3 w-3" />
            {post.collect_count?.toLocaleString() ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {post.comment_count?.toLocaleString() ?? 0}
          </span>
          {post.play_count > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.play_count?.toLocaleString() ?? 0}
            </span>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {post.published_at
              ? new Date(post.published_at).toLocaleDateString('zh-CN')
              : new Date(post.fetched_at).toLocaleDateString('zh-CN')}
          </span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <a href={post.url ?? '#'} target="_blank" rel="noopener noreferrer">
              <Share2 className="h-3 w-3 mr-1" />
              查看
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PostSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-5 w-12 shrink-0" />
        </div>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-full" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PostLibrary() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Post[]>('/api/posts')
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">帖子库</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? '加载中...' : `共 ${posts.length} 条帖子`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          暂无帖子数据
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
