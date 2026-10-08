import Lottie from 'lottie-react';
import save from '../assets/lottie/save.json';
import success from '../assets/lottie/success.json';
import empty from '../assets/lottie/empty.json';
import { useAccessibility } from '../lib/AccessibilityContext';
type Props={type:'save'|'success'|'empty';label?:string};
export default function LottieState({type,label}:Props){ const {reducedMotion}=useAccessibility(); const data=type==='save'?save:type==='success'?success:empty; return <div className="lottie-state">{reducedMotion ? <span className="lottie-static" aria-hidden="true">✓</span> : <Lottie animationData={data} loop={!reducedMotion} autoplay/>}{label&&<span className="sr-only">{label}</span>}</div>; }
