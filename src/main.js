import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initScene } from './viewer.js';
import { initAudio } from './audio.js';
import { initProfile } from './profile.js';
import { initStory } from './story.js';

gsap.registerPlugin(ScrollTrigger);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
initAudio();initProfile();
let scene;
try{scene=initScene(document.querySelector('#viewer'),reducedMotion);}catch(error){console.error('Initialisation 3D impossible',error);document.querySelector('#model-status').textContent='3D INDISPONIBLE';}
initStory({ onChapter: index => scene?.setChapter(index) });
if(!reducedMotion){gsap.from('.hero-heading',{y:24,opacity:0,duration:1,ease:'power2.out'});document.querySelectorAll('.team article').forEach(element=>gsap.from(element,{y:25,opacity:0,duration:.7,scrollTrigger:{trigger:element,start:'top 92%',once:true}}));}
