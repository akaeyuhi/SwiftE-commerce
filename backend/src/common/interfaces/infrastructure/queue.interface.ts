export interface QueueJob<Data = any> {
  id: string;
  data: Data;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface QueueOptions {
  priority?: number;
  delay?: number;
  maxAttempts?: number;
  backoff?: 'fixed' | 'exponential';
  backoffDelay?: number;
}
