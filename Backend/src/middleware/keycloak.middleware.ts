/**
Copyright 2025 JasmineGraph Team
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { Request, Response, NextFunction, RequestHandler } from 'express';

const keycloakIssuer = 'http://keycloak:8080/realms/jasminegraph';

const rawMiddleware = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `${keycloakIssuer}/protocol/openid-connect/certs`,
  }),
  audience: 'jasminegraph-api', 
  issuer: keycloakIssuer,
  algorithms: ['RS256'],
});

export const keycloakAuthMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  console.log('[Keycloak Middleware] Called for path:', req.path);
  rawMiddleware(req, res, (err?: any) => {
    if (err) {
      console.error('[Keycloak Middleware] JWT error:', err);
      return next(err);
    }
    next();
  });
};
