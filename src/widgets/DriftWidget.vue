<template>
  <Lab
    ref="lab"
    id="drift"
    title="Distribution shift: trajectories drifting off the demo"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { tween } from '../composables/useAnimate.js';
import { simulateRollout } from '../logic/driftFunnel.js';

const note =
  'The cyan dashed line is the expert\'s path. Each orange line is one rollout of the cloned policy: once a small error knocks it off-distribution, there\'s no correcting signal, so it walks away. Raise \\(\\epsilon\\) and the funnel widens fast.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Layout from the drift IIFE (reference lines 2470–2483); the walk itself
  // comes from the vitest-pinned core (rollouts start ON the demo line at t=0).
  var W=700,H=300,padL=18,padR=18,NRoll=26,STEPS=64,eps=0.06;var svg=R.SVG(stage,W,H);
  var x0=padL,x1=W-padR,ymid=H/2,maxA=H/2-22,dx=(x1-x0)/STEPS;
  // Sample the rollout bundle ONCE per (re)sample and cache the point-strings, so
  // animating opacity fades fixed lines in rather than re-jittering them each frame.
  var rolls=[];
  function sampleRolls(){rolls=[];for(var n=0;n<NRoll;n++){
    var d=simulateRollout(eps,STEPS,maxA),pts='';
    for(var t=0;t<=STEPS;t++){pts+=(t?' ':'')+(x0+t*dx).toFixed(1)+','+(ymid+d[t]).toFixed(1);}
    rolls.push(pts);}}
  sampleRolls();
  function draw(rollAlpha){
   if(rollAlpha===undefined)rollAlpha=0.5;
   R.clr(svg);
   svg.appendChild(R.E('line',{x1:x0,y1:ymid,x2:x1,y2:ymid,stroke:R.C.cyan,'stroke-width':2,'stroke-dasharray':'6 5'}));
   // Label moved to the top-left corner: at x0 all rollouts still sit on the demo
   // line, so this band is clear of the orange funnel (which fans out to the right).
   svg.appendChild(R.TX(x0+4,16,'cyan dashed = expert / demo trajectory',{anchor:'start',fill:R.C.cyan,size:11.5,base:'hanging'}));
   for(var n=0;n<rolls.length;n++){svg.appendChild(R.E('polyline',{points:rolls[n],fill:'none',stroke:R.C.orange,'stroke-width':1.2,opacity:rollAlpha}));}
   svg.appendChild(R.TX((x0+x1)/2,H-8,'time / steps  →    (each line is one rollout of the cloned policy)',{fill:R.C.dim,size:11.5}));
  }
  // Slider drag: re-sample (ε changed the funnel shape) and draw instantly.
  R.slider(ctr,{label:'per-step error  ε',min:0.01,max:0.2,step:0.01,value:eps,fmt:function(v){return v.toFixed(2);},on:function(v){eps=v;sampleRolls();draw(0.5);}});
  R.btn(ctr,'Resample rollouts','primary',function(){
   // Discrete change: draw a fresh bundle, then fade it in for a gentle settle.
   sampleRolls();
   tween(360,{onStep(e){draw(0.5*e);},onDone(){draw(0.5);}});
  });
  draw(0.5);
});
</script>
