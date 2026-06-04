'use client'

import { Suspense, useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center } from '@react-three/drei'
import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import * as THREE from 'three'
import { Button } from '@/components/ui/button'
import { Grid3x3, Box, Loader2 } from 'lucide-react'

interface StlMeshProps {
  url: string
  wireframe: boolean
}

function StlMesh({ url, wireframe }: StlMeshProps) {
  const geometry = useLoader(STLLoader, url)

  const mesh = useRef<THREE.Mesh>(null)

  // Center and scale geometry
  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const center = new THREE.Vector3()
  box.getCenter(center)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = maxDim > 0 ? 2 / maxDim : 1

  return (
    <mesh ref={mesh} scale={scale} position={[-center.x * scale, -center.y * scale, -center.z * scale]}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color="#94a3b8"
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

interface StlViewerProps {
  signedUrl: string
  density?: 'full' | 'compact'
}

export function StlViewer({ signedUrl, density = 'full' }: StlViewerProps) {
  const [wireframe, setWireframe] = useState(false)
  const height = density === 'compact' ? 200 : 500

  return (
    <div className="relative rounded-md overflow-hidden border bg-zinc-950" style={{ height }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          <StlMesh url={signedUrl} wireframe={wireframe} />
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      </Canvas>

      {density === 'full' && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            variant={wireframe ? 'default' : 'secondary'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setWireframe(w => !w)}
            title={wireframe ? 'Solid mode' : 'Wireframe mode'}
          >
            {wireframe ? <Box className="h-3.5 w-3.5" /> : <Grid3x3 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  )
}
