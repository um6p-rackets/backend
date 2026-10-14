import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom, timeout } from "rxjs";

export const rpc = <T>(client: ClientProxy, pattern: string, payload: unknown, ms = 5000) =>
    firstValueFrom(client.send<T>(pattern, payload).pipe(timeout(ms)));

