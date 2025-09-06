/**
 * SNS Topic Import Component
 * Imports an existing SNS topic for publishing/subscribing purposes
 * Does NOT create new infrastructure - only references existing resources
 */

import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { BaseComponent, ComponentContext, ComponentCapabilities } from '../base/base-component';
import { Logger } from '../../utils/logger';

export interface SnsTopicImportConfig {
  topicArn: string;
  topicName?: string; // Optional friendly name for the topic
}

export interface SnsTopicImportDependencies {
  logger: Logger;
}

/**
 * Import component for existing SNS topics
 * Enables secure binding to shared messaging resources managed by other teams
 */
export class SnsTopicImportComponent extends BaseComponent<SnsTopicImportConfig> {
  private topic: sns.ITopic;

  constructor(
    scope: Construct,
    id: string,
    private config: SnsTopicImportConfig,
    private dependencies: SnsTopicImportDependencies
  ) {
    super(scope, id);
    
    // Validate required configuration
    this.validateConfig();
    
    // Import the existing topic
    this.importExistingTopic();
  }

  /**
   * Synthesis phase - Import existing topic without creating new ones
   */
  async synth(context: ComponentContext): Promise<void> {
    this.dependencies.logger.debug(`Importing existing SNS topic: ${this.config.topicArn}`);
    
    // The topic is already imported in constructor
    // This method is called for consistency with the platform lifecycle
    
    this.dependencies.logger.debug('SNS topic import component synthesis completed');
  }

  /**
   * Get the capabilities this imported topic provides
   */
  getCapabilities(): ComponentCapabilities {
    return {
      'topic:sns': {
        description: 'SNS topic messaging capabilities',
        bindings: {
          read: {
            description: 'Subscribe to messages from the topic',
            environmentVariables: {
              SNS_TOPIC_ARN: 'ARN of the SNS topic for subscription',
              SNS_TOPIC_NAME: 'Name of the SNS topic'
            }
          },
          write: {
            description: 'Publish messages to the topic',
            environmentVariables: {
              SNS_TOPIC_ARN: 'ARN of the SNS topic for publishing',
              SNS_TOPIC_NAME: 'Name of the SNS topic'
            }
          },
          readwrite: {
            description: 'Both publish and subscribe to the topic',
            environmentVariables: {
              SNS_TOPIC_ARN: 'ARN of the SNS topic',
              SNS_TOPIC_NAME: 'Name of the SNS topic'
            }
          },
          admin: {
            description: 'Full administrative access to the topic',
            environmentVariables: {
              SNS_TOPIC_ARN: 'ARN of the SNS topic',
              SNS_TOPIC_NAME: 'Name of the SNS topic'
            }
          }
        }
      }
    };
  }

  /**
   * Get the imported SNS topic for binding strategies
   */
  getTopic(): sns.ITopic {
    return this.topic;
  }

  /**
   * Validate the import configuration
   */
  private validateConfig(): void {
    if (!this.config.topicArn) {
      throw new Error('topicArn is required for SNS topic import component');
    }

    // Validate ARN format
    if (!this.config.topicArn.startsWith('arn:aws:sns:')) {
      throw new Error(`Invalid SNS topic ARN format: ${this.config.topicArn}`);
    }

    // Extract and validate ARN parts
    const arnParts = this.config.topicArn.split(':');
    if (arnParts.length !== 6) {
      throw new Error(`Invalid SNS topic ARN format: ${this.config.topicArn}. Expected format: arn:aws:sns:region:account:topic-name`);
    }

    const topicName = arnParts[5];
    if (!topicName || topicName.trim() === '') {
      throw new Error(`Invalid topic name in ARN: ${this.config.topicArn}`);
    }
  }

  /**
   * Import existing SNS topic using CDK's fromTopicArn method
   */
  private importExistingTopic(): void {
    this.dependencies.logger.debug('Importing existing SNS topic');

    // Import the SNS topic using its ARN
    this.topic = sns.Topic.fromTopicArn(
      this,
      'ImportedTopic',
      this.config.topicArn
    );

    this.dependencies.logger.debug('SNS topic imported successfully');
  }

  /**
   * Get resource references for CloudFormation outputs or binding
   */
  getResourceReferences(): Record<string, any> {
    return {
      topic: this.topic,
      topicArn: this.config.topicArn,
      topicName: this.config.topicName || this.extractTopicNameFromArn()
    };
  }

  /**
   * Extract topic name from ARN for reference purposes
   */
  private extractTopicNameFromArn(): string {
    const arnParts = this.config.topicArn.split(':');
    return arnParts[5]; // Topic name is the last part of the ARN
  }
}