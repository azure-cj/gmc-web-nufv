import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateRequestSchema } from '@gmc/shared/schemas/request.schema'
import type { CreateRequestInput } from '@gmc/shared/schemas/request.schema'

export default function RequestForm() {
  const { register, handleSubmit, formState } = useForm<CreateRequestInput>({
    resolver: zodResolver(CreateRequestSchema)
  })

  async function onSubmit(values: CreateRequestInput) {
    try {
      const form = new FormData()
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined) form.append(k, String(v))
      })
      // file input handling
      const fileInput = (document.getElementById('paymentProof') as HTMLInputElement | null)
      if (fileInput?.files && fileInput.files[0]) {
        form.append('paymentProof', fileInput.files[0])
      }

      await fetch('/api/requests', { method: 'POST', body: form })
      // feedback would be added here
    } catch (err) {
      // handle error
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Student ID</label>
        <input {...register('studentId')} className="input" />
      </div>
      <div>
        <label>First Name</label>
        <input {...register('firstName')} className="input" />
      </div>
      <div>
        <label>Middle Initial</label>
        <input {...register('middleInitial')} className="input" />
      </div>
      <div>
        <label>Last Name</label>
        <input {...register('lastName')} className="input" />
      </div>
      <div>
        <label>Course</label>
        <select {...register('course')}>
          <option value="BSCS">BSCS</option>
          <option value="BSIT">BSIT</option>
          <option value="BSE">BSE</option>
        </select>
      </div>
      <div>
        <label>Academic Year</label>
        <select {...register('academicYear')}>
          <option value="2025-2026">2025-2026</option>
          <option value="2024-2025">2024-2025</option>
        </select>
      </div>
      <div>
        <label>Purpose</label>
        <select {...register('purpose')}>
          <option>Transfer Out</option>
          <option>Employment</option>
          <option>Scholarship</option>
          <option>Internship</option>
          <option>Board Exam</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label>Email</label>
        <input {...register('email')} className="input" />
      </div>
      <div>
        <label>Payment Proof (JPG, PNG, PDF, max 5MB)</label>
        <input id="paymentProof" type="file" accept="image/png,image/jpeg,application/pdf" />
      </div>
      <div>
        <button type="submit" disabled={formState.isSubmitting} className="btn">
          Submit Request
        </button>
      </div>
    </form>
  )
}
