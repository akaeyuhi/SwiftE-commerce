import { Injectable } from '@nestjs/common';
import { BaseMapper } from 'src/common/abstracts/base.mapper';
import { Product } from 'src/entities/store/product/product.entity';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/modules/products/dto/update-product.dto';
import {
  ProductDto,
  ProductListDto,
  ProductStatsDto,
  ProductDetailDto,
} from 'src/modules/products/dto/product.dto';

@Injectable()
export class ProductsMapper extends BaseMapper<Product, ProductDto> {
  /**
   * Map entity to full DTO (with all fields and relations)
   */
  toDto(entity: Product): ProductDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,

      // Cached statistics
      averageRating: entity.averageRating
        ? Number(entity.averageRating)
        : undefined,
      reviewCount: entity.reviewCount,
      totalSales: entity.totalSales,
      likeCount: entity.likeCount,
      viewCount: entity.viewCount,

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,

      // Relations (only if loaded)
      store: entity.store,
      categories: entity.categories,
      variants: entity.variants,
      photos: entity.photos,
      reviews: entity.reviews,
    };
  }

  /**
   * Map entity to lightweight list DTO (for product listings)
   */
  toListDto(entity: Product, mainPhotoUrl?: string): ProductListDto {
    const minPrice = entity.variants?.length
      ? Math.min(...entity.variants.map((v) => Number(v.price)))
      : undefined;

    const maxPrice = entity.variants?.length
      ? Math.max(...entity.variants.map((v) => Number(v.price)))
      : undefined;

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      averageRating: entity.averageRating
        ? Number(entity.averageRating)
        : undefined,
      reviewCount: entity.reviewCount || 0,
      likeCount: entity.likeCount || 0,
      viewCount: entity.viewCount || 0,
      totalSales: entity.totalSales || 0,
      mainPhotoUrl: mainPhotoUrl || entity.photos?.find((p) => p.isMain)?.url,
      minPrice,
      maxPrice,
    };
  }

  /**
   * Map entity to detailed DTO (for product detail pages)
   */
  toDetailDto(entity: Product): ProductDetailDto {
    const mainPhoto = entity.photos?.find((p) => p.isMain);
    const additionalPhotos = entity.photos?.filter((p) => !p.isMain) || [];

    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,

      // Stats
      averageRating: entity.averageRating
        ? Number(entity.averageRating)
        : undefined,
      reviewCount: entity.reviewCount || 0,
      likeCount: entity.likeCount || 0,
      viewCount: entity.viewCount || 0,
      totalSales: entity.totalSales || 0,

      // Store info
      storeId: entity.store?.id,
      storeName: entity.store?.name,

      // Categories
      categories:
        entity.categories?.map((c) => ({
          id: c.id,
          name: c.name,
        })) || [],

      // Photos
      mainPhoto: mainPhoto
        ? {
            id: mainPhoto.id,
            url: mainPhoto.url,
            altText: mainPhoto.altText,
          }
        : undefined,
      photos: additionalPhotos.map((p) => ({
        id: p.id,
        url: p.url,
        altText: p.altText,
      })),

      // Variants
      variants:
        entity.variants?.map((v) => ({
          id: v.id,
          sku: v.sku,
          price: Number(v.price),
          attributes: v.attributes,
          inStock: v.inventory?.quantity > 0,
          stockQuantity: v.inventory?.quantity,
        })) || [],

      // Reviews (summary)
      recentReviews:
        entity.reviews?.slice(0, 5).map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          userName: r.user
            ? `${r.user?.firstName} ${r.user?.lastName}`.trim()
            : 'Anonymous',
          createdAt: r.createdAt,
        })) || [],

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Map entity to stats DTO (for analytics)
   */
  toStatsDto(entity: Product): ProductStatsDto {
    const conversionRate =
      entity.viewCount && entity.viewCount > 0
        ? (entity.totalSales / entity.viewCount) * 100
        : 0;

    return {
      id: entity.id,
      name: entity.name,
      averageRating: entity.averageRating ? Number(entity.averageRating) : 0,
      reviewCount: entity.reviewCount || 0,
      likeCount: entity.likeCount || 0,
      viewCount: entity.viewCount || 0,
      totalSales: entity.totalSales || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Map CreateProductDto to entity
   */
  toEntity(dto: Partial<CreateProductDto>): Product {
    const product = new Product();

    if (dto.id) {
      product.id = dto.id;
    }

    product.name = dto.name!;
    product.description = dto.description;

    // Initialize cached counters to 0 for new products
    product.reviewCount = 0;
    product.totalSales = 0;
    product.likeCount = 0;
    product.viewCount = 0;

    return product;
  }

  /**
   * Map UpdateProductDto to partial entity
   */
  fromUpdateDto(dto: UpdateProductDto): Partial<Product> {
    const updates: Partial<Product> = {};

    if (dto.name !== undefined) {
      updates.name = dto.name;
    }

    if (dto.description !== undefined) {
      updates.description = dto.description;
    }

    // Note: We don't update cached fields directly
    // They're maintained by database triggers

    return updates;
  }

  /**
   * Map Product entity back to CreateProductDto format
   * (useful for edit forms)
   */
  toCreateDto(entity: Product): CreateProductDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      storeId: entity.store?.id || entity.storeId,
      categoryIds: entity.categories?.map((c) => c.id) || [],
      categoryId: entity.categories?.[0]?.id,
    };
  }

  /**
   * Batch map entities to list DTOs
   */
  toListDtos(entities: Product[]): ProductListDto[] {
    return entities.map((entity) => this.toListDto(entity));
  }

  /**
   * Batch map entities to stats DTOs
   */
  toStatsDtos(entities: Product[]): ProductStatsDto[] {
    return entities.map((entity) => this.toStatsDto(entity));
  }
}
