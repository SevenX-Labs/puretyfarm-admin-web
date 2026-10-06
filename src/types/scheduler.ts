export type CronJobStatus = "ACTIVE" | "IDLE" | "PLANNED" | "STANDBY";

export interface ScheduledJobInfo {
  id: string;
  name: string;
  cadence: string;
  cadenceHuman: string;
  targetMethod: string;
  status: CronJobStatus;
  description: string;
  purpose: string;
  safetyGuards: string[];
  lastEstimatedRun?: string;
  nextEstimatedRun?: string;
}

export interface SchedulerAuditItem {
  id: string;
  jobName: string;
  timestamp: string;
  outcome: "RELEASED" | "CLEARED" | "ZERO_ROWS";
  details: string;
}
