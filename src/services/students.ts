import { supabase } from '@/lib/supabase'
import type { AdmissionStatus, Student } from '@/types/domain'

export interface StudentWithClass extends Student {
  classes: { class_name: string } | null
}

export async function listStudents(): Promise<StudentWithClass[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*, classes:class_id(class_name)')
    .order('full_name')
  if (error) throw error
  return data as unknown as StudentWithClass[]
}

export async function nextStudentNumber(): Promise<string> {
  const { data, error } = await supabase
    .from('students')
    .select('student_number')
    .order('student_number', { ascending: false })
    .limit(1)
  if (error) throw error
  const last = data?.[0]?.student_number as string | undefined
  const lastNum = last ? parseInt(last.replace(/\D/g, ''), 10) : 0
  return `STU-${String(lastNum + 1).padStart(4, '0')}`
}

export interface StudentFormValues {
  student_number: string
  full_name: string
  gender: 'Male' | 'Female' | 'Other' | ''
  class_id: string
  parent_guardian_name: string
  parent_guardian_phone: string
  admission_status: AdmissionStatus
  academic_year_id: string
}

export async function createStudent(values: StudentFormValues) {
  const { error } = await supabase.from('students').insert({
    student_number: values.student_number,
    full_name: values.full_name,
    gender: values.gender || null,
    class_id: values.class_id,
    parent_guardian_name: values.parent_guardian_name || null,
    parent_guardian_phone: values.parent_guardian_phone || null,
    admission_status: values.admission_status,
    academic_year_id: values.academic_year_id,
  })
  if (error) throw error
}

export async function updateStudent(id: string, values: StudentFormValues) {
  const { error } = await supabase
    .from('students')
    .update({
      full_name: values.full_name,
      gender: values.gender || null,
      class_id: values.class_id,
      parent_guardian_name: values.parent_guardian_name || null,
      parent_guardian_phone: values.parent_guardian_phone || null,
      admission_status: values.admission_status,
    })
    .eq('id', id)
  if (error) throw error
}

export async function setStudentAdmissionStatus(id: string, status: AdmissionStatus) {
  const { error } = await supabase.from('students').update({ admission_status: status }).eq('id', id)
  if (error) throw error
}
