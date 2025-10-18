'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusCircle } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'
import { useToast } from '@/hooks/use-toast'

export function AddStudentDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [className, setClassName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const resetForm = () => {
    setName('')
    setStudentId('')
    setClassName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullName = name.trim()
    const schoolId = studentId.trim()
    const classRef = className.trim()

    if (!fullName || !schoolId || !classRef) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      await addDoc(collection(db, 'students'), {
        fullName,
        schoolId,
        classRef,
        totalMeritPoints: 0,
        totalDemeritPoints: 0,
        createdAt: serverTimestamp(),
      })

      toast({ title: 'Thành công', description: 'Đã thêm học sinh mới.' })
      resetForm()
      setIsOpen(false)
    } catch (error: unknown) {
      console.error('Lỗi khi thêm học sinh:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast({
        title: 'Lỗi',
        description: `Không thể thêm học sinh. Vui lòng thử lại. Lỗi: ${errorMessage}`,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Thêm Học Sinh Mới
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Thêm Học Sinh Mới</DialogTitle>
            <DialogDescription>
              Nhập thông tin chi tiết của học sinh mới. Nhấn "Lưu" để hoàn tất.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Họ và Tên</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="col-span-3"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="studentId" className="text-right">Mã số HS</Label>
              <Input
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="HS001"
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right">Lớp</Label>
              <Input
                id="class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="class_6_1"
                className="col-span-3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}