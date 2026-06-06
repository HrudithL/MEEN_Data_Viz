'use client'

import { Suspense, useState } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import * as THREE from 'three'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Grid3x3, Box, Loader2, Settings2 } from 'lucide-react'

interface StlMeshProps {
  url: string
  wireframe: boolean
  color: string
}

function StlMesh({ url, wireframe, color }: StlMeshProps) {
  const geometry = useLoader(STLLoader, url, (loader: STLLoader) => {
    loader.crossOrigin = 'anonymous'
  })

  geometry.computeBoundingBox()
  const box = geometry.boundingBox!
  const center = new THREE.Vector3()
  box.getCenter(center)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = maxDim > 0 ? 2 / maxDim : 1

  return (
    <group scale={scale} position={[-center.x * scale, -center.y * scale, -center.z * scale]}>
      <mesh castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial
          color={color}
          wireframe={wireframe}
          side={THREE.DoubleSide}
          metalness={0.15}
          roughness={0.45}
        />
      </mesh>
    </group>
  )
}

interface StlViewerProps {
  signedUrl: string
  density?: 'full' | 'compact'
}

export function StlViewer({ signedUrl, density = 'full' }: StlViewerProps) {
  const [wireframe, setWireframe] = useState(false)
  const [color, setColor] = useState('#ff6b35')
  const [showSettings, setShowSettings] = useState(false)
  const height = density === 'compact' ? 240 : 520

  return (
    <div className="relative rounded-md overflow-hidden border bg-zinc-950" style={{ height }}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0a0a0a']} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, -2, -6]} intensity={0.25} />
        <Suspense fallback={null}>
          <StlMesh url={signedUrl} wireframe={wireframe} color={color} />
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      </Canvas>

      {density === 'full' && (
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            variant={showSettings ? 'default' : 'secondary'}
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowSettings(s => !s)}
            title="Viewer settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
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

      {showSettings && density === 'full' && (
        <div className="absolute top-10 right-2 w-52 rounded-md border bg-background/95 backdrop-blur p-3 space-y-2 shadow-lg">
          <div className="space-y-1">
            <Label className="text-xs">Mesh color</Label>
            <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 p-1" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  )
}
