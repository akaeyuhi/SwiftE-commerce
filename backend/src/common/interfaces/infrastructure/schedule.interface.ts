export interface ScheduledTask {
  name: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
}

export interface TaskOptions {
  enabled?: boolean;
  timezone?: string;
  runOnInit?: boolean;
  maxConcurrent?: number;
}
