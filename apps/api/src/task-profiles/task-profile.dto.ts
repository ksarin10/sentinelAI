import { OptimizationGoal, TaskProfile, TaskRiskLevel } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class UpsertTaskProfileDto {
  @IsString()
  @MinLength(1)
  taskName!: string;

  @IsEnum(TaskRiskLevel)
  riskLevel!: TaskRiskLevel;

  @IsNumber()
  @Min(0)
  @Max(1)
  qualityThreshold!: number;

  @IsEnum(OptimizationGoal)
  optimizationGoal!: OptimizationGoal;

  @IsOptional()
  @IsString()
  notes?: string;
}

export type TaskProfileResponse = {
  id: string;
  projectId: string;
  taskName: string;
  riskLevel: TaskRiskLevel;
  qualityThreshold: number;
  optimizationGoal: OptimizationGoal;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toTaskProfileResponse(profile: TaskProfile): TaskProfileResponse {
  return {
    id: profile.id,
    projectId: profile.projectId,
    taskName: profile.taskName,
    riskLevel: profile.riskLevel,
    qualityThreshold: profile.qualityThreshold,
    optimizationGoal: profile.optimizationGoal,
    notes: profile.notes,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString()
  };
}
