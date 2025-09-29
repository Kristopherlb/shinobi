# Cognito User Pool Component

Configuration-driven Amazon Cognito User Pool that honours the shared
ConfigBuilder precedence chain. Compliance-specific defaults (commercial,
FedRAMP moderate/high) are encoded in `/config/<framework>.yml`; the component
only consumes the resolved configuration when synthesising resources.

## Features

- Sign-in aliases, standard/custom attributes, password policy, and device
  tracking driven entirely by configuration.
- Optional SES-backed email configuration and imported SMS role support.
- App client creation with OAuth flows/scopes, identity providers, and token
  validity controls.
- Domain provisioning for Cognito-hosted UI (prefix or custom domain).
- CloudWatch alarms for sign-in/sign-up success rates, throttling, and high risk
  events with thresholds sourced from configuration.
- Capability metadata exposes user-pool identifiers and registered app clients.

## Usage

```yaml
components:
  - name: customer-auth
    type: cognito-user-pool
    config:
      userPoolName: customer-auth-prod
      mfa:
        mode: required
        enableTotp: true
      domain:
        domainPrefix: customer-auth-prod
      appClients:
        - clientName: web-app
          authFlows: ["user-srp"]
          supportedIdentityProviders: ["cognito"]
          oAuth:
            flows: ["authorization-code"]
            scopes: ["openid", "email", "profile"]
            callbackUrls:
              - https://app.example.com/auth/callback
            logoutUrls:
              - https://app.example.com/logout
      monitoring:
        enabled: true
        riskHigh:
          enabled: true
```

Any field omitted inherits the defaults for the active compliance framework.
For example, FedRAMP profiles enforce stringent password policies, mandatory
advanced security mode, and tighter throttling thresholds.

## Key Configuration Sections

| Path | Description |
|------|-------------|
| `signIn` | Enable the sign-in aliases (username/email/phone/preferredUsername). At least one alias must be true. |
| `standardAttributes` | Per-attribute required/mutable flags for built-in Cognito attributes. |
| `customAttributes` | Map of additional attributes with type, mutability, and optional length bounds. |
| `passwordPolicy` | Minimum length and complexity requirements including temporary password validity. |
| `mfa` | MFA enforcement level plus second-factor toggles and SMS template. |
| `featurePlan` | Cognito feature plan (`lite`, `essentials`, `plus`). Advanced security modes require `plus`. |
| `accountRecovery` | Toggle email/phone recovery channels. |
| `email` / `sms` | Optional SES sender configuration and imported SMS role ARN/external ID. |
| `domain` | Cognito-hosted UI prefix or custom domain (with certificate ARN). |
| `appClients[]` | App client definitions (auth flows, providers, OAuth, token validity, secrets). |
| `monitoring` | Enable alarms and specify thresholds/evaluation periods per metric. |
| `tags` | Additional resource tags merged with platform tagging. |

## Capabilities

- `auth:user-pool` – User pool identifiers, provider name/URL, registered client IDs.
- `auth:identity-provider` – Alias of provider name/URL for downstream binders.

## Testing

```bash
corepack pnpm exec jest --runTestsByPath \
  packages/components/cognito-user-pool/tests/cognito-user-pool.builder.test.ts \
  packages/components/cognito-user-pool/tests/cognito-user-pool.component.synthesis.test.ts
```

The builder tests validate platform-default posture per framework and manifest
override precedence. The synthesis suite ensures the component wires Cognito
resources, app clients, domains, and alarms according to the resolved config.
