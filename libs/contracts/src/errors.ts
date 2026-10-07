export interface RpcErrorPayload {
  status: number;      // HTTP-like code: 400, 401, 404, 409, ...
  message: string;
  error?: string;
}