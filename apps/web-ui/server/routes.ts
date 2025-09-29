import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { localDevManager } from "./localDevelopment";
import featureFlagsRouter from "./routes/feature-flags";

export async function registerRoutes(app: Express): Promise<Server> {
  // Service creation endpoint for onboarding wizard
  app.post("/api/services/create", async (req, res) => {
    try {
      const serviceData = req.body;

      // Validate required fields
      if (!serviceData.serviceName || !serviceData.description || !serviceData.owner ||
        !serviceData.team || !serviceData.complianceFramework || !serviceData.initialPattern) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "serviceName, description, owner, team, complianceFramework, and initialPattern are required"
        });
      }

      // Call storage layer to create service (which simulates platform service creation)
      const result = await storage.createService(serviceData);

      res.status(201).json(result);
    } catch (error) {
      console.error("Service creation error:", error);
      res.status(500).json({
        error: "Service creation failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Local Development API endpoints
  app.get("/api/local-dev/services", async (req, res) => {
    try {
      const services = await localDevManager.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to get services", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/local-dev/services/:serviceId/logs", async (req, res) => {
    try {
      const { serviceId } = req.params;
      const logs = await localDevManager.getServiceLogs(serviceId);
      res.json({ logs });
    } catch (error) {
      res.status(500).json({ error: "Failed to get logs", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/local-dev/services/:serviceId/start", async (req, res) => {
    try {
      const { serviceId } = req.params;
      const success = await localDevManager.startService(serviceId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to start service", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/local-dev/services/:serviceId/stop", async (req, res) => {
    try {
      const { serviceId } = req.params;
      const success = await localDevManager.stopService(serviceId);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop service", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/local-dev/start-all", async (req, res) => {
    try {
      const success = await localDevManager.startAllServices();
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: "Failed to start all services", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/local-dev/commands/:command", async (req, res) => {
    try {
      const { command } = req.params;
      const { serviceName } = req.body;

      if (!['graph', 'cost', 'test', 'plan'].includes(command)) {
        return res.status(400).json({ error: "Invalid command", validCommands: ['graph', 'cost', 'test', 'plan'] });
      }

      const result = await localDevManager.executeCommand(command as 'graph' | 'cost' | 'test' | 'plan', serviceName);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to execute command", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Feature flags routes
  app.use('/api/feature-flags', featureFlagsRouter);

  const httpServer = createServer(app);

  return httpServer;
}
