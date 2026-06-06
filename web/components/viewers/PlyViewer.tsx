'use client'

import { Suspense, useEffect } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import * as THREE from 'three'

interface PlyPointsProps {
  url: string
}

function PlyPoints({ url }: PlyPointsProps) {
  const geometry = useLoader(PLYLoader, url, (loader: PLYLoader) => {
    loader.crossOrigin = 'anonymous'
  })

  useEffect(() => {
    geometry.computeBoundingBox()
    const box = geometry.boundingBox
    if (box) {
      const center = new THREE.Vector3()
      box.getCenter(center)
      geometry.translate(-center.x, -center.y, -center.z)
    }
  }, [geometry])

  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  const size = new THREE.Vector3()
  box?.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = maxDim > 0 ? 2 / maxDim : 1

  const hasColors = geometry.hasAttribute('color')

  const material = new THREE.PointsMaterial({
    size: 0.035,
    vertexColors: hasColors,
    color: hasColors ? undefined : new THREE.Color('#ff00aa'),
    sizeAttenuation: true,
  })

  return <points scale={scale} geometry={geometry} material={material} />
}

interface PlyViewerProps {
  signedUrl: string
  density?: 'full' | 'compact'
}

export function PlyViewer({ signedUrl, density = 'full' }: PlyViewerProps) {
  const height = density === 'compact' ? 240 : 520

  return (
    <div className="relative rounded-md overflow-hidden border bg-zinc-950" style={{ height }}>
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <color attach="background" args={['#0a0a0a']} />
        <ambientLight intensity={0.8} />
        <Suspense fallback={null}>
          <PlyPoints url={signedUrl} />
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      </Canvas>

      <div className="absolute top-2 left-2">
        <span className="text-xs text-zinc-300 px-2 py-0.5">
          Point Cloud
        </span>
      </div>
    </div>
  )
}
