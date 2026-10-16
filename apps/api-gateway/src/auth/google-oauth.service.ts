import { Inject } from "@nestjs/common";
import googleOauthConfig from "../common/config/google-oauth.config.js";
import { type ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { OAuth2Client } from "google-auth-library";


export class GoogleOAuthService {
    private readonly client: OAuth2Client;

    constructor(
        @Inject(googleOauthConfig.KEY)
        private cfg: ConfigType<typeof googleOauthConfig>,
        private readonly jwt: JwtService,
    )  {
        this.client = new OAuth2Client(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
    }

    
}