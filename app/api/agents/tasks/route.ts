// Agent Tasks API
import { NextResponse } from "next/server";
import { getAgentTasks, getTodaysTasks, getOverdueTasks, completeTask, updateTaskStatus } from "@/lib/agents/tasks";
import { getAgentIdentity } from "@/lib/agents/identity";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const filter = searchParams.get("filter"); // "today" | "overdue" | "all"
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const tenant = searchParams.get("tenant") || undefined;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId required" },
        { status: 400 }
      );
    }

    let tasks;

    if (filter === "today") {
      tasks = await getTodaysTasks(agentId, tenant);
    } else if (filter === "overdue") {
      tasks = await getOverdueTasks(agentId, tenant);
    } else {
      const filters: any = {};
      if (status) filters.status = status.split(",");
      if (priority) filters.priority = priority.split(",");
      tasks = await getAgentTasks(agentId, filters, tenant);
    }

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error("Error getting agent tasks:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskId, agentId, action, status, notes } = body;

    if (!taskId || !agentId || !action) {
      return NextResponse.json(
        { error: "taskId, agentId, and action required" },
        { status: 400 }
      );
    }

    let success = false;

    if (action === "complete") {
      success = await completeTask(taskId, agentId, notes);
    } else if (action === "updateStatus" && status) {
      success = await updateTaskStatus(taskId, status, agentId);
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
