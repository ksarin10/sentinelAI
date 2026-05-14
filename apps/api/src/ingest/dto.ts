import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from "class-validator";

class TokenUsageDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  promptTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  completionTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalTokens?: number;
}

export class IngestTraceDto {
  @IsOptional()
  @IsString()
  externalId?: string;

  @IsString()
  name!: string;

  @IsString()
  provider!: string;

  @IsString()
  model!: string;

  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  response?: string;

  @IsOptional()
  @IsIn(["SUCCESS", "ERROR", "TIMEOUT"])
  status?: "SUCCESS" | "ERROR" | "TIMEOUT";

  @IsInt()
  @Min(0)
  latencyMs!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TokenUsageDto)
  tokens?: TokenUsageDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costUsd?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;
}
