export interface NewBinderGeneratorSchema {
  binderName: string;
  category: string; // Any string allowed - new categories are auto-created
  mainCapability: string;
  supportedAccess?: string[];
}

