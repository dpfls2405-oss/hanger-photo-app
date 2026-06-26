import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vjkpinqzfqcmaqrsyobo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqa3BpbnF6ZnFjbWFxcnN5b2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NzY3NDUsImV4cCI6MjA4OTM1Mjc0NX0.4LEgaj1LyeUH1a5FoAuCSM43kPseDPqJkWj2jZu8bVA'

export const supabase = createClient(supabaseUrl, supabaseKey)
export const STORAGE_URL = `${supabaseUrl}/storage/v1/object/public/hanger-photos`

/** 업로드 전 브라우저에서 리사이즈+JPEG 압축 (긴 변 1600px, 품질 0.75) */
export async function compressImage(file, maxDim = 1600, quality = 0.75) {
  try {
    if (!file || !file.type || !file.type.startsWith('image/')) return file
    const bitmap = await createImageBitmap(file)
    let width = bitmap.width, height = bitmap.height
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    if (bitmap.close) bitmap.close()
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    return (blob && blob.size < file.size) ? blob : file
  } catch {
    return file
  }
}
