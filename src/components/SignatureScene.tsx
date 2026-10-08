import { lazy, Suspense } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useAccessibility } from '../lib/AccessibilityContext';
import { Accessibility, Keyboard, Mic, Sparkles, Check } from 'lucide-react';
const PremiumScene = lazy(() => import('./PremiumScene'));
type Props = {
    variant?: 'hero' | 'job' | 'progress' | 'success';
    label?: string;
};
export default function SignatureScene({ variant = 'hero', label }: Props) { const a11y = useAccessibility(); const osReduced = useReducedMotion(); const reduced = a11y.reducedMotion || !!osReduced; return <div className={`signature-scene scene-${variant}`} aria-hidden="true"><Suspense fallback={null}><PremiumScene variant={variant}/></Suspense><div className="scene-orbit orbit-one"/><div className="scene-orbit orbit-two"/><motion.div className="scene-core" animate={reduced ? undefined : { y: [0, -10, 0], rotateX: [0, 3, 0], rotateY: [-8, 8, -8] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}><div className="scene-inner"><Sparkles size={28}/></div><div className="scene-node node-key"><Keyboard size={16}/></div><div className="scene-node node-voice"><Mic size={16}/></div><div className="scene-node node-a11y"><Accessibility size={16}/></div></motion.div>{variant === 'progress' && <div className="scene-path"><span className="path-dot active"/><span /><span /><span /><span className="path-dot end"/></div>}{variant === 'success' && <div className="scene-success"><Check size={24}/></div>}{label && <span className="scene-label">{label}</span>}</div>; }
