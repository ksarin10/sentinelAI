import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Project } from "@prisma/client";

export const CurrentProject = createParamDecorator((_data: unknown, ctx: ExecutionContext): Project => {
  const request = ctx.switchToHttp().getRequest<{ project: Project }>();
  return request.project;
});
