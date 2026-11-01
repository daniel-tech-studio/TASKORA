import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    enum: ['VALIDATION_ERROR', 'UNAUTHORIZED', 'CSRF_INVALID', 'NOT_FOUND', 'EMAIL_ALREADY_USED', 'RATE_LIMITED', 'INTERNAL_ERROR'],
  })
  code: string;
  @ApiProperty({ example: 'Données invalides' }) message: string;
  @ApiPropertyOptional({ example: { title: ['Le titre est obligatoire'] } }) details?: Record<string, string[]>;
  @ApiProperty({ example: 'req_0f2c…' }) requestId: string;
}
