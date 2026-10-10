import { Catch, RpcExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class AllRpcExceptionsFilter implements RpcExceptionFilter {
  private readonly logger = new Logger(AllRpcExceptionsFilter.name);

  catch(exception: any): Observable<any> {
    const payload = this.createPayload(exception);
    return throwError(() => payload);
  }

  private createPayload(exception: any) {
    // 1. Native NestJS Validation / HTTP Errors
    if (exception instanceof HttpException) {
      const res = exception.getResponse() as any;
      return {
        statusCode: exception.getStatus(),
        message: res.message || exception.message,
        error: res.error || exception.name,
      };
    }

    // 2. Custom rpcError() Helper
    if (exception instanceof RpcException) {
      const res = exception.getError() as any;
      return {
        statusCode: res.status || res.statusCode || HttpStatus.BAD_REQUEST,
        message: res.message || 'RPC Error',
        error: res.error || 'RpcException',
      };
    }

    // 3. Fatal Crashes
    this.logger.error(`Unhandled Exception: ${exception?.message}`, exception?.stack);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Error',
    };
  }
}