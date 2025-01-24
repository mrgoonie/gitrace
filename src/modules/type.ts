import { z } from "zod";

export const imagesType = {
  where: {
    approved: true,
  },
  select: {
    blurBase64: true,
    height: true,
    width: true,
    url: true,
    mimetype: true,
  },
};

export const profileType = {
  select: {
    id: true,
    email: true,
    name: true,
    image: true,
    validEmail: true,
    UserRoles: { select: { id: true, role: { select: { name: true } }, endDate: true } },
    Workspace: true,
    UserBalance: {
      select: { id: true, cashType: true, balance: true },
    },
  },
};

export const userRolesType = { include: { role: { select: { name: true } } } };

export const productTagType = {
  select: {
    tag: {
      select: {
        name: true,
      },
    },
  },
};

export const ErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "CONFLICT",
  "UNPROCESSABLE_ENTITY",
  "INTERNAL_SERVER_ERROR",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
  "UPSTREAM_ERROR",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export class ApiError extends Error {
  code: ErrorCode;
  cause?: any;
  constructor({ code, message, cause }: { code: ErrorCode; message: string; cause?: any }) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
}
