/**
 * ClamAV Scanning Service
 *
 * Reusable platform service for virus scanning across multiple storage services
 * including S3, EFS, and other file storage systems.
 */
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { ComponentContext } from '../../contracts/component-interfaces.js';
export interface ClamAvScanningConfig {
    enabled: boolean;
    scanOnUpload: boolean;
    scanOnDownload?: boolean;
    quarantineEnabled: boolean;
    notificationTopics?: string[];
    scanTimeout: number;
    maxFileSize: number;
}
export interface StorageTarget {
    type: 's3' | 'efs' | 'fsx';
    bucketArn?: string;
    efsArn?: string;
    fsxArn?: string;
    path?: string;
}
export interface ClamAvScanningService {
    configureForS3(config: ClamAvScanningConfig, bucket: s3.Bucket): void;
    configureForEFS(config: ClamAvScanningConfig, efsArn: string): void;
    configureForFSx(config: ClamAvScanningConfig, fsxArn: string): void;
    getScanningResources(): Construct[];
    getQuarantineResources(): Construct[];
}
export declare class ClamAvScanningServiceImpl implements ClamAvScanningService {
    private scope;
    private context;
    private scanningResources;
    private quarantineResources;
    constructor(scope: Construct, context: ComponentContext);
    /**
     * Configures ClamAV scanning for S3 buckets
     */
    configureForS3(config: ClamAvScanningConfig, bucket: s3.Bucket): void;
    /**
     * Configures ClamAV scanning for EFS
     */
    configureForEFS(config: ClamAvScanningConfig, efsArn: string): void;
    /**
     * Configures ClamAV scanning for FSx
     */
    configureForFSx(config: ClamAvScanningConfig, fsxArn: string): void;
    /**
     * Gets all scanning-related resources
     */
    getScanningResources(): Construct[];
    /**
     * Gets all quarantine-related resources
     */
    getQuarantineResources(): Construct[];
    private createClamAvFunction;
    private getClamAvCode;
    private addClamAvPermissions;
    private createQuarantineBucket;
    private configureS3UploadScanning;
    private configureScheduledScanning;
    private configureEFSAccess;
    private configureScheduledEFSScanning;
    private configureFSxAccess;
    private configureScheduledFSxScanning;
    private logEvent;
}
/**
 * Factory function to create ClamAV Scanning Service
 */
export declare function createClamAvScanningService(scope: Construct, context: ComponentContext): ClamAvScanningService;
//# sourceMappingURL=clamav-scanning.service.d.ts.map