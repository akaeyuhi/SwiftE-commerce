import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  NEWS_MAIN_PHOTO_FIELD,
  NEWS_PHOTOS_FIELD,
  NEWS_PHOTOS_MAX_COUNT,
} from 'src/modules/infrastructure/interceptors/news-files/constants';
import { NewsFilesInterceptor } from 'src/modules/infrastructure/interceptors/news-files/news-files.interceptor';

export function UploadNewsMainPhoto() {
  return UseInterceptors(FileInterceptor(NEWS_MAIN_PHOTO_FIELD));
}

export function UploadNewsPhotos(maxCount: number = NEWS_PHOTOS_MAX_COUNT) {
  return UseInterceptors(FilesInterceptor(NEWS_PHOTOS_FIELD, maxCount));
}

export function UploadNewsFiles(maxCount: number = NEWS_PHOTOS_MAX_COUNT) {
  return UseInterceptors(new NewsFilesInterceptor(maxCount));
}
