import { PartialType } from '@nestjs/mapped-types';
import { CreateCartDto } from 'src/modules/store/cart/dto/create-cart.dto';

export class UpdateCartDto extends PartialType(CreateCartDto) {}
