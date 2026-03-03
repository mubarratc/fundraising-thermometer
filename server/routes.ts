import type { Express } from "express";
import type { Server } from "http";
import { db } from "./db";
import { config } from "@shared/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

const CHARITYSTACK_API_URL = "https://0k90mc4jjj.execute-api.us-east-2.amazonaws.com";
const CHARITYSTACK_API_KEY = "cs_live_1Nm8mMj35c6_K2km3m0qtwgIY1Y6weXW";

export async function registerRoutes(server: Server, app: Express) {
  app.get("/api/config", async (req, res) => {
    try {
      let configData = await db.select().from(config).limit(1);
      if (configData.length === 0) {
        const [newConfig] = await db.insert(config).values({
          formId: "1eb8be3a-d8e8-42ec-aa64-404af5a6d625",
          goalAmount: 50000
        }).returning();
        return res.json(newConfig);
      }
      res.json(configData[0]);
    } catch (error: any) {
      console.error("Error fetching config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/config", async (req, res) => {
    try {
      const { formId, goalAmount } = req.body;
      console.log(`Updating config: formId=${formId}, goalAmount=${goalAmount}`);
      let configData = await db.select().from(config).limit(1);
      if (configData.length === 0) {
        const [newConfig] = await db.insert(config).values({
          formId,
          goalAmount,
          updatedAt: new Date()
        }).returning();
        return res.json(newConfig);
      }
      const [updated] = await db
        .update(config)
        .set({ formId, goalAmount, updatedAt: new Date() })
        .where(eq(config.id, configData[0].id))
        .returning();
      console.log(`Config updated successfully`);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/donations", async (req, res) => {
    try {
      const configData = await db.select().from(config).limit(1);
      const formId = configData[0]?.formId || "1eb8be3a-d8e8-42ec-aa64-404af5a6d625";
      console.log(`[Donations] Fetching all donations for form ID: ${formId}`);
      
      // Fetch ALL donations with pagination
      let allDonations: any[] = [];
      let hasMore = true;
      let lastEvaluatedKey: string | undefined = undefined;
      let pageCount = 0;
      
      while (hasMore && pageCount < 500) {
        pageCount++;
        const url = lastEvaluatedKey 
          ? `${CHARITYSTACK_API_URL}/v1/donations?lastEvaluatedKey=${encodeURIComponent(lastEvaluatedKey)}`
          : `${CHARITYSTACK_API_URL}/v1/donations`;
        
        const response = await axios.get(url, {
          headers: { "Authorization": `Bearer ${CHARITYSTACK_API_KEY}` }
        });
        
        const pageDonations = response.data.donations || [];
        allDonations = allDonations.concat(pageDonations);
        
        hasMore = response.data.hasMore || false;
        lastEvaluatedKey = response.data.lastEvaluatedKey;
        
        if (pageCount <= 5 || pageCount % 50 === 0) {
            console.log(`[Donations] Page ${pageCount}: ${pageDonations.length} donations (total: ${allDonations.length}), hasMore: ${hasMore}`);
          }
      }
      
      console.log(`[Donations] Total donations from API: ${allDonations.length}`);
      
      const filteredDonations = allDonations.filter((donation: any) =>
        (donation.formID === formId || donation.elementID === formId) &&
        donation.state === "SUCCEEDED"
      );
      
      console.log(`[Donations] Filtered donations for form: ${filteredDonations.length}`);
      
      const transformedDonations = filteredDonations.map((donation: any) => ({
        id: donation.transactionID,
        amount: Math.round((donation.grossAmount || 0) * 100),
        currency: "USD",
        donorName: donation.anonymous ? "Anonymous" : donation.name,
        donorEmail: donation.email,
        message: donation.message || "",
        createdAt: donation.timestamp,
        status: donation.state.toLowerCase()
      }));
      
      const totalRaised = transformedDonations.reduce((sum: number, d: any) => sum + d.amount, 0) / 100;
      console.log(`[Donations] Total raised: $${totalRaised.toLocaleString()}`);
      
      res.json(transformedDonations);
    } catch (error: any) {
      console.error("[Donations] Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.message, details: error.response?.data });
    }
  });


  // Webhook Management
  app.post("/api/admin/register-webhook", async (req, res) => {
    try {
      const { webhookUrl } = req.body;
      if (!webhookUrl) {
        return res.status(400).json({ error: "webhookUrl is required" });
      }
      
      const response = await axios.post(
        `${CHARITYSTACK_API_URL}/v1/webhooks`,
        {
          url: webhookUrl,
          events: ["donation.created", "donation.updated"],
          active: true,
          description: "Fundraising Thermometer Real-time Updates"
        },
        {
          headers: {
            "Authorization": `Bearer ${CHARITYSTACK_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      console.log("[Webhook] Registered successfully:", response.data);
      res.json(response.data);
    } catch (error: any) {
      console.error("[Webhook] Registration error:", error.response?.data || error.message);
      res.status(500).json({ error: error.message, details: error.response?.data });
    }
  });

  app.get("/api/admin/webhooks", async (req, res) => {
    try {
      const response = await axios.get(`${CHARITYSTACK_API_URL}/v1/webhooks`, {
        headers: { "Authorization": `Bearer ${CHARITYSTACK_API_KEY}` }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("[Webhook] List error:", error.response?.data || error.message);
      res.status(500).json({ error: error.message, details: error.response?.data });
    }
  });

  app.delete("/api/admin/webhooks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await axios.delete(`${CHARITYSTACK_API_URL}/v1/webhooks/${id}`, {
        headers: { "Authorization": `Bearer ${CHARITYSTACK_API_KEY}` }
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Webhook] Delete error:", error.response?.data || error.message);
      res.status(500).json({ error: error.message, details: error.response?.data });
    }
  });

  app.post("/api/webhook/donation", async (req, res) => {
    try {
      const event = req.body;
      console.log("[Webhook] Received event:", event.type || event.event);
      console.log("[Webhook] Data:", JSON.stringify(event, null, 2));
      
      // Respond quickly to acknowledge receipt
      res.status(200).json({ received: true });
      
      // Process the webhook asynchronously
      // Note: In a production app, you would:
      // 1. Verify the webhook signature
      // 2. Update your database
      // 3. Broadcast to connected clients via WebSocket
      
      // For now, the polling mechanism will pick up the new donation
    } catch (error: any) {
      console.error("[Webhook] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
