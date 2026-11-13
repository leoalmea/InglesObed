(function(){
'use strict';
var KEY='listenpath_v1', $=function(s){return document.querySelector(s)};
var S=load(), view='home', cur=null, plays=0, swReg=null, voice=null;
function load(){try{var s=JSON.parse(localStorage.getItem(KEY));if(s&&s.res)return s}catch(e){}return {res:{},rem:{on:false,time:'19:00'},days:[]}}
function save(){S.sec=S.sec||{};S.done=S.done||{};try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function dkey(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function today(){return dkey(new Date())}
function lessonsOf(l){return LESSONS.filter(function(x){return x.lv===l})}
function best(id){return S.res[id]?S.res[id].best:null}
function levelStats(l){var ls=lessonsOf(l),done=ls.filter(function(x){return best(x.id)!==null}),sum=0;done.forEach(function(x){sum+=best(x.id)});
 var avg=done.length?Math.round(sum/done.length):0;return {n:ls.length,done:done.length,avg:avg,ready:done.length===ls.length&&avg>=80}}
function nextLesson(){var i,l;for(i=0;i<LESSONS.length;i++){l=LESSONS[i];if(best(l.id)===null||best(l.id)<70)return l}return null}
function overall(){var d=LESSONS.filter(function(x){return best(x.id)!==null}),s=0;d.forEach(function(x){s+=best(x.id)});return {done:d.length,pct:Math.round(d.length/LESSONS.length*100),score:d.length?Math.round(s/d.length):0}}
function assistant(){
 var cur='A1',i,st,msg,k;
 for(i=0;i<LEVELS.length;i++){st=levelStats(LEVELS[i]);cur=LEVELS[i];if(!st.ready)break}
 st=levelStats(cur);var nl=LEVELS[LEVELS.indexOf(cur)+1];
 if(st.ready&&!nl)return {lv:'B2',txt:'¡Completaste todos los niveles con buen puntaje! Mantén el hábito repitiendo lecciones a velocidad normal.'};
 if(st.ready)return {lv:cur,txt:'Ya puedes subir al nivel '+nl+'. Promedio en '+cur+': '+st.avg+'%.'};
 if(!st.done)return {lv:cur,txt:'Estás empezando el nivel '+cur+'. '+TIPS[cur]};
 if(st.done<st.n)return {lv:cur,txt:'Vas bien en '+cur+' ('+st.avg+'% de promedio). Faltan '+(st.n-st.done)+' lección(es) para evaluar tu salto. '+TIPS[cur]};
 return {lv:cur,txt:'Completaste '+cur+' pero tu promedio es '+st.avg+'%. Necesitas 80% para subir: empieza repitiendo "'+weak(cur).t+'", tu lección más baja. '+TIPS[cur]};
}
/* audio */
function pickVoice(){if(!window.speechSynthesis)return;var v=speechSynthesis.getVoices();voice=null;for(var i=0;i<v.length;i++){if(/^en[-_]US/i.test(v[i].lang)){voice=v[i];break}}if(!voice)for(i=0;i<v.length;i++){if(/^en/i.test(v[i].lang)){voice=v[i];break}}}
if(window.speechSynthesis){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
function speak(txt,rate,onend){
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){alert('Tu navegador no soporta audio por voz. Prueba con Chrome, Edge, Safari o Firefox actualizados.');return}
 speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(txt);u.lang='en-US';u.rate=rate;if(voice)u.voice=voice;
 u.onend=u.onerror=function(){document.body.classList.remove('playing');if(onend)onend()};
 document.body.classList.add('playing');speechSynthesis.speak(u)}
/* views */
function bar(p){return '<div class="bar" role="progressbar" aria-valuenow="'+p+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+p+'%"></i></div>'}
function lessonCard(l){var b=best(l.id);return '<button class="card lesson" data-open="'+l.id+'"><span class="lv">'+l.lv+'</span><b>'+l.t+'</b><small>'+(b===null?'Sin intentar':'Mejor puntaje: '+b+'%')+'</small></button>'}
function home(){
 var o=overall(),a=assistant(),n=nextLesson(),h='';
 h+='<section class="hero"><p class="muted">Tu puntaje de escucha</p><div class="score">'+o.score+'<span>%</span></div><p>Progreso general: '+o.done+' de '+LESSONS.length+' lecciones</p>'+bar(o.pct)+'</section>';
 h+=goal();
 h+='<section class="panel"><h2>Asistente de nivel: '+a.lv+'</h2><p>'+a.txt+'</p></section>';
 if(n)h+='<section><h2>Siguiente lección recomendada</h2>'+lessonCard(n)+'</section>';
 LEVELS.forEach(function(l){var s=levelStats(l);h+='<section><h2>Nivel '+l+' <small>'+s.done+'/'+s.n+(s.done?' · promedio '+s.avg+'%':'')+'</small></h2><div class="grid">'+lessonsOf(l).map(lessonCard).join('')+'</div></section>'});
 return h}
function lesson(){
 var l=cur,h='<button class="link" data-nav="home">‹ Volver</button><h1>'+l.t+' <span class="lv">'+l.lv+'</span></h1>';
 h+='<div class="player"><div class="wave" aria-hidden="true">'+new Array(24).join('<i></i>')+'</div><div class="ctl"><button class="btn" id="play">▶ Escuchar</button><label>Velocidad <select id="rate"><option value="0.7">Lenta</option><option value="1" selected>Normal</option><option value="1.2">Rápida</option></select></label></div><p class="muted" id="pc">Reproducciones: '+plays+'</p></div>';
 h+='<form id="quiz">';
 l.qs.forEach(function(q,i){h+='<fieldset><legend>'+(i+1)+'. '+q[0]+'</legend>'+q[1].map(function(o,j){return '<label class="opt"><input type="radio" name="q'+i+'" value="'+j+'"> '+o+'</label>'}).join('')+'</fieldset>'});
 h+='<fieldset><legend>Dictado (opcional): escribe la primera frase que escuches</legend><input id="dict" type="text" autocomplete="off" autocapitalize="none" spellcheck="false"></fieldset>';
 return h+'<button class="btn" type="submit">Comprobar respuestas</button></form><div id="result"></div>'}
function review(){
 var d=LESSONS.filter(function(x){return S.res[x.id]});
 if(!d.length)return '<h1>Repaso</h1><p class="empty">Aún no hay lecciones completadas. Haz tu primera lección y aparecerá aquí con su transcripción.</p>';
 return '<h1>Repaso</h1>'+d.map(function(l){var r=S.res[l.id];return '<details class="card"><summary><span class="lv">'+l.lv+'</span> <b>'+l.t+'</b> <small>Mejor: '+r.best+'% · intentos: '+r.n+'</small></summary><p class="tx">'+l.txt+'</p>'+vocabHTML(l)+'<button class="btn small" data-say="'+l.id+'">▶ Escuchar de nuevo</button> <button class="btn small ghost" data-open="'+l.id+'">Repetir lección</button></details>'}).join('')}
function settings(){
 var perm=('Notification' in window)?Notification.permission:'no soportado';
 return '<h1>Recordatorios y datos</h1><section class="panel"><label class="row"><input type="checkbox" id="remOn"'+(S.rem.on?' checked':'')+'> Recordarme practicar cada día</label><label class="row">Hora <input type="time" id="remTime" value="'+S.rem.time+'"></label><p class="muted">Permiso de notificaciones: '+perm+'. Los avisos llegan cuando la app está abierta o instalada; si no, verás el aviso al abrirla.</p><button class="btn small" id="remSave">Guardar recordatorio</button></section><section class="panel"><h2>Tu progreso</h2><p class="muted">Se guarda solo en este dispositivo.</p><button class="btn small ghost" id="exp">Exportar copia</button> <button class="btn small ghost" id="reset">Borrar progreso</button></section>'}
function render(){
 var m=$('#main');m.innerHTML=viewHTML();
 var b=document.querySelectorAll('nav button');for(var i=0;i<b.length;i++)b[i].classList.toggle('on',b[i].getAttribute('data-nav')===(['review','settings'].indexOf(view)<0?'home':view));
 window.scrollTo(0,0)}
function go(v){if(window.speechSynthesis)speechSynthesis.cancel();view=v;render()}
function openLesson(id){cur=LESSONS.filter(function(x){return x.id===id})[0];plays=0;go('lesson')}
function norm(x){return x.toLowerCase().replace(/[^a-z0-9' ]/g,' ').split(/\s+/).filter(Boolean)}
function firstSentence(l){return l.txt.match(/[^.?!]+[.?!]/)[0].trim()}
function dictHTML(v,l){if(!v.replace(/\s/g,''))return '';var t=norm(firstSentence(l)),u=norm(v),hit=0;t.forEach(function(w){if(u.indexOf(w)>-1)hit++});
 return '<h2>Dictado: '+Math.round(hit/t.length*100)+'%</h2><p class="tx">Frase correcta: '+firstSentence(l)+'</p>'}
function vocabHTML(l){return l.vo.length?'<h2>Vocabulario clave</h2><div class="voc">'+l.vo.map(function(w){return '<span><b>'+w[0]+'</b></span><span>'+w[1]+'</span>'}).join('')+'</div>':''}
function weak(lv){var w=null;lessonsOf(lv).forEach(function(x){if(!w||(best(x.id)||0)<(best(w.id)||0))w=x});return w}
function submit(e){
 e.preventDefault();var l=cur,ok=0,all=true,h='',dv=$('#dict')?$('#dict').value:'';
 l.qs.forEach(function(q,i){var c=document.querySelector('input[name=q'+i+']:checked');if(!c){all=false;return}if(+c.value===q[2])ok++});
 if(!all){alert('Responde todas las preguntas.');return}
 var p=Math.round(ok/l.qs.length*100),r=S.res[l.id]||{best:0,n:0};r.n++;r.last=p;r.best=Math.max(r.best,p);S.res[l.id]=r;mark('lesson');
 if(S.days.indexOf(today())<0)S.days.push(today());save();
 l.qs.forEach(function(q,i){var c=+document.querySelector('input[name=q'+i+']:checked').value;h+='<li class="'+(c===q[2]?'good':'bad')+'">'+q[0]+' <b>'+q[1][q[2]]+'</b></li>'});
 var msg=p>=80?'¡Excelente!':p>=60?'Buen intento. Repite el audio para afinar.':'Escucha de nuevo a velocidad lenta e inténtalo otra vez.';
 $('#result').innerHTML='<section class="panel"><h2>Puntaje: '+p+'% ('+ok+'/'+l.qs.length+')</h2><p>'+msg+'</p><ul class="res">'+h+'</ul>'+dictHTML(dv,l)+vocabHTML(l)+'<h2>Transcripción</h2><p class="tx">'+l.txt+'</p><button class="btn" data-nav="home">Continuar</button></section>';
 $('#quiz').querySelector('button').disabled=true;$('#result').scrollIntoView()}
/* plan diario */
var VC,SH,TK,BK='<button class="link" data-nav="home">‹ Volver</button>';
function mins(){return Math.floor((S.sec[today()]||0)/60)}
function doneT(){S.done=S.done||{};return S.done[today()]||(S.done[today()]={})}
function mark(k){doneT()[k]=1;save()}
function streak(){var n=0,d=new Date();if((S.sec[dkey(d)]||0)<1200)d.setDate(d.getDate()-1);while((S.sec[dkey(d)]||0)>=1200){n++;d.setDate(d.getDate()-1)}return n}
function toast(m){var t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},4500)}
function shuffle(a){return a.slice().sort(function(){return Math.random()-.5})}
function pickLesson(){return nextLesson()||LESSONS.slice().sort(function(a,b){return best(a.id)-best(b.id)})[0]}
function goal(){
 var sec=S.sec[today()]||0,m=mins(),d=doneT(),
 T=[['vocab','Calentamiento de vocabulario','3 min'],['lesson','Lección de escucha','6 min'],['shadow','Repetir en voz alta','5 min'],['talk','Conversación guiada','6 min']],
 h='<section class="panel"><h2>Meta de hoy: '+m+' de 20 min</h2>'+bar(Math.min(100,Math.round(sec/12)))+'<p>'+(m>=20?'¡Meta cumplida! La constancia diaria es lo que construye la fluidez.':'Te faltan '+(20-m)+' min. Sigue el plan de hoy.')+' Racha: '+streak()+' día(s) con 20 min.</p>';
 T.forEach(function(t){h+='<div class="row task"><span>'+(d[t[0]]?'✅':'⬜')+' '+t[1]+' <small>'+t[2]+'</small></span><button class="btn small ghost" data-start="'+t[0]+'">'+(d[t[0]]?'Otra vez':'Empezar')+'</button></div>'});
 return h+'</section>'}
function start(k){
 var lv=assistant().lv,l;
 if(k==='lesson'){openLesson(pickLesson().id);return}
 if(k==='vocab'){var w=[];LESSONS.forEach(function(x){if(LEVELS.indexOf(x.lv)<=LEVELS.indexOf(lv))w=w.concat(x.vo)});VC={w:shuffle(w).slice(0,10),i:0};go('vocab')}
 else if(k==='shadow'){var d=LESSONS.filter(function(x){return best(x.id)!==null});l=d.length?d[d.length-1]:pickLesson();SH={s:l.txt.match(/[^.?!]+[.?!]/g),i:0};go('shadow')}
 else{TK={d:DIALOGS.filter(function(x){return x.lv===lv})[0],i:0,ok:0,a:-1};go('talk');speak(TK.d.turns[0][0],.95)}}
function pick(j){if(TK.a>=0)return;var t=TK.d.turns[TK.i];TK.a=j;if(j===t[2])TK.ok++;render();speak(t[1][t[2]],.95)}
function viewHTML(){
 if(view==='lesson')return lesson();if(view==='review')return review();if(view==='settings')return settings();
 if(view==='vocab'){var w=VC.w[VC.i];return BK+'<h1>Calentamiento</h1><div class="player"><p class="big">'+w[0]+'</p><button class="btn small" id="vc-say">▶ Pronunciación</button><p class="tx" id="vc-es" hidden>'+w[1]+'</p><p><button class="btn small ghost" id="vc-show">Ver significado</button> <button class="btn" id="vc-next">Siguiente ›</button></p><p class="muted">'+(VC.i+1)+' de '+VC.w.length+'</p></div>'}
 if(view==='shadow')return BK+'<h1>Repite en voz alta</h1><div class="player"><p class="tx big">'+SH.s[SH.i].trim()+'</p><div class="ctl"><button class="btn" id="sh-play">▶ Escuchar</button><label>Velocidad <select id="rate"><option value="0.7">Lenta</option><option value="1" selected>Normal</option></select></label></div><p class="muted">Escucha, repite en voz alta imitando ritmo y entonación, y vuelve a escuchar para comparar.</p><button class="btn" id="sh-next">Ya la repetí ›</button><p class="muted">Frase '+(SH.i+1)+' de '+SH.s.length+'</p></div>';
 var T=TK.d.turns;
 if(TK.i>=T.length)return BK+'<h1>Conversación completada</h1><div class="panel"><p>Respuestas acertadas: '+TK.ok+' de '+T.length+'.</p><p>Mañana repite el diálogo intentando responder sin leer las opciones.</p><button class="btn" data-nav="home">Terminar</button></div>';
 var t=T[TK.i],h=BK+'<h1>'+TK.d.name+'</h1><div class="player"><p class="muted">Tu interlocutor dice:</p><p class="tx big">'+(TK.a<0?'🎧 Escucha y elige':t[0])+'</p><button class="btn small" id="tk-play">▶ Escuchar</button></div>';
 t[1].forEach(function(o,j){var c=TK.a<0?'':j===t[2]?' good':(j===TK.a?' bad':'');h+='<button class="card opt2'+c+'" data-opt="'+j+'"'+(TK.a>=0?' disabled':'')+'>'+o+'</button>'});
 if(TK.a>=0)h+='<p class="tx">'+(TK.a===t[2]?'✅ Muy bien.':'La mejor respuesta era la verde.')+' Ahora dila en voz alta.</p><button class="btn small" id="tk-say">▶ Modelo</button> <button class="btn" id="tk-next">Siguiente ›</button>';
 return h}
/* reminders */
function notify(){
 var n=nextLesson();if(!n)return;var body='Meta: 20 min de práctica. Hoy te toca: '+n.t+' ('+n.lv+')';
 if('Notification' in window&&Notification.permission==='granted'){if(swReg&&swReg.showNotification)swReg.showNotification('Hora de practicar tu escucha',{body:body,icon:'icons/icon-192.png',tag:'daily'});else new Notification('Hora de practicar tu escucha',{body:body})}}
function checkRem(){
 if(!S.rem.on||mins()>=20||S.rem.last===today())return;
 var d=new Date(),t=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
 if(t>=S.rem.time){S.rem.last=today();save();notify()}}
document.addEventListener('click',function(e){
 var t=e.target.closest?e.target.closest('[data-open],[data-nav],[data-say],[data-start],[data-opt]'):null;
 if(t){if(t.hasAttribute('data-open')){e.preventDefault();openLesson(t.getAttribute('data-open'))}
  else if(t.hasAttribute('data-start'))start(t.getAttribute('data-start'));else if(t.hasAttribute('data-opt'))pick(+t.getAttribute('data-opt'));else if(t.hasAttribute('data-nav'))go(t.getAttribute('data-nav'));
  else{var l=LESSONS.filter(function(x){return x.id===t.getAttribute('data-say')})[0];speak(l.txt,1)}return}
 var id=e.target.id;
 if(id==='sh-play'){speak(SH.s[SH.i],parseFloat($('#rate').value))}else if(id==='sh-next'){SH.i++;if(SH.i>=SH.s.length){mark('shadow');toast('Shadowing completado');go('home')}else render()}else if(id==='vc-show'){$('#vc-es').hidden=false}else if(id==='vc-say'){speak(VC.w[VC.i][0],.8)}else if(id==='vc-next'){VC.i++;if(VC.i>=VC.w.length){mark('vocab');toast('Calentamiento completado');go('home')}else render()}else if(id==='tk-play'){speak(TK.d.turns[TK.i][0],.95)}else if(id==='tk-say'){var tt=TK.d.turns[TK.i];speak(tt[1][tt[2]],.95)}else if(id==='tk-next'){TK.i++;TK.a=-1;if(TK.i>=TK.d.turns.length){mark('talk');render()}else{render();speak(TK.d.turns[TK.i][0],.95)}}else if(id==='play'){plays++;$('#pc').textContent='Reproducciones: '+plays;speak(cur.txt,parseFloat($('#rate').value))}
 else if(id==='remSave'){S.rem.on=$('#remOn').checked;S.rem.time=$('#remTime').value||'19:00';S.rem.last=null;save();
  if(S.rem.on&&'Notification' in window&&Notification.permission==='default')Notification.requestPermission().then(render);else{alert('Recordatorio guardado.');render()}}
 else if(id==='reset'){if(confirm('¿Borrar todo tu progreso?')){S={res:{},rem:S.rem,days:[],sec:{},done:{}};save();go('home')}}
 else if(id==='exp'){var b=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='listenpath-progreso.json';document.body.appendChild(a);a.click();document.body.removeChild(a)}
});
document.addEventListener('submit',function(e){if(e.target.id==='quiz')submit(e)});
/* PWA */
var dip=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();dip=e;$('#install').hidden=false});
$('#install').addEventListener('click',function(){if(dip){dip.prompt();dip=null;$('#install').hidden=true}});
if('serviceWorker' in navigator)window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').then(function(r){swReg=r}).catch(function(){})});
setInterval(function(){if(document.hidden||['lesson','shadow','talk','vocab'].indexOf(view)<0)return;var k=today();S.sec[k]=(S.sec[k]||0)+1;if(S.sec[k]%10===0)save();if(S.sec[k]===1200){save();toast('¡Meta de 20 minutos cumplida! Excelente constancia.')}},1000);
render();checkRem();setInterval(checkRem,60000);
})();
