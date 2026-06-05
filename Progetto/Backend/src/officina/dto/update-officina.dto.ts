import { PartialType } from '@nestjs/mapped-types';
import { CreateOfficinaDto } from './create-officina.dto';

export class UpdateOfficinaDto extends PartialType(CreateOfficinaDto) {}
