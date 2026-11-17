export type JourneyStep = {
  id: number;
  group: number;
  label: string;
  title: string;
  lead: string;
  image?: string;
  cards?: string[];
  question?: string;
  note: string;
  health?: boolean;
};
export const journeyGroups: string[];
export const presenterJourney: JourneyStep[];
