import { bg } from './src/locales/bg.js';
import { en } from './src/locales/en.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './src/supabase-config.js';

// StudyFlow — Етап 2. Подготвен начален код с помощта на ChatGPT; екипът го проверява и редактира.
// Локалното демо НИКОГА не се представя като запис в Supabase.
const translations = { bg, en };
const STORAGE_KEY = 'studyflow-tasks-v1';
const SUBJECTS_KEY = 'studyflow-subjects-v2';
const LANGUAGE_KEY = 'studyflow-language';
const allowedPages = ['dashboard', 'tasks', 'calendar'];
const defaultSubjects = [
  { id: 'math', name: 'math', translation: 'subjectMath' },
  { id: 'bulgarian', name: 'bulgarian', translation: 'subjectBulgarian' },
  { id: 'biology', name: 'biology', translation: 'subjectBiology' },
  { id: 'history', name: 'history', translation: 'subjectHistory' },
  { id: 'other', name: 'other', translation: 'subjectOther' }
];

let language = localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'bg';
let currentPage = 'dashboard';
let localTasks = readJSON(STORAGE_KEY, []);
let localSubjects = readJSON(SUBJECTS_KEY, defaultSubjects);
let tasks = [];
let subjects = [];
let db = null;
let user = null;
let cloudReady = false;
let busy = false;

const $ = (id) => document.getElementById(id);
const tr = (key) => translations[language][key] || key;
const isCloud = () => Boolean(cloudReady && user && db);
const isConfigured = () => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL) &&
  SUPABASE_PUBLISHABLE_KEY.length > 25 && !SUPABASE_PUBLISHABLE_KEY.includes('YOUR_');
const toast = $('toast');

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : structuredClone(fallback);
  } catch { return structuredClone(fallback); }
}
function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(localTasks));
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(localSubjects));
}
function showMessage(message) {
  toast.textContent = message;
  toast.classList.add('visible');
}
function hideMessage() { toast.classList.remove('visible'); }
function showError(error) { console.error('StudyFlow:', error); showMessage(tr('genericError')); }
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function dateAfter(days) { const d = new Date(); d.setDate(d.getDate() + days); return localDate(d); }
function formatDate(iso) {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat(language === 'bg' ? 'bg-BG' : 'en-GB', {day:'numeric', month:'long',year:'numeric'}).format(date);
}
function subjectName(subjectId) {
  const found = subjects.find((s) => s.id === subjectId);
  if (!found) return '—';
  return found.translation ? tr(found.translation) : found.name;
}
function syncedLocal() {
  tasks = localTasks.map((t) => ({
    id:t.id, title:t.title, subjectId:t.subjectId || t.subject,
    dueDate:t.dueDate, priority:t.priority, completed:Boolean(t.completed)
  }));
  subjects = localSubjects;
}
function normalizeCloudTask(t) {
  return { id:t.id, title:t.title, subjectId:t.subject_id,
    dueDate:t.due_date, priority:({1:'low',2:'medium',3:'high'})[t.priority] || 'medium',
    completed:Boolean(t.is_completed) };
}
function sorted(list) {return [...list].sort((a,b)=>a.dueDate.localeCompare(b.dueDate));}

function renderSelect() {
  const select = $('task-subject');
  const previous = select.value;
  select.replaceChildren();
  if (!subjects.length) {
    const option = new Option(tr('noSubjects'), '');
    option.disabled = true; option.selected = true; select.add(option);
  }
  subjects.forEach((s) => select.add(new Option(subjectName(s.id), s.id)));
  if (subjects.some(s=>s.id===previous)) select.value = previous;
}
function updateStatus() {
  $('connection-status').dataset.state = isCloud() ? 'cloud' : 'local';
  $('connection-status').textContent = tr(isCloud() ? 'cloudStatus' : 'localStatus');
  $('mode-description').textContent = tr(isCloud() ? 'cloudModeDescription' : 'localModeDescription');
  $('logout-button').hidden = !isCloud();
  $('auth-button').hidden = isCloud();
  $('seed-button').hidden = !isCloud();
  $('refresh-button').hidden = !isCloud();
}
function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = tr(element.dataset.i18n); });
  $('task-search').placeholder = tr('searchPlaceholder');
  $('task-title').placeholder = tr('titlePlaceholder');
  $('lang-bg').classList.toggle('selected', language === 'bg');
  $('lang-en').classList.toggle('selected', language === 'en');
  $('lang-bg').setAttribute('aria-pressed',String(language==='bg'));
  $('lang-en').setAttribute('aria-pressed',String(language==='en'));
  document.title = `StudyFlow — ${tr(currentPage)}`;
  $('today-label').textContent = `${tr('todayPrefix')} ${formatDate(localDate())}`;
  $('breadcrumb-current').textContent = tr(currentPage);
  updateStatus(); render();
}
function switchPage(page) {
  currentPage = allowedPages.includes(page) ? page : 'dashboard';
  document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === `page-${currentPage}`));
  document.querySelectorAll('.nav-item').forEach(el => {
    const current = el.dataset.page === currentPage;
    el.classList.toggle('active',current);
    if(current) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');
  });
  $('breadcrumb-current').textContent = tr(currentPage);
}
function emptyState(title, detail) {
  const box=document.createElement('div'); box.className='empty-state';
  const icon=document.createElement('div'); icon.className='empty-icon'; icon.textContent='☷';
  const header=document.createElement('strong'); header.textContent=title;
  const p=document.createElement('span'); p.textContent=detail;
  box.append(icon,header,p); return box;
}
function rowForTask(task) {
  const row=document.createElement('div'); row.className=`task-row ${task.completed?'done':''}`;
  const checkbox=document.createElement('input'); checkbox.type='checkbox'; checkbox.className='check-task';
  checkbox.checked=task.completed; checkbox.setAttribute('aria-label',`${tr('completedTasks')}: ${task.title}`);
  checkbox.addEventListener('change',async()=>{
    checkbox.disabled=true;
    try {await setCompleted(task.id,checkbox.checked);} catch(e){checkbox.checked=!checkbox.checked;showError(e);} finally{checkbox.disabled=false;}
  });
  const info=document.createElement('div'); info.className='task-info';
  const title=document.createElement('div'); title.className='task-title'; title.textContent=task.title;
  const meta=document.createElement('div'); meta.className='task-meta';
  const sub=document.createElement('span'); sub.textContent=subjectName(task.subjectId);
  const due=document.createElement('span'); due.textContent=`${tr('datePrefix')} ${formatDate(task.dueDate)}`;
  meta.append(sub,due); info.append(title,meta);
  const priority=document.createElement('span'); priority.className=`priority ${task.priority}`;
  priority.textContent=tr(`priority${task.priority[0].toUpperCase()}${task.priority.slice(1)}`);
  const remove=document.createElement('button'); remove.className='delete-btn';remove.type='button';
  remove.textContent='×';remove.title=tr('delete');remove.setAttribute('aria-label',`${tr('delete')}: ${task.title}`);
  remove.addEventListener('click',async()=>{
    if(!window.confirm(tr('confirmDelete')))return;
    try {await deleteTask(task.id);}catch(e){showError(e);}
  });
  row.append(checkbox,info,priority,remove);return row;
}
function showTasks(container,list,title=tr('emptyTitle'),description=tr('emptyDescription')) {
  container.replaceChildren();
  if (!list.length) container.append(emptyState(title,description));
  else list.forEach(t=>container.append(rowForTask(t)));
}
function renderCalendar() {
  const calendar=$('calendar-list'); calendar.replaceChildren();
  const grouped=new Map();
  sorted(tasks).forEach(task=>{if(!grouped.has(task.dueDate))grouped.set(task.dueDate,[]);grouped.get(task.dueDate).push(task);});
  if (!grouped.size){const card=document.createElement('div');card.className='panel';card.append(emptyState(tr('noDates'),tr('calendarNoTask')));calendar.append(card);return;}
  for (const [date,items] of grouped){
    const card=document.createElement('article');card.className='panel day-card';
    const heading=document.createElement('h2');heading.className='day-heading';heading.textContent=formatDate(date);
    card.append(heading);items.forEach(t=>card.append(rowForTask(t)));calendar.append(card);
  }
}
function render(){
  $('stat-total').textContent=tasks.length;
  $('stat-upcoming').textContent=tasks.filter(t=>!t.completed).length;
  $('stat-done').textContent=tasks.filter(t=>t.completed).length;
  showTasks($('dashboard-list'),sorted(tasks.filter(t=>!t.completed)).slice(0,4));
  const q=$('task-search').value.trim().toLocaleLowerCase();const filter=$('task-filter').value;
  const filtered=sorted(tasks).filter(t=>{
    const matchText=(t.title+' '+subjectName(t.subjectId)).toLocaleLowerCase().includes(q);
    const matchStatus=filter==='all'||(filter==='completed'&&t.completed)||(filter==='active'&&!t.completed);
    return matchText&&matchStatus;
  });
  $('task-count').textContent=filtered.length;
  showTasks($('all-task-list'),filtered,(q||filter!=='all')?tr('noMatches'):tr('emptyTitle'));
  renderCalendar();renderSelect();
}
async function refreshCloud(){
  if(!isCloud())return;
  const [{data:ss,error:se},{data:tt,error:te}]=await Promise.all([
    db.from('subjects').select('id,name,color').order('name'),
    db.from('tasks').select('id,subject_id,title,due_date,priority,is_completed').order('due_date')
  ]);
  if(se||te)throw(se||te);
  subjects=ss;tasks=tt.map(normalizeCloudTask);updateStatus();render();
}
async function setCompleted(id,completed){
  if(isCloud()){
    const {error}=await db.from('tasks').update({is_completed:completed}).eq('id',id);
    if(error)throw error;
    await refreshCloud();
  }else{
    const task=localTasks.find(t=>t.id===id);if(task)task.completed=completed;
    saveLocal();syncedLocal();render();
  }
}
async function deleteTask(id){
  if(isCloud()){
    const {error}=await db.from('tasks').delete().eq('id',id);if(error)throw error;
    await refreshCloud();
  }else{
    localTasks=localTasks.filter(t=>t.id!==id);saveLocal();syncedLocal();render();
  }
  showMessage(tr('taskDeleted'));
}
async function addTask(data){
  if(isCloud()){
    const {error}=await db.from('tasks').insert({
      user_id:user.id,subject_id:data.subjectId,title:data.title,due_date:data.dueDate,
      priority:({low:1,medium:2,high:3})[data.priority],estimated_minutes:30,is_completed:false
    });
    if(error)throw error;
    await refreshCloud();
  }else{
    localTasks.push({id:crypto.randomUUID(),...data,completed:false});
    saveLocal();syncedLocal();render();
  }
  showMessage(tr('taskAdded'));
}
function openTaskDialog(){
  $('form-error').textContent='';renderSelect();
  if(!subjects.length){showMessage(tr('needSubject'));return;}
  $('task-date').value=localDate();$('task-dialog').showModal();$('task-title').focus();
}
async function createSubject(name){
  if(isCloud()){
    const {error}=await db.from('subjects').insert({user_id:user.id,name});if(error)throw error;
    await refreshCloud();
    showMessage(tr('subjectAdded'));
  }else{
    localSubjects.push({id:crypto.randomUUID(),name});saveLocal();syncedLocal();render();
    showMessage(tr('localSubjectAdded'));
  }
}
async function ensureProfile(){
  const {error}=await db.from('profiles').upsert({id:user.id,display_name:'Student'},{onConflict:'id'});
  if(error)throw error;
}
async function afterSignIn(session){
  user=session.user;
  await ensureProfile();
  await refreshCloud();
  updateStatus();showMessage(tr('signedIn'));
}
async function openAuth(){
  if(!isConfigured()){showMessage(tr('needConfig'));return;}
  if(!db){try{await initCloud();}catch(e){showError(e);return;}}
  $('auth-error').textContent='';$('auth-dialog').showModal();
}
async function authAction(register){
  if(busy)return;
  const email=$('auth-email').value.trim();const password=$('auth-password').value;
  if(!email||password.length<6){$('auth-error').textContent=tr('loginInvalid');return;}
  busy=true; $('auth-error').textContent='';
  try{
    const result=register?await db.auth.signUp({email,password}):await db.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    if(result.data.session){$('auth-dialog').close();await afterSignIn(result.data.session);}
    else $('auth-error').textContent=tr('verifyEmail');
  }catch(e){console.error('StudyFlow auth:',e);$('auth-error').textContent=tr('loginInvalid');}
  finally{busy=false;}
}
async function initCloud(){
  if(!isConfigured())return;
  if(db)return;
  // SDK is loaded only when Supabase is configured; local demo works without network.
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
  cloudReady=true;
  const {data,error}=await db.auth.getSession();if(error)throw error;
  if(data.session)await afterSignIn(data.session);
  updateStatus();
}
async function seedExamples(){
  if(!isCloud()){showMessage(tr('mustSignIn'));return;}
  if(tasks.length){showMessage(tr('sampleExists'));return;}
  const samples=['Математика','Български език','Биология'];
  try{
    const {error:err1}=await db.from('subjects').upsert(samples.map(name=>({user_id:user.id,name})),{onConflict:'user_id,name'});
    if(err1)throw err1;
    await refreshCloud();
    const lookup=Object.fromEntries(subjects.map(s=>[s.name,s.id]));
    const toInsert=[
      {title:'Пример: Уравнения',subject_id:lookup['Математика'],due_date:dateAfter(2),priority:3},
      {title:'Пример: Литературен анализ',subject_id:lookup['Български език'],due_date:dateAfter(4),priority:2},
      {title:'Пример: Клетъчно делене',subject_id:lookup['Биология'],due_date:dateAfter(7),priority:1}
    ].map(t=>({...t,user_id:user.id,is_completed:false,estimated_minutes:30}));
    const {error:err2}=await db.from('tasks').insert(toInsert);if(err2)throw err2;
    await refreshCloud();showMessage(tr('sampleAdded'));
  }catch(e){showError(e);}
}

// Navigation, language, forms, Supabase actions.
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.page;}));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{location.hash=b.dataset.go;}));
window.addEventListener('hashchange',()=>{switchPage(location.hash.slice(1));document.title=`StudyFlow — ${tr(currentPage)}`;});
$('brand-link').addEventListener('click',()=>switchPage('dashboard'));
for(const lang of ['bg','en']) $( `lang-${lang}`).addEventListener('click',()=>{
  language=lang;localStorage.setItem(LANGUAGE_KEY,lang);applyLanguage();
});
for(const id of ['dashboard-add','tasks-add','calendar-add']) $(id).addEventListener('click',openTaskDialog);
$('close-dialog').addEventListener('click',()=>$('task-dialog').close());
$('cancel-dialog').addEventListener('click',()=>$('task-dialog').close());
$('task-form').addEventListener('submit',async(e)=>{
  e.preventDefault();if(busy)return;
  const title=$('task-title').value.trim(), dueDate=$('task-date').value,subjectId=$('task-subject').value;
  if(!title||title.length>100){$('form-error').textContent=tr('invalidTitle');return;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)){$('form-error').textContent=tr('invalidDate');return;}
  if(!subjects.some(s=>s.id===subjectId)){$('form-error').textContent=tr('needSubject');return;}
  busy=true;
  try{
    await addTask({title,subjectId,dueDate,priority:$('task-priority').value});
    $('task-form').reset();$('task-dialog').close();
  }catch(err){$('form-error').textContent=tr('genericError');console.error(err);}finally{busy=false;}
});
$('add-subject').addEventListener('click',()=>{$('subject-error').textContent='';$('subject-dialog').showModal();});
$('close-subject-dialog').addEventListener('click',()=>$('subject-dialog').close());
$('cancel-subject-dialog').addEventListener('click',()=>$('subject-dialog').close());
$('subject-form').addEventListener('submit',async(e)=>{
  e.preventDefault();if(busy)return;
  const name=$('subject-name').value.trim();
  if(!name||name.length>60){$('subject-error').textContent=tr('invalidSubject');return;}
  busy=true;try{await createSubject(name);$('subject-dialog').close();$('subject-form').reset();}
  catch(err){$('subject-error').textContent=tr('genericError');console.error(err);}finally{busy=false;}
});
$('task-search').addEventListener('input',render);
$('task-filter').addEventListener('change',render);
$('auth-button').addEventListener('click',openAuth);
$('auth-close').addEventListener('click',()=>$('auth-dialog').close());
$('auth-form').addEventListener('submit',e=>{e.preventDefault();authAction(false);});
$('register-submit').addEventListener('click',()=>authAction(true));
$('logout-button').addEventListener('click',async()=>{
  try{if(db){const {error}=await db.auth.signOut();if(error)throw error;}
    user=null;syncedLocal();applyLanguage();showMessage(tr('signedOut'));
  }catch(e){showError(e);}
});
$('seed-button').addEventListener('click',seedExamples);
$('refresh-button').addEventListener('click',async()=>{try{await refreshCloud();showMessage(tr('saved'));}catch(e){showError(e);}});
toast.addEventListener('click',hideMessage);
syncedLocal();switchPage(location.hash.slice(1));applyLanguage();
initCloud().catch(showError);
