import { useEffect, useState } from 'react'
import { apiUrl, mediaUrl } from '../api/client'

const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` })

export function usePrivateMemberPhoto(memberId?: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let disposed = false
    let objectUrl: string | null = null
    const controller = new AbortController()
    setUrl(null)
    if (!memberId) return () => undefined
    fetch(`${apiUrl}/api/members/${memberId}/photo`, { headers: auth(), signal: controller.signal }).then(response => response.ok ? response.blob() : null).then(blob => {
      if (disposed || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => undefined)
    return () => {
      disposed = true
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [memberId])
  return url
}

export function PrivateMemberPhoto({ memberId, alt = '', className }: { memberId?: string | null; alt?: string; className?: string }) {
  const url = usePrivateMemberPhoto(memberId)
  return url ? <img src={url} alt={alt} className={className} /> : null
}

export function usePrivateMemberPhotos(photoPaths: Array<string | null | undefined>, memberIds: Array<string | null | undefined> = []) {
  const [urls, setUrls] = useState<Record<number, string>>({})
  const pathsKey = photoPaths.map((photoPath, index) => `${memberIds[index] ?? ''}\u0000${photoPath ?? ''}`).join('\u0001')

  useEffect(() => {
    let disposed = false
    const controller = new AbortController()
    const objectUrls = new Set<string>()
    setUrls({})

    const revokeObjectUrls = () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url))
      objectUrls.clear()
    }

    const load = async () => {
      const entries = await Promise.all(photoPaths.map(async (photoPath, index) => {
        if (!photoPath) return [index, null] as const
        const memberId = memberIds[index]
        const response = await fetch(memberId ? `${apiUrl}/api/members/${memberId}/photo` : mediaUrl(photoPath), { headers: auth(), signal: controller.signal })
        if (!response.ok) throw new Error(`Não foi possível carregar a foto (${response.status}).`)
        const blob = await response.blob()
        if (disposed) return [index, null] as const
        const url = URL.createObjectURL(blob)
        objectUrls.add(url)
        return [index, url] as const
      }))

      if (disposed) return
      setUrls(Object.fromEntries(entries.filter((entry): entry is readonly [number, string] => Boolean(entry[1]))))
    }

    void load().catch(() => {
      if (!disposed) setUrls({})
      revokeObjectUrls()
    })

    return () => {
      disposed = true
      controller.abort()
      revokeObjectUrls()
    }
  }, [pathsKey])

  return urls
}
