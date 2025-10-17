import { ProductRankingRepository } from 'src/modules/products/repositories/product-ranking.repository';
import { Injectable } from '@nestjs/common';
import { ProductListDto } from 'src/modules/products/dto/product.dto';

@Injectable()
export class ProductsRankingService {
  constructor(private readonly productsRankRepo: ProductRankingRepository) {}

  // ===============================
  // Ranking & Leaderboard Methods
  // ===============================

  /**
   * Get top products by view count
   * Uses cached viewCount for instant results
   */
  async getTopProductsByViews(
    storeId: string,
    limit: number = 10
  ): Promise<ProductListDto[]> {
    const products = await this.productsRankRepo.findTopProductsByViews(
      storeId,
      limit
    );
    return this.mapRawProductsToListDto(products);
  }

  /**
   * Get top products by total sales
   * Uses cached totalSales for instant results
   */
  async getTopProductsBySales(
    storeId: string,
    limit: number = 10
  ): Promise<ProductListDto[]> {
    const products = await this.productsRankRepo.findTopProductsBySales(
      storeId,
      limit
    );

    return this.mapRawProductsToListDto(products);
  }

  /**
   * Get top rated products
   * Uses cached averageRating and reviewCount
   * Requires minimum review threshold for credibility
   */
  async getTopRatedProducts(
    storeId: string,
    limit: number = 10,
    minReviews: number = 5
  ): Promise<ProductListDto[]> {
    const products = await this.productsRankRepo.findTopRatedProducts(
      storeId,
      limit,
      minReviews
    );

    return this.mapRawProductsToListDto(products);
  }

  /**
   * Get top products by conversion rate
   * Calculated as: (totalSales / viewCount) * 100
   * Requires minimum view threshold to filter noise
   */
  async getTopProductsByConversionRate(
    storeId: string,
    limit: number = 10,
    minViews: number = 50
  ): Promise<ProductListDto[]> {
    const products = await this.productsRankRepo.findTopProductsByConversion(
      storeId,
      limit,
      minViews
    );

    return this.mapRawProductsToListDto(products);
  }

  /**
   * Get trending products based on recent activity
   * Algorithm: Combines recent views, likes, and sales with time decay
   *
   * Trending score = (views * 1) + (likes * 2) + (sales * 5) + recencyBoost
   */
  async getTrendingProducts(
    storeId: string,
    limit: number = 10,
    days: number = 7
  ): Promise<ProductListDto[]> {
    // Calculate date threshold
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    const dateThreshold = thresholdDate.toISOString();

    // Get products with their recent activity
    const products = await this.productsRankRepo.findTrendingProducts(
      storeId,
      dateThreshold
    );

    // Calculate trending score for each product
    const scoredProducts = products.map((p) => {
      const recentViews = parseInt(p.recentViews) || 0;
      const recentLikes = parseInt(p.recentLikes) || 0;
      const recentSales = parseInt(p.recentSales) || 0;

      // Calculate recency boost (newer products get slight advantage)
      const productAge = Date.now() - new Date(p.p_createdAt).getTime();
      const daysOld = productAge / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 100 - daysOld * 2); // Decreases over time

      // Weighted trending score
      const trendingScore =
        recentViews + recentLikes * 2 + recentSales * 5 + recencyBoost;

      return {
        ...p,
        trendingScore,
        recentViews,
        recentLikes,
        recentSales,
      };
    });

    // Sort by trending score and take top results
    const topTrending = scoredProducts
      .filter((p) => p.trendingScore > 0)
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return this.mapRawProductsToListDto(topTrending);
  }

  // ===============================
  // Helper Methods
  // ===============================

  /**
   * Map raw query results to ProductListDto
   */
  private mapRawProductsToListDto(rawProducts: any[]): ProductListDto[] {
    return rawProducts.map((p) => ({
      id: p.p_id,
      name: p.p_name,
      description: p.p_description,
      averageRating: p.p_averageRating ? Number(p.p_averageRating) : undefined,
      reviewCount: p.p_reviewCount || 0,
      likeCount: p.p_likeCount || 0,
      viewCount: p.p_viewCount || 0,
      totalSales: p.p_totalSales || 0,
      mainPhotoUrl: p.mainPhotoUrl || p.photoUrl,
      conversionRate: p.conversionRate || 0,
      minPrice: p.minPrice ? Number(p.minPrice) : undefined,
      maxPrice: p.maxPrice ? Number(p.maxPrice) : undefined,
    }));
  }
}
