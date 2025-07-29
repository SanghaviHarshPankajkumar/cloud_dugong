import { create } from "zustand";
import { persist } from "zustand/middleware";

type UploadStatus = "pending" | "uploading" | "success" | "error";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  url?: string;
  error?: string;
}

interface UploadState {
  files: UploadFile[];
  sessionId: string | null;
  sessionStartTime: number | null;
  addFiles: (files: File[]) => void;
  setSessionId: (sessionId: string) => void;
  resetSessionTimer: () => void;
  updateFileProgress: (id: string, progress: number) => void;
  updateFileStatus: (
    id: string,
    status: UploadStatus,
    url?: string,
    error?: string
  ) => void;
  clearFiles: () => void;
  clearStore: () => void;
  getFileById: (id: string) => UploadFile | undefined;
}

export const useUploadStore = create<UploadState>()(
  persist(
    (set, get) => ({
      files: [],
      sessionId: null,
      sessionStartTime: null,

      addFiles: (newFiles: File[]) =>
        set((state) => ({
          files: [
            ...state.files,
            ...newFiles.map((file) => ({
              id: crypto.randomUUID(),
              file,
              progress: 0,
              status: "pending" as UploadStatus,
            })),
          ],
        })),

      setSessionId: (sessionId: string) => {
        set({
          sessionId,
          sessionStartTime: Date.now(),
        });
      },

      resetSessionTimer: () => {
        const { sessionId } = get();
        if (sessionId) {
          set({
            sessionStartTime: Date.now(),
          });
        }
      },

      updateFileProgress: (id: string, progress: number) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, progress } : file
          ),
        })),

      updateFileStatus: (
        id: string,
        status: UploadStatus,
        url?: string,
        error?: string
      ) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === id ? { ...file, status, url, error } : file
          ),
        })),

      clearFiles: () => set({ files: [] }),

      clearStore: () => {
        set({
          sessionId: null,
          sessionStartTime: null,
        });
      },

      getFileById: (id: string) => get().files.find((file) => file.id === id),
    }),
    {
      name: "upload-store",
    }
  )
);
