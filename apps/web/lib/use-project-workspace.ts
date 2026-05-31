"use client";

import type { AnalyticsSummary, TaskModelAnalyticsPoint } from "@sentinelai/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VerificationUiPhase } from "../components/verification-progress";
import { apiRequest } from "./api";
import { getSelectedProjectId, getToken, saveSelectedProjectId } from "./auth";
import type {
  ModelMigrationRecord,
  ModelRecommendationRecord,
  ProjectRecord,
  RecommendationsResponse,
  TaskProfileRecord,
  TraceRecord,
  VerificationRecord
} from "./types";

const emptySummary: AnalyticsSummary = {
  traceCount: 0,
  averageLatencyMs: 0,
  totalTokens: 0,
  totalCostUsd: 0,
  errorRate: 0
};

const POLL_MS = 2000;
const MAX_POLLS = 45;
const MIN_RUNNING_MS = 2500;
const SUCCESS_VISIBLE_MS = 8000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function verificationProgressPercent(verifications: VerificationRecord[], pendingExperiments: number) {
  const active = verifications.find(
    (v) => v.experimentStatus === "RUNNING" || v.experimentStatus === "QUEUED"
  );
  if (active?.experimentStatus === "RUNNING") {
    const completed = active.passedRuns + active.failedRuns;
    return Math.min(95, Math.max(15, Math.round((completed / 8) * 100)));
  }
  if (pendingExperiments > 0 || active?.experimentStatus === "QUEUED") {
    return 12;
  }
  return 100;
}

function verificationStatusMessage(verifications: VerificationRecord[], pendingExperiments: number) {
  const active = verifications.find(
    (v) => v.experimentStatus === "RUNNING" || v.experimentStatus === "QUEUED"
  );
  if (active?.experimentStatus === "RUNNING") {
    const done = active.passedRuns + active.failedRuns;
    return `Replaying prompt ${Math.min(done + 1, 8)} of ~8 on ${active.taskName} (${active.currentModel} → ${active.candidateModel})…`;
  }
  if (pendingExperiments > 0) {
    return "Queued shadow replay — worker is sampling your production traces…";
  }
  return "Finishing up…";
}

export function useProjectWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary>(emptySummary);
  const [taskModels, setTaskModels] = useState<TaskModelAnalyticsPoint[]>([]);
  const [traces, setTraces] = useState<TraceRecord[]>([]);
  const [recommendations, setRecommendations] = useState<ModelRecommendationRecord[]>([]);
  const [recommendationInsights, setRecommendationInsights] = useState<RecommendationsResponse["insights"] | null>(null);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [migrations, setMigrations] = useState<ModelMigrationRecord[]>([]);
  const [taskProfiles, setTaskProfiles] = useState<TaskProfileRecord[]>([]);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationPhase, setVerificationPhase] = useState<VerificationUiPhase | null>(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationResultTask, setVerificationResultTask] = useState<string | null>(null);
  const pollAbort = useRef(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccessTimer = useCallback(() => {
    if (successTimer.current) {
      clearTimeout(successTimer.current);
      successTimer.current = null;
    }
  }, []);

  const showSuccessNotice = useCallback(
    (phase: "success" | "already_verified", message: string, taskName: string | null) => {
      clearSuccessTimer();
      setVerificationPhase(phase);
      setVerificationMessage(message);
      setVerificationResultTask(taskName);
      setVerificationBusy(false);
      setVerificationProgress(100);
      successTimer.current = setTimeout(() => {
        setVerificationPhase(null);
        setVerificationMessage("");
        setVerificationResultTask(null);
        setVerificationProgress(0);
      }, SUCCESS_VISIBLE_MS);
    },
    [clearSuccessTimer]
  );

  const applyRecommendationPayload = useCallback((payload: RecommendationsResponse) => {
    setRecommendations(payload.recommendations);
    setRecommendationInsights(payload.insights);
  }, []);

  const refreshSilent = useCallback(
    async (authToken: string, activeProjectId: string) => {
      const [summaryData, taskModelData, traceData, recommendationPayload, verificationData, migrationData, profiles] =
        await Promise.all([
          apiRequest<AnalyticsSummary>(`/projects/${activeProjectId}/analytics/summary`, { token: authToken }),
          apiRequest<TaskModelAnalyticsPoint[]>(`/projects/${activeProjectId}/analytics/task-models`, { token: authToken }),
          apiRequest<TraceRecord[]>(`/projects/${activeProjectId}/traces`, { token: authToken }),
          apiRequest<RecommendationsResponse>(`/projects/${activeProjectId}/recommendations`, { token: authToken }),
          apiRequest<VerificationRecord[]>(`/projects/${activeProjectId}/verifications`, { token: authToken }),
          apiRequest<ModelMigrationRecord[]>(`/projects/${activeProjectId}/model-migrations`, { token: authToken }),
          apiRequest<TaskProfileRecord[]>(`/projects/${activeProjectId}/task-profiles`, { token: authToken })
        ]);

      setSummary(summaryData);
      setTaskModels(taskModelData);
      setTraces(traceData);
      applyRecommendationPayload(recommendationPayload);
      setVerifications(verificationData);
      setMigrations(migrationData);
      setTaskProfiles(profiles);
      return { recommendationPayload, verificationData };
    },
    [applyRecommendationPayload]
  );

  const refresh = useCallback(
    async (authToken: string | null = token, projectOverride?: string) => {
      if (!authToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const projectList = await apiRequest<ProjectRecord[]>("/projects", { token: authToken });
        setProjects(projectList);
        const saved = projectOverride ?? getSelectedProjectId();
        const active = projectList.find((item) => item.id === saved) ?? projectList[0];
        if (!active) {
          setProject(null);
          setProjectId("");
          return;
        }
        setProjectId(active.id);
        setProject(active);
        saveSelectedProjectId(active.id);
        await refreshSilent(authToken, active.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load workspace");
      } finally {
        setLoading(false);
      }
    },
    [refreshSilent, token]
  );

  const pollVerificationStatus = useCallback(
    async (authToken: string, activeProjectId: string) => {
      const { recommendationPayload, verificationData } = await refreshSilent(authToken, activeProjectId);
      const pending = recommendationPayload.insights.pendingExperiments;
      setVerificationProgress(verificationProgressPercent(verificationData, pending));
      setVerificationMessage(verificationStatusMessage(verificationData, pending));
      return { pending, verificationData, recommendationPayload };
    },
    [refreshSilent]
  );

  const runVerification = useCallback(async () => {
    if (!token || !projectId || verificationBusy) {
      return;
    }
    pollAbort.current = false;
    clearSuccessTimer();
    setVerificationPhase("running");
    setVerificationBusy(true);
    setVerificationProgress(5);
    setVerificationMessage("Queueing shadow replay on sampled production traces…");
    setError("");

    const startedAt = Date.now();
    let sawWork = false;

    try {
      await apiRequest<RecommendationsResponse>(`/projects/${projectId}/recommendations`, { token });
      setVerificationProgress(10);

      let finished = false;
      for (let poll = 0; poll < MAX_POLLS; poll++) {
        if (pollAbort.current) {
          break;
        }

        const { pending, verificationData, recommendationPayload } = await pollVerificationStatus(token, projectId);
        const stillRunning = verificationData.some(
          (v) => v.experimentStatus === "QUEUED" || v.experimentStatus === "RUNNING"
        );
        if (pending > 0 || stillRunning) {
          sawWork = true;
        }

        const elapsed = Date.now() - startedAt;
        const canComplete = pending === 0 && !stillRunning && (sawWork ? elapsed >= MIN_RUNNING_MS : true);

        if (canComplete) {
          finished = true;
          const taskName =
            recommendationPayload.recommendations[0]?.taskName ??
            verificationData.find((v) => v.experimentStatus === "PASSED")?.taskName ??
            null;
          const rec = recommendationPayload.recommendations[0];
          if (!sawWork) {
            showSuccessNotice(
              "already_verified",
              rec
                ? `${rec.taskName}: already shadow-tested (${rec.switchStatusLabel}). Results are below.`
                : "This project already has a completed verification run. See results below or open Verification.",
              taskName
            );
          } else {
            showSuccessNotice(
              "success",
              rec
                ? `${rec.taskName}: ${rec.switchStatusLabel} — ~${rec.estimatedSavingsPercent}% estimated savings.`
                : "Shadow replay finished. Review the latest result below.",
              taskName
            );
          }
          break;
        }

        await sleep(POLL_MS);
      }

      if (!finished) {
        setVerificationPhase(null);
        setVerificationBusy(false);
        setVerificationProgress(0);
        setError(
          "Verification is taking longer than expected. Ensure the worker is running (`docker compose up -d worker`), then try again."
        );
      }
    } catch (err) {
      setVerificationPhase(null);
      setVerificationBusy(false);
      setVerificationProgress(0);
      setError(err instanceof Error ? err.message : "Verification failed to start");
    }
  }, [clearSuccessTimer, pollVerificationStatus, projectId, showSuccessNotice, token, verificationBusy]);

  useEffect(() => {
    const authToken = getToken();
    setToken(authToken);
    setReady(true);
    void refresh(authToken);
    return () => {
      pollAbort.current = true;
      clearSuccessTimer();
    };
  }, [clearSuccessTimer, refresh]);

  return {
    token,
    ready,
    loading,
    error,
    projects,
    projectId,
    project,
    summary,
    taskModels,
    traces,
    recommendations,
    recommendationInsights,
    verifications,
    migrations,
    taskProfiles,
    verificationBusy,
    verificationPhase,
    verificationProgress,
    verificationMessage,
    verificationResultTask,
    setProjectId,
    refresh,
    runVerification
  };
}
