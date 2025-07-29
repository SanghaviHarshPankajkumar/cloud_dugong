import { create } from "zustand";
import { persist } from "zustand/middleware";

type ImageState = {
  currentImage: number;
  apiResponse: any | null;
  totalImages: number;
  setApiResponse: (response: any) => void;
  setCurrentImage: (imageNumber: number) => void;
  handlePrevious: () => void;
  handleNext: () => void;
  getCurrentImageData: () => any | null;
  clearStore: () => void;
};

export const useImageStore = create<
  ImageState,
  [["zustand/persist", Partial<ImageState>]]
>(
  persist(
    (set, get) => ({
      currentImage: 1,
      apiResponse: null,
      totalImages: 0,

      setApiResponse: (response) =>
        set({
          apiResponse: response,
          currentImage: 1,
          totalImages: response?.results?.length || 0,
        }),

      setCurrentImage: (imageNumber) => set({ currentImage: imageNumber }),

      handlePrevious: () =>
        set((state) => ({
          currentImage: Math.max(1, state.currentImage - 1),
        })),

      handleNext: () =>
        set((state) => ({
          currentImage: Math.min(state.totalImages, state.currentImage + 1),
        })),

      getCurrentImageData: () => {
        const state = get();
        if (!state.apiResponse?.results || state.currentImage < 1) return null;
        return state.apiResponse.results[state.currentImage - 1];
      },

      clearStore: () =>
        set({
          currentImage: 1,
          apiResponse: null,
          totalImages: 0,
        }),
    }),
    {
      name: "image-storage",
    }
  )
);
