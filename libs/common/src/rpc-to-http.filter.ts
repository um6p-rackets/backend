import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Request, Response } from 'express';

// ======================= The Gateway Error Normalization Pattern =======================
@Catch()
export class RpcToHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcToHttpFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Default to 500 Internal Server Error
    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorType = 'Internal Error';

    // 1. Errors thrown by the Gateway itself (validation, guards, NotFoundException...)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        const body = res as any;
        message = body.message ?? exception.message;
        errorType = body.error ?? 'HTTP Error';
      }
    } else {
      // 2. RpcException thrown in the gateway, or the plain error object
      //    a microservice sends back over RabbitMQ
      const rpcError: any =
        exception instanceof RpcException ? exception.getError() : exception;

      if (
        typeof rpcError === 'object' &&
        rpcError !== null &&
        Number.isInteger(rpcError.status) &&
        rpcError.status >= 400 &&
        rpcError.status < 600
      ) {
        status = rpcError.status;
        message = rpcError.message ?? message;
        errorType = rpcError.error ?? 'RPC Error';
      } else {
        // 3. Anything unexpected stays a 500, and we log the real cause
        this.logger.error(
          exception?.message ?? String(exception),
          exception?.stack,
        );
      }
    }

    // Send a standard, formatted REST API response
    response.status(status).json({
      statusCode: status,
      message,
      error: errorType,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}