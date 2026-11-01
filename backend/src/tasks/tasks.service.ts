import { Injectable } from '@nestjs/common';
import { Prisma, Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Clock } from '../common/time/clock';
import { isOverdue, todayInTimeZone } from '../common/time/civil-date';
import { AppException } from '../common/errors/app-exception';
import type { AuthContext } from '../types/auth-context';
import { CreateTaskDto, ListTasksQueryDto, TaskDto, TaskPageDto, TaskStatsDto, UpdateTaskDto } from './dto/tasks.dto';
import { buildSearchText, normalizeSearch, PRIORITY_RANK, TaskPriority, TaskStatus } from './task.constants';

const NOT_FOUND = 'Tâche introuvable';

/**
 * Tâches privées : chaque requête est filtrée par ownerId issu de la session vérifiée
 * (backend.md B3, E3). Une tâche d'autrui est indiscernable d'une tâche absente (404).
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  private today(auth: AuthContext): string {
    return todayInTimeZone(this.clock.now(), auth.timeZone);
  }

  toDto(task: Task, today: string): TaskDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskStatus,
      priority: task.priority as TaskPriority,
      dueDate: task.dueDate,
      isOverdue: isOverdue(task.status, task.dueDate, today),
      completedAt: task.completedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }

  async create(auth: AuthContext, dto: CreateTaskDto): Promise<TaskDto> {
    const status = dto.status ?? 'TODO';
    const priority = dto.priority ?? 'MEDIUM';
    const description = dto.description ?? null;
    const now = this.clock.now();
    const task = await this.prisma.task.create({
      data: {
        ownerId: auth.userId,
        title: dto.title,
        description,
        status,
        priority,
        priorityRank: PRIORITY_RANK[priority],
        dueDate: dto.dueDate ?? null,
        completedAt: status === 'DONE' ? now : null,
        searchText: buildSearchText(dto.title, description),
        titleSort: normalizeSearch(dto.title),
      },
    });
    return this.toDto(task, this.today(auth));
  }

  async findOne(auth: AuthContext, id: string): Promise<TaskDto> {
    const task = await this.prisma.task.findFirst({ where: { id, ownerId: auth.userId } });
    if (!task) throw AppException.notFound(NOT_FOUND);
    return this.toDto(task, this.today(auth));
  }

  /** PATCH partiel : seules les propriétés présentes changent ; completedAt suit le statut (C3). */
  async update(auth: AuthContext, id: string, dto: UpdateTaskDto): Promise<TaskDto> {
    const present = (key: keyof UpdateTaskDto) => dto[key] !== undefined;
    if (!(['title', 'description', 'status', 'priority', 'dueDate'] as const).some(present)) {
      throw AppException.validation({ _: ['Aucun champ à modifier'] });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.task.findFirst({ where: { id, ownerId: auth.userId } });
      if (!current) return null;

      const data: Prisma.TaskUpdateInput = {};
      if (dto.title !== undefined) {
        data.title = dto.title;
        data.titleSort = normalizeSearch(dto.title);
      }
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.priority !== undefined) {
        data.priority = dto.priority;
        data.priorityRank = PRIORITY_RANK[dto.priority];
      }
      if (dto.dueDate !== undefined) data.dueDate = dto.dueDate;
      if (dto.status !== undefined && dto.status !== current.status) {
        data.status = dto.status;
        if (dto.status === 'DONE') data.completedAt = this.clock.now();
        else if (current.status === 'DONE') data.completedAt = null;
      }
      if (dto.title !== undefined || dto.description !== undefined) {
        const title = dto.title ?? current.title;
        const description = dto.description !== undefined ? dto.description : current.description;
        data.searchText = buildSearchText(title, description);
      }

      // Mise à jour filtrée par id ET ownerId (C5) : dernière écriture validée gagne.
      const { count } = await tx.task.updateMany({ where: { id, ownerId: auth.userId }, data: data as Prisma.TaskUpdateManyMutationInput });
      if (count !== 1) return null;
      return tx.task.findUniqueOrThrow({ where: { id } });
    });
    if (!updated) throw AppException.notFound(NOT_FOUND);
    return this.toDto(updated, this.today(auth));
  }

  /** Suppression physique après vérification de propriété (C2). */
  async remove(auth: AuthContext, id: string): Promise<void> {
    const { count } = await this.prisma.task.deleteMany({ where: { id, ownerId: auth.userId } });
    if (count !== 1) throw AppException.notFound(NOT_FOUND);
  }

  async list(auth: AuthContext, query: ListTasksQueryDto): Promise<TaskPageDto> {
    const today = this.today(auth);
    const where: Prisma.TaskWhereInput = { ownerId: auth.userId };
    const and: Prisma.TaskWhereInput[] = [];

    if (query.search) {
      const ids = await this.searchIds(auth.userId, normalizeSearch(query.search));
      and.push({ id: { in: ids } });
    }
    if (query.status) and.push({ status: query.status });
    if (query.priority) and.push({ priority: query.priority });
    switch (query.due) {
      case 'withDate':
        and.push({ dueDate: { not: null } });
        break;
      case 'withoutDate':
        and.push({ dueDate: null });
        break;
      case 'overdue':
        and.push({ status: { not: 'DONE' } }, { dueDate: { not: null, lt: today } });
        break;
    }
    if (and.length) where.AND = and;

    const direction = query.sortOrder;
    const orderBy: Prisma.TaskOrderByWithRelationInput[] = [];
    switch (query.sortBy) {
      case 'dueDate':
        // Échéances nulles toujours en fin de liste, quel que soit le sens (convention D5).
        orderBy.push({ dueDate: { sort: direction, nulls: 'last' } });
        break;
      case 'priority':
        orderBy.push({ priorityRank: direction });
        break;
      case 'title':
        orderBy.push({ titleSort: direction }, { title: direction });
        break;
      default:
        orderBy.push({ createdAt: direction });
    }
    if (query.sortBy !== 'createdAt') orderBy.push({ createdAt: 'desc' });
    orderBy.push({ id: 'asc' }); // ordre stable

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({ where, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }),
    ]);
    const totalPages = Math.ceil(total / query.limit);
    return {
      items: rows.map((t) => this.toDto(t, today)),
      pagination: { page: query.page, limit: query.limit, total, totalPages, hasNextPage: query.page < totalPages },
    };
  }

  /**
   * Recherche par sous-chaîne littérale via instr() : contrairement à LIKE, les caractères
   * % et _ saisis par l'utilisateur ne sont pas interprétés comme jokers. Requête paramétrée.
   */
  private async searchIds(ownerId: string, needle: string): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Task" WHERE "ownerId" = ${ownerId} AND instr("searchText", ${needle}) > 0`;
    return rows.map((r) => r.id);
  }

  /** Statistiques globales du propriétaire, indépendantes de toute pagination (D7). */
  async stats(auth: AuthContext): Promise<TaskStatsDto> {
    const today = this.today(auth);
    const [groups, overdue] = await this.prisma.$transaction([
      this.prisma.task.groupBy({ by: ['status'], where: { ownerId: auth.userId }, _count: { _all: true }, orderBy: { status: 'asc' } }),
      this.prisma.task.count({ where: { ownerId: auth.userId, status: { not: 'DONE' }, dueDate: { not: null, lt: today } } }),
    ]);
    const count = (status: TaskStatus) => {
      const group = groups.find((g) => g.status === status);
      const c = group?._count;
      return typeof c === 'object' && c ? (c._all ?? 0) : 0;
    };
    const todo = count('TODO');
    const inProgress = count('IN_PROGRESS');
    const done = count('DONE');
    const total = todo + inProgress + done;
    return {
      total,
      todo,
      inProgress,
      done,
      overdue,
      completionRate: total > 0 ? Math.round((done / total) * 1000) / 10 : 0,
      statusDistribution: { TODO: todo, IN_PROGRESS: inProgress, DONE: done },
    };
  }
}
