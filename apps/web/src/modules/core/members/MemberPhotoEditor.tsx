import { useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import './MemberPhotoEditor.css'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type PhotoDraft = { file: File; url: string } | null

type MemberPhotoEditorProps = {
  value?: string | null
  draft?: PhotoDraft
  saving?: boolean
  onSave: (file: File) => Promise<void> | void
  onRemove?: () => Promise<void> | void
}

type ImageSource = { file: File; url: string }

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('Não foi possível ler esta imagem.'))
  image.src = url
})

const getCropFile = async (source: ImageSource, area: Area) => {
  if (area.width < 3 || area.height < 4) throw new Error('A imagem é pequena demais para gerar uma foto 3:4.')
  const image: CanvasImageSource & { close?: () => void } = typeof createImageBitmap === 'function'
    ? await createImageBitmap(source.file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    : await loadImage(source.url)
  const outputWidth = Math.max(3, Math.floor(Math.min(600, area.width) / 3) * 3)
  const outputHeight = outputWidth * 4 / 3
  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível preparar a foto.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, outputWidth, outputHeight)
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, outputWidth, outputHeight)
  image.close?.()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Não foi possível gerar a foto recortada.')), 'image/jpeg', .9))
  return new File([blob], 'member-photo.jpg', { type: 'image/jpeg' })
}

export function MemberPhotoEditor({ value, draft, saving = false, onSave, onRemove }: MemberPhotoEditorProps) {
  const [source, setSource] = useState<ImageSource | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [error, setError] = useState('')
  const cancelRef = useRef<HTMLButtonElement>(null)
  const preview = draft?.url || value || null

  useEffect(() => {
    if (!source) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) closeEditor() }
    window.addEventListener('keydown', onKeyDown)
    cancelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [source, saving])

  const closeEditor = () => {
    if (saving) return
    if (source) URL.revokeObjectURL(source.url)
    setSource(null)
    setCroppedArea(null)
    setZoom(1)
    setError('')
  }

  const select = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) return setError('Formato inválido. Use JPG, PNG ou WEBP.')
    if (file.size > MAX_FILE_SIZE) return setError('A foto deve ter no máximo 5 MB.')
    if (source) URL.revokeObjectURL(source.url)
    setError('')
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedArea(null)
    setSource({ file, url: URL.createObjectURL(file) })
  }

  const save = async () => {
    if (!source || !croppedArea) return setError('Ajuste a foto antes de salvar.')
    setError('')
    try {
      await onSave(await getCropFile(source, croppedArea))
      closeEditor()
    } catch (cause: any) {
      setError(cause?.message || 'Não foi possível salvar a foto. Tente novamente.')
    }
  }

  return <section className="member-photo-editor" aria-labelledby="member-photo-heading">
    <strong id="member-photo-heading">Foto do sócio</strong>
    <div className="member-photo-preview member-photo-preview-3x4">
      {preview ? <img src={preview} alt="Pré-visualização da foto do sócio" /> : <div className="photo-placeholder"><span>Sem foto</span></div>}
    </div>
    <div className="photo-actions">
      <label className="photo-upload-button">{preview ? 'Alterar foto' : 'Selecionar foto'}<input type="file" accept={ACCEPTED_TYPES.join(',')} onChange={select} disabled={saving} /></label>
      {preview && onRemove && <button type="button" onClick={() => void onRemove()} disabled={saving}>{draft ? 'Remover seleção' : 'Remover foto'}</button>}
    </div>
    {draft && <small className="photo-draft-note">Foto ajustada. Ela será enviada ao salvar o cadastro.</small>}
    {error && <small className="photo-error" role="alert">{error}</small>}
    {source && <div className="member-photo-modal" role="dialog" aria-modal="true" aria-labelledby="member-photo-editor-title">
      <div className="member-photo-editor-dialog">
        <div className="member-photo-editor-heading"><div><span className="eyebrow">Foto do associado</span><h2 id="member-photo-editor-title">Ajustar foto</h2></div><button type="button" className="member-photo-close" onClick={closeEditor} disabled={saving} aria-label="Fechar editor">×</button></div>
        <div className="member-photo-cropper"><Cropper image={source.url} crop={crop} zoom={zoom} aspect={3 / 4} cropShape="rect" showGrid restrictPosition objectFit="contain" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCroppedArea(pixels)} /></div>
        <div className="member-photo-zoom"><label htmlFor="member-photo-zoom-range">Zoom</label><span>Menos</span><input id="member-photo-zoom-range" type="range" min={1} max={3} step={0.01} value={zoom} onChange={event => setZoom(Number(event.target.value))} disabled={saving} aria-label="Zoom da foto" /><span>Mais</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="member-photo-editor-actions"><button type="button" className="btn btn-secondary" onClick={closeEditor} disabled={saving} ref={cancelRef}>Cancelar</button><button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando…' : 'Salvar foto'}</button></div>
      </div>
    </div>}
  </section>
}
