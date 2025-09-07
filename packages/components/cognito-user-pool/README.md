# Cognito User Pool Component

Enterprise-grade Amazon Cognito User Pool for secure user authentication and authorization with advanced features including MFA, federation, and comprehensive compliance controls.

## Overview

This component provides a fully managed user authentication service with:

- **User Management**: Registration, verification, password policies, and user attributes
- **Multi-Factor Authentication**: SMS, email, and TOTP-based MFA support
- **Federation**: Integration with SAML, OIDC, and social identity providers
- **Compliance Hardening**: Three-tier compliance support (Commercial/FedRAMP Moderate/FedRAMP High)
- **Advanced Security**: Risk-based authentication, account takeover protection, and audit logging

## Capabilities

- **auth:user-pool**: Provides user authentication and authorization services for applications

## Configuration

```yaml
components:
  - name: app-user-pool
    type: cognito-user-pool
    config:
      userPoolName: ApplicationUserPool
      
      # User pool policies
      policies:
        passwordPolicy:
          minimumLength: 12
          requireUppercase: true
          requireLowercase: true
          requireNumbers: true
          requireSymbols: true
          temporaryPasswordValidityDays: 1
      
      # MFA configuration
      mfaConfiguration: OPTIONAL
      enabledMfas:
        - SMS_MFA
        - SOFTWARE_TOKEN_MFA
      
      # User attributes
      attributes:
        standard:
          - email
          - phone_number
          - given_name
          - family_name
        custom:
          - department
          - employee_id
          - security_clearance
      
      requiredAttributes:
        - email
        - given_name
        - family_name
      
      # Auto-verified attributes
      autoVerifiedAttributes:
        - email
        - phone_number
      
      # User registration
      selfSignUpEnabled: true
      adminCreateUserConfig:
        allowAdminCreateUserOnly: false
        temporaryPasswordValidityDays: 7
        messageAction: SUPPRESS  # Don't send welcome email for admin-created users
      
      # Account recovery
      accountRecoverySetting:
        recoveryMechanisms:
          - name: verified_email
            priority: 1
          - name: verified_phone_number
            priority: 2
      
      # Device tracking
      deviceConfiguration:
        challengeRequiredOnNewDevice: true
        deviceOnlyRememberedOnUserPrompt: false
      
      # Email configuration
      emailConfiguration:
        emailSendingAccount: DEVELOPER
        sourceArn: arn:aws:ses:us-east-1:123456789012:identity/noreply@company.com
        replyToEmailAddress: support@company.com
        
      # SMS configuration  
      smsConfiguration:
        snsCallerArn: arn:aws:iam::123456789012:role/CognitoSMSRole
        externalId: unique-external-id-123
        snsRegion: us-east-1
      
      # Lambda triggers
      lambdaTriggers:
        preSignUp: arn:aws:lambda:us-east-1:123456789012:function:PreSignUpTrigger
        postConfirmation: arn:aws:lambda:us-east-1:123456789012:function:PostConfirmationTrigger
        preAuthentication: arn:aws:lambda:us-east-1:123456789012:function:PreAuthTrigger
        postAuthentication: arn:aws:lambda:us-east-1:123456789012:function:PostAuthTrigger
        preTokenGeneration: arn:aws:lambda:us-east-1:123456789012:function:PreTokenGenerationTrigger
      
      # Advanced security features
      userPoolAddOns:
        advancedSecurityMode: ENFORCED
      
      tags:
        auth-type: user-pool
        mfa-enabled: "true"
        security-level: high
```

## Binding Examples

### Application Client Configuration

```yaml
components:
  - name: web-app-client
    type: cognito-user-pool-client
    config:
      clientName: WebApplicationClient
      userPoolId: ${app-user-pool.userPoolId}
      generateSecret: false
      
      supportedIdentityProviders:
        - COGNITO
        - Google
        - SAML
      
      callbackUrls:
        - https://app.company.com/auth/callback
      logoutUrls:
        - https://app.company.com/logout
      
      allowedOAuthFlows:
        - authorization_code
        - implicit
      allowedOAuthScopes:
        - openid
        - profile
        - email
      
      explicitAuthFlows:
        - ALLOW_USER_PASSWORD_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH
        - ALLOW_USER_SRP_AUTH
    binds:
      - to: app-user-pool
        capability: auth:user-pool
        access: client
```

### API Gateway Authorizer

```yaml
components:
  - name: api-gateway
    type: api-gateway-v2
    config:
      authorizers:
        - name: CognitoAuthorizer
          type: JWT
          jwtConfiguration:
            issuer: https://cognito-idp.us-east-1.amazonaws.com/${app-user-pool.userPoolId}
            audience:
              - ${web-app-client.clientId}
    binds:
      - to: app-user-pool
        capability: auth:user-pool
        access: authorize
```

## Compliance Features

### Commercial
- Basic password policies and user management
- Standard MFA options (SMS, email)
- Basic security monitoring

### FedRAMP Moderate
- Enhanced password policies with complexity requirements
- Multi-factor authentication mandatory for admin users
- Advanced security features enabled (risk-based auth)
- Comprehensive audit logging with 1-year retention
- Account lockout and takeover protection

### FedRAMP High
- Strict password policies with maximum complexity
- Multi-factor authentication mandatory for all users
- Advanced security mode enforced
- Comprehensive audit logging with 10-year retention
- Enhanced account protection and monitoring
- FIPS 140-2 Level 1 compliance

## Advanced Configuration

### Identity Providers Integration

```yaml
config:
  identityProviders:
    - providerName: Google
      providerType: Google
      providerDetails:
        client_id: google-client-id.apps.googleusercontent.com
        client_secret: google-client-secret
      attributeMapping:
        email: email
        given_name: given_name
        family_name: family_name
    
    - providerName: SAML_Corporate
      providerType: SAML
      providerDetails:
        MetadataURL: https://corporate-idp.company.com/metadata
        SLORedirectBindingURI: https://corporate-idp.company.com/slo
        SSORedirectBindingURI: https://corporate-idp.company.com/sso
      attributeMapping:
        email: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
        given_name: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname
        family_name: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname
        custom:department: http://company.com/claims/department
```

### Custom Message Templates

```yaml
config:
  verificationMessageTemplate:
    emailMessage: |
      Welcome to our application! Your verification code is {####}
      
      If you didn't request this, please ignore this email.
      
      Best regards,
      The Application Team
    emailSubject: "Verify your account - {####}"
    smsMessage: "Your verification code for MyApp is {####}"
    defaultEmailOption: CONFIRM_WITH_CODE
```

### Risk Configuration

```yaml
config:
  riskConfiguration:
    compromisedCredentialsRiskConfiguration:
      actions:
        eventAction: BLOCK
      eventFilter:
        - SIGN_IN
        - SIGN_UP
        - PASSWORD_CHANGE
    
    accountTakeoverRiskConfiguration:
      actions:
        lowAction:
          notify: true
          eventAction: NO_ACTION
        mediumAction:
          notify: true
          eventAction: MFA_IF_CONFIGURED
        highAction:
          notify: true
          eventAction: MFA_REQUIRED
      
      notifyConfiguration:
        from: security@company.com
        subject: "Security Alert: Suspicious Activity"
        htmlBody: |
          <p>We detected suspicious activity on your account.</p>
          <p>If this was you, you can ignore this email.</p>
        textBody: |
          We detected suspicious activity on your account.
          If this was you, you can ignore this email.
```

## Monitoring and Observability

The component automatically configures:

- **CloudWatch Metrics**: Authentication events, MFA usage, user activity
- **CloudWatch Logs**: Authentication logs and Lambda trigger execution
- **AWS CloudTrail**: Administrative actions and configuration changes
- **User Pool Analytics**: Sign-in metrics, MFA adoption, user journey analytics
- **Security Events**: Compromise credential events, account takeover attempts

### Monitoring Levels

- **Basic**: Standard authentication metrics and basic security events
- **Enhanced**: Detailed user analytics + MFA adoption + security event analysis
- **Comprehensive**: Enhanced + risk analytics + compliance reporting + threat intelligence

## Security Features

### Advanced Security
- Adaptive authentication based on risk assessment
- Device tracking and remembering
- Compromised credential detection
- Account takeover protection

### Multi-Factor Authentication
- SMS-based MFA with phone verification
- Time-based one-time passwords (TOTP)
- Software token MFA support
- MFA enforcement policies

### Access Control
- Fine-grained user attribute access
- Resource-based policies for user pool access
- Cross-account access support
- API-level access controls

## Lambda Triggers

### Pre-Sign-Up Trigger

```javascript
exports.handler = async (event) => {
    console.log('Pre-sign-up trigger:', JSON.stringify(event, null, 2));
    
    const { userAttributes } = event.request;
    
    // Validate business rules
    if (!userAttributes.email.endsWith('@company.com')) {
        throw new Error('Only company email addresses are allowed');
    }
    
    // Check against internal directory
    const isValidEmployee = await checkEmployeeDirectory(userAttributes.email);
    if (!isValidEmployee) {
        throw new Error('User not found in employee directory');
    }
    
    // Auto-confirm users from trusted domain
    if (userAttributes.email.endsWith('@company.com')) {
        event.response.autoConfirmUser = true;
        event.response.autoVerifyEmail = true;
    }
    
    // Set custom attributes
    event.response.userAttributes = {
        ...userAttributes,
        'custom:department': await getDepartment(userAttributes.email),
        'custom:employee_id': await getEmployeeId(userAttributes.email)
    };
    
    return event;
};

async function checkEmployeeDirectory(email) {
    // Check against LDAP/Active Directory
    // Implementation depends on your directory service
    return true;
}

async function getDepartment(email) {
    // Lookup department from employee directory
    return 'Engineering';
}

async function getEmployeeId(email) {
    // Lookup employee ID from directory
    return 'EMP-12345';
}
```

### Pre-Token Generation Trigger

```javascript
exports.handler = async (event) => {
    console.log('Pre-token generation trigger:', JSON.stringify(event, null, 2));
    
    const { userAttributes } = event.request;
    
    // Add custom claims to tokens
    event.response = {
        claimsOverrideDetails: {
            claimsToAddOrOverride: {
                'department': userAttributes['custom:department'],
                'employee_id': userAttributes['custom:employee_id'],
                'security_clearance': userAttributes['custom:security_clearance'],
                'roles': await getUserRoles(event.userName)
            },
            claimsToSuppress: ['email_verified'] // Remove sensitive claims
        }
    };
    
    return event;
};

async function getUserRoles(userName) {
    // Lookup user roles from your authorization system
    return ['user', 'employee'];
}
```

### Post-Confirmation Trigger

```javascript
exports.handler = async (event) => {
    console.log('Post-confirmation trigger:', JSON.stringify(event, null, 2));
    
    const { userAttributes, userName } = event.request;
    
    try {
        // Create user profile in application database
        await createUserProfile({
            cognitoId: userName,
            email: userAttributes.email,
            firstName: userAttributes.given_name,
            lastName: userAttributes.family_name,
            department: userAttributes['custom:department']
        });
        
        // Send welcome email
        await sendWelcomeEmail(userAttributes.email, userAttributes.given_name);
        
        // Add user to default groups
        await addUserToGroups(userName, ['employees', 'standard-users']);
        
        // Log successful user creation
        console.log(`User profile created successfully for ${userName}`);
        
    } catch (error) {
        console.error('Error in post-confirmation:', error);
        // Don't throw - user is already confirmed
    }
    
    return event;
};

async function createUserProfile(userData) {
    // Implementation to create user in your database
}

async function sendWelcomeEmail(email, firstName) {
    // Implementation to send welcome email via SES
}

async function addUserToGroups(userName, groups) {
    // Implementation to add user to Cognito groups
}
```

## User Management

### Programmatic User Operations

```javascript
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

class CognitoUserService {
    constructor(userPoolId) {
        this.userPoolId = userPoolId;
    }
    
    async createUser(userData) {
        const params = {
            UserPoolId: this.userPoolId,
            Username: userData.email,
            UserAttributes: [
                { Name: 'email', Value: userData.email },
                { Name: 'given_name', Value: userData.firstName },
                { Name: 'family_name', Value: userData.lastName },
                { Name: 'email_verified', Value: 'true' }
            ],
            TemporaryPassword: this.generateTemporaryPassword(),
            MessageAction: 'SUPPRESS' // Don't send email
        };
        
        return await cognito.adminCreateUser(params).promise();
    }
    
    async enableMFA(username) {
        const params = {
            UserPoolId: this.userPoolId,
            Username: username,
            SMSMfaSettings: {
                Enabled: true,
                PreferredMfa: true
            }
        };
        
        return await cognito.adminSetUserMFAPreference(params).promise();
    }
    
    async addUserToGroup(username, groupName) {
        const params = {
            UserPoolId: this.userPoolId,
            Username: username,
            GroupName: groupName
        };
        
        return await cognito.adminAddUserToGroup(params).promise();
    }
    
    async getUserAttributes(username) {
        const params = {
            UserPoolId: this.userPoolId,
            Username: username
        };
        
        const result = await cognito.adminGetUser(params).promise();
        
        // Convert attribute array to object
        const attributes = {};
        result.UserAttributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
        });
        
        return attributes;
    }
    
    generateTemporaryPassword() {
        // Generate secure temporary password
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
    }
}
```

## Client-Side Integration

### Web Application (JavaScript)

```javascript
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

class AuthService {
    constructor(userPoolId, clientId) {
        this.userPool = new CognitoUserPool({
            UserPoolId: userPoolId,
            ClientId: clientId
        });
    }
    
    signUp(email, password, attributes) {
        return new Promise((resolve, reject) => {
            const attributeList = attributes.map(attr => ({
                Name: attr.name,
                Value: attr.value
            }));
            
            this.userPool.signUp(email, password, attributeList, null, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result.user);
            });
        });
    }
    
    signIn(email, password) {
        return new Promise((resolve, reject) => {
            const authenticationDetails = new AuthenticationDetails({
                Username: email,
                Password: password
            });
            
            const cognitoUser = new CognitoUser({
                Username: email,
                Pool: this.userPool
            });
            
            cognitoUser.authenticateUser(authenticationDetails, {
                onSuccess: (result) => {
                    resolve({
                        accessToken: result.getAccessToken().getJwtToken(),
                        idToken: result.getIdToken().getJwtToken(),
                        refreshToken: result.getRefreshToken().getToken()
                    });
                },
                onFailure: (err) => {
                    reject(err);
                },
                mfaRequired: (codeDeliveryDetails) => {
                    // Handle MFA challenge
                    resolve({ mfaRequired: true, codeDeliveryDetails });
                }
            });
        });
    }
    
    getCurrentUser() {
        return this.userPool.getCurrentUser();
    }
    
    signOut() {
        const cognitoUser = this.userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.signOut();
        }
    }
}
```

## Troubleshooting

### Common Issues

1. **MFA Setup Failures**
   - Verify SMS configuration and IAM role permissions
   - Check phone number format and verification status
   - Review MFA enforcement policies

2. **Federation Issues**
   - Verify SAML metadata configuration
   - Check attribute mapping between IdP and Cognito
   - Review callback URLs and domain configuration

3. **Lambda Trigger Errors**
   - Check CloudWatch Logs for trigger execution errors
   - Verify Lambda function permissions
   - Review trigger configuration and event format

### Debug Mode

Enable detailed logging and monitoring:

```yaml
config:
  tags:
    debug: "true"
    detailed-logging: "enabled"
    
  # Enable all CloudWatch Logs exports
  enableCloudWatchLogsExports: true
  
  # Enhanced monitoring
  userPoolAddOns:
    advancedSecurityMode: AUDIT
```

## Examples

See the [`examples/`](../../examples/) directory for complete service templates:

- `examples/web-app-auth/` - Web application with Cognito authentication
- `examples/mobile-app-auth/` - Mobile app authentication patterns
- `examples/enterprise-federation/` - Enterprise SAML federation setup

## API Reference

### CognitoUserPoolComponent

Main component class that extends `Component`.

#### Methods

- `synth()`: Creates AWS resources (User Pool, Identity Providers, Lambda Triggers)
- `getCapabilities()`: Returns auth:user-pool capability
- `getType()`: Returns 'cognito-user-pool'

### Configuration Interfaces

- `CognitoUserPoolConfig`: Main configuration interface
- `COGNITO_USER_POOL_CONFIG_SCHEMA`: JSON schema for validation

## Development

To contribute to this component:

1. Make changes to the source code
2. Run tests: `npm test`
3. Build: `npm run build`
4. Follow the [Contributing Guide](../../../CONTRIBUTING.md)

## License

MIT License - see LICENSE file for details.