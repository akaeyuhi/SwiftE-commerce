import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmailPriority } from '../enums/email.enum';

export class EmailRecipientDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
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

export class SendStockAlertDto {
  @IsEmail()
  userEmail: string;

  @IsString()
  userName: string;

  @IsObject()
  productData: {
    name: string;
    price: string;
    stockQuantity: number;
    url: string;
    image?: string;
    description?: string;
  };
}

export class SendLowStockWarningDto {
  @IsEmail()
  storeOwnerEmail: string;

  @IsString()
  storeOwnerName: string;

  @IsObject()
  productData: {
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    threshold: number;
    recentSales: number;
    estimatedDays: number;
  };

  @IsString()
  manageInventoryUrl: string;
}
