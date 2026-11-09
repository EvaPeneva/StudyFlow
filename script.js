import { bg } from './src/locales/bg.js';
import { en } from './src/locales/en.js';

// ЕТАП 1: данните се записват само в браузъра (localStorage).
// През Етап 2/3 ще ги свържем със Supabase.
const translations = { bg, en };
const STORAGE_KEY = 'studyflow-tasks-v1';
const LANGUAGE_KEY = 'studyflow-language';
const allowedPages = ['dashboard', 'tasks', 'calendar'];

let language = localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'bg';
let tasks = loadTasks();
let currentPage = 'dashboard';

const dialog = document.querySelector('#task-dialog');
const form = document.querySelector('#task-form');
const searchInput = document.querySelector('#task-search');
const filterInput = document.querySelector('#task-filter');

function tr(key) {
  return translations[language][key] || key;
}

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat(language === 'bg' ? 'bg-BG' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(date);
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = tr(element.dataset.i18n);
  });
  searchInput.placeholder = tr('searchPlaceholder');
  document.querySelector('#task-title').placeholder = tr('titlePlaceholder');
  document.querySelector('#lang-bg').classList.toggle('selected', language === 'bg');
  document.querySelector('#lang-en').classList.toggle('selected', language === 'en');
  document.title = `StudyFlow — ${tr('dashboard')}`;
  document.querySelector('#today-label').textContent = `${tr('todayPrefix')} ${formatDate(toLocalDateString(new Date()))}`;
  document.querySelector('#breadcrumb-current').textContent = tr(currentPage);
  render();
}

function toLocalDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function switchPage(page) {
  currentPage = allowedPages.includes(page) ? page : 'dashboard';
  document.querySelectorAll('.page').forEach((item) => {
    item.classList.toggle('active', item.id === `page-${currentPage}`);
  });
  document.querySelectorAll('.nav-item').forEach((item) => {
    const active = item.dataset.page === currentPage;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
  document.querySelector('#breadcrumb-current').textContent = tr(currentPage);
}

function sortedTasks(list) {
  return [...list].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function makeEmpty(title, description) {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  const icon = document.createElement('div');
  icon.className = 'empty-icon';
  icon.textContent = '☷';
  const heading = document.createElement('strong');
  heading.textContent = title;
  const detail = document.createElement('span');
  detail.textContent = description;
  empty.append(icon, heading, detail);
  return empty;
}

function createTaskRow(task) {
  const row = document.createElement('div');
  row.className = `task-row ${task.completed ? 'done' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'check-task';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `${tr('completedTasks')}: ${task.title}`);
  checkbox.addEventListener('change', () => {
    task.completed = checkbox.checked;
    saveTasks();
    render();
  });

  const info = document.createElement('div');
  info.className = 'task-info';
  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title; // textContent предпазва от вмъкване на HTML в заглавието.
  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const subject = document.createElement('span');
  subject.textContent = tr(`subject${task.subject.charAt(0).toUpperCase()}${task.subject.slice(1)}`);
  const date = document.createElement('span');
  date.textContent = `${tr('datePrefix')} ${formatDate(task.dueDate)}`;
  meta.append(subject, date);
  info.append(title, meta);

  const priority = document.createElement('span');
  priority.className = `priority ${task.priority}`;
  priority.textContent = tr(`priority${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1)}`);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-btn';
  deleteButton.title = tr('delete');
  deleteButton.setAttribute('aria-label', `${tr('delete')}: ${task.title}`);
  deleteButton.textContent = '×';
  deleteButton.addEventListener('click', () => {
    if (window.confirm(tr('confirmDelete'))) {
      tasks = tasks.filter((item) => item.id !== task.id);
      saveTasks();
      render();
    }
  });

  row.append(checkbox, info, priority, deleteButton);
  return row;
}

function showTasks(container, list, emptyTitle = tr('emptyTitle'), emptyDescription = tr('emptyDescription')) {
  container.replaceChildren();
  if (list.length === 0) {
    container.append(makeEmpty(emptyTitle, emptyDescription));
    return;
  }
  list.forEach((task) => container.append(createTaskRow(task)));
}

function renderCalendar() {
  const calendar = document.querySelector('#calendar-list');
  calendar.replaceChildren();
  const grouped = new Map();
  sortedTasks(tasks).forEach((task) => {
    if (!grouped.has(task.dueDate)) grouped.set(task.dueDate, []);
    grouped.get(task.dueDate).push(task);
  });
  if (grouped.size === 0) {
    const card = document.createElement('div');
    card.className = 'panel';
    card.append(makeEmpty(tr('noDates'), tr('calendarNoTask')));
    calendar.append(card);
    return;
  }
  grouped.forEach((items, date) => {
    const card = document.createElement('article');
    card.className = 'panel day-card';
    const heading = document.createElement('h2');
    heading.className = 'day-heading';
    heading.textContent = formatDate(date);
    card.append(heading);
    items.forEach((task) => card.append(createTaskRow(task)));
    calendar.append(card);
  });
}

function render() {
  document.querySelector('#stat-total').textContent = tasks.length;
  document.querySelector('#stat-upcoming').textContent = tasks.filter((t) => !t.completed).length;
  document.querySelector('#stat-done').textContent = tasks.filter((t) => t.completed).length;
  showTasks(document.querySelector('#dashboard-list'), sortedTasks(tasks.filter((t) => !t.completed)).slice(0, 4));

  const query = searchInput.value.trim().toLocaleLowerCase(language === 'bg' ? 'bg-BG' : 'en');
  const selectedFilter = filterInput.value;
  const filtered = sortedTasks(tasks).filter((task) => {
    const matchesText = task.title.toLocaleLowerCase().includes(query) ||
      tr(`subject${task.subject.charAt(0).toUpperCase()}${task.subject.slice(1)}`).toLocaleLowerCase().includes(query);
    const matchesStatus = selectedFilter === 'all' ||
      (selectedFilter === 'completed' && task.completed) ||
      (selectedFilter === 'active' && !task.completed);
    return matchesText && matchesStatus;
  });
  document.querySelector('#task-count').textContent = filtered.length;
  showTasks(document.querySelector('#all-task-list'), filtered,
    query || selectedFilter !== 'all' ? tr('noMatches') : tr('emptyTitle'), tr('emptyDescription'));
  renderCalendar();
}

function openTaskDialog() {
  document.querySelector('#form-error').textContent = '';
  document.querySelector('#task-date').value = toLocalDateString(new Date());
  dialog.showModal();
  document.querySelector('#task-title').focus();
}

// Навигация + двуезичност.
document.querySelectorAll('[data-page]').forEach((button) => {
  button.addEventListener('click', () => { window.location.hash = button.dataset.page; });
});
document.querySelectorAll('[data-go]').forEach((button) => {
  button.addEventListener('click', () => { window.location.hash = button.dataset.go; });
});
window.addEventListener('hashchange', () => switchPage(window.location.hash.slice(1)));
document.querySelector('#brand-link').addEventListener('click', () => switchPage('dashboard'));
document.querySelector('#lang-bg').addEventListener('click', () => {
  language = 'bg'; localStorage.setItem(LANGUAGE_KEY, language); applyLanguage();
});
document.querySelector('#lang-en').addEventListener('click', () => {
  language = 'en'; localStorage.setItem(LANGUAGE_KEY, language); applyLanguage();
});

// Формуляр за добавяне на задача.
['dashboard-add', 'tasks-add', 'calendar-add'].forEach((id) => {
  document.getElementById(id).addEventListener('click', openTaskDialog);
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = document.querySelector('#task-title').value.trim();
  const dueDate = document.querySelector('#task-date').value;
  const error = document.querySelector('#form-error');
  if (!title) { error.textContent = tr('invalidTitle'); return; }
  if (!dueDate) { error.textContent = tr('invalidDate'); return; }
  tasks.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: title.slice(0, 100),
    subject: document.querySelector('#task-subject').value,
    dueDate,
    priority: document.querySelector('#task-priority').value,
    completed: false
  });
  saveTasks();
  form.reset();
  dialog.close();
  render();
});
searchInput.addEventListener('input', render);
filterInput.addEventListener('change', render);

switchPage(window.location.hash.slice(1));
applyLanguage();
