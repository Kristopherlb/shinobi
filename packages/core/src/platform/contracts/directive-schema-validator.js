/**
 * Directive Schema Validator
 *
 * Validates binding directives before execution to prevent injection attacks
 * and ensure type safety. Validates:
 * - directive.options against capability-specific JSON schemas
 * - directive.env against allow-list of permitted keys
 * - Rejects unknown keys in options
 * - Deep freezes directive after validation
 *
 * SECURITY: This validator is critical for preventing directive injection attacks.
 * All directives must be validated before binding execution.
 */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { getDirectiveSchema, getEnvAllowList } from './schemas/directive-schemas.js';
// AJV v8 ESM import - use default export correctly
const ajv = new Ajv({
    allErrors: true,
    strict: true,
    strictSchema: true,
    strictNumbers: true,
    strictTypes: true,
    strictTuples: true,
    strictRequired: true
});
// ajv-formats ESM default export
addFormats(ajv);
/**
 * Validation error for directive schema validation failures
 */
export class DirectiveValidationError extends Error {
    errors;
    constructor(errors, message = 'Directive validation failed') {
        super(message);
        this.errors = errors;
        this.name = 'DirectiveValidationError';
    }
}
/**
 * Directive Schema Validator
 *
 * Validates binding directives against capability-specific schemas
 * and environment variable allow-lists.
 */
export class DirectiveSchemaValidator {
    /**
     * Validate a binding directive
     *
     * @param directive - Binding directive to validate
     * @param capability - Target capability (e.g., 's3:bucket', 'kms:key')
     * @returns Validated and frozen directive
     * @throws DirectiveValidationError if validation fails
     */
    static validate(directive, capability) {
        const errors = [];
        // Validate options against capability-specific schema
        if (directive.options) {
            const schema = getDirectiveSchema(capability);
            if (schema) {
                const validate = ajv.compile(schema);
                const valid = validate(directive.options);
                if (!valid && validate.errors) {
                    for (const error of validate.errors) {
                        const path = error.instancePath || error.schemaPath || 'options';
                        errors.push({
                            path,
                            message: error.message || `Invalid value at ${path}`
                        });
                    }
                }
            }
            else {
                // No schema defined for this capability - reject all options to be safe
                // This prevents unknown capabilities from accepting arbitrary options
                const optionKeys = Object.keys(directive.options);
                if (optionKeys.length > 0) {
                    errors.push({
                        path: 'options',
                        message: `Unknown capability '${capability}'. Options are not allowed for unknown capabilities.`
                    });
                }
            }
        }
        // Validate env keys against allow-list
        if (directive.env) {
            const allowList = getEnvAllowList(capability);
            const envKeys = Object.keys(directive.env);
            for (const key of envKeys) {
                // Block sensitive system variables
                if (this.isSensitiveEnvVar(key)) {
                    errors.push({
                        path: `env.${key}`,
                        message: `Environment variable '${key}' is blocked for security reasons. Use a prefixed variable name instead.`
                    });
                    continue;
                }
                // Check allow-list if defined
                if (allowList && allowList.length > 0) {
                    if (!allowList.includes(key)) {
                        errors.push({
                            path: `env.${key}`,
                            message: `Environment variable '${key}' is not in the allow-list for capability '${capability}'. ` +
                                `Allowed variables: ${allowList.join(', ')}`
                        });
                    }
                }
                // If no allow-list defined, allow all non-sensitive vars (for backwards compatibility)
                // But log a warning
                else {
                    console.warn(`[SECURITY] No env allow-list defined for capability '${capability}'. ` +
                        `Allowing environment variable '${key}'. Consider defining an allow-list.`);
                }
            }
        }
        if (errors.length > 0) {
            throw new DirectiveValidationError(errors, `Directive validation failed: ${errors.length} error(s)`);
        }
        // Deep freeze directive after validation to prevent tampering
        return this.deepFreeze(directive);
    }
    /**
     * Check if an environment variable name is sensitive and should be blocked
     *
     * @param key - Environment variable key
     * @returns True if the variable is sensitive and should be blocked
     */
    static isSensitiveEnvVar(key) {
        const sensitiveVars = [
            'PATH',
            'LD_LIBRARY_PATH',
            'LD_PRELOAD',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_SESSION_TOKEN',
            'AWS_SECURITY_TOKEN',
            'HOME',
            'USER',
            'SHELL',
            'TMPDIR',
            'TEMP',
            'TMP',
            'NODE_ENV', // Could affect runtime behavior
            'NODE_OPTIONS', // Could inject code
            'NPM_CONFIG', // Could affect package installation
            'PYTHONPATH', // Could affect Python execution
            'JAVA_HOME', // Could affect Java execution
            'GOPATH', // Could affect Go execution
            'RUBYLIB', // Could affect Ruby execution
            'PERL5LIB', // Could affect Perl execution
            'LANG',
            'LC_ALL',
            'LC_CTYPE',
            'DISPLAY', // X11 display
            'XAUTHORITY', // X11 authority
            'SSH_AUTH_SOCK', // SSH agent socket
            'GPG_AGENT_INFO', // GPG agent
            'DBUS_SESSION_BUS_ADDRESS', // D-Bus session
            'XDG_RUNTIME_DIR', // XDG runtime directory
            'XDG_SESSION_ID', // XDG session ID
            'XDG_SESSION_TYPE', // XDG session type
            'XDG_CURRENT_DESKTOP', // XDG desktop
            'SESSION_MANAGER', // Session manager
            'WINDOWID', // Window ID
            'COLUMNS', // Terminal columns
            'LINES', // Terminal lines
            'TERM', // Terminal type
            'TERMINAL', // Terminal emulator
            'WINDOWMANAGER', // Window manager
            'DESKTOP_SESSION', // Desktop session
            'XDG_SESSION_DESKTOP', // XDG desktop session
            'XDG_SESSION_CLASS', // XDG session class
            'XDG_SEAT', // XDG seat
            'XDG_VTNR', // XDG virtual terminal number
            'XDG_CONFIG_DIRS', // XDG config directories
            'XDG_DATA_DIRS', // XDG data directories
            'XDG_CACHE_HOME', // XDG cache home
            'XDG_CONFIG_HOME', // XDG config home
            'XDG_DATA_HOME', // XDG data home
            'XDG_RUNTIME_DIR', // XDG runtime directory
            'XDG_STATE_HOME', // XDG state home
            'XDG_BIN_HOME', // XDG bin home
            'HOSTNAME', // Hostname
            'HOST', // Host
            'DOMAINNAME', // Domain name
            'LOGNAME', // Login name
            'MAIL', // Mail
            'PWD', // Current directory
            'OLDPWD', // Previous directory
            'SHLVL', // Shell level
            'BASH_ENV', // Bash environment
            'BASH_FUNC', // Bash functions
            'BASHOPTS', // Bash options
            'BASHPID', // Bash PID
            'BASH_VERSION', // Bash version
            'BASH_VERSINFO', // Bash version info
            'BASH_XTRACEFD', // Bash trace FD
            'BASH_SUBSHELL', // Bash subshell
            'BASH_LINENO', // Bash line number
            'BASH_SOURCE', // Bash source
            'BASH_ARGC', // Bash argc
            'BASH_ARGV', // Bash argv
            'BASH_CMDS', // Bash commands
            'BASH_COMMAND', // Bash command
            'BASH_EXECUTION_STRING', // Bash execution string
            'BASH_REMATCH', // Bash rematch
            'COMP_CWORD', // Completion word
            'COMP_KEY', // Completion key
            'COMP_LINE', // Completion line
            'COMP_POINT', // Completion point
            'COMP_TYPE', // Completion type
            'COMP_WORDBREAKS', // Completion word breaks
            'COMP_WORDS', // Completion words
            'DIRSTACK', // Directory stack
            'EUID', // Effective UID
            'FUNCNAME', // Function name
            'GROUPS', // Groups
            'HISTCMD', // History command
            'HOSTNAME', // Hostname
            'HOSTTYPE', // Host type
            'IFS', // Internal field separator
            'IGNOREEOF', // Ignore EOF
            'LANG', // Language
            'LC_ALL', // Locale all
            'LC_COLLATE', // Locale collate
            'LC_CTYPE', // Locale ctype
            'LC_MESSAGES', // Locale messages
            'LC_MONETARY', // Locale monetary
            'LC_NUMERIC', // Locale numeric
            'LC_TIME', // Locale time
            'LINENO', // Line number
            'MACHTYPE', // Machine type
            'MAILCHECK', // Mail check
            'OPTERR', // Option error
            'OPTIND', // Option index
            'OSTYPE', // OS type
            'PIPESTATUS', // Pipe status
            'POSIXLY_CORRECT', // POSIX correct
            'PPID', // Parent PID
            'PS1', // Prompt string 1
            'PS2', // Prompt string 2
            'PS3', // Prompt string 3
            'PS4', // Prompt string 4
            'PWD', // Current directory
            'RANDOM', // Random number
            'REPLY', // Reply
            'SECONDS', // Seconds
            'SHELLOPTS', // Shell options
            'SHLVL', // Shell level
            'UID', // User ID
            '_', // Last argument
            'BASH_ENV', // Bash environment
            'CDPATH', // CD path
            'COLUMNS', // Columns
            'COMPREPLY', // Completion reply
            'EMACS', // Emacs
            'FCEDIT', // FC edit
            'FIGNORE', // FIGNORE
            'GLOBIGNORE', // Glob ignore
            'HISTCONTROL', // History control
            'HISTFILE', // History file
            'HISTFILESIZE', // History file size
            'HISTSIZE', // History size
            'HISTTIMEFORMAT', // History time format
            'HOME', // Home directory
            'HOSTFILE', // Host file
            'IGNOREEOF', // Ignore EOF
            'INPUTRC', // Input RC
            'LANG', // Language
            'LC_ALL', // Locale all
            'MAIL', // Mail
            'MAILPATH', // Mail path
            'OLDPWD', // Old PWD
            'PATH', // Path
            'PROMPT_COMMAND', // Prompt command
            'PROMPT_DIRTRIM', // Prompt dir trim
            'PS1', // Prompt string 1
            'PS2', // Prompt string 2
            'PS3', // Prompt string 3
            'PS4', // Prompt string 4
            'PWD', // Current directory
            'SHELL', // Shell
            'TIMEFORMAT', // Time format
            'TMOUT', // Timeout
            'TMPDIR', // Temp directory
            'auto_resume', // Auto resume
            'histchars', // History chars
        ];
        return sensitiveVars.includes(key.toUpperCase());
    }
    /**
     * Deep freeze an object to prevent tampering
     *
     * @param obj - Object to freeze
     * @returns Frozen object
     */
    static deepFreeze(obj) {
        // Freeze the object itself
        Object.freeze(obj);
        // Freeze all properties
        Object.getOwnPropertyNames(obj).forEach((prop) => {
            const value = obj[prop];
            if (value && typeof value === 'object' && !Object.isFrozen(value)) {
                this.deepFreeze(value);
            }
        });
        return obj;
    }
}
//# sourceMappingURL=directive-schema-validator.js.map