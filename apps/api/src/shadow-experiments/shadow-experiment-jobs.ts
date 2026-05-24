import { Queue } from "bullmq";

export type ShadowExperimentJobData = {
  experimentId: string;
};

export const shadowExperimentJobOptions = {
  attempts: 2,
  backoff: { type: "exponential", delay: 10000 }
} as const;

export async function queueShadowExperiment(queue: Queue, experimentId: string) {
  return queue.add("run-shadow-experiment", { experimentId } satisfies ShadowExperimentJobData, shadowExperimentJobOptions);
}
