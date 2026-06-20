export type ColorSchemeId = "dark" | "original";

export type ColorTokens = Record<`--${string}`, string>;

export type ColorScheme = {
  id: ColorSchemeId;
  name: string;
  description: string;
  swatches: [string, string, string];
  tokens: ColorTokens;
  familyColors: [string, string, string, string];
};

// Theme values live here so the interface can grow beyond two schemes without
// having to hunt through component styles for individual colour literals.
export const COLOR_SCHEMES: Record<ColorSchemeId, ColorScheme> = {
  dark: {
    id: "dark",
    name: "Professional dark",
    description: "Graphite surfaces with a restrained copper signal.",
    swatches: ["#12191b", "#243337", "#d58a58"],
    tokens: {
      "--ink": "#eef3f2",
      "--muted": "#9ca9aa",
      "--paper": "#101618",
      "--app-bg": "#030506",
      "--surface": "#162024",
      "--surface-raised": "#1b272a",
      "--surface-hover": "#223134",
      "--line": "#2c3b3f",
      "--line-strong": "#45585b",
      "--orange": "#d58a58",
      "--orange-soft": "#34241d",
      "--lime": "#a9c866",
      "--live-bg": "#1a261a",
      "--live-line": "#526a35",
      "--live-text": "#b8d27d",
      "--control-bg": "#1b282b",
      "--control-hover": "#26373a",
      "--stage": "#090d0e",
      "--stage-line": "#202c2e",
      "--stage-text": "#dbe4e1",
      "--stage-muted": "#94a3a3",
      "--stage-grid": "rgba(219, 233, 230, .045)",
      "--stage-hot": "#d58a58",
      "--stage-hot-glow": "rgba(213, 138, 88, .18)",
      "--chart-grid": "#304044",
      "--chart-line": "#d58a58",
      "--chart-fill": "#d58a58",
      "--time-line": "#d8e4e2",
      "--selection": "#223235",
      "--overlay": "rgba(4, 8, 9, .72)",
      "--file-overlay": "rgba(4, 8, 9, .82)",
    },
    familyColors: ["#e3a15d", "#e4757f", "#9fa8e8", "#58c7b6"],
  },
  original: {
    id: "original",
    name: "Original light",
    description: "The warm paper palette currently used by Cerebra.",
    swatches: ["#f4f1e8", "#fffefa", "#e95f39"],
    tokens: {
      "--ink": "#20221f",
      "--muted": "#8d8c82",
      "--paper": "#f4f1e8",
      "--app-bg": "#f4f1e8",
      "--surface": "#fffefa",
      "--surface-raised": "#fcfaf4",
      "--surface-hover": "#f1eee4",
      "--line": "#d9d5c9",
      "--line-strong": "#c8c7bc",
      "--orange": "#e95f39",
      "--orange-soft": "#fae5dc",
      "--lime": "#c1df5a",
      "--live-bg": "#eef3d8",
      "--live-line": "#c3c9a2",
      "--live-text": "#586122",
      "--control-bg": "#fffef9",
      "--control-hover": "#f1eee4",
      "--stage": "#08080a",
      "--stage-line": "#1c1d1f",
      "--stage-text": "#deded3",
      "--stage-muted": "#a8aa9e",
      "--stage-grid": "rgba(255, 255, 255, .03)",
      "--stage-hot": "#ef623c",
      "--stage-hot-glow": "rgba(238, 104, 65, .16)",
      "--chart-grid": "#e7e4da",
      "--chart-line": "#ee693f",
      "--chart-fill": "#ed6339",
      "--time-line": "#292c27",
      "--selection": "#f1eee4",
      "--overlay": "rgba(20, 20, 18, .5)",
      "--file-overlay": "rgba(28, 30, 27, .8)",
    },
    familyColors: ["#ffb13b", "#ff5a7a", "#9b8cff", "#3fd6c0"],
  },
};

export const DEFAULT_COLOR_SCHEME: ColorSchemeId = "dark";
