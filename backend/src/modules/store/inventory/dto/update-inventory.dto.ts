import { PartialType } from '@nestjs/mapped-types';
import { CreateInventoryDto } from 'src/modules/store/inventory/dto/create-inventory.dto';

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {}
