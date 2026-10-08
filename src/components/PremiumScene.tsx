import { Component, Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, useGLTF } from '@react-three/drei';
import { useAccessibility } from '../lib/AccessibilityContext';
import { useReducedMotion } from 'motion/react';
type Props = { variant?: 'hero'|'job'|'progress'|'success' };
const paths: Record<NonNullable<Props['variant']>, string> = { hero:'/models/applyease-hero.glb', job:'/models/applyease-hero.glb', progress:'/models/applyease-progress.glb', success:'/models/applyease-success.glb' };
/** Decorative only: if WebGL or the model fails, render nothing instead of crashing the page. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
function Model({ path }: { path:string }) { const { scene } = useGLTF(path); return <primitive object={scene} scale={2.2} />; }
export default function PremiumScene({variant='hero'}:Props) { const { reducedMotion }=useAccessibility(); const osReduced=useReducedMotion(); const reduced=reducedMotion||!!osReduced; return <SceneBoundary><div className="premium-scene"><Canvas dpr={[1,1.5]} camera={{position:[0,0,4],fov:40}} frameloop={reduced?'demand':'always'}><ambientLight intensity={1.2}/><directionalLight position={[3,3,4]} intensity={2}/><Suspense fallback={null}><Float speed={reduced?0:1.2} rotationIntensity={reduced?0:.25} floatIntensity={reduced?0:.4}><Model path={paths[variant]}/></Float></Suspense></Canvas></div></SceneBoundary>; }
