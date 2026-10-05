import { useEffect, useState } from 'react'
import { apiUrl } from '../api/client'

const auth = () => ({ Authorization: `Bearer ${sessionStorage.getItem('cisne.accessToken') || ''}` })

export function usePrivateMemberPhoto(memberId?: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    setUrl(null)
    if (!memberId) return () => undefined
    fetch(`${apiUrl}/api/members/${memberId}/photo`, { headers: auth() }).then(response => response.ok ? response.blob() : null).then(blob => {
      if (!active || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    }).catch(() => undefined)
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [memberId])
  return url
}

export function PrivateMemberPhoto({ memberId, alt = '', className }: { memberId?: string | null; alt?: string; className?: string }) {
  const url = usePrivateMemberPhoto(memberId)
  return url ? <img src={url} alt={alt} className={className} /> : null
}
