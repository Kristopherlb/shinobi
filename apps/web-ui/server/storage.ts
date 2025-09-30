import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

// Service creation types for storage
interface ServiceCreationRequest {
  serviceName: string;
  description: string;
  owner: string;
  team: string;
  complianceFramework: string;
  initialPattern: string;
  environment?: string;
  region?: string;
  tags?: Record<string, string>;
}

interface ServiceCreationResult {
  serviceName: string;
  manifestPath: string;
  success: boolean;
  message: string;
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createService(serviceData: ServiceCreationRequest): Promise<ServiceCreationResult>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private services: Map<string, ServiceCreationRequest>;

  constructor() {
    this.users = new Map();
    this.services = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createService(serviceData: ServiceCreationRequest): Promise<ServiceCreationResult> {
    // Simulate service creation by storing the service data
    // In a real implementation, this would call the actual Shinobi platform svc init
    const serviceId = randomUUID();
    this.services.set(serviceId, serviceData);
    
    // Simulate successful service scaffolding
    return {
      serviceName: serviceData.serviceName,
      manifestPath: `./services/${serviceData.serviceName}/service.yml`,
      success: true,
      message: `Service '${serviceData.serviceName}' has been successfully scaffolded with ${serviceData.initialPattern} pattern and ${serviceData.complianceFramework} compliance framework.`
    };
  }
}

export const storage = new MemStorage();
