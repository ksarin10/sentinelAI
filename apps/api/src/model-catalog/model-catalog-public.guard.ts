import { CanActivate, ExecutionContext, Injectable, NotFoundException } from "@nestjs/common";

function isPublicCatalogEnabled() {
  if (process.env.ENABLE_PUBLIC_MODEL_CATALOG === "true") {
    return true;
  }
  if (process.env.ENABLE_PUBLIC_MODEL_CATALOG === "false") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}

@Injectable()
export class ModelCatalogPublicGuard implements CanActivate {
  canActivate(_context: ExecutionContext) {
    if (!isPublicCatalogEnabled()) {
      throw new NotFoundException();
    }
    return true;
  }
}
