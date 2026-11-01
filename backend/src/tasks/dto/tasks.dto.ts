import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, Validate, ValidateIf } from 'class-validator';
import { Trim } from '../../common/validation/transforms';
import { IsCivilDate } from '../../common/validation/is-civil-date';
import {
  DESCRIPTION_MAX,
  SEARCH_MAX,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TITLE_MAX,
  TaskPriority,
  TaskStatus,
} from '../task.constants';

const TITLE_MSG = `Le titre doit contenir entre 1 et ${TITLE_MAX} caractères`;
const DESCRIPTION_MSG = `La description doit contenir au plus ${DESCRIPTION_MAX} caractères`;
const STATUS_MSG = 'Statut invalide (TODO, IN_PROGRESS, DONE)';
const PRIORITY_MSG = 'Priorité invalide (LOW, MEDIUM, HIGH)';

export class CreateTaskDto {
  @ApiProperty({ minLength: 1, maxLength: TITLE_MAX, example: 'Préparer le brief' })
  @Trim()
  @IsString({ message: 'Le titre est obligatoire' })
  @Length(1, TITLE_MAX, { message: TITLE_MSG })
  title: string;

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX, nullable: true, example: 'Valider les écrans' })
  @ValidateIf((o: CreateTaskDto) => o.description !== undefined && o.description !== null)
  @IsString({ message: 'La description doit être une chaîne' })
  @MaxLength(DESCRIPTION_MAX, { message: DESCRIPTION_MSG })
  description?: string | null;

  @ApiPropertyOptional({ enum: TASK_STATUSES, default: 'TODO' })
  @IsOptional()
  @IsIn(TASK_STATUSES, { message: STATUS_MSG })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES, default: 'MEDIUM' })
  @IsOptional()
  @IsIn(TASK_PRIORITIES, { message: PRIORITY_MSG })
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true, example: '2026-11-12' })
  @ValidateIf((o: CreateTaskDto) => o.dueDate !== undefined && o.dueDate !== null)
  @Validate(IsCivilDate)
  dueDate?: string | null;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: TITLE_MAX })
  @ValidateIf((o: UpdateTaskDto) => o.title !== undefined)
  @Trim()
  @IsString({ message: 'Le titre est obligatoire' })
  @Length(1, TITLE_MAX, { message: TITLE_MSG })
  title?: string;

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX, nullable: true, description: 'null supprime la description' })
  @ValidateIf((o: UpdateTaskDto) => o.description !== undefined && o.description !== null)
  @IsString({ message: 'La description doit être une chaîne' })
  @MaxLength(DESCRIPTION_MAX, { message: DESCRIPTION_MSG })
  description?: string | null;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @ValidateIf((o: UpdateTaskDto) => o.status !== undefined)
  @IsIn(TASK_STATUSES, { message: STATUS_MSG })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @ValidateIf((o: UpdateTaskDto) => o.priority !== undefined)
  @IsIn(TASK_PRIORITIES, { message: PRIORITY_MSG })
  priority?: TaskPriority;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true, description: "null retire l'échéance" })
  @ValidateIf((o: UpdateTaskDto) => o.dueDate !== undefined && o.dueDate !== null)
  @Validate(IsCivilDate)
  dueDate?: string | null;
}

export const DUE_FILTERS = ['all', 'withDate', 'withoutDate', 'overdue'] as const;
export const SORT_FIELDS = ['createdAt', 'dueDate', 'priority', 'title'] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];
export type SortField = (typeof SORT_FIELDS)[number];

export class ListTasksQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page doit être un entier' })
  @Min(1, { message: 'page doit être ≥ 1' })
  @Max(100000)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit doit être un entier' })
  @Min(1, { message: 'limit doit être compris entre 1 et 100' })
  @Max(100, { message: 'limit doit être compris entre 1 et 100' })
  limit: number = 20;

  @ApiPropertyOptional({ maxLength: SEARCH_MAX, description: 'Titre et description, insensible à la casse et aux accents' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(SEARCH_MAX, { message: `La recherche est limitée à ${SEARCH_MAX} caractères` })
  search?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES, { message: STATUS_MSG })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @IsOptional()
  @IsIn(TASK_PRIORITIES, { message: PRIORITY_MSG })
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: DUE_FILTERS, default: 'all' })
  @IsOptional()
  @IsIn(DUE_FILTERS, { message: 'Filtre due invalide' })
  due: DueFilter = 'all';

  @ApiPropertyOptional({ enum: SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORT_FIELDS, { message: 'sortBy invalide' })
  sortBy: SortField = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sortOrder invalide' })
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class TaskDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty({ enum: TASK_STATUSES }) status: TaskStatus;
  @ApiProperty({ enum: TASK_PRIORITIES }) priority: TaskPriority;
  @ApiProperty({ type: String, format: 'date', nullable: true }) dueDate: string | null;
  @ApiProperty({ description: 'Calculé en lecture selon le fuseau du compte' }) isOverdue: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class PaginationDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
}

export class TaskPageDto {
  @ApiProperty({ type: [TaskDto] }) items: TaskDto[];
  @ApiProperty({ type: PaginationDto }) pagination: PaginationDto;
}

export class StatusDistributionDto {
  @ApiProperty() TODO: number;
  @ApiProperty() IN_PROGRESS: number;
  @ApiProperty() DONE: number;
}

export class TaskStatsDto {
  @ApiProperty() total: number;
  @ApiProperty() todo: number;
  @ApiProperty() inProgress: number;
  @ApiProperty() done: number;
  @ApiProperty() overdue: number;
  @ApiProperty({ description: 'Pourcentage terminé, arrondi à 0,1 ; 0 si aucune tâche' }) completionRate: number;
  @ApiProperty({ type: StatusDistributionDto }) statusDistribution: StatusDistributionDto;
}
