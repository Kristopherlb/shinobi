/**
 * Feature Flag Example Component
 * 
 * Demonstrates how to use feature flags in React components.
 * Shows both single flag evaluation and batch evaluation patterns.
 */

import React from 'react';
import { useFeatureFlag, useFeatureFlagsBatch, useFeatureFlagContext } from '../hooks/useFeatureFlags';

/**
 * Example component showing single feature flag usage
 */
export function SingleFeatureFlagExample() {
  // Evaluate a single feature flag
  const { value: isNewFeatureEnabled, isLoading, error, reason } = useFeatureFlag(
    'new-feature-enabled',
    false, // default value
    'boolean'
  );

  if (isLoading) {
    return <div className="p-4 border rounded-lg bg-gray-50">Loading feature flag...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
        <p className="text-red-600">Error loading feature flag: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
      <h3 className="font-semibold text-blue-900">Single Feature Flag Example</h3>
      <p className="text-blue-700">
        New Feature Enabled: {isNewFeatureEnabled ? 'Yes' : 'No'}
      </p>
      <p className="text-sm text-blue-600">
        Reason: {reason}
      </p>
    </div>
  );
}

/**
 * Example component showing batch feature flag evaluation
 */
export function BatchFeatureFlagsExample() {
  // Evaluate multiple feature flags at once
  const { values, isLoading, error, reasons, variants } = useFeatureFlagsBatch([
    { key: 'new-dashboard', defaultValue: false, type: 'boolean' },
    { key: 'theme-color', defaultValue: 'blue', type: 'string' },
    { key: 'max-items', defaultValue: 10, type: 'number' },
    { key: 'ui-config', defaultValue: {}, type: 'object' }
  ]);

  if (isLoading) {
    return <div className="p-4 border rounded-lg bg-gray-50">Loading feature flags...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
        <p className="text-red-600">Error loading feature flags: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
      <h3 className="font-semibold text-green-900">Batch Feature Flags Example</h3>
      <div className="space-y-2 mt-2">
        <p className="text-green-700">
          <span className="font-medium">New Dashboard:</span> {values.newDashboard ? 'Enabled' : 'Disabled'}
          <span className="text-sm text-green-600 ml-2">({reasons.newDashboard})</span>
        </p>
        <p className="text-green-700">
          <span className="font-medium">Theme Color:</span> {values.themeColor}
          <span className="text-sm text-green-600 ml-2">({reasons.themeColor})</span>
        </p>
        <p className="text-green-700">
          <span className="font-medium">Max Items:</span> {values.maxItems}
          <span className="text-sm text-green-600 ml-2">({reasons.maxItems})</span>
        </p>
        <p className="text-green-700">
          <span className="font-medium">UI Config:</span> {JSON.stringify(values.uiConfig)}
          <span className="text-sm text-green-600 ml-2">({reasons.uiConfig})</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Example component showing user context management
 */
export function UserContextExample() {
  const { setUserContext, setSessionContext, getContext } = useFeatureFlagContext();

  const handleSetUser = () => {
    setUserContext({
      userId: 'user-123',
      email: 'user@example.com',
      role: 'admin',
      team: 'platform'
    });
  };

  const handleSetSession = () => {
    setSessionContext({
      sessionId: 'session-456',
      userAgent: 'Mozilla/5.0...',
      ipAddress: '192.168.1.1'
    });
  };

  const currentContext = getContext();

  return (
    <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
      <h3 className="font-semibold text-purple-900">User Context Management</h3>
      <div className="space-y-3 mt-3">
        <div>
          <button
            onClick={handleSetUser}
            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Set User Context
          </button>
          <button
            onClick={handleSetSession}
            className="ml-2 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Set Session Context
          </button>
        </div>
        <div className="text-sm">
          <p className="font-medium text-purple-800">Current Context:</p>
          <pre className="text-xs text-purple-700 bg-purple-100 p-2 rounded mt-1 overflow-auto">
            {JSON.stringify(currentContext, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * Main feature flag example component that combines all examples
 */
export function FeatureFlagExample() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Feature Flag Examples</h1>
        <p className="text-gray-600">
          Demonstrating OpenFeature integration with Shinobi platform
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SingleFeatureFlagExample />
        <BatchFeatureFlagsExample />
      </div>

      <UserContextExample />

      <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
        <h3 className="font-semibold text-yellow-900">Integration Notes</h3>
        <ul className="text-yellow-700 text-sm mt-2 space-y-1">
          <li>• Feature flags are evaluated server-side using Shinobi's OpenFeature integration</li>
          <li>• Client-side hooks provide React-friendly APIs for flag evaluation</li>
          <li>• User context can be set to enable targeted flag evaluation</li>
          <li>• Batch evaluation is available for better performance</li>
          <li>• All evaluations are logged for audit and compliance</li>
        </ul>
      </div>
    </div>
  );
}
