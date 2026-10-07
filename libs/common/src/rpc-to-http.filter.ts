
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Request, Response } from 'express';

// ======================= The Gateway Error Normalization Pattern =======================
@Catch(HttpException)
export class RpcToHttpFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();


    // Default to 500 Internal Server Error
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorType = 'Internal Error'

    // 1. Unwrap RabbitMQ RPC Exceptions
    if (exception instanceof RpcException) {
        const rpcError = exception.getError() as any;
        status = rpcError.status;
        message = rpcError.message;
        errorType = rpcError.error || 'RPC Error';
    }
    // 2. Handle standard HTTP Exceptions (thrown directly by the Gateway itself)
    else if (exception.status || exception.response) {
      status = exception.status || exception.response?.statusCode || status;
      message = exception.response?.message || exception.message || message;
      errorType = exception.response?.error || 'HTTP Error';
    }

    // Send a standard, formatted REST API response
    response.status(status).json({
      statusCode: status,
      message: message,
      error: errorType,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
