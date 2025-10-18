/**
 * NewsPublishedEvent
 *
 * Emitted when a news post is published.
 * Triggers notifications to all store followers/subscribers.
 */
export class NewsPublishedEvent {
  constructor(
    public readonly newsId: string,
    public readonly storeId: string,
    public readonly storeName: string,
    public readonly title: string,
    public readonly content: string,
    public readonly excerpt: string, // First 200 chars or custom excerpt
    public readonly authorName: string,
    public readonly publishedAt: Date,
    public readonly newsUrl: string,
    public readonly coverImageUrl?: string,
    public readonly category?: string
  ) {}
}
