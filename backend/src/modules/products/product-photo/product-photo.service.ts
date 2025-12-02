import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { BaseService } from 'src/common/abstracts/base.service';
import { ProductPhoto } from 'src/entities/store/product/product-photo.entity';
import { ProductPhotoRepository } from 'src/modules/products/product-photo/product-photo.repository';
import {
  ALLOWED_IMAGE_MIME_PREFIX,
  UPLOADS_PRODUCTS_DIR,
} from 'src/modules/infrastructure/interceptors/product-photo/constants';
import { Store } from 'src/entities/store/store.entity';
import { Product } from 'src/entities/store/product/product.entity';

/**
 * ProductPhotoService
 *
 * Service responsible for handling product photo filesystem and DB operations:
 *  - moving uploaded files from a temporary upload directory into a stable
 *    per-store location (`/uploads/products/<storeId>/...`),
 *  - performing a lightweight MIME check (image/*),
 *  - creating `ProductPhoto` DB rows via `ProductPhotoRepository`,
 *  - unsetting previous `isMain` photo(s) when a new main photo is added,
 *  - deleting both DB rows and physical files.
 *
 * Important notes:
 *  - File IO and DB writes are performed sequentially and are not transactional.
 *    If you need atomic behavior (product creation + photos), wrap the higher-level
 *    orchestration in a TypeORM `QueryRunner` transaction and implement file cleanup
 *    on rollback.
 *  - This service extends `BaseService<ProductPhoto>` and therefore also exposes the
 *    base convenience methods (create, save, find, etc.) if you need them.
 */
@Injectable()
export class ProductPhotoService extends BaseService<ProductPhoto> {
  private readonly logger = new Logger(ProductPhotoService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly photoRepo: ProductPhotoRepository,
    private readonly configService: ConfigService
  ) {
    super(photoRepo);

    // ✅ Get base URL from environment (e.g., http://localhost:3000 or https://api.example.com)
    this.baseUrl =
      this.configService.get<string>('APP_BASE_URL') || 'http://localhost:3000';
  }

  /**
   * Build a full URL from a relative path
   *
   * @param relativePath - Relative path like /uploads/products/store-id/filename.jpg
   * @returns Full URL like https://api.example.com/uploads/products/store-id/filename.jpg
   *
   * @example
   * buildFullUrl('/uploads/products/123/photo.jpg')
   * // Returns: 'https://api.example.com/uploads/products/123/photo.jpg'
   */
  private buildFullUrl(relativePath: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = relativePath.replace(/^\/+/, '');

    // Ensure baseUrl doesn't have trailing slash
    const cleanBaseUrl = this.baseUrl.replace(/\/+$/, '');

    return `${cleanBaseUrl}/${cleanPath}`;
  }

  /**
   * Move an uploaded file (from Multer tmp path or memory buffer) into the final
   * storage location for the given store and return the full public URL.
   *
   * This is a low-level helper — prefer `saveFileAndCreatePhoto` which also
   * creates the DB row for the product photo.
   *
   * @param file - Express.Multer.File (may contain `.buffer` or `.path`)
   * @param storeId - store identifier used to compute final folder
   * @returns full public URL, e.g. `https://api.example.com/uploads/products/<storeId>/<filename>`
   * @throws BadRequestException when file is not an image or lacks `buffer`/`path`
   */
  private async saveFileToStore(
    file: Express.Multer.File,
    storeId: string
  ): Promise<string> {
    if (
      !file.mimetype ||
      !file.mimetype.startsWith(ALLOWED_IMAGE_MIME_PREFIX)
    ) {
      throw new BadRequestException('Invalid file type, only image/* allowed');
    }

    const finalDir = join(UPLOADS_PRODUCTS_DIR, storeId);
    await fs.mkdir(finalDir, { recursive: true });

    const ext = extname(file.originalname) || '';
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    const destPath = join(finalDir, filename);

    if ((file as any).buffer) {
      // Multer memory storage
      await fs.writeFile(destPath, (file as any).buffer);
    } else if (file.path) {
      // Multer disk storage (tmp path). Try to rename it, fallback to copy.
      try {
        await fs.rename(file.path, destPath);
      } catch (err) {
        this.logger.warn('rename failed, copying file: ' + err?.message);
        const data = await fs.readFile(file.path);
        await fs.writeFile(destPath, data);
        await fs.unlink(file.path).catch(() => undefined);
      }
    } else {
      throw new BadRequestException('Uploaded file has no buffer or path');
    }

    // ✅ Build full URL instead of just relative path
    const relativePath = `/uploads/products/${storeId}/${filename}`;
    return this.buildFullUrl(relativePath);
  }

  /**
   * Save an uploaded file to disk and create a ProductPhoto DB row referencing the product.
   *
   * Flow:
   *  1. Move a file into final per-store folder (saveFileToStore).
   *  2. If `isMain` is true, unset previous main photos for the product.
   *  3. Create and persist a ProductPhoto row.
   *
   * Note on atomicity:
   *  - This method performs filesystem IO and DB write sequentially. If the DB save
   *    fails after the file was written, the file will remain on disk. Consider
   *    wrapping orchestration in a transaction and cleanup logic if you need strict atomicity.
   *
   * @param file - uploaded file
   * @param store - store id used for final folder
   * @param product - product to attach the photo to
   * @param altText - optional alt text for the photo
   * @param isMain - if true, this photo will be marked as main and previous mains unset
   * @returns the saved ProductPhoto entity
   */
  private async saveFileAndCreatePhoto(
    file: Express.Multer.File,
    store: Store,
    product: Product,
    altText?: string,
    isMain = false
  ): Promise<ProductPhoto> {
    // 1) Save file to disk and get full URL
    const fullUrl = await this.saveFileToStore(file, store.id);

    // 2) If asked to be main, unset previous mains first
    if (isMain) {
      const prevMain = this.getProductMainPhoto(product);
      if (prevMain)
        await this.photoRepo.updateEntity(prevMain.id, { isMain: false });
    }

    // 3) Create DB row for the photo with full URL
    return this.photoRepo.createEntity({
      product,
      url: fullUrl, // ✅ Now stores full URL
      altText,
      isMain,
    });
  }

  /**
   * Delete ProductPhoto DB row and remove the corresponding file from disk.
   *
   * Behaviour:
   *  - Loads the photo by id. If not found, resolves silently (no-op).
   *  - Deletes the DB row.
   *  - Attempts to delete the file on disk (best-effort, errors are logged).
   *
   * @param photoId - id of the ProductPhoto row to delete
   */
  async deletePhotoAndFile(photoId: string): Promise<void> {
    const photo = await this.photoRepo.findById(photoId);
    if (!photo) {
      return;
    }

    await this.photoRepo.deleteById(photoId);

    try {
      // ✅ Extract relative path from full URL
      const url = new URL(photo.url);
      const relativePath = url.pathname.replace(/^\/+/, '');
      const pathOnDisk = join(process.cwd(), relativePath);
      await fs.unlink(pathOnDisk).catch(() => undefined);
    } catch (err) {
      this.logger.warn('Failed to delete product photo file: ' + err?.message);
    }
  }

  /**
   * Add multiple uploaded photos to a product.
   *
   * Behaviour:
   *  - Validates input and returns `null` if `photos` is empty/undefined.
   *  - If `isMain === true`, the first photo in the provided array will be
   *    treated as the main photo (previous mains are unset before saving it).
   *  - Saves files sequentially and creates DB rows via `saveFileAndCreatePhoto`.
   *
   * Returns an array of created ProductPhoto entities.
   *
   * @param product - product to attach photos to
   * @param store - store id (used to build a filesystem path)
   * @param photos - array of uploaded files to attach
   * @param isMain - optional flag; if true the first uploaded file becomes main
   * @returns array of saved ProductPhoto entities or null when no photos provided
   */
  async addPhotos(
    product: Product,
    store: Store,
    photos?: Express.Multer.File[],
    isMain?: boolean
  ): Promise<ProductPhoto[] | null> {
    if (!photos || photos.length === 0) return null;

    const dbPhotos: ProductPhoto[] = [];

    const markFirstAsMain = !isMain;

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const altText = file.originalname;
      const shouldBeMain = markFirstAsMain ? i === 0 : isMain;

      const saved = await this.saveFileAndCreatePhoto(
        file,
        store,
        product,
        altText,
        shouldBeMain
      );
      dbPhotos.push(saved);
    }

    return dbPhotos;
  }

  private getProductMainPhoto(product: Product): ProductPhoto | undefined {
    return product.photos.find((photo) => photo.isMain);
  }
}
