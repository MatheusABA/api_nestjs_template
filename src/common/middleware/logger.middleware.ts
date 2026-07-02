import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';
    const ip = req.ip;

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');

      console.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip}`,
      );
    });
    next();
  }
}
