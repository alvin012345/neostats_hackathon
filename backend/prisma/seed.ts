import { PrismaClient, SystemRole, ProjectRole, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean existing data in reverse order of foreign keys
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned existing records.");

  // 2. Hash shared password
  const passwordHash = await bcrypt.hash("password123", 10);

  // 3. Create Seed Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@neostats.com",
      name: "Alex Administrator",
      passwordHash,
      systemRole: SystemRole.ADMIN,
      isActive: true,
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: "pm@neostats.com",
      name: "Patricia Manager",
      passwordHash,
      systemRole: SystemRole.USER,
      isActive: true,
    },
  });

  const member = await prisma.user.create({
    data: {
      email: "member@neostats.com",
      name: "Marcus Developer",
      passwordHash,
      systemRole: SystemRole.USER,
      isActive: true,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@neostats.com",
      name: "Victoria Observer",
      passwordHash,
      systemRole: SystemRole.USER,
      isActive: true,
    },
  });

  console.log("👤 Created 4 seeded users (Admin, PM, Member, Viewer).");

  // 4. Create Seed Projects
  const projectAlpha = await prisma.project.create({
    data: {
      name: "E-Commerce Platform Modernization",
      description: "Migrating legacy monolithic microservices to Next.js and real-time distributed architecture.",
      createdById: admin.id,
      isArchived: false,
    },
  });

  const projectBeta = await prisma.project.create({
    data: {
      name: "Mobile App Redesign",
      description: "Cross-platform mobile redesign for customer retention.",
      createdById: admin.id,
      isArchived: false,
    },
  });

  console.log("📁 Created 2 seed projects.");

  // 5. Add Project Memberships for Project Alpha
  await prisma.projectMember.createMany({
    data: [
      { projectId: projectAlpha.id, userId: pm.id, role: ProjectRole.PROJECT_MANAGER },
      { projectId: projectAlpha.id, userId: member.id, role: ProjectRole.TEAM_MEMBER },
      { projectId: projectAlpha.id, userId: viewer.id, role: ProjectRole.VIEWER },
      { projectId: projectAlpha.id, userId: admin.id, role: ProjectRole.PROJECT_MANAGER },
    ],
  });

  // 6. Create Tasks for Project Alpha
  const task1 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      title: "Design PostgreSQL Schema & Migrations",
      description: "Define relational ERD, foreign keys, cascade deletes, and optimistic concurrency version field.",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      version: 1,
      creatorId: pm.id,
      assigneeId: member.id,
    },
  });

  const task2 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      title: "Implement Real-Time Socket.IO Gateway",
      description: "Setup project and user rooms with connection auth handshake and reconnect caching.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      version: 1,
      creatorId: pm.id,
      assigneeId: member.id,
    },
  });

  const task3 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      title: "Optimistic Concurrency Conflict UI (HTTP 409)",
      description: "Build collision detection handler with interactive side-by-side conflict modal.",
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      version: 1,
      creatorId: pm.id,
      assigneeId: member.id,
    },
  });

  const task4 = await prisma.task.create({
    data: {
      projectId: projectAlpha.id,
      title: "Write RBAC Test Matrix & Security Audit",
      description: "Automate test assertions verifying 403 Forbidden responses on unauthorized endpoint access.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      version: 1,
      creatorId: admin.id,
      assigneeId: pm.id,
    },
  });

  console.log("📋 Created 4 initial tasks across TODO, IN_PROGRESS, and DONE.");

  // 7. Seed Initial Comments
  await prisma.comment.create({
    data: {
      taskId: task2.id,
      userId: pm.id,
      content: "Make sure socket rooms strictly verify project membership to prevent event leaks.",
    },
  });

  await prisma.comment.create({
    data: {
      taskId: task2.id,
      userId: member.id,
      content: "Understood, added room auth checks and live socket eviction on member removal.",
    },
  });

  // 8. Seed Initial Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        projectId: projectAlpha.id,
        action: "PROJECT_CREATED",
        entityType: "PROJECT",
        entityId: projectAlpha.id,
        metadata: { name: projectAlpha.name },
      },
      {
        userId: pm.id,
        projectId: projectAlpha.id,
        action: "TASK_CREATED",
        entityType: "TASK",
        entityId: task2.id,
        metadata: { title: task2.title, status: "IN_PROGRESS" },
      },
    ],
  });

  // 9. Seed Initial Notifications
  await prisma.notification.create({
    data: {
      userId: member.id,
      title: "Task Assigned",
      message: `You were assigned to "${task2.title}" in ${projectAlpha.name}`,
      link: `/projects/${projectAlpha.id}/tasks`,
      isRead: false,
    },
  });

  console.log("✅ Database successfully seeded!");
  console.log("------------------------------------------------");
  console.log(" Seed Credentials (Password: password123 for all)");
  console.log(" - Admin:          admin@neostats.com");
  console.log(" - Project Manager: pm@neostats.com");
  console.log(" - Team Member:     member@neostats.com");
  console.log(" - Viewer:          viewer@neostats.com");
  console.log("------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
