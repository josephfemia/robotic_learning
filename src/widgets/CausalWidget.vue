<template>
  <Lab
    ref="lab"
    id="causal"
    title="The brake-light trap: train accuracy ↑, real driving ↓"
    :note="note"
  />
</template>

<script setup>
import { onMounted, ref } from 'vue';
import Lab from '../components/Lab.vue';
import R from './rllab.js';
import { trainingAccuracy, deploymentSuccess } from '../logic/causalConfusion.js';

const note =
  'Cloning fits correlations in \\(p(a\\mid o)\\); it has no notion of intervention, so it cannot tell a cause from its effect. The fix isn\'t more data — it\'s <em>removing the leaked channel</em> (or breaking the correlation with targeted interventions). This is why richer sensors sometimes need careful observation design, not just bigger networks.';

const lab = ref(null);

onMounted(() => {
  const stage = lab.value.stage;
  const ctr = lab.value.ctrl;
  if (!stage) return;

  // Ported VERBATIM from the causal IIFE (reference lines 2670–2688).
  // trainingAccuracy / deploymentSuccess imported from logic/causalConfusion.js;
  // identical to the original's inline incl?1.0:0.92 and incl?0.06:0.86.
  var W=700,H=300,incl=true;var svg=R.SVG(stage,W,H);
  function bar(x,w,val,col,label,sub){var y0=H-72,top=58,h=(y0-top)*R.clamp(val,0,1);
   svg.appendChild(R.E('rect',{x:x,y:y0-h,width:w,height:h,fill:col,opacity:0.88,rx:4}));
   svg.appendChild(R.TX(x+w/2,y0-h-8,(val*100).toFixed(0)+'%',{fill:'#EAF0F8',size:15,weight:700}));
   svg.appendChild(R.TX(x+w/2,y0+18,label,{fill:R.C.ink,size:12}));
   if(sub)svg.appendChild(R.TX(x+w/2,y0+34,sub,{fill:R.C.dim,size:10.5}));}
  function draw(){R.clr(svg);var trainAcc=trainingAccuracy(incl),deploy=deploymentSuccess(incl);
   svg.appendChild(R.E('line',{x1:40,y1:H-72,x2:W-40,y2:H-72,stroke:R.C.axis,'stroke-width':1.2}));
   bar(130,150,trainAcc,trainAcc>0.8?R.C.green:R.C.red,'training accuracy','on logged demos');
   bar(420,150,deploy,deploy>0.5?R.C.green:R.C.red,'closed-loop success','driving for real');
   svg.appendChild(R.TX(W/2,26,incl?'Observation INCLUDES the car’s own brake-light':'Observation EXCLUDES the brake-light',{fill:incl?R.C.red:R.C.green,size:13,weight:700}));
   svg.appendChild(R.TX(W/2,H-10,incl?'Learns "brake-light → brake" (an effect) — perfect on data, never starts braking when deployed':'Forced to learn the real cause → brakes correctly when driving',{fill:R.C.dim,size:11.5}));}
  R.btn(ctr,'Remove the brake-light feature',null,function(){incl=false;draw();});
  R.btn(ctr,'Add the brake-light feature','primary',function(){incl=true;draw();});
  R.legend(stage,[[R.C.green,'good'],[R.C.red,'fails']]);
  draw();
});
</script>
