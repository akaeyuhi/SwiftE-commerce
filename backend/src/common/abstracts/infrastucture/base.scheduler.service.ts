/* eslint-disable brace-style */
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  ScheduledTask,
  TaskOptions,
} from 'src/common/interfaces/infrastructure/schedule.interface';

/**
 * BaseSchedulerService
 *
 * Abstract service for managing scheduled tasks and cron jobs.
 * Provides patterns for task registration, execution tracking, error handling,
 * and runtime management of scheduled operations.
 *
 * Subclasses must implement:
 * - `registerTasks`: Define all scheduled tasks for this service
 * - `executeTask`: Handle execution of specific tasks
 *
 * Common functionality provided:
 * - Task registration and management
 * - Execution tracking and metrics
 * - Error handling and alerting
 * - Runtime enable/disable of tasks
 * - Concurrent execution limits
 *
 * Generics:
 * - `TaskContext` — Type of context data passed to task execution
 */
@Injectable()
export abstract class BaseSchedulerService<TaskContext = any>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly tasks = new Map<string, ScheduledTask>();
  private readonly runningTasks = new Set<string>();

  constructor(protected readonly schedulerRegistry: SchedulerRegistry) {}

  /**
   * Register all scheduled tasks.
   *
   * Called during module initialization. Subclasses should call `addTask`
   * for each scheduled operation they want to register.
   */
  protected abstract registerTasks(): void;

  /**
   * Execute a specific task.
   *
   * Contains the business logic for the named task. Should be idempotent
   * when possible to handle overlapping executions gracefully.
   *
   * @param taskName - name of the task to execute
   * @param context - execution context data
   * @returns Promise resolving when task completes
   * @throws Error if task execution fails
   */
  protected abstract executeTask(
    taskName: string,
    context?: TaskContext
  ): Promise<void>;

  /**
   * Add a scheduled task.
   *
   * Call this from `registerTasks()` to register cron jobs.
   *
   * @param name - unique task name
   * @param cronExpression - cron pattern for scheduling
   * @param options - task options
   */
  protected addTask(
    name: string,
    cronExpression: string,
    options: TaskOptions = {}
  ): void {
    const task: ScheduledTask = {
      name,
      cronExpression,
      enabled: options.enabled ?? true,
      runCount: 0,
      errorCount: 0,
    };

    this.tasks.set(name, task);

    if (task.enabled) {
      this.scheduleCronJob(name, cronExpression, options);
    }
  }

  /**
   * Create and register cron job.
   *
   * @param taskName - name of task
   * @param cronExpression - cron pattern
   * @param options - task options
   */
  private scheduleCronJob(
    taskName: string,
    cronExpression: string,
    options: TaskOptions
  ): void {
    const job = new CronJob(
      cronExpression,
      () => this.runTask(taskName),
      null, // Don't start immediately,
      null,
      options.timezone || 'UTC'
    );

    this.schedulerRegistry.addCronJob(taskName, job);
    job.start();

    // Run immediately if requested
    if (options.runOnInit) {
      setImmediate(() => this.runTask(taskName));
    }
  }

  /**
   * Execute task with error handling and tracking.
   *
   * @param taskName - name of task to run
   * @param context - optional execution context
   */
  private async runTask(
    taskName: string,
    context?: TaskContext
  ): Promise<void> {
    const task = this.tasks.get(taskName);
    if (!task || !task.enabled) {
      return;
    }

    // Check if task is already running (concurrent execution limit)
    if (this.runningTasks.has(taskName)) {
      console.warn(`Task ${taskName} is already running, skipping execution`);
      return;
    }

    this.runningTasks.add(taskName);
    const startTime = Date.now();

    try {
      await this.executeTask(taskName, context);

      // Update success metrics
      task.runCount++;
      task.lastRun = new Date();
      this.updateNextRun(task);

      const duration = Date.now() - startTime;
      await this.onTaskSuccess(taskName, duration);
    } catch (error) {
      // Update error metrics
      task.errorCount++;
      task.lastRun = new Date();

      const duration = Date.now() - startTime;
      await this.onTaskError(taskName, error, duration);
    } finally {
      this.runningTasks.delete(taskName);
    }
  }

  /**
   * Update next run time for task.
   *
   * @param task - task to update
   */
  private updateNextRun(task: ScheduledTask): void {
    try {
      const job = this.schedulerRegistry.getCronJob(task.name);
      task.nextRun = job.nextDate().toJSDate();
    } catch {
      // Job might not be registered yet
    }
  }

  /**
   * Handle successful task execution.
   *
   * Override to implement custom success handling (metrics, notifications, etc.)
   *
   * @param taskName - name of successful task
   * @param duration - execution duration in ms
   */
  protected async onTaskSuccess(
    taskName: string,
    duration: number
  ): Promise<void> {
    console.log(`Task ${taskName} completed successfully in ${duration}ms`);
  }

  /**
   * Handle failed task execution.
   *
   * Override to implement custom error handling (alerting, etc.)
   *
   * @param taskName - name of failed task
   * @param error - error that occurred
   * @param duration - execution duration in ms
   */
  protected async onTaskError(
    taskName: string,
    error: Error,
    duration: number
  ): Promise<void> {
    console.error(`Task ${taskName} failed after ${duration}ms:`, error);

    // Could implement alerting here
    // await this.sendTaskErrorAlert(taskName, error);
  }

  /**
   * Enable a scheduled task.
   *
   * @param taskName - name of task to enable
   * @returns true if task was enabled
   */
  async enableTask(taskName: string): Promise<boolean> {
    const task = this.tasks.get(taskName);
    if (!task) return false;

    if (!task.enabled) {
      task.enabled = true;

      // Start cron job if not running
      try {
        const job = this.schedulerRegistry.getCronJob(taskName);
        job.start();
      } catch {
        // Job doesn't exist, create it
        this.scheduleCronJob(taskName, task.cronExpression, {});
      }
    }

    return true;
  }

  /**
   * Disable a scheduled task.
   *
   * @param taskName - name of task to disable
   * @returns true if task was disabled
   */
  async disableTask(taskName: string): Promise<boolean> {
    const task = this.tasks.get(taskName);
    if (!task) return false;

    if (task.enabled) {
      task.enabled = false;

      // Stop cron job
      try {
        const job = this.schedulerRegistry.getCronJob(taskName);
        job.stop();
      } catch {
        // Job doesn't exist, that's fine
      }
    }

    return true;
  }

  /**
   * Manually trigger a task.
   *
   * @param taskName - name of task to trigger
   * @param context - optional execution context
   * @returns Promise resolving when task completes
   */
  async triggerTask(taskName: string, context?: TaskContext): Promise<void> {
    await this.runTask(taskName, context);
  }

  /**
   * Get status of all tasks.
   *
   * @returns Array of task status information
   */
  getTaskStatus(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get status of specific task.
   *
   * @param taskName - name of task
   * @returns Task status or null if not found
   */
  getTaskInfo(taskName: string): ScheduledTask | null {
    return this.tasks.get(taskName) || null;
  }

  /**
   * Initialize scheduler and register tasks.
   */
  async onModuleInit(): Promise<void> {
    this.registerTasks();
    console.log(
      `Scheduler service [${this.constructor.name}] initialized with ${this.tasks.size} tasks`
    );
  }

  /**
   * Clean up when module destroys.
   */
  async onModuleDestroy(): Promise<void> {
    // Stop all cron jobs
    for (const taskName of this.tasks.keys()) {
      try {
        const job = this.schedulerRegistry.getCronJob(taskName);
        job.stop();
        this.schedulerRegistry.deleteCronJob(taskName);
      } catch {
        // Job might not exist
      }
    }

    console.log(`Scheduler service [${this.constructor.name}] destroyed`);
  }
}

/**
 * Example usage:
 *
 * @Injectable()
 * export class InventorySchedulerService extends BaseSchedulerService<{ storeId?: string }> {
 *   constructor(
 *     schedulerRegistry: SchedulerRegistry,
 *     private inventoryService: InventoryService,
 *     private emailService: EmailService
 *   ) {
 *     super(schedulerRegistry);
 *   }
 *
 *   protected registerTasks(): void {
 *     // Check low stock every hour
 *     this.addTask('check-low-stock', '0 * * * *', {
 *       enabled: true,
 *       runOnInit: true
 *     });
 *
 *     // Generate daily inventory report at 6 AM
 *     this.addTask('daily-inventory-report', '0 6 * * *', {
 *       timezone: 'America/New_York'
 *     });
 *
 *     // Clean up old data weekly
 *     this.addTask('cleanup-old-data', '0 2 * * 0');
 *   }
 *
 *   protected async executeTask(taskName: string, context?: { storeId?: string }): Promise<void> {
 *     switch (taskName) {
 *       case 'check-low-stock':
 *         await this.checkLowStock(context?.storeId);
 *         break;
 *       case 'daily-inventory-report':
 *         await this.generateDailyReport(context?.storeId);
 *         break;
 *       case 'cleanup-old-data':
 *         await this.cleanupOldData();
 *         break;
 *       default:
 *         throw new Error(`Unknown task: ${taskName}`);
 *     }
 *   }
 * }
 */
