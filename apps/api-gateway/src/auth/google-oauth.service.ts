import { Inject } from "@nestjs/common";
import googleOauthConfig from "../common/config/google-oauth.config.js";
import { type ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import { randomBytes } from "crypto";


export class GoogleOAuthService {
    private readonly oauth2client: OAuth2Client;

    constructor(
        @Inject(googleOauthConfig.KEY)
        private cfg: ConfigType<typeof googleOauthConfig>,
        private readonly jwt: JwtService,
    )  {
        this.oauth2client = new OAuth2Client(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
    }

    async getAuthorizationUrl() {
        const { codeVerifier, codeChallenge } = await this.oauth2client.generateCodeVerifierAsync();

        const state = randomBytes(24).toString('base64url');
        const nonce = randomBytes(24).toString('base64url');

        const url = this.oauth2client.generateAuthUrl({
            scope: ['openid', 'email', 'profile'],
            state,
            nonce,
            codeChallenge,
            codeChallengeMethod: CodeChallengeMethod.S256,
            prompt: 'select_account',
        })

        const token = this.jwt.sign
    }

    async verifyCallback() {

    }

    
}