import { z } from 'zod'

export const CreateRequestSchema = z.object({
  studentId: z.string().min(1),
  firstName: z.string().min(1),
  middleInitial: z.string().max(1).optional().or(z.literal('')),
  lastName: z.string().min(1),
  course: z.string().min(1),
  academicYear: z.string().min(1),
  purpose: z.enum([
    'Transfer Out',
    'Employment',
    'Scholarship',
    'Internship',
    'Board Exam',
    'Other',
  ]),
  email: z.string().email(),
})

export type CreateRequestInput = z.infer<typeof CreateRequestSchema>
