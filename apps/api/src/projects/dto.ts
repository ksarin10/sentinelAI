import { IsOptional, IsString, Matches, MinLength } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateApiKeyDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
