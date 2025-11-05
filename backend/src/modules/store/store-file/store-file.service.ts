import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

export const UPLOADS_STORES_DIR = './uploads/stores';
export const ALLOWED_IMAGE_MIME_PREFIX = 'image/';

@Injectable()
export class StoreFileService {
  private readonly logger = new Logger(StoreFileService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('APP_BASE_URL') || 'http://localhost:3000';
  }

  private buildFullUrl(relativePath: string): string {
    const cleanPath = relativePath.replace(/^\/+/, '');
    const cleanBaseUrl = this.baseUrl.replace(/\/+$/, '');
    return `${cleanBaseUrl}/${cleanPath}`;
  }

  async saveFile(
    file: Express.Multer.File,
    storeId: string,
    type: 'logo' | 'banner'
  ): Promise<string> {
    if (
      !file.mimetype ||
      !file.mimetype.startsWith(ALLOWED_IMAGE_MIME_PREFIX)
    ) {
      throw new BadRequestException('Invalid file type, only image/* allowed');
    }

    const finalDir = join(UPLOADS_STORES_DIR, storeId, type);
    await fs.mkdir(finalDir, { recursive: true });

    const ext = extname(file.originalname) || '';
    const filename = `${Date.now()}-${uuidv4()}${ext}`;
    const destPath = join(finalDir, filename);

    if ((file as any).buffer) {
      await fs.writeFile(destPath, (file as any).buffer);
    } else if (file.path) {
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

    const relativePath = `/uploads/stores/${storeId}/${type}/${filename}`;
    return this.buildFullUrl(relativePath);
  }
}
