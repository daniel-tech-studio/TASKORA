import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'taskora:isPublic';
/** Route accessible sans session (l'Origin/CSRF reste contrôlé sur les mutations). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
