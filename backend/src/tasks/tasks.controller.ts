import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentAuth } from '../common/decorators/current-auth.decorator';
import { AppException } from '../common/errors/app-exception';
import { ErrorResponseDto } from '../common/errors/error-response.dto';
import type { AuthContext } from '../types/auth-context';
import { CreateTaskDto, ListTasksQueryDto, TaskDto, TaskPageDto, TaskStatsDto, UpdateTaskDto } from './dto/tasks.dto';
import { TasksService } from './tasks.service';

// Un identifiant mal formé est traité comme une tâche introuvable (404 indistinct, B04).
const TaskId = () =>
  new ParseUUIDPipe({ exceptionFactory: () => AppException.notFound('Tâche introuvable') });

@ApiTags('tasks')
@ApiCookieAuth('access')
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une tâche (statut TODO et priorité MEDIUM par défaut)' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiCreatedResponse({ type: TaskDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  create(@CurrentAuth() auth: AuthContext, @Body() dto: CreateTaskDto): Promise<TaskDto> {
    return this.tasks.create(auth, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister / rechercher / filtrer / trier (paginé). Kanban : un appel par statut, pagination indépendante.',
  })
  @ApiOkResponse({ type: TaskPageDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  list(@CurrentAuth() auth: AuthContext, @Query() query: ListTasksQueryDto): Promise<TaskPageDto> {
    return this.tasks.list(auth, query);
  }

  // Déclarée avant /tasks/:id (backend.md D4).
  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales du propriétaire (hors filtres de liste)' })
  @ApiOkResponse({ type: TaskStatsDto })
  stats(@CurrentAuth() auth: AuthContext): Promise<TaskStatsDto> {
    return this.tasks.stats(auth);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lire une tâche' })
  @ApiOkResponse({ type: TaskDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentAuth() auth: AuthContext, @Param('id', TaskId()) id: string): Promise<TaskDto> {
    return this.tasks.findOne(auth, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier partiellement une tâche (y compris déplacement Kanban)' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOkResponse({ type: TaskDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(@CurrentAuth() auth: AuthContext, @Param('id', TaskId()) id: string, @Body() dto: UpdateTaskDto): Promise<TaskDto> {
    return this.tasks.update(auth, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer définitivement une tâche' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(@CurrentAuth() auth: AuthContext, @Param('id', TaskId()) id: string): Promise<void> {
    return this.tasks.remove(auth, id);
  }
}
