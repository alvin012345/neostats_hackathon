import http from "http";
import { createApp } from "../app";
import { prisma } from "../config/prisma";

async function runRBACTests() {
  console.log("==================================================");
  console.log("🚀 STARTING AUTOMATED RBAC & PERMISSION TEST SUITE");
  console.log("==================================================");

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(5099, resolve));
  const baseUrl = "http://localhost:5099/api";

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

  try {
    // 1. Test Logins for all 4 roles
    console.log("\n[Test Suite 1: Authentication for All Roles]");
    const adminLogin = await apiCall("POST", "/auth/login", { email: "admin@neostats.com", password: "password123" });
    assert(adminLogin.status === 200 && !!adminLogin.data.token, "Admin can login and receives JWT");

    const pmLogin = await apiCall("POST", "/auth/login", { email: "pm@neostats.com", password: "password123" });
    assert(pmLogin.status === 200 && !!pmLogin.data.token, "Project Manager can login");

    const memberLogin = await apiCall("POST", "/auth/login", { email: "member@neostats.com", password: "password123" });
    assert(memberLogin.status === 200 && !!memberLogin.data.token, "Team Member can login");

    const viewerLogin = await apiCall("POST", "/auth/login", { email: "viewer@neostats.com", password: "password123" });
    assert(viewerLogin.status === 200 && !!viewerLogin.data.token, "Viewer can login");

    const badLogin = await apiCall("POST", "/auth/login", { email: "admin@neostats.com", password: "wrongpassword" });
    assert(badLogin.status === 401, "Bad password rejected with 401 Unauthorized");

    const adminToken = adminLogin.data.token;
    const pmToken = pmLogin.data.token;
    const memberToken = memberLogin.data.token;
    const viewerToken = viewerLogin.data.token;

    // 2. System Role Tests (/api/users)
    console.log("\n[Test Suite 2: System Role Permissions (Admin vs Non-Admin)]");
    const adminGetUsers = await apiCall("GET", "/users", undefined, adminToken);
    assert(adminGetUsers.status === 200 && Array.isArray(adminGetUsers.data.data), "Admin can list system users");

    const pmGetUsers = await apiCall("GET", "/users", undefined, pmToken);
    assert(pmGetUsers.status === 403, "PM attempting to access /api/users rejected with 403 Forbidden");

    const memberGetUsers = await apiCall("GET", "/users", undefined, memberToken);
    assert(memberGetUsers.status === 403, "Team Member attempting to access /api/users rejected with 403 Forbidden");

    // 3. Project Creation Permissions
    console.log("\n[Test Suite 3: Project Creation (Admin Only)]");
    const memberCreateProject = await apiCall("POST", "/projects", { name: "Hacked Project" }, memberToken);
    assert(memberCreateProject.status === 403, "Team Member attempting POST /api/projects rejected with 403 Forbidden");

    const pmCreateProject = await apiCall("POST", "/projects", { name: "PM Project" }, pmToken);
    assert(pmCreateProject.status === 403, "PM attempting POST /api/projects rejected with 403 Forbidden");

    // 4. Fetch Sample Project and Task for Project-Level RBAC
    const projectsRes = await apiCall("GET", "/projects", undefined, adminToken);
    const demoProject = projectsRes.data.data.find((p: any) => p._count?.tasks > 0) || projectsRes.data.data[0];
    assert(!!demoProject, "Demo project fetched successfully");

    // Ensure member and viewer have active roles in the tested project
    const adminUser = await prisma.user.findUnique({ where: { email: "admin@neostats.com" } });
    const memberUser = await prisma.user.findUnique({ where: { email: "member@neostats.com" } });
    const viewerUser = await prisma.user.findUnique({ where: { email: "viewer@neostats.com" } });
    const pmUser = await prisma.user.findUnique({ where: { email: "pm@neostats.com" } });

    if (pmUser) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: demoProject.id, userId: pmUser.id } },
        create: { projectId: demoProject.id, userId: pmUser.id, role: "PROJECT_MANAGER" },
        update: { role: "PROJECT_MANAGER" },
      });
    }

    if (memberUser) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: demoProject.id, userId: memberUser.id } },
        create: { projectId: demoProject.id, userId: memberUser.id, role: "TEAM_MEMBER" },
        update: { role: "TEAM_MEMBER" },
      });
    }
    if (viewerUser) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: demoProject.id, userId: viewerUser.id } },
        create: { projectId: demoProject.id, userId: viewerUser.id, role: "VIEWER" },
        update: { role: "VIEWER" },
      });
    }

    const tasksRes = await apiCall("GET", `/projects/${demoProject.id}/tasks`, undefined, adminToken);
    const sampleTask = tasksRes.data.data[0];
    assert(!!sampleTask, "Sample task fetched successfully");

    // 5. Project Level Permissions
    console.log("\n[Test Suite 4: Project Level RBAC & Task Operations]");

    // Test Team Member attempting to delete a task -> 403 Forbidden!
    const memberDeleteTask = await apiCall("DELETE", `/tasks/${sampleTask.id}`, undefined, memberToken);
    assert(memberDeleteTask.status === 403, "Team Member attempting DELETE /api/tasks/:id rejected with 403 Forbidden");

    // Test Viewer attempting to advance task status -> 403 Forbidden!
    const viewerChangeStatus = await apiCall("PATCH", `/tasks/${sampleTask.id}/status`, { status: "DONE" }, viewerToken);
    assert(viewerChangeStatus.status === 403, "Viewer attempting to update task status rejected with 403 Forbidden");

    // Test Viewer attempting to post comment -> 403 Forbidden!
    const viewerComment = await apiCall("POST", `/tasks/${sampleTask.id}/comments`, { content: "Viewer comment" }, viewerToken);
    assert(viewerComment.status === 403, "Viewer attempting to post comment rejected with 403 Forbidden");

    // Test Team Member posting a valid comment -> 201 Created!
    const memberComment = await apiCall("POST", `/tasks/${sampleTask.id}/comments`, { content: "Test comment from Member" }, memberToken);
    assert(memberComment.status === 201, "Team Member successfully posted comment (201 Created)");

    // 6. Optimistic Concurrency Control (OCC) Tests
    console.log("\n[Test Suite 5: Optimistic Concurrency Control (HTTP 409 Conflict)]");
    
    // User A reads task version
    const freshTaskRes = await apiCall("GET", `/tasks/${sampleTask.id}`, undefined, adminToken);
    const currentVersion = freshTaskRes.data.data.version;

    // User A updates successfully with matching expectedVersion
    const updateARes = await apiCall(
      "PATCH",
      `/tasks/${sampleTask.id}`,
      { title: "Updated by User A", expectedVersion: currentVersion },
      adminToken
    );
    assert(updateARes.status === 200, "User A update with current version succeeds (200 OK)");
    assert(updateARes.data.data.version === currentVersion + 1, "Task version atomically incremented");

    // User B submits with the old/stale version -> Expect 409 Conflict!
    const updateBRes = await apiCall(
      "PATCH",
      `/tasks/${sampleTask.id}`,
      { title: "Conflicting Update by User B", expectedVersion: currentVersion },
      adminToken
    );
    assert(
      updateBRes.status === 409 && updateBRes.data.error === "CONCURRENCY_CONFLICT",
      "User B stale update correctly rejected with 409 Conflict"
    );

    // 7. User Deactivation & Login Enforcement
    console.log("\n[Test Suite 6: User Deactivation & Account Blocking]");
    // Create temporary user to deactivate
    const testUserEmail = `test_deact_${Date.now()}@neostats.com`;
    const createTestUserRes = await apiCall(
      "POST",
      "/users",
      { name: "Deactivate Test", email: testUserEmail, password: "password123", systemRole: "USER" },
      adminToken
    );
    assert(createTestUserRes.status === 201, "Admin creates user for deactivation test");
    const testUserId = createTestUserRes.data.data.id;

    // Deactivate user via Admin PATCH /api/users/:id/deactivate
    const deactRes = await apiCall("PATCH", `/users/${testUserId}/deactivate`, undefined, adminToken);
    assert(deactRes.status === 200 && deactRes.data.data.isActive === false, "Admin successfully deactivates user account");

    // Attempt login with deactivated credentials -> Expect 403 Forbidden: Account deactivated
    const deactLoginRes = await apiCall("POST", "/auth/login", { email: testUserEmail, password: "password123" });
    assert(
      deactLoginRes.status === 403 && deactLoginRes.data.message.includes("Account deactivated"),
      "Deactivated user login rejected with 403 Forbidden: Account deactivated"
    );

    // Reactivate account
    const reactivateRes = await apiCall("PATCH", `/users/${testUserId}/deactivate`, undefined, adminToken);
    assert(reactivateRes.status === 200 && reactivateRes.data.data.isActive === true, "Admin reactivates user account");

    // Reactivated user can now login successfully
    const reactLoginRes = await apiCall("POST", "/auth/login", { email: testUserEmail, password: "password123" });
    assert(reactLoginRes.status === 200 && !!reactLoginRes.data.token, "Reactivated user can log in successfully");

    // Clean up test user
    await prisma.user.delete({ where: { id: testUserId } });

    // 8. Project Archiving & Operation Blocking
    console.log("\n[Test Suite 7: Project Archiving & Mutation Blocking]");
    // Create a temporary project to archive
    const archProjRes = await apiCall(
      "POST",
      "/projects",
      { name: "Archive Test Project", description: "Testing write locks on archived project" },
      adminToken
    );
    assert(archProjRes.status === 201, "Admin created test project");
    const archProjectId = archProjRes.data.data.id;

    // Create a task while project is active
    const archTaskRes = await apiCall(
      "POST",
      `/projects/${archProjectId}/tasks`,
      { title: "Task in active project", status: "TODO" },
      adminToken
    );
    assert(archTaskRes.status === 201, "Task created in active project");
    const archTaskId = archTaskRes.data.data.id;

    // Archive project (Admins / PMs can set status to ARCHIVED)
    const archiveProjectRes = await apiCall(
      "PATCH",
      `/projects/${archProjectId}/archive`,
      { isArchived: true },
      adminToken
    );
    assert(archiveProjectRes.status === 200 && archiveProjectRes.data.data.isArchived === true, "Project successfully marked as ARCHIVED");

    // Test 1: Creating task in archived project -> 403
    const blockedCreateTask = await apiCall(
      "POST",
      `/projects/${archProjectId}/tasks`,
      { title: "Blocked Task", status: "TODO" },
      adminToken
    );
    assert(
      blockedCreateTask.status === 403 && blockedCreateTask.data.error === "PROJECT_ARCHIVED",
      "Task creation blocked in archived project with 403 Forbidden"
    );

    // Test 2: Updating task in archived project -> 403
    const blockedUpdateTask = await apiCall(
      "PATCH",
      `/tasks/${archTaskId}`,
      { title: "Blocked Update" },
      adminToken
    );
    assert(
      blockedUpdateTask.status === 403 && blockedUpdateTask.data.error === "PROJECT_ARCHIVED",
      "Task mutation blocked in archived project with 403 Forbidden"
    );

    // Test 3: Updating task status in archived project -> 403
    const blockedStatusChange = await apiCall(
      "PATCH",
      `/tasks/${archTaskId}/status`,
      { status: "DONE" },
      adminToken
    );
    assert(
      blockedStatusChange.status === 403 && blockedStatusChange.data.error === "PROJECT_ARCHIVED",
      "Task status change blocked in archived project with 403 Forbidden"
    );

    // Test 4: Deleting task in archived project -> 403
    const blockedDeleteTask = await apiCall(
      "DELETE",
      `/tasks/${archTaskId}`,
      undefined,
      adminToken
    );
    assert(
      blockedDeleteTask.status === 403 && blockedDeleteTask.data.error === "PROJECT_ARCHIVED",
      "Task deletion blocked in archived project with 403 Forbidden"
    );

    // Test 5: Posting comment in archived project -> 403
    const blockedComment = await apiCall(
      "POST",
      `/tasks/${archTaskId}/comments`,
      { content: "Blocked comment" },
      adminToken
    );
    assert(
      blockedComment.status === 403 && blockedComment.data.error === "PROJECT_ARCHIVED",
      "Comment addition blocked in archived project with 403 Forbidden"
    );

    // Clean up archive test project
    await apiCall("DELETE", `/projects/${archProjectId}`, undefined, adminToken);

    // 9. Comment Deletion Permissions
    console.log("\n[Test Suite 8: Comment Deletion (Author & PM vs Other)]");
    // Create fresh comment by Member on sampleTask
    const authorCommentRes = await apiCall(
      "POST",
      `/tasks/${sampleTask.id}/comments`,
      { content: "Author's test comment" },
      memberToken
    );
    assert(authorCommentRes.status === 201, "Member posted a comment on sample task");
    const authorCommentId = authorCommentRes.data.data.id;

    // PM can delete any comment on the project
    const pmDeleteCommentRes = await apiCall(
      "DELETE",
      `/comments/${authorCommentId}`,
      undefined,
      pmToken
    );
    assert(pmDeleteCommentRes.status === 200, "Project Manager can delete member comment");

    // Author can delete their own comment
    const ownCommentRes = await apiCall(
      "POST",
      `/tasks/${sampleTask.id}/comments`,
      { content: "Comment to delete by author" },
      memberToken
    );
    const ownCommentId = ownCommentRes.data.data.id;

    const memberDeleteOwnRes = await apiCall(
      "DELETE",
      `/comments/${ownCommentId}`,
      undefined,
      memberToken
    );
    assert(memberDeleteOwnRes.status === 200, "Author can delete their own comment");

    // 9. Test Suite 9: Fine-Grained Authorization, Input Trimming & Non-Existent ID Resilience
    console.log("\n[Test Suite 9: Security Hardening & Edge Cases]");

    // 9a. Team Member cannot edit a task assigned to someone else
    // Create a task assigned to PM
    const pmTaskRes = await apiCall(
      "POST",
      `/projects/${demoProject.id}/tasks`,
      { title: "PM Task", assigneeId: pmUser!.id },
      pmToken
    );
    const pmTaskId = pmTaskRes.data.data.id;

    const memberEditPmTask = await apiCall(
      "PATCH",
      `/tasks/${pmTaskId}`,
      { title: "Member Attempting Edit" },
      memberToken
    );
    assert(
      memberEditPmTask.status === 403,
      "Team Member editing task assigned to someone else rejected with 403 Forbidden"
    );

    // 9b. Team Member cannot remove a project member
    const memberRemoveMemberRes = await apiCall(
      "DELETE",
      `/projects/${demoProject.id}/members/${pmUser!.id}`,
      undefined,
      memberToken
    );
    assert(
      memberRemoveMemberRes.status === 403,
      "Team Member removing project member rejected with 403 Forbidden"
    );

    // 9c. Last active admin cannot be deleted
    const adminDeleteSelfRes = await apiCall(
      "DELETE",
      `/users/${adminUser!.id}`,
      undefined,
      adminToken
    );
    assert(
      adminDeleteSelfRes.status === 400 && adminDeleteSelfRes.data.error === "LAST_ADMIN_PROTECTION",
      "Deleting sole active Admin rejected with 400 Bad Request (LAST_ADMIN_PROTECTION)"
    );

    // 9d. Non-existent and malformed IDs return 404 Not Found (not 500)
    const malformedTaskIdRes = await apiCall(
      "GET",
      "/tasks/not-a-valid-uuid-id",
      undefined,
      adminToken
    );
    assert(
      malformedTaskIdRes.status === 404,
      "Malformed task ID returns 404 Not Found without 500 server crash"
    );

    const malformedProjectIdRes = await apiCall(
      "GET",
      "/projects/not-a-valid-uuid-id",
      undefined,
      adminToken
    );
    assert(
      malformedProjectIdRes.status === 404,
      "Malformed project ID returns 404 Not Found without 500 server crash"
    );

    // 9e. Whitespace-only inputs blocked with 400 Validation Error
    const whitespaceTaskRes = await apiCall(
      "POST",
      `/projects/${demoProject.id}/tasks`,
      { title: "     " },
      pmToken
    );
    assert(
      whitespaceTaskRes.status === 400,
      "Whitespace-only task title rejected with 400 Bad Request validation error"
    );

    const whitespaceCommentRes = await apiCall(
      "POST",
      `/tasks/${sampleTask.id}/comments`,
      { content: "     " },
      memberToken
    );
    assert(
      whitespaceCommentRes.status === 400,
      "Whitespace-only comment content rejected with 400 Bad Request validation error"
    );

    console.log("\n==================================================");
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runRBACTests().catch((err) => {
  console.error("Test execution crashed:", err);
  process.exit(1);
});
