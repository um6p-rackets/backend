import { Module } from "@nestjs/common";
import { MatchesService } from "./matches.service.js";
import { MatchesController } from "./matches.controller.js";


@Module({
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}