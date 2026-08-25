import { create } from "zustand";
import { createJSONStorage } from "zustand/middleware";
import { persist } from "zustand/middleware";

export interface DiagnosticResult {
  ability_estimate: number;
  knowledge_gaps: Array<{
    subject: string;
    topic: string;
    cognitive_level: number;
    gap_score: number;
  }>;
}

export interface StudyPlan {
  id: string;
  weeks: Array<{
    week_number: number;
    objectives: string[];
    topics: string[];
  }>;
}

interface EdniStore {
  // User
  user: any | null;
  setUser: (user: any) => void;

  // Diagnostic
  diagnosticResults: DiagnosticResult | null;
  setDiagnosticResults: (results: DiagnosticResult) => void;

  // Study Plan
  studyPlan: StudyPlan | null;
  setStudyPlan: (plan: StudyPlan) => void;

  // UI State
  loading: boolean;
  setLoading: (loading: boolean) => void;

  error: string | null;
  setError: (error: string | null) => void;

  // Clear all
  reset: () => void;
}

export const useEdniStore = create<EdniStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),

      diagnosticResults: null,
      setDiagnosticResults: (results) => set({ diagnosticResults: results }),

      studyPlan: null,
      setStudyPlan: (plan) => set({ studyPlan: plan }),

      loading: false,
      setLoading: (loading) => set({ loading }),

      error: null,
      setError: (error) => set({ error }),

      reset: () =>
        set({
          user: null,
          diagnosticResults: null,
          studyPlan: null,
          loading: false,
          error: null,
        }),
    }),
    {
      name: "edni-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);