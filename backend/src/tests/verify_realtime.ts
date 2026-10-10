import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { createApp } from "../app";
import { setupSocketGateway } from "../sockets/socketManager";
import { prisma } from "../config/prisma";

async function runRealtimeTests() {
  console.log("==========================================================");
  console.log("📡 STARTING AUTOMATED REAL-TIME SOCKET.IO TEST SUITE");
  console.log("==========================================================");

  const app = createApp();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: "*" } });
  setupSocketGateway(io);

  const testPort = 5098;
  await new Promise<void>((resolve) => server.listen(testPort, resolve));
  const baseUrl = `http://localhost:${testPort}/api`;
  const socketUrl = `http://localhost:${testPort}`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail || "");
      failed++;
    }
  }

  async function apiCall(method: string, path: string, body?: any, token?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  let pmSocket: ClientSocketType | null = null;
  let memberSocket: ClientSocketType | null = null;

  try {
    // 1. Authenticate PM and Member via REST
    const pmLogin = await apiCall("POST", "/auth/login", { email: "pm@neostats.com", password: "password123" });
    const memberLogin = await apiCall("POST", "/auth/login", { email: "member@neostats.com", password: "password123" });
    const pmToken = pmLogin.data.token;
    const memberToken = memberLogin.data.token;

    // Fetch demo project
    const projectsRes = await apiCall("GET", "/projects", undefined, pmToken);
    const demoProject = projectsRes.data.data.find((p: any) => p._count?.tasks > 0) || projectsRes.data.data[0];
    const projectId = demoProject.id;

    // 2. Connect WebSockets with JWT Handshake
    console.log("\n[Test Suite 1: WebSocket Handshake & Authentication]");

    pmSocket = ClientSocket(socketUrl, { auth: { token: pmToken }, transports: ["websocket"] });
    memberSocket = ClientSocket(socketUrl, { auth: { token: memberToken }, transports: ["websocket"] });

    await Promise.all([
      new Promise<void>((resolve) => pmSocket!.on("connect", resolve)),
      new Promise<void>((resolve) => memberSocket!.on("connect", resolve)),
    ]);

    assert(pmSocket.connected, "PM Socket connected with JWT handshake");
    assert(memberSocket.connected, "Member Socket connected with JWT handshake");

    // 3. Join Project Rooms
    console.log("\n[Test Suite 2: Room Subscriptions & Scoping]");

    const pmJoinAck = await new Promise<any>((resolve) => {
      pmSocket!.emit("project:join", { projectId }, resolve);
    });
    assert(pmJoinAck.success, "PM successfully joined project room");

    const memberJoinAck = await new Promise<any>((resolve) => {
      memberSocket!.emit("project:join", { projectId }, resolve);
    });
    assert(memberJoinAck.success, "Member successfully joined project room");

    // 4. Real-Time Task Creation Broadcast
    console.log("\n[Test Suite 3: Real-Time Event Broadcasts]");

    const taskCreatedPromise = new Promise<any>((resolve) => {
      memberSocket!.on("task:created", resolve);
    });

    const newTaskRes = await apiCall(
      "POST",
      `/projects/${projectId}/tasks`,
      {
        title: "Real-time Verification Task",
        description: "Testing broadcast to connected clients",
        priority: "HIGH",
        status: "TODO",
      },
      pmToken
    );
    assert(newTaskRes.status === 201, "PM created task via REST API (201 Created)");

    const receivedTask = await Promise.race([
      taskCreatedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for task:created")), 3000)),
    ]);
    assert(receivedTask.title === "Real-time Verification Task", "Member received 'task:created' event over WebSocket");

    const createdTaskId = newTaskRes.data.data.id;

    // 5. Real-Time Status Change Broadcast
    const statusChangedPromise = new Promise<any>((resolve) => {
      pmSocket!.on("task:status_changed", resolve);
    });

    // Update status via REST API (as PM or Member)
    const updateStatusRes = await apiCall(
      "PATCH",
      `/tasks/${createdTaskId}/status`,
      { status: "IN_PROGRESS" },
      pmToken
    );
    assert(updateStatusRes.status === 200, "Task status updated via REST API");

    const receivedStatusChange = await Promise.race([
      statusChangedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for task:status_changed")), 3000)),
    ]);
    assert(
      receivedStatusChange.taskId === createdTaskId && receivedStatusChange.status === "IN_PROGRESS",
      "PM received 'task:status_changed' event over WebSocket"
    );

    // 6. Real-Time Comment Broadcast
    const commentCreatedPromise = new Promise<any>((resolve) => {
      memberSocket!.on("comment:created", resolve);
    });

    const commentRes = await apiCall(
      "POST",
      `/tasks/${createdTaskId}/comments`,
      { content: "Real-time comment test content" },
      pmToken
    );
    assert(commentRes.status === 201, "PM posted comment via REST API");

    const receivedComment = await Promise.race([
      commentCreatedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for comment:created")), 3000)),
    ]);
    assert(
      receivedComment.content === "Real-time comment test content",
      "Member received 'comment:created' event over WebSocket"
    );

    // 7. Real-Time Private Notification Delivery
    console.log("\n[Test Suite 4: Private User Notification Channel]");

    const notificationPromise = new Promise<any>((resolve) => {
      memberSocket!.on("notification:new", resolve);
    });

    // Assign the task to Member (triggers notification:new to user:member.id room)
    await apiCall(
      "PATCH",
      `/tasks/${createdTaskId}`,
      { assigneeId: memberLogin.data.user.id },
      pmToken
    );

    const receivedNotif = await Promise.race([
      notificationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for notification:new")), 3000)),
    ]);
    assert(
      receivedNotif.title.includes("Task Assigned"),
      "Member received targeted 'notification:new' in private user room"
    );

    // 8. Real-Time Task Status Change Notification for Assignee
    const statusNotifPromise = new Promise<any>((resolve) => {
      memberSocket!.on("notification:new", resolve);
    });

    await apiCall(
      "PATCH",
      `/tasks/${createdTaskId}/status`,
      { status: "IN_REVIEW" },
      pmToken
    );

    const receivedStatusNotif = await Promise.race([
      statusNotifPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for status notification")), 3000)),
    ]);
    assert(
      receivedStatusNotif.title.includes("Status Updated"),
      "Assignee received 'notification:new' on status change"
    );

    // 9. Real-Time Activity Log Broadcast (activity:created)
    console.log("\n[Test Suite 5: Real-Time Activity Log & Comment Deletion Broadcasts]");
    const activityPromise = new Promise<any>((resolve) => {
      pmSocket!.on("activity:created", resolve);
    });

    const mentionCommentRes = await apiCall(
      "POST",
      `/tasks/${createdTaskId}/comments`,
      { content: "Hey @Marcus check this out" },
      pmToken
    );
    assert(mentionCommentRes.status === 201, "PM posted comment with mention");
    const mentionCommentId = mentionCommentRes.data.data.id;

    const receivedActivity = await Promise.race([
      activityPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for activity:created")), 3000)),
    ]);
    assert(
      receivedActivity.action === "comment_added",
      "PM received 'activity:created' event over WebSocket"
    );

    // 10. Real-Time Comment Deletion Broadcast (comment:deleted)
    const commentDeletedPromise = new Promise<any>((resolve) => {
      memberSocket!.on("comment:deleted", resolve);
    });

    await apiCall("DELETE", `/comments/${mentionCommentId}`, undefined, pmToken);

    const receivedDeletedComment = await Promise.race([
      commentDeletedPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for comment:deleted")), 3000)),
    ]);
    assert(
      receivedDeletedComment.commentId === mentionCommentId,
      "Member received 'comment:deleted' event over WebSocket"
    );

    // Clean up test task
    await apiCall("DELETE", `/tasks/${createdTaskId}`, undefined, pmToken);

    console.log("\n==========================================================");
    console.log(`📊 REAL-TIME RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================================");

    if (failed > 0) process.exit(1);
  } catch (error) {
    console.error("Real-time test suite failed:", error);
    process.exit(1);
  } finally {
    if (pmSocket) pmSocket.disconnect();
    if (memberSocket) memberSocket.disconnect();
    server.close();
    await prisma.$disconnect();
  }
}

runRealtimeTests();
