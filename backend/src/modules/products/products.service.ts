import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BaseService } from 'src/common/abstracts/base.service';
import { Product } from 'src/entities/product.entity';
import { StoreService } from 'src/modules/store/store.service';
import { ProductRepository } from 'src/modules/products/products.repository';
import { CategoriesRepository } from 'src/modules/categories/categories.repository';
import { VariantsRepository } from 'src/modules/variants/variants.repository';
import { ProductPhotoRepository } from 'src/modules/product-photo/product-photo.repository';
import { Category } from 'src/entities/category.entity';

@Injectable()
export class ProductsService extends BaseService<
  Product,
  CreateProductDto,
  UpdateProductDto
> {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly variantRepo: VariantsRepository,
    private readonly photoRepo: ProductPhotoRepository,
    private readonly storeService: StoreService
  ) {
    super();
  }
  async findAll(): Promise<Product[]> {
    return this.productRepo.find();
  }

  async findProductWithRelations(id: string): Promise<Product | null> {
    return this.productRepo.findWithRelations(id);
  }

  async findAllByStore(id: string): Promise<Product[]> {
    return this.findAllByStore(id);
  }

  async create(dto: CreateProductDto): Promise<Product> {
    // validate store exists
    const store = await this.storeService.getEntityById(dto.storeId);
    if (!store) throw new NotFoundException('Store not found');

    const product = this.productRepo.create({
      name: dto.name,
      description: dto.description,
      store,
      category: dto.categoryId
        ? ({ id: dto.categoryId } as Category)
        : undefined,
    });

    return this.productRepo.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepo.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    if (dto.categoryId) product.category = { id: dto.categoryId } as Category;
    return this.productRepo.save(product);
  }

  async remove(id: string): Promise<void> {
    const res = await this.productRepo.delete(id);
    if (res.affected === 0) throw new NotFoundException('Product not found');
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // Photo handling: service expects that file was uploaded to storage and returns URL
  async addPhoto(
    productId: string,
    url: string,
    altText?: string,
    isMain = false
  ) {
    const product = await this.productRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');
    if (isMain) {
      // optionally unset previous main photo
      await this.photoRepo.update({ product: { id: productId } as any }, {
        isMain: false,
      } as any);
    }
    const photo = this.photoRepo.create({ product, url, altText, isMain });
    return this.photoRepo.save(photo);
  }

  async removePhoto(photoId: string) {
    return this.photoRepo.delete(photoId);
  }

  // Variant convenience
  async createVariant(dto: {
    productId: string;
    sku: string;
    price: number;
    attributes?: any;
    stock?: number;
  }) {
    const product = await this.productRepo.findOneBy({ id: dto.productId });
    if (!product) throw new NotFoundException('Product not found');
    const v = this.variantRepo.create({
      product,
      sku: dto.sku,
      price: dto.price,
      attributes: dto.attributes,
    });
    const saved = await this.variantRepo.save(v);
    if (dto.stock !== undefined) {
      // create inventory record if separate table exists; for our model
      // we use variant.stock or inventory table
      // If you use Inventory entity, create it here.
    }
    return saved;
  }
}
