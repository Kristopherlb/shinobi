/**
 * EFS Binder Strategy
 * Handles Elastic File System bindings for Amazon EFS
 */
// Compliance framework branching removed; use binding.options/config instead
export class EfsBinderStrategy {
    supportedCapabilities = ['efs:file-system', 'efs:mount-target', 'efs:access-point'];
    async bind(sourceComponent, targetComponent, binding, context) {
        const { capability, access } = binding;
        switch (capability) {
            case 'efs:file-system':
                await this.bindToFileSystem(sourceComponent, targetComponent, binding, context);
                break;
            case 'efs:mount-target':
                await this.bindToMountTarget(sourceComponent, targetComponent, binding, context);
                break;
            case 'efs:access-point':
                await this.bindToAccessPoint(sourceComponent, targetComponent, binding, context);
                break;
            default:
                throw new Error(`Unsupported EFS capability: ${capability}`);
        }
    }
    async bindToFileSystem(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant file system access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'elasticfilesystem:DescribeFileSystems',
                    'elasticfilesystem:DescribeMountTargets',
                    'elasticfilesystem:DescribeAccessPoints'
                ],
                Resource: targetComponent.fileSystemArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'elasticfilesystem:CreateFileSystem',
                    'elasticfilesystem:DeleteFileSystem',
                    'elasticfilesystem:ModifyFileSystem',
                    'elasticfilesystem:CreateMountTarget',
                    'elasticfilesystem:DeleteMountTarget'
                ],
                Resource: targetComponent.fileSystemArn
            });
        }
        // Inject file system environment variables
        sourceComponent.addEnvironment('EFS_FILE_SYSTEM_ID', targetComponent.fileSystemId);
        sourceComponent.addEnvironment('EFS_FILE_SYSTEM_ARN', targetComponent.fileSystemArn);
        sourceComponent.addEnvironment('EFS_FILE_SYSTEM_DNS_NAME', targetComponent.dnsName);
        sourceComponent.addEnvironment('EFS_FILE_SYSTEM_STATE', targetComponent.lifeCycleState);
        // Configure performance mode
        sourceComponent.addEnvironment('EFS_PERFORMANCE_MODE', targetComponent.performanceMode || 'generalPurpose');
        sourceComponent.addEnvironment('EFS_THROUGHPUT_MODE', targetComponent.throughputMode || 'bursting');
        // Configure secure access when requested via options/config
        if (binding.options?.requireSecureAccess === true) {
            await this.configureSecureFileSystemAccess(sourceComponent, targetComponent, context);
        }
    }
    async bindToMountTarget(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant mount target access permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'elasticfilesystem:DescribeMountTargets'
                ],
                Resource: targetComponent.mountTargetArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'elasticfilesystem:CreateMountTarget',
                    'elasticfilesystem:DeleteMountTarget'
                ],
                Resource: targetComponent.mountTargetArn
            });
        }
        // Inject mount target environment variables
        sourceComponent.addEnvironment('EFS_MOUNT_TARGET_ID', targetComponent.mountTargetId);
        sourceComponent.addEnvironment('EFS_MOUNT_TARGET_ARN', targetComponent.mountTargetArn);
        sourceComponent.addEnvironment('EFS_MOUNT_TARGET_IP_ADDRESS', targetComponent.ipAddress);
        sourceComponent.addEnvironment('EFS_MOUNT_TARGET_SUBNET_ID', targetComponent.subnetId);
        sourceComponent.addEnvironment('EFS_MOUNT_TARGET_AVAILABILITY_ZONE', targetComponent.availabilityZoneName);
        // Configure security groups
        if (targetComponent.securityGroups) {
            sourceComponent.addEnvironment('EFS_SECURITY_GROUPS', targetComponent.securityGroups.join(','));
        }
    }
    async bindToAccessPoint(sourceComponent, targetComponent, binding, context) {
        const { access } = binding;
        // Grant access point permissions
        if (access.includes('read')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'elasticfilesystem:DescribeAccessPoints',
                    'elasticfilesystem:DescribeFileSystemPolicy'
                ],
                Resource: targetComponent.accessPointArn
            });
        }
        if (access.includes('write')) {
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: [
                    'elasticfilesystem:CreateAccessPoint',
                    'elasticfilesystem:DeleteAccessPoint'
                ],
                Resource: targetComponent.accessPointArn
            });
        }
        // Inject access point environment variables
        sourceComponent.addEnvironment('EFS_ACCESS_POINT_ID', targetComponent.accessPointId);
        sourceComponent.addEnvironment('EFS_ACCESS_POINT_ARN', targetComponent.accessPointArn);
        sourceComponent.addEnvironment('EFS_ACCESS_POINT_FILE_SYSTEM_ID', targetComponent.fileSystemId);
        // Configure POSIX user and group
        if (targetComponent.posixUser) {
            sourceComponent.addEnvironment('EFS_POSIX_UID', targetComponent.posixUser.uid.toString());
            sourceComponent.addEnvironment('EFS_POSIX_GID', targetComponent.posixUser.gid.toString());
        }
        // Configure root directory
        if (targetComponent.rootDirectory) {
            sourceComponent.addEnvironment('EFS_ROOT_DIRECTORY_PATH', targetComponent.rootDirectory.path);
            sourceComponent.addEnvironment('EFS_ROOT_DIRECTORY_CREATION_INFO', JSON.stringify(targetComponent.rootDirectory.creationInfo));
        }
    }
    async configureSecureFileSystemAccess(sourceComponent, targetComponent, context) {
        // Configure encryption at rest
        if (targetComponent.encrypted) {
            sourceComponent.addEnvironment('EFS_ENCRYPTION_ENABLED', 'true');
            if (targetComponent.kmsKeyId) {
                sourceComponent.addEnvironment('EFS_KMS_KEY_ID', targetComponent.kmsKeyId);
                // Grant KMS permissions
                sourceComponent.addToRolePolicy({
                    Effect: 'Allow',
                    Action: [
                        'kms:Decrypt',
                        'kms:GenerateDataKey'
                    ],
                    Resource: targetComponent.kmsKeyId
                });
            }
        }
        // Configure backup policy when requested
        if (targetComponent?.backupPolicyEnabled === true) {
            sourceComponent.addEnvironment('EFS_BACKUP_POLICY_ENABLED', 'true');
            sourceComponent.addToRolePolicy({
                Effect: 'Allow',
                Action: ['elasticfilesystem:PutBackupPolicy', 'elasticfilesystem:GetBackupPolicy'],
                Resource: targetComponent.fileSystemArn
            });
        }
        // Configure file system policy for access control
        if (targetComponent.fileSystemPolicy) {
            sourceComponent.addEnvironment('EFS_FILE_SYSTEM_POLICY', JSON.stringify(targetComponent.fileSystemPolicy));
        }
    }
}
//# sourceMappingURL=efs-binder-strategy.js.map