export type RootStackParamList = {
  TodayWork: undefined;
  ProjectList: undefined;
  ProjectForm: { projectId?: string };
  DrawingBoard: { projectId: string };
  MuffList: { projectId: string };
  DailySummary: { date?: string };
};
