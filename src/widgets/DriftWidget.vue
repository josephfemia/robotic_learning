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

const note =
  'The cyan dashed line is the expert\'s path. Each orange line is one rollout of the cloned policy: once a small error knocks it off-distribution, there\'s no correcting signal, so it walks away. Raise \\(\\epsilon\\) and the funnel widens fast.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the drift IIFE (reference lines 2470–2483).
  var W=700,H=300,padL=18,padR=18,NRoll=26,STEPS=64,eps=0.06;var svg=R.SVG(stage,W,H);
  function draw(){R.clr(svg);var x0=padL,x1=W-padR,ymid=H/2,maxA=H/2-22,dx=(x1-x0)/STEPS;
   svg.appendChild(R.E('line',{x1:x0,y1:ymid,x2:x1,y2:ymid,stroke:R.C.cyan,'stroke-width':2,'stroke-dasharray':'6 5'}));
   svg.appendChild(R.TX(x0+4,ymid-8,'expert / demo trajectory',{anchor:'start',fill:R.C.cyan,size:11.5}));
   for(var n=0;n<NRoll;n++){var d=0,off=false,pts='';
    for(var t=0;t<=STEPS;t++){if(!off){if(Math.random()<eps){off=true;d+=(Math.random()<0.5?-1:1)*4;}}else{d+=(Math.random()-0.5)*4+(d>0?0.6:-0.6);}d=R.clamp(d,-maxA,maxA);pts+=(t?' ':'')+(x0+t*dx).toFixed(1)+','+(ymid+d).toFixed(1);}
    svg.appendChild(R.E('polyline',{points:pts,fill:'none',stroke:R.C.orange,'stroke-width':1.2,opacity:0.5}));}
   svg.appendChild(R.TX((x0+x1)/2,H-8,'time / steps  →    (each line is one rollout of the cloned policy)',{fill:R.C.dim,size:11.5}));
  }
  R.slider(ctr,{label:'per-step error  ε',min:0.01,max:0.2,step:0.01,value:eps,fmt:function(v){return v.toFixed(2);},on:function(v){eps=v;draw();}});
  R.btn(ctr,'Resample rollouts','primary',function(){draw();});
  draw();
});
</script>
