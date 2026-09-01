export const REPORT_TEMPLATE_PRESETS = ["classic", "compact", "competency"] as const;

export type ReportTemplatePreset = (typeof REPORT_TEMPLATE_PRESETS)[number];

export type LogoVariants = {
  original?: string;
  wide?: string;
  square?: string;
  favicon?: string;
};

export type ReportSettings = {
  preset: ReportTemplatePreset;
  title: string;
  showLogo: boolean;
  showStudentPhoto: boolean;
  showPosition: boolean;
  showAttendance: boolean;
  showFees: boolean;
  showHealth: boolean;
  showLibrary: boolean;
  classTeacherLabel: string;
  headTeacherLabel: string;
};

export const DEFAULT_REPORT_SETTINGS: ReportSettings = {
  preset: "classic",
  title: "END OF TERM PROGRESSIVE REPORT",
  showLogo: true,
  showStudentPhoto: true,
  showPosition: true,
  showAttendance: true,
  showFees: false,
  showHealth: false,
  showLibrary: false,
  classTeacherLabel: "Class Teacher",
  headTeacherLabel: "Head Teacher",
};

export type PublicSchoolBranding = {
  schoolId: string;
  slug: string;
  name: string;
  motto: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string | null;
  logoVariants: LogoVariants;
  brandingVersion: number;
};

export function normalizeReportSettings(value: unknown): ReportSettings {
  const input = value && typeof value === "object" ? value as Partial<ReportSettings> : {};
  const preset = REPORT_TEMPLATE_PRESETS.includes(input.preset as ReportTemplatePreset)
    ? input.preset as ReportTemplatePreset
    : DEFAULT_REPORT_SETTINGS.preset;

  return {
    ...DEFAULT_REPORT_SETTINGS,
    ...input,
    preset,
    title: String(input.title || DEFAULT_REPORT_SETTINGS.title).slice(0, 120),
    classTeacherLabel: String(input.classTeacherLabel || DEFAULT_REPORT_SETTINGS.classTeacherLabel).slice(0, 60),
    headTeacherLabel: String(input.headTeacherLabel || DEFAULT_REPORT_SETTINGS.headTeacherLabel).slice(0, 60),
  };
}
