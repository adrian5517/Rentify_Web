"use client"

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Navbar from './navbar'

export default function NavbarWrapper() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState<string>('')

  useEffect(() => {
    if (!pathname) return
    // Map known routes to navbar page ids
    if (pathname === '/' || pathname === '/home') setCurrentPage('home')
    else if (pathname.startsWith('/my-listings')) setCurrentPage('my-listings')
    else if (pathname.startsWith('/messages')) setCurrentPage('messages')
    else if (pathname.startsWith('/profile')) setCurrentPage('profile')
    else setCurrentPage('')
  }, [pathname])

  const onPageChange = (page: string) => {
    // Router navigation for known pages
    if (page === 'home') router.push('/')
    else if (page === 'my-listings') router.push('/my-listings')
    else if (page === 'messages') router.push('/messages')
    else if (page === 'profile') router.push('/profile')
    else router.push('/')
  }

  return <Navbar currentPage={currentPage} onPageChange={onPageChange} />
}
