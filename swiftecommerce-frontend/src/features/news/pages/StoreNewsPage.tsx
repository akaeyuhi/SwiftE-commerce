import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { mockNews } from '@/shared/mocks/news.mock';
import { Newspaper, Calendar, Eye, Heart, User } from 'lucide-react';

export function StoreNewsPage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [searchQuery, setSearchQuery] = useState('');

  const storeNews = mockNews.filter((news) => news.storeId === storeId);

  const filteredNews = storeNews.filter(
    (news) =>
      news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      news.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Store News</h1>
        <p className="text-muted-foreground">
          Stay updated with the latest announcements and updates
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <SearchBar
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* News List */}
      {filteredNews.length === 0 ? (
        <Card>
          <EmptyState
            icon={Newspaper}
            title="No news found"
            description={
              searchQuery
                ? 'Try adjusting your search'
                : 'No news posts available yet'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredNews.map((news) => (
            <Card key={news.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  {news.imageUrl && (
                    <div className="h-32 w-48 bg-muted rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground mb-2">
                      {news.title}
                    </h2>

                    {/* Meta Info */}
                    <div
                      className="flex flex-wrap items-center
                    gap-4 text-sm text-muted-foreground mb-3"
                    >
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {news.author.name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(news.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {news.views} views
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        {news.likes} likes
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {news.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <p className="text-muted-foreground mb-4">{news.content}</p>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Read More
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4 mr-2" />
                    Like
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
