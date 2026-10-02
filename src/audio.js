export function initAudio(){
  let context,master,enabled=false;
  const button=document.querySelector('#sound'),label=document.querySelector('#sound-label');
  async function toggle(){try{if(!context){context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination);
    // Original quiet cinematic drone. Replace with a licensed track if desired.
    [55,82.41,110.2].forEach((frequency,i)=>{const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.value=.09/(i+1);oscillator.connect(gain).connect(master);oscillator.start();});
  }await context.resume();enabled=!enabled;master.gain.setTargetAtTime(enabled ? .32 : 0,context.currentTime,.3);button.setAttribute('aria-pressed',String(enabled));label.textContent=enabled?'Couper le son':'Activer le son';}catch{label.textContent='Son indisponible';}}
  button.addEventListener('click',toggle);
  function click(){if(!enabled||!context||document.hidden)return;const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime;oscillator.type='sine';oscillator.frequency.setValueAtTime(420,now);oscillator.frequency.exponentialRampToValueAtTime(160,now+.045);gain.gain.setValueAtTime(.025,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.06);oscillator.connect(gain).connect(master);oscillator.start();oscillator.stop(now+.07);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}
  document.querySelectorAll('button,a').forEach(el=>{el.addEventListener('pointerenter',click);el.addEventListener('click',click);});
  document.addEventListener('visibilitychange',()=>{if(context&&master)master.gain.setTargetAtTime(enabled && !document.hidden ? .32 : 0,context.currentTime,.2);});
}
