import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmailPriority } from 'src/common/enums/email.enum';

export class EmailRecipientDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}

// ✅ Create DTO for attachments
export class EmailAttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsString()
  encoding?: string;
}

export class SendEmailDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  to: EmailRecipientDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  cc?: EmailRecipientDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  bcc?: EmailRecipientDto[];

  @IsString()
  subject: string;

  @IsString()
  html: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsEnum(EmailPriority)
  priority?: EmailPriority;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto) // ✅ Add Type decorator
  attachments?: EmailAttachmentDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SendUserConfirmationDto {
  @IsEmail()
  userEmail: string;

  @IsString()
  userName: string;

  @IsString()
  confirmationUrl: string;

  @IsString()
  storeName: string;
}

export class SendWelcomeEmailDto {
  @IsEmail()
  userEmail: string;

  @IsString()
  userName: string;

  @IsString()
  storeUrl: string;

  @IsString()
  storeName: string;
}

export class StockAlertProductDataDto {
  @IsString()
  name: string;

  @IsString()
  price: string;

  @IsNumber()
  stockQuantity: number;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SendStockAlertDto {
  @IsEmail()
  userEmail: string;

  @IsString()
  userName: string;

  @ValidateNested()
  @Type(() => StockAlertProductDataDto)
  productData: StockAlertProductDataDto;
}

export class LowStockWarningProductDataDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsString()
  category: string;

  @IsNumber()
  currentStock: number;

  @IsNumber()
  threshold: number;

  @IsNumber()
  recentSales: number;

  @IsNumber()
  estimatedDays: number;
}

export class SendLowStockWarningDto {
  @IsEmail()
  storeOwnerEmail: string;

  @IsString()
  storeOwnerName: string;

  @IsString()
  storeName: string;

  @ValidateNested()
  @Type(() => LowStockWarningProductDataDto)
  productData: LowStockWarningProductDataDto;

  @IsString()
  @IsUrl()
  manageInventoryUrl: string;
}
