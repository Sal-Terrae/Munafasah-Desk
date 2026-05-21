import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import {
  InboundEmailPayload,
  InboundEmailService,
} from './inbound-email.service';

class InboundEmailBody implements InboundEmailPayload {
  @IsString() timestamp!: string;
  @IsString() token!: string;
  @IsString() signature!: string;
  @IsString() messageId!: string;
  @IsString() from!: string;
  @IsString() to!: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() bodyPlain!: string;
}

/**
 * Public webhook target — no JWT guard. Auth is the HMAC signature
 * inside the body. Mount under /webhooks so reverse-proxy rules can
 * apply IP allowlists if needed.
 */
@Controller('webhooks')
export class InboundEmailController {
  constructor(private readonly svc: InboundEmailService) {}

  @Post('inbound-email')
  receive(@Body() body: InboundEmailBody) {
    return this.svc.receive(body);
  }
}
