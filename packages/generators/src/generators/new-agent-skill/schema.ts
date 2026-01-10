export interface NewAgentSkillGeneratorSchema {
  skillName: string;
  description: string;
  license?: string | null;
  compatibility?: string | null;
  author?: string | null;
  version?: string | null;
  degreesOfFreedom?: 'Low' | 'Medium' | 'High';
}

