import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

/** CRUD, filtres, Kanban par statut et statistiques (pas de StatisticsModule séparé, B03). */
@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
