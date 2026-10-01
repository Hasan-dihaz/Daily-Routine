'use client';

import { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, BookOpen, CheckCircle2, Clock3, Moon, Pencil, RotateCcw, Save, Target, Timer, Trophy } from 'lucide-react';

type Prayer = { name: string; time: string };
type Task = { id: string; title: string; duration: number; type: string; done: boolean };

const defaultPrayers: Prayer[] = [
  { name: 'Fajr', time: '05:00' }, { name: 'Dhuhr', time: '13:00' }, { name: 'Asr', time: '16:30' }, { name: 'Maghrib', time: '18:15' }, { name: 'Isha', time: '20:30' }
];
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const tasks: Record<string, Task[]> = {
  Monday:[{id:'m1',title:'Vocabulary + Verbal',duration:60,type:'Verbal',done:false},{id:'m2',title:'Quant concepts',duration:60,type:'Quant',done:false},{id:'m3',title:'Quant practice + error log',duration:30,type:'Review',done:false}],
  Tuesday:[{id:'t1',title:'Vocabulary + Verbal',duration:60,type:'Verbal',done:false},{id:'t2',title:'Reading Comprehension',duration:60,type:'Verbal',done:false},{id:'t3',title:'TC / SE practice',duration:60,type:'Verbal',done:false}],
  Wednesday:[{id:'w1',title:'Vocabulary + Verbal',duration:60,type:'Verbal',done:false},{id:'w2',title:'Timed Quant practice',duration:90,type:'Quant',done:false},{id:'w3',title:'Mistake analysis',duration:30,type:'Review',done:false}],
  Thursday:[{id:'th1',title:'Vocabulary + Verbal',duration:60,type:'Verbal',done:false},{id:'th2',title:'Reading Comprehension',duration:60,type:'Verbal',done:false},{id:'th3',title:'TC / SE practice',duration:60,type:'Verbal',done:false}],
  Friday:[{id:'f1',title:'Vocabulary review',duration:60,type:'Verbal',done:false},{id:'f2',title:'Mixed timed practice',duration:60,type:'Mixed',done:false},{id:'f3',title:'Weekly error review',duration:60,type:'Review',done:false}],
  Saturday:[{id:'sa1',title:'Deep Quant study',duration:120,type:'Quant',done:false},{id:'sa2',title:'Deep Verbal study',duration:90,type:'Verbal',done:false},{id:'sa3',title:'Practice + weak areas',duration:120,type:'Mixed',done:false}],
  Sunday:[{id:'su1',title:'GRE mock test',duration:120,type:'Mock',done:false},{id:'su2',title:'Mock test analysis',duration:120,type:'Review',done:false},{id:'su3',title:'Weak-topic practice',duration:60,type:'Mixed',done:false}]
};

const schedule = [
  ['5:00–5:20','Fajr + Dua / Qur’an'],['5:20–6:20','GRE Vocabulary + Verbal'],['6:20–7:15','Breakfast + get ready'],['7:15–8:00','Commute / prepare'],['8:00–12:45','Work'],['~13:00','Dhuhr + lunch'],['13:30–16:30','Work'],['~16:30','Asr'],['17:00–17:45','Commute + rest'],['17:45–18:45','Cooking + dinner'],['~18:15','Maghrib'],['19:00–20:30','Main GRE study'],['~20:30','Isha'],['21:00–22:00','GRE practice / review'],['22:00–22:30','Relax + prepare for bed'],['22:30','Sleep']
];

const KEY='gre-planner';
type Store={prayers:Prayer[];week:Record<string,Task[]>;goal:number};
const parse=(j:string):Store=>JSON.parse(j);
function normalize(x:any):Store|null{
  if(!x||typeof x!=='object') return null;
  return {
    prayers:Array.isArray(x.prayers)?x.prayers:defaultPrayers,
    week:x.week&&typeof x.week==='object'?x.week:tasks,
    goal:Number(x.goal)||16
  };
}
function readStore():Store|null{
  try{return normalize(JSON.parse(localStorage.getItem(KEY)||'null'))}catch{return null}
}
function writeStore(v:Store){try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}}
function clearStore(){try{localStorage.removeItem(KEY);localStorage.removeItem(KEY+'-at')}catch{}}

export default function Home(){
  const [day,setDay]=useState('Monday');
  const [prayers,setPrayers]=useState(defaultPrayers);
  const [week,setWeek]=useState(tasks);
  const [goal,setGoal]=useState(16);
  const [saved,setSaved]=useState(false);
  const [editPrayer,setEditPrayer]=useState(false);

  const [loaded,setLoaded]=useState(false);
  const [status,setStatus]=useState<'syncing'|'synced'|'error'>('syncing');
  const updatedAt=useRef(0);
  const lastJson=useRef('');
  const pushTimer=useRef<ReturnType<typeof setTimeout>>(undefined);

  const apply=(x:Store,at:number)=>{lastJson.current=JSON.stringify(x);updatedAt.current=at;setPrayers(x.prayers);setWeek(x.week);setGoal(x.goal)};

  // Load once on the client (localStorage is unavailable during SSR).
  useEffect(()=>{
    const x=readStore();
    if(x) apply(x,Number(localStorage.getItem(KEY+'-at'))||0);
    setLoaded(true);
  },[]);

  const push=async(x:Store,at:number)=>{
    try{
      const r=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:x,updatedAt:at})});
      if(!r.ok) throw 0;
      const d=await r.json();
      if(d.updatedAt>at&&d.data){const n=normalize(d.data);if(n){apply(n,d.updatedAt);writeStore(n);localStorage.setItem(KEY+'-at',String(d.updatedAt))}}
      setStatus('synced');
    }catch{setStatus('error')}
  };
  const pull=async()=>{
    try{
      const r=await fetch('/api/state',{cache:'no-store'});
      if(!r.ok) throw 0;
      const d=await r.json();
      const n=d.data&&normalize(d.data);
      if(n&&d.updatedAt>updatedAt.current){apply(n,d.updatedAt);writeStore(n);try{localStorage.setItem(KEY+'-at',String(d.updatedAt))}catch{}}
      else if(updatedAt.current>(d.updatedAt||0)) await push(parse(lastJson.current),updatedAt.current);
      setStatus('synced');
    }catch{setStatus('error')}
  };

  // Persist every change locally and push to the cloud (debounced).
  useEffect(()=>{
    if(!loaded) return;
    const x={prayers,week,goal};
    const j=JSON.stringify(x);
    if(j===lastJson.current) return;
    lastJson.current=j;
    updatedAt.current=Date.now();
    writeStore(x);
    try{localStorage.setItem(KEY+'-at',String(updatedAt.current))}catch{}
    setStatus('syncing');
    clearTimeout(pushTimer.current);
    const at=updatedAt.current;
    pushTimer.current=setTimeout(()=>push(x,at),600);
  },[loaded,prayers,week,goal]);

  // Pull on connect, every 15s, and when the tab regains focus.
  useEffect(()=>{
    if(!loaded) return;
    pull();
    const t=setInterval(pull,15000);
    const onVis=()=>{if(document.visibilityState==='visible')pull()};
    document.addEventListener('visibilitychange',onVis);
    return ()=>{clearInterval(t);document.removeEventListener('visibilitychange',onVis)};
  },[loaded]);

  const selected=week[day]||[];
  const completed=Object.values(week).flat().filter(x=>x.done).reduce((a,x)=>a+x.duration,0)/60;
  const planned=Object.values(week).flat().reduce((a,x)=>a+x.duration,0)/60;
  const progress=Math.min(100,Math.round(completed/goal*100));
  const todayDone=selected.filter(x=>x.done).length;
  const toggle=(id:string)=>setWeek(w=>({...w,[day]:w[day].map(x=>x.id===id?{...x,done:!x.done}:x)}));
  const save=()=>{writeStore({prayers,week,goal});pull();setSaved(true);setTimeout(()=>setSaved(false),1800)};
  const reset=()=>{setWeek(tasks);setPrayers(defaultPrayers);setGoal(16)};

  return <main>
    <header className="top"><div><div className="eyebrow">PERSONAL STUDY SYSTEM</div><h1>GRE Routine Planner</h1><p>Prayer-aware planning for a full-time work week.</p></div><div className="actions"><span className="pill syncpill">{status==='error'?<CloudOff size={14}/>:<Cloud size={14}/>}{status==='error'?'Offline':status==='syncing'?'Syncing…':'Synced'}</span><button className="ghost" onClick={reset}><RotateCcw size={16}/>Reset</button><button className="primary" onClick={save}><Save size={16}/>{saved?'Saved':'Save progress'}</button></div></header>
    <section className="stats">
      <Stat icon={<Clock3/>} label="GRE this week" value={`${completed.toFixed(1)}h`} sub={`of ${goal}h goal`}/>
      <Stat icon={<Target/>} label="Weekly progress" value={`${progress}%`} sub={`${Math.max(0,goal-completed).toFixed(1)}h remaining`}/>
      <Stat icon={<CheckCircle2/>} label={`${day} tasks`} value={`${todayDone}/${selected.length}`} sub="completed"/>
      <Stat icon={<Trophy/>} label="Planned study" value={`${planned.toFixed(1)}h`} sub="across the week"/>
    </section>
    <div className="grid">
      <section className="card schedule"><div className="cardhead"><div><span className="kicker">DAILY RHYTHM</span><h2>Work + Salah + GRE</h2></div><span className="pill">8 AM – 5 PM work</span></div>{schedule.map(([t,a],i)=><div className="row" key={i}><span>{t}</span><b>{a}</b></div>)}</section>
      <section className="card"><div className="cardhead"><div><span className="kicker">PRAYER TIMES</span><h2>Adjust locally</h2></div><button className="iconbtn" onClick={()=>setEditPrayer(!editPrayer)}><Pencil size={16}/></button></div><p className="muted">These are placeholders. Change them to your local timetable.</p>{prayers.map((p,i)=><div className="prayer" key={p.name}><span><Moon size={15}/>{p.name}</span>{editPrayer?<input value={p.time} onChange={e=>setPrayers(ps=>ps.map((x,j)=>j===i?{...x,time:e.target.value}:x))}/>:<b>{p.time}</b>}</div>)}
      <div className="goal"><label>Weekly GRE goal <b>{goal}h</b></label><input type="range" min="8" max="25" value={goal} onChange={e=>setGoal(Number(e.target.value))}/></div></section>
    </div>
    <section className="card tasks"><div className="cardhead"><div><span className="kicker">STUDY TRACKER</span><h2>Weekly plan</h2></div><div className="tabs">{days.map(d=><button className={day===d?'active':''} onClick={()=>setDay(d)} key={d}>{d.slice(0,3)}</button>)}</div></div><div className="tasklist">{selected.map(t=><label className={`task ${t.done?'done':''}`} key={t.id}><input type="checkbox" checked={t.done} onChange={()=>toggle(t.id)}/><span className="tasktitle">{t.title}<small>{t.type} · {t.duration} min</small></span><span className="duration">{t.duration}m</span></label>)}</div></section>
    <section className="card tips"><div className="tip"><BookOpen/><div><b>GRE strategy</b><p>Use Fajr for low-friction vocabulary, your evening block for deep work, and Sunday for a timed mock plus mistake analysis.</p></div></div><div className="tip"><Timer/><div><b>Protect your focus</b><p>Start each 60–90 minute session with one clearly defined target. Keep an error log instead of simply repeating questions.</p></div></div></section>
    <footer>Progress saves automatically and syncs across your devices.</footer>
  </main>
}
function Stat({icon,label,value,sub}:{icon:React.ReactNode,label:string,value:string,sub:string}){return <div className="stat"><div className="staticon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></div>}
