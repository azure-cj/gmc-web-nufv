import React from 'react'
import RequestForm from '../components/forms/RequestForm'

export default function HomePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Good Moral Certificate Request</h1>
      <RequestForm />
    </div>
  )
}
