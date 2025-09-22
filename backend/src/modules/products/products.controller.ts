import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from 'src/modules/products/products.service';
import { CreateProductDto } from 'src/modules/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/modules/products/dto/update-product.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Product } from 'src/entities/store/product/product.entity';
import { JwtAuthGuard } from 'src/modules/auth/policy/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/modules/auth/policy/guards/store-roles.guard';
import { ProductPhotosInterceptor } from 'src/modules/products/product-photo/interceptors/product-photo.interceptor';

/**
 * ProductsController
 *
 * Extends BaseController for products but overrides creation to support
 * multipart uploads (photos[]) and exposes endpoints to add/remove photos
 * for an existing product.
 *
 * Routes (examples):
 * - POST /stores/:storeId/products -> create product (supports photos[])
 * - POST /stores/:storeId/products/:productId/photos -> add photos to existing product
 * - DELETE /stores/:storeId/products/:productId/photos/:photoId -> delete photo
 *
 * Authorization:
 * - JwtAuthGuard and StoreRolesGuard are applied at controller level.
 */
@Controller('stores/:storeId/products')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class ProductsController extends BaseController<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(private readonly productsService: ProductsService) {
    super(productsService);
  }

  /**
   * Override: Create product (optionally with photos[])
   *
   * Accepts multipart/form-data:
   *  - fields: name, description, categoryId
   *  - files: photos[] (optional)
   *
   * The interceptor saves files to a temporary folder; ProductsService.create
   * receives the photo array and uses ProductPhotoService internally to move
   * files to the final folder and persist DB rows.
   *
   * @param storeId - uuid of the store
   * @param body - CreateProductDto payload
   * @param photos - optionally uploaded files
   * @param mainPhoto - optionally uploaded main photo
   */
  @UseInterceptors(ProductPhotosInterceptor())
  @Post()
  async createProduct(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Body() body: CreateProductDto,
    @UploadedFiles() photos?: Express.Multer.File[],
    @UploadedFile() mainPhoto?: Express.Multer.File
  ) {
    if (!body || !body.name) {
      throw new BadRequestException('name is required');
    }

    return await this.productsService.create(
      { ...body, storeId } as CreateProductDto,
      photos,
      mainPhoto
    );
  }

  /**
   * Add photos to an existing product.
   *
   * @param storeId - uuid of the store (used for a storage path)
   * @param productId - uuid of the product to attach photos to
   * @param photos - uploaded files from the request
   */
  @UseInterceptors(ProductPhotosInterceptor())
  @Post(':productId/photos')
  async addPhotosToProduct(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @UploadedFiles() photos?: Express.Multer.File[]
  ) {
    if (!photos || photos.length === 0) {
      throw new BadRequestException('No photos uploaded');
    }

    return this.productsService.addPhotos(productId, storeId, photos);
  }

  /**
   * Add the main photo to an existing product.
   *
   * @param storeId - uuid of the store (used for a storage path)
   * @param productId - uuid of the product to attach photos to
   * @param photo - Main photo to upload
   */
  @UseInterceptors(ProductPhotosInterceptor())
  @Post(':productId/photos/main')
  async addMainPhotoToProduct(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @UploadedFile() photo: Express.Multer.File
  ) {
    if (!photo) {
      throw new BadRequestException('No photos uploaded');
    }

    return this.productsService.addMainPhoto(productId, storeId, photo);
  }

  /**
   * Delete an existing photo by id (DB row + file on disk).
   *
   * Delegates to ProductsService.removePhoto(photoId) that call
   * ProductPhotoService.deletePhotoAndFile.
   *
   * @param photoId - id of the photo to delete
   */
  @Delete(':productId/photos/:photoId')
  async deletePhoto(@Param('photoId', new ParseUUIDPipe()) photoId: string) {
    await this.productsService.removePhoto(photoId);
    return { success: true };
  }

  /**
   * Get products assigned to this category. If `storeId` is provided it will
   * filter products to that store.
   *
   * Route: GET /stores/:storeId/products/:productId/categories/:id/products
   *
   * @param storeId - UUID of the store to filter products by (optional in some models but required by route).
   * @param _productId - UUID of the product in the route (kept for route consistency/authorization).
   * @param id - UUID of the category to list products for.
   * @returns Promise resolving to an array of Product entities associated with the category (optionally store-filtered).
   */
  @Get(':productId/category/:id')
  async findProductsByCategory(
    @Param('storeId', new ParseUUIDPipe()) storeId: string,
    @Param('productId', new ParseUUIDPipe()) _productId: string,
    @Param('id', new ParseUUIDPipe()) id: string
  ): Promise<Product[]> {
    return this.productsService.findProductsByCategory(id, storeId);
  }

  /**
   * Assign a category to the product identified by :productId.
   *
   * Route: POST /stores/:storeId/products/:productId/categories/assign/:categoryId
   *
   * This endpoint allows store admins to attach an existing category to a product.
   *
   * @param _storeId - UUID of the store (used for authorization context).
   * @param productId - UUID of the product which will receive the category.
   * @param categoryId - UUID of the existing category to assign to the product.
   * @returns Promise resolving to the updated Product entity with the category assigned.
   */
  @Post(':productId/assignCategory/:categoryId')
  async assignCategoryToProduct(
    @Param('storeId', new ParseUUIDPipe()) _storeId: string,
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string
  ): Promise<Product> {
    return this.productsService.attachCategoryToProduct(categoryId, productId);
  }
}
