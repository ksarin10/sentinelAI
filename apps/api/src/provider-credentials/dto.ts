import { IsString, MinLength } from "class-validator";

export class UpsertProviderCredentialDto {
  @IsString()
  @MinLength(2)
  provider!: string;

  @IsString()
  @MinLength(8)
  apiKey!: string;
}
