import { Injectable, NotFoundException } from "@nestjs/common";
import { ProjectsRepository } from "../projects/projects.repository";
import { PrismaService } from "../prisma/prisma.service";
import { toTaskProfileResponse, UpsertTaskProfileDto } from "./task-profile.dto";

@Injectable()
export class TaskProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsRepository
  ) {}

  private async assertProjectAccess(ownerId: string, projectId: string) {
    const project = await this.projects.findOwned(projectId, ownerId);
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }

  async list(ownerId: string, projectId: string) {
    await this.assertProjectAccess(ownerId, projectId);
    const profiles = await this.prisma.taskProfile.findMany({
      where: { projectId },
      orderBy: { taskName: "asc" }
    });
    return profiles.map(toTaskProfileResponse);
  }

  async upsert(ownerId: string, projectId: string, dto: UpsertTaskProfileDto) {
    await this.assertProjectAccess(ownerId, projectId);
    const profile = await this.prisma.taskProfile.upsert({
      where: { projectId_taskName: { projectId, taskName: dto.taskName } },
      update: {
        riskLevel: dto.riskLevel,
        qualityThreshold: dto.qualityThreshold,
        optimizationGoal: dto.optimizationGoal,
        notes: dto.notes ?? null
      },
      create: {
        projectId,
        taskName: dto.taskName,
        riskLevel: dto.riskLevel,
        qualityThreshold: dto.qualityThreshold,
        optimizationGoal: dto.optimizationGoal,
        notes: dto.notes ?? null
      }
    });
    return toTaskProfileResponse(profile);
  }

  async remove(ownerId: string, projectId: string, taskName: string) {
    await this.assertProjectAccess(ownerId, projectId);
    const profile = await this.prisma.taskProfile.findUnique({
      where: { projectId_taskName: { projectId, taskName } }
    });
    if (!profile) {
      throw new NotFoundException("Task profile not found");
    }
    await this.prisma.taskProfile.delete({ where: { id: profile.id } });
    return { removed: true, taskName };
  }
}
