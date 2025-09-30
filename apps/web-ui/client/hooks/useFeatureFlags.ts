/**
 * Feature Flag React Hook
 * 
 * Provides React integration for feature flags using OpenFeature.
 * Integrates with the web-ui backend feature flag service.
 * Compliant with Platform Feature Flagging & Canary Deployment Standard v1.0.
 */

import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';

/**
 * Feature flag evaluation context for client-side evaluation
 */
export interface ClientFeatureFlagContext {
  userId?: string;
  email?: string;
  role?: string;
  team?: string;
  userAgent?: string;
  sessionId?: string;
  [key: string]: any;
}

/**
 * Feature flag evaluation result
 */
export interface ClientFeatureFlagResult<T = any> {
  value: T;
  reason: string;
  variant?: string;
  metadata?: {
    evaluatedAt: string;
    clientName: string;
    contextKeys: string[];
  };
}

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  flagKey: string;
  defaultValue: any;
  type: 'boolean' | 'string' | 'number' | 'object';
}

/**
 * Feature flag context provider props
 */
export interface FeatureFlagProviderProps {
  children: ReactNode;
  baseUrl?: string;
  defaultContext?: ClientFeatureFlagContext;
  refreshInterval?: number;
}

/**
 * Feature flag context value
 */
export interface FeatureFlagContextValue {
  evaluateFlag: <T>(config: FeatureFlagConfig) => Promise<ClientFeatureFlagResult<T>>;
  evaluateFlags: (configs: FeatureFlagConfig[]) => Promise<Record<string, ClientFeatureFlagResult>>;
  updateContext: (context: Partial<ClientFeatureFlagContext>) => void;
  getContext: () => ClientFeatureFlagContext;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Feature flag context
 */
const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

/**
 * Feature flag provider component
 * 
 * Provides feature flag evaluation capabilities to the React component tree.
 * Handles client-side evaluation context and API communication with the backend.
 */
export function FeatureFlagProvider({ 
  children, 
  baseUrl = '/api', 
  defaultContext = {},
  refreshInterval = 30000 // 30 seconds
}: FeatureFlagProviderProps) {
  const [context, setContext] = useState<ClientFeatureFlagContext>(defaultContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Update the evaluation context
   */
  const updateContext = useCallback((newContext: Partial<ClientFeatureFlagContext>) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  /**
   * Get current evaluation context
   */
  const getContext = useCallback(() => context, [context]);

  /**
   * Evaluate a single feature flag
   */
  const evaluateFlag = useCallback(async <T>(config: FeatureFlagConfig): Promise<ClientFeatureFlagResult<T>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/feature-flags/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flagKey: config.flagKey,
          defaultValue: config.defaultValue,
          type: config.type,
          context: context
        })
      });

      if (!response.ok) {
        throw new Error(`Feature flag evaluation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // Return default value on error
      return {
        value: config.defaultValue,
        reason: 'ERROR',
        metadata: {
          evaluatedAt: new Date().toISOString(),
          clientName: 'web-ui-client',
          contextKeys: Object.keys(context)
        }
      };
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, context]);

  /**
   * Evaluate multiple feature flags in batch
   */
  const evaluateFlags = useCallback(async (configs: FeatureFlagConfig[]): Promise<Record<string, ClientFeatureFlagResult>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/feature-flags/evaluate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flags: configs,
          context: context
        })
      });

      if (!response.ok) {
        throw new Error(`Feature flag batch evaluation failed: ${response.statusText}`);
      }

      const results = await response.json();
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      // Return default values on error
      const fallbackResults: Record<string, ClientFeatureFlagResult> = {};
      configs.forEach(config => {
        fallbackResults[config.flagKey] = {
          value: config.defaultValue,
          reason: 'ERROR',
          metadata: {
            evaluatedAt: new Date().toISOString(),
            clientName: 'web-ui-client',
            contextKeys: Object.keys(context)
          }
        };
      });
      return fallbackResults;
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, context]);

  const contextValue: FeatureFlagContextValue = {
    evaluateFlag,
    evaluateFlags,
    updateContext,
    getContext,
    isLoading,
    error
  };

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook to use feature flags
 * 
 * Provides access to feature flag evaluation capabilities.
 * Must be used within a FeatureFlagProvider.
 */
export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  
  return context;
}

/**
 * Hook to evaluate a single feature flag
 * 
 * Evaluates a feature flag and returns its value along with metadata.
 * Automatically re-evaluates when the evaluation context changes.
 */
export function useFeatureFlag<T = boolean>(
  flagKey: string, 
  defaultValue: T,
  type: 'boolean' | 'string' | 'number' | 'object' = 'boolean'
): {
  value: T;
  isLoading: boolean;
  error: Error | null;
  reason?: string;
  variant?: string;
  metadata?: any;
} {
  const { evaluateFlag, isLoading, error } = useFeatureFlags();
  const [result, setResult] = useState<ClientFeatureFlagResult<T>>({
    value: defaultValue,
    reason: 'DEFAULT'
  });

  useEffect(() => {
    const evaluate = async () => {
      try {
        const evaluationResult = await evaluateFlag<T>({
          flagKey,
          defaultValue,
          type
        });
        setResult(evaluationResult);
      } catch (err) {
        // Error handling is done in the provider
        setResult({
          value: defaultValue,
          reason: 'ERROR'
        });
      }
    };

    evaluate();
  }, [flagKey, defaultValue, type, evaluateFlag]);

  return {
    value: result.value,
    isLoading,
    error,
    reason: result.reason,
    variant: result.variant,
    metadata: result.metadata
  };
}

/**
 * Hook to evaluate multiple feature flags
 * 
 * Evaluates multiple feature flags in batch for better performance.
 * Automatically re-evaluates when the evaluation context changes.
 */
export function useFeatureFlagsBatch<T extends Record<string, any>>(
  flagConfigs: Array<{ key: keyof T; defaultValue: T[keyof T]; type: 'boolean' | 'string' | 'number' | 'object' }>
): {
  values: T;
  isLoading: boolean;
  error: Error | null;
  reasons: Record<keyof T, string>;
  variants: Record<keyof T, string | undefined>;
  metadata: Record<keyof T, any>;
} {
  const { evaluateFlags, isLoading, error } = useFeatureFlags();
  const [results, setResults] = useState<Record<string, ClientFeatureFlagResult>>({});
  const [reasons, setReasons] = useState<Record<keyof T, string>>({} as Record<keyof T, string>);
  const [variants, setVariants] = useState<Record<keyof T, string | undefined>>({} as Record<keyof T, string | undefined>);
  const [metadata, setMetadata] = useState<Record<keyof T, any>>({} as Record<keyof T, any>);

  useEffect(() => {
    const evaluate = async () => {
      try {
        const configs = flagConfigs.map(config => ({
          flagKey: String(config.key),
          defaultValue: config.defaultValue,
          type: config.type
        }));

        const evaluationResults = await evaluateFlags(configs);
        setResults(evaluationResults);

        // Extract reasons, variants, and metadata
        const newReasons = {} as Record<keyof T, string>;
        const newVariants = {} as Record<keyof T, string | undefined>;
        const newMetadata = {} as Record<keyof T, any>;

        flagConfigs.forEach(config => {
          const result = evaluationResults[String(config.key)];
          if (result) {
            newReasons[config.key] = result.reason;
            newVariants[config.key] = result.variant;
            newMetadata[config.key] = result.metadata;
          }
        });

        setReasons(newReasons);
        setVariants(newVariants);
        setMetadata(newMetadata);
      } catch (err) {
        // Error handling is done in the provider
        const fallbackResults: Record<string, ClientFeatureFlagResult> = {};
        const newReasons = {} as Record<keyof T, string>;
        const newVariants = {} as Record<keyof T, string | undefined>;
        const newMetadata = {} as Record<keyof T, any>;

        flagConfigs.forEach(config => {
          fallbackResults[String(config.key)] = {
            value: config.defaultValue,
            reason: 'ERROR'
          };
          newReasons[config.key] = 'ERROR';
          newVariants[config.key] = undefined;
          newMetadata[config.key] = undefined;
        });

        setResults(fallbackResults);
        setReasons(newReasons);
        setVariants(newVariants);
        setMetadata(newMetadata);
      }
    };

    evaluate();
  }, [flagConfigs, evaluateFlags]);

  // Build values object from results
  const values = {} as T;
  flagConfigs.forEach(config => {
    const result = results[String(config.key)];
    values[config.key] = result?.value ?? config.defaultValue;
  });

  return {
    values,
    isLoading,
    error,
    reasons,
    variants,
    metadata
  };
}

/**
 * Hook to update user context for feature flag targeting
 * 
 * Provides a convenient way to update user-specific context
 * that affects feature flag evaluation.
 */
export function useFeatureFlagContext() {
  const { updateContext, getContext } = useFeatureFlags();

  const setUserContext = useCallback((userContext: {
    userId?: string;
    email?: string;
    role?: string;
    team?: string;
  }) => {
    updateContext(userContext);
  }, [updateContext]);

  const setSessionContext = useCallback((sessionContext: {
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
  }) => {
    updateContext(sessionContext);
  }, [updateContext]);

  return {
    setUserContext,
    setSessionContext,
    updateContext,
    getContext
  };
}