export type ReportGradeBand = {
  min: number;
  grade: string;
  comment: string;
  description?: string;
};

export type ProgressiveReportSubject = {
  id: string;
  subject: string;
  a1: number | null;
  a2: number | null;
  a3: number | null;
  a4: number | null;
  average: number | null;
  identifier: number | null;
  courseworkScore: number;
  examScore: number;
  examWeightedScore: number;
  finalScore: number;
  grade: string;
  descriptor: string;
  teacherInitials: string;
};

export type ProgressiveReportData = {
  reportId: string | null;
  status: "draft" | "finalized";
  school: {
    id: string;
    name: string;
    logoUrl: string | null;
    motto: string;
    address: string;
    box: string;
    phones: string;
    email: string;
    deoCode: string;
    primaryColor: string;
    secondaryColor: string;
    stampWarning: string;
    reportFooter: string;
  };
  student: {
    id: string;
    name: string;
    photoUrl: string | null;
    lin: string;
    payCode: string;
    section: string;
    gender: string;
    roll: string;
    year: string;
    term: string;
    class: string;
  };
  statusSummary: {
    daysAttended: number;
    expectedSchoolDays: number;
    feesBalance: number;
    sicknessStatus: string;
    lastSickbayVisit: string | null;
    booksBorrowed: number;
    borrowedBookTitles: string[];
  };
  subjects: ProgressiveReportSubject[];
  summary: {
    average: number;
    projectWork: string;
    overallIdentifier: string;
    overallGrade: string;
    overallPerformance: string;
    result: string;
    termOpensOn: string | null;
    termClosesOn: string | null;
  };
  comments: {
    classTeacherComment: string;
    headTeacherComment: string;
  };
  gradeBands: ReportGradeBand[];
};
