import { WafWebAclConfigBuilder } from '../../waf-web-acl.builder';
import { WafWebAclConfig } from '../../waf-web-acl.builder';

describe('waf-web-aclBuilder', () => {
  let builder: WafWebAclConfigBuilder;

  beforeEach(() => {
    // builder = new WafWebAclConfigBuilder();
  });

  describe('configuration precedence', () => {
    it('should use hardcoded fallbacks when no config provided', () => {
      const config = builder.build();
      expect(config).toBeDefined();
      // Add specific assertions based on component requirements
    });

    it('should override hardcoded values with user config', () => {
      const userConfig = {
        // Add user config properties
      };
      const config = builder.build(userConfig);
      expect(config).toEqual(expect.objectContaining(userConfig));
    });

    it('should apply framework defaults for fedramp-moderate', () => {
      const config = builder.build({}, 'fedramp-moderate');
      expect(config).toBeDefined();
      // Add framework-specific assertions
    });

    it('should apply framework defaults for fedramp-high', () => {
      const config = builder.build({}, 'fedramp-high');
      expect(config).toBeDefined();
      // Add framework-specific assertions
    });
  });

  describe('validation', () => {
    it('should validate required properties', () => {
      expect(() => builder.build({})).not.toThrow();
    });

    it('should throw on invalid configuration', () => {
      const invalidConfig = {
        // Add invalid config properties
      };
      expect(() => builder.build(invalidConfig)).toThrow();
    });
  });
});
