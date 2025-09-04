import { Controller, UseGuards } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { ProductVariant } from 'src/entities/variant.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';

@Controller('variants')
@UseGuards(JwtAuthGuard, StoreRolesGuard)
export class VariantsController extends BaseController<
  ProductVariant,
  CreateVariantDto,
  UpdateVariantDto
> {
  constructor(private readonly variantsService: VariantsService) {
    super(variantsService);
  }
}
