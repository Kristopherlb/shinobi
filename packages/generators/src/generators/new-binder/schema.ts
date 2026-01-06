export interface NewBinderGeneratorSchema {
  binderName: string;
  category: string;
  mainCapability: string;
  supportedAccess?: ('read' | 'write' | 'readwrite' | 'admin' | 'invoke' | 'publish' | 'subscribe')[];
}
