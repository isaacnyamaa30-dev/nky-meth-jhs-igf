import { supabase } from '@/lib/supabase'
import type { SchoolClass } from '@/types/domain'

export interface ClassWithTeacher extends SchoolClass {
  staff: { full_name: string } | null
  student_count?: number
}

export async function listClasses(): Promise<ClassWithTeacher[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*, staff:class_teacher_id(full_name)')
    .order('class_name')
  if (error) throw error
  return data as unknown as ClassWithTeacher[]
}

export async function listActiveClasses(): Promise<SchoolClass[]> {
  const { data, error } = await supabase.from('classes').select('*').eq('active', true).order('class_name')
  if (error) throw error
  return data
}

export interface ClassFormValues {
  class_name: string
  academic_year_id: string
  class_teacher_id: string
}

export async function createClass(values: ClassFormValues) {
  const { error } = await supabase.from('classes').insert({
    class_name: values.class_name,
    academic_year_id: values.academic_year_id,
    class_teacher_id: values.class_teacher_id || null,
  })
  if (error) throw error
}

export async function updateClass(id: string, values: Pick<ClassFormValues, 'class_name' | 'class_teacher_id'>) {
  const { error } = await supabase
    .from('classes')
    .update({ class_name: values.class_name, class_teacher_id: values.class_teacher_id || null })
    .eq('id', id)
  if (error) throw error
}

export async function setClassActive(id: string, active: boolean) {
  const { error } = await supabase.from('classes').update({ active }).eq('id', id)
  if (error) throw error
}
