import { join } from 'path';

export const NEWS_PHOTOS_FIELD = 'photos';
export const NEWS_MAIN_PHOTO_FIELD = 'mainPhoto';

export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const UPLOADS_TMP_DIR = join(UPLOADS_ROOT, 'tmp');

export const UPLOADS_NEWS_DIR = join(UPLOADS_ROOT, 'news');

export const NEWS_PHOTOS_MAX_COUNT = 10;
export const NEWS_PHOTO_MAX_SIZE = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_PREFIX = 'image/';
