/**
 * RDS Postgres Creator - Factory Method implementation
 * Implements Template Method pattern for enterprise governance
 */
import { ComponentSpec, ComponentContext, IComponent, IComponentCreator } from '@platform/contracts';
/**
 * Creator for RDS Postgres components with Template Method governance
 */
export declare class RdsPostgresCreator implements IComponentCreator {
    /**
     * Factory Method - creates the specific component
     */
    createComponent(spec: ComponentSpec, context: ComponentContext): IComponent;
    /**
     * Template Method - fixed algorithm with governance steps
     */
    processComponent(spec: ComponentSpec, context: ComponentContext): IComponent;
    /**
     * Validation step - part of Template Method
     */
    protected validateSpec(spec: ComponentSpec): void;
    /**
     * Policy application step - part of Template Method
     */
    protected applyCommonPolicies(component: IComponent, context: ComponentContext): void;
    private applyMandatoryTags;
    private applyFedRAMPPolicies;
    private applyEnvironmentPolicies;
}
