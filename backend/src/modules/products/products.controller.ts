import { Controller, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BaseController } from 'src/common/abstracts/base.controller';
import { Product } from 'src/entities/product.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StoreRolesGuard } from 'src/common/guards/store-roles.guard';

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
}
