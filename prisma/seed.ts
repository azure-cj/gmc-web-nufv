import {
  GmcRequestStatus,
  PaymentVerificationStatus,
  PrismaClient,
  PurposeOfRequest,
  StaffRole,
} from "@prisma/client";
import { createGmcRequest, updateGmcRequestStatus } from "../src/server/services/gmc-request-service";
import { issueCertificateForRequest } from "../src/server/services/certificate-service";
import { hashStaffPassword } from "../src/lib/staff-password";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLogEntry.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.gmcRequest.deleteMany();
  await prisma.numberingCounter.deleteMany();
  await prisma.staffSession.deleteMany();
  await prisma.staffLoginAttempt.deleteMany();
  await prisma.student.deleteMany();
  await prisma.staffUser.deleteMany();

  const defaultPasswordHash = await hashStaffPassword("gmcnufv2026");
  const adminPasswordHash = await hashStaffPassword("Mark@1234");

  const staffUsers = await Promise.all([
    prisma.staffUser.create({
      data: {
        name: "Alyssa Reyes",
        email: "alyssa.reyes@school.edu",
        passwordHash: defaultPasswordHash,
        mustChangePassword: true,
        isActive: true,
        role: StaffRole.DISCIPLINE_OFFICE_STAFF,
      },
    }),
    prisma.staffUser.create({
      data: {
        name: "Mark Dizon",
        email: "mark.dizon@school.edu",
        passwordHash: adminPasswordHash,
        mustChangePassword: false,
        isActive: true,
        role: StaffRole.ADMIN,
      },
    }),
  ]);

  const [disciplineStaff, adminUser] = staffUsers;

  const students = await Promise.all([
    prisma.student.create({
      data: {
        studentId: "2021-123456",
        firstName: "Juan",
        middleInitial: "M",
        lastName: "Dela Cruz",
        courseProgram: "BS Information Technology",
        academicYear: "2025-2026",
        email: "juan.delacruz@school.edu",
      },
    }),
    prisma.student.create({
      data: {
        studentId: "2020-654321",
        firstName: "Maria",
        middleInitial: "A",
        lastName: "Santos",
        courseProgram: "BS Business Administration",
        academicYear: "2025-2026",
        email: "maria.santos@school.edu",
      },
    }),
    prisma.student.create({
      data: {
        studentId: "2022-112233",
        firstName: "Enzo",
        middleInitial: null,
        lastName: "Reyes",
        courseProgram: "BS Criminology",
        academicYear: "2025-2026",
        email: "enzo.reyes@school.edu",
      },
    }),
    prisma.student.create({
      data: {
        studentId: "2023-445566",
        firstName: "Lara",
        middleInitial: "P",
        lastName: "Garcia",
        courseProgram: "BS Psychology",
        academicYear: "2025-2026",
        email: "lara.garcia@school.edu",
      },
    }),
    prisma.student.create({
      data: {
        studentId: "2019-778899",
        firstName: "Noah",
        middleInitial: "R",
        lastName: "Lim",
        courseProgram: "BS Accountancy",
        academicYear: "2025-2026",
        email: "noah.lim@school.edu",
      },
    }),
  ]);

  const [juan, maria, enzo, lara, noah] = students;

  const june10 = new Date("2026-06-10T09:00:00+08:00");
  const june12 = new Date("2026-06-12T10:30:00+08:00");
  const july02 = new Date("2026-07-02T08:45:00+08:00");
  const july03 = new Date("2026-07-03T11:20:00+08:00");
  const july04 = new Date("2026-07-04T14:00:00+08:00");
  const june13 = new Date("2026-06-13T13:15:00+08:00");
  const july08 = new Date("2026-07-08T15:40:00+08:00");

  await createGmcRequest(prisma, {
    studentId: juan.studentId,
    titlePrefix: "Mr.",
    term: "1",
    purposeOfRequest: PurposeOfRequest.SCHOLARSHIP,
    officialReceiptNumber: "INV01-000044214",
    submittedAt: june10,
    actorId: null,
  });

  const request2 = await createGmcRequest(prisma, {
    studentId: maria.studentId,
    titlePrefix: "Mrs.",
    term: "2",
    purposeOfRequest: PurposeOfRequest.EMPLOYMENT,
    officialReceiptNumber: "INV01-000044218",
    submittedAt: june12,
    actorId: null,
  });

  const request3 = await createGmcRequest(prisma, {
    studentId: enzo.studentId,
    titlePrefix: "Mr.",
    term: "3",
    purposeOfRequest: PurposeOfRequest.INTERNSHIP,
    officialReceiptNumber: "INV01-000044219",
    submittedAt: july02,
    actorId: null,
  });

  const request4 = await createGmcRequest(prisma, {
    studentId: lara.studentId,
    titlePrefix: "Mrs.",
    term: "4",
    purposeOfRequest: PurposeOfRequest.BOARD_EXAM,
    officialReceiptNumber: "INV01-000044220",
    submittedAt: july03,
    actorId: null,
  });

  const request5 = await createGmcRequest(prisma, {
    studentId: noah.studentId,
    titlePrefix: "Mr.",
    term: "5",
    purposeOfRequest: PurposeOfRequest.TRANSFER_OUT,
    officialReceiptNumber: "INV01-000044221",
    submittedAt: july04,
    actorId: null,
  });

  const approvedRequest = await updateGmcRequestStatus(prisma, {
    gmcRequestId: request2.id,
    status: GmcRequestStatus.APPROVED,
    reviewedById: disciplineStaff.id,
    paymentVerificationStatus: PaymentVerificationStatus.VALID,
    officialReceiptNumber: "INV01-000044218",
    reviewNotes: "Payment verified and GMC approved for employment requirement.",
    actorId: disciplineStaff.id,
  });

  await issueCertificateForRequest(prisma, {
    gmcRequestId: approvedRequest.id,
    authorizedSignatory: "SHEILA MARIE R. RELLES, MA",
    officeDesignation: "SDO Officer-in-Charge",
    dateOfIssuance: june13,
    generatedPdfUrl: "/uploads/generated-certificates/2026-06-000001.pdf",
    actorId: disciplineStaff.id,
  });

  await updateGmcRequestStatus(prisma, {
    gmcRequestId: request2.id,
    status: GmcRequestStatus.GENERATED,
    reviewedById: disciplineStaff.id,
    reviewNotes: "Certificate preview prepared for Phase 4 review.",
    actorId: disciplineStaff.id,
  });

  await updateGmcRequestStatus(prisma, {
    gmcRequestId: request3.id,
    status: GmcRequestStatus.RETURNED,
    reviewedById: disciplineStaff.id,
    paymentVerificationStatus: PaymentVerificationStatus.UNVERIFIED,
    officialReceiptNumber: "INV01-000044219",
    returnReason: "Payment proof is missing the transaction reference number.",
    reviewNotes: "Return for resubmission with a clearer payment proof.",
    actorId: disciplineStaff.id,
  });

  await updateGmcRequestStatus(prisma, {
    gmcRequestId: request4.id,
    status: GmcRequestStatus.REJECTED,
    reviewedById: adminUser.id,
    paymentVerificationStatus: PaymentVerificationStatus.INVALID,
    officialReceiptNumber: "INV01-000044220",
    rejectionReason: "Outstanding disciplinary case on record.",
    reviewNotes: "Rejected pending clearance from the Discipline Office.",
    actorId: adminUser.id,
  });

  const releasedRequest = await updateGmcRequestStatus(prisma, {
    gmcRequestId: request5.id,
    status: GmcRequestStatus.APPROVED,
    reviewedById: disciplineStaff.id,
    paymentVerificationStatus: PaymentVerificationStatus.VALID,
    officialReceiptNumber: "INV01-000044221",
    reviewNotes: "Approved for transfer-out processing.",
    actorId: disciplineStaff.id,
  });

  await issueCertificateForRequest(prisma, {
    gmcRequestId: releasedRequest.id,
    authorizedSignatory: "SHEILA MARIE R. RELLES, MA",
    officeDesignation: "SDO Officer-in-Charge",
    dateOfIssuance: july08,
    generatedPdfUrl: "/uploads/generated-certificates/2026-07-000001.pdf",
    actorId: disciplineStaff.id,
  });

  await updateGmcRequestStatus(prisma, {
    gmcRequestId: request5.id,
    status: GmcRequestStatus.RELEASED,
    reviewedById: disciplineStaff.id,
    dateReleased: new Date("2026-07-09T09:15:00+08:00"),
    reviewNotes: "Released to the student after certificate issuance.",
    actorId: disciplineStaff.id,
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
