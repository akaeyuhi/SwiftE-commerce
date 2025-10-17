import { join } from 'path';

/**
 * Constants used by product-photo module for file storage & limits.
 * Centralizing helps keep controller, interceptor and service aligned.
 */
export const PRODUCT_PHOTOS_FIELD = 'photos';
export const PRODUCT_MAIN_PHOTO_FIELD = 'mainPhoto';
/**
 * Temporary (multer) upload directory. Multer will write incoming files here first.
 * ProductPhotoService will move each file into the final folder:
 *   <UPLOADS_ROOT>/products/<storeId>/
 */
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const UPLOADS_TMP_DIR = join(UPLOADS_ROOT, 'tmp');

/**
 * Final per-store product folder root (ProductPhotoService will create product-specific subfolders).
 * Files will be moved into `${UPLOADS_ROOT}/products/<storeId>/...`
 */
export const UPLOADS_PRODUCTS_DIR = join(UPLOADS_ROOT, 'products');

/**
 * Upload policy defaults
 */
export const PRODUCT_PHOTOS_MAX_COUNT = 10; // max number of files per request
export const PRODUCT_PHOTO_MAX_SIZE = 5 * 1024 * 1024; // 5 MB per file
export const ALLOWED_IMAGE_MIME_PREFIX = 'image/'; // basic mime check (optional)
