/**
 * Appointment Booking Tool
 * 
 * Checks availability and books appointments in calendar + Airtable.
 */

import Airtable from "airtable";
import {
  AppointmentBookParams,
  AppointmentBookResult,
  AvailabilityCheckParams,
  AvailabilityCheckResult,
  AvailableSlot,
  ClientConfig,
  MCPToolResponse,
} from "../types";
import { getClientConfig, getFieldMapping } from "../clients";
import { lookupLead } from "./lookup-lead";
import { sendConfirmationSMS } from "./sms-confirm";

// Parse natural language date
function parseDate(dateStr: string): Date {
  const today = new Date();
  const lower = dateStr.toLowerCase();

  if (lower === "today") {
    return today;
  }
  if (lower === "tomorrow") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  if (lower.includes("next")) {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const targetDay = i;
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + daysUntil);
        return nextDate;
      }
    }
  }
  // Try to parse as ISO date
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return today;
}

// Parse natural language time
function parseTime(timeStr: string): { hour: number; minute: number } {
  const lower = timeStr.toLowerCase();

  // Handle "morning", "afternoon", "evening"
  if (lower === "morning") {
    return { hour: 10, minute: 0 };
  }
  if (lower === "afternoon") {
    return { hour: 14, minute: 0 };
  }
  if (lower === "evening") {
    return { hour: 17, minute: 0 };
  }

  // Handle "9am", "2pm", "10:30am", etc.
  const timeMatch = lower.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3];

    if (period === "pm" && hour !== 12) {
      hour += 12;
    } else if (period === "am" && hour === 12) {
      hour = 0;
    }

    return { hour, minute };
  }

  // Default to 10am
  return { hour: 10, minute: 0 };
}

// Generate available slots for the next N days
function generateSlots(
  daysAhead: number,
  startHour: number,
  endHour: number,
  timezone: string
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const now = new Date();

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);

    // Skip weekends (optional - comment out if weekend availability)
    if (date.getDay() === 0 || date.getDay() === 6) {
      continue;
    }

    // Generate slots every 30 minutes
    for (let h = startHour; h < endHour; h++) {
      for (const m of [0, 30]) {
        const slotDate = new Date(date);
        slotDate.setHours(h, m, 0, 0);

        // Skip past times for today
        if (slotDate <= now) {
          continue;
        }

        slots.push({
          date: slotDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
          time: slotDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          datetime_iso: slotDate.toISOString(),
        });
      }
    }
  }

  return slots;
}

export async function checkAvailability(
  params: AvailabilityCheckParams,
  clientConfig?: ClientConfig
): Promise<MCPToolResponse> {
  try {
    const config = clientConfig || getClientConfig("opus1");
    if (!config) {
      return {
        success: false,
        error: "Client configuration not found",
      };
    }

    const daysAhead = params.days_ahead || 3;
    const slots = generateSlots(
      daysAhead,
      config.business_hours.start,
      config.business_hours.end,
      config.timezone
    );

    // TODO: Filter against existing appointments in calendar
    // For now, return all slots during business hours

    const result: AvailabilityCheckResult = {
      available_slots: slots.slice(0, 10), // Return first 10 slots
      next_available: slots.length > 0 ? `${slots[0].date} at ${slots[0].time}` : undefined,
    };

    return {
      success: true,
      data: result,
      variables: {
        next_available: result.next_available || "No availability",
        slots_count: slots.length,
      },
    };
  } catch (error: any) {
    console.error("[MCP] Availability check error:", error);
    return {
      success: false,
      error: error.message || "Failed to check availability",
    };
  }
}

export async function bookAppointment(
  params: AppointmentBookParams,
  clientConfig?: ClientConfig
): Promise<MCPToolResponse> {
  try {
    const config = clientConfig || getClientConfig("opus1");
    if (!config) {
      return {
        success: false,
        error: "Client configuration not found",
      };
    }

    const fields = getFieldMapping(config.client_id);

    // Get lead ID if not provided
    let leadId = params.lead_id;
    let leadPhone = params.phone_number;

    if (!leadId && params.phone_number) {
      const lookupResult = await lookupLead(
        { phone_number: params.phone_number },
        config
      );
      if (!lookupResult.success || !lookupResult.data?.found) {
        return {
          success: false,
          error: "Lead not found with provided phone number",
        };
      }
      leadId = lookupResult.data.lead_id;
    }

    if (!leadId) {
      return {
        success: false,
        error: "Either lead_id or phone_number must be provided",
      };
    }

    // Parse the preferred date and time
    const appointmentDate = parseDate(params.preferred_date || "tomorrow");
    const time = parseTime(params.preferred_time || "10am");
    appointmentDate.setHours(time.hour, time.minute, 0, 0);

    // Format for display
    const formattedDate = appointmentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const formattedTime = appointmentDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      config.airtable_base_id
    );

    // Update the lead record with appointment
    const updateFields: Record<string, any> = {
      [fields.status]: "Appointment Scheduled",
      [fields.appointment_date]: appointmentDate.toISOString(),
      [fields.last_contact]: new Date().toISOString().split("T")[0],
    };

    if (params.notes) {
      const existingRecord = await base(config.leads_table_id).find(leadId);
      const existingNotes = existingRecord.fields[fields.notes] || "";
      const timestamp = new Date().toLocaleString();
      updateFields[fields.notes] = `${existingNotes}\n[${timestamp}] Appointment booked: ${formattedDate} at ${formattedTime}. ${params.notes}`.trim();
    }

    await base(config.leads_table_id).update(leadId, updateFields);

    // Send confirmation SMS
    let confirmationSent = false;
    if (leadPhone) {
      const smsResult = await sendConfirmationSMS(
        {
          phone_number: leadPhone,
          message_type: "appointment_confirmation",
          appointment_date: formattedDate,
          appointment_time: formattedTime,
        },
        config
      );
      confirmationSent = smsResult.success && smsResult.data?.sent;
    }

    const result: AppointmentBookResult = {
      booked: true,
      appointment_id: leadId, // Using lead ID as reference
      appointment_date: formattedDate,
      appointment_time: formattedTime,
      confirmation_sent: confirmationSent,
    };

    return {
      success: true,
      data: result,
      variables: {
        appointment_booked: true,
        appointment_date: formattedDate,
        appointment_time: formattedTime,
        confirmation_sent: confirmationSent,
      },
    };
  } catch (error: any) {
    console.error("[MCP] Appointment booking error:", error);
    return {
      success: false,
      error: error.message || "Failed to book appointment",
    };
  }
}









