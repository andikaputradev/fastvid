import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./AppError.js";

interface ErrorLogDetails {
  code?: string;
  message: string;
  name: string;
}

function errorCode(error: FastifyError | Error): string | undefined {
  const code = (error as { code?: unknown }).code;

  return typeof code === "string" && code.length > 0 ? code : undefined;
}

function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/https?:\/\/\S+/giu, "[redacted-url]")
    .replace(/postgres(?:ql)?:\/\/\S+/giu, "[redacted-database-url]")
    .slice(0, 500);
}

function errorLogDetails(error: FastifyError | Error): ErrorLogDetails {
  const code = errorCode(error);
  const details: ErrorLogDetails = {
    message: sanitizeErrorMessage(error.message),
    name: error.name
  };

  if (code !== undefined) {
    details.code = code;
  }

  return details;
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.publicRequestId ?? request.id;

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message
      },
      requestId
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Input tidak valid."
      },
      requestId
    });
  }

  request.log.error(
    {
      requestId,
      error: errorLogDetails(error)
    },
    "unexpected_request_error"
  );

  return reply.status(500).send({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Terjadi kesalahan pada server."
    },
    requestId
  });
}
