const STORAGE_KEY = 'money-tracker-v1';
const CATEGORY_STORAGE_KEY = 'money-tracker-categories-v1';
const BUDGET_STORAGE_KEY = 'money-tracker-budget-v1';
const THEME_STORAGE_KEY = 'money-tracker-theme-v1';
const FONT_STORAGE_KEY = 'money-tracker-font-v1';
const GOAL_STORAGE_KEY = 'money-tracker-goals-v1';
const DEFAULT_CATEGORIES = ['Shopping', 'Food', 'Transpo', 'Savings', 'Salary', 'Bills', 'Allowance', 'Other'];
const THEMES = {
  classic: { accent: '#174c4f', background: '#f3f0e8', surface: '#fffdf8', text: '#183235' },
  blush: { accent: '#b54f72', background: '#f8e9ee', surface: '#fffafd', text: '#34252d' },
  mono: { accent: '#30343b', background: '#e6e8eb', surface: '#ffffff', text: '#17191c' },
};

const form = document.getElementById('transactionForm');
const categorySelect = document.getElementById('category');
const newCategoryInput = document.getElementById('newCategoryInput');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const categoryList = document.getElementById('categoryList');
const transactionList = document.getElementById('transactionList');
const incomeTotalEl = document.getElementById('incomeTotal');
const expenseTotalEl = document.getElementById('expenseTotal');
const balanceTotalEl = document.getElementById('balanceTotal');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const backupBtn = document.getElementById('backupBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const monthFilter = document.getElementById('monthFilter');
const budgetInput = document.getElementById('budgetInput');
const budgetStatus = document.getElementById('budgetStatus');
const budgetProgress = document.getElementById('budgetProgress');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const categoryBreakdown = document.getElementById('categoryBreakdown');
const categoryExpenseTotal = document.getElementById('categoryExpenseTotal');
const authScreen = document.getElementById('authScreen');
const appShell = document.getElementById('appShell');
const authForm = document.getElementById('authForm');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const authMessage = document.getElementById('authMessage');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authModeBtn = document.getElementById('authModeBtn');
const userGreeting = document.getElementById('userGreeting');
const syncStatus = document.getElementById('syncStatus');
const logoutBtn = document.getElementById('logoutBtn');
const tabButtons = document.querySelectorAll('.app-tab');
const goalForm = document.getElementById('goalForm');
const goalList = document.getElementById('goalList');
const resetThemeBtn = document.getElementById('resetThemeBtn');
const themeInputs = {
  accent: document.getElementById('accentColor'),
  background: document.getElementById('backgroundColor'),
  surface: document.getElementById('surfaceColor'),
  text: document.getElementById('textColor'),
};
const fontSelect = document.getElementById('fontSelect');
const FONT_STYLES = {
  dm: { body: "'DM Sans', sans-serif", heading: "'Space Grotesk', sans-serif" },
  manrope: { body: "'Manrope', sans-serif", heading: "'Plus Jakarta Sans', sans-serif" },
  editorial: { body: "'DM Sans', sans-serif", heading: "'Lora', serif" },
};

const today = new Date();
const defaultDate = today.toISOString().split('T')[0];
let currentUser = null;
let currentEmail = '';
let records = loadRecords();
let categories = loadCategories();
let goals = loadGoals();
let editingId = null;
let isRegisterMode = false;

function setActiveTab(tabName) {
  document.querySelectorAll('.tab-content, .tab-section').forEach((section) => {
    section.classList.toggle('tab-hidden', !section.classList.contains(`${tabName}-content`));
  });
  document.querySelector('.content-grid').classList.toggle('tab-hidden', tabName === 'dashboard');
  tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabName));
}

document.getElementById('date').value = defaultDate;
monthFilter.value = defaultDate.slice(0, 7);
budgetInput.value = localStorage.getItem(getBudgetKey()) || '';

function normalizeCategoryName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getUserKey(prefix) {
  return `${prefix}-${currentUser || 'guest'}`;
}

function getBudgetKey() {
  return `${getUserKey(BUDGET_STORAGE_KEY)}-${monthFilter.value}`;
}

function getSavedBudgets() {
  const budgets = {};
  const prefix = `${getUserKey(BUDGET_STORAGE_KEY)}-`;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && key.startsWith(prefix)) {
      budgets[key.slice(prefix.length)] = localStorage.getItem(key);
    }
  }
  return budgets;
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle('error', isError);
}

function setSyncStatus(message, isError = false) {
  syncStatus.textContent = message;
  syncStatus.classList.toggle('error', isError);
}

function showAuth() {
  authScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
}

async function loadCloudData() {
  const [{ data: cloudRecords, error: recordsError }, { data: cloudCategories, error: categoriesError }, { data: cloudGoals, error: goalsError }] = await Promise.all([
    supabaseClient.from('transactions').select('*').order('transaction_date', { ascending: false }),
    supabaseClient.from('categories').select('name').order('created_at'),
    supabaseClient.from('goals').select('*').order('created_at'),
  ]);

  if (recordsError || categoriesError || goalsError) {
    throw recordsError || categoriesError || goalsError;
  }

  records = (cloudRecords || []).map((record) => ({
    id: record.id,
    type: record.type,
    category: record.category,
    amount: Number(record.amount),
    date: record.transaction_date,
    note: record.note || '',
    frequency: record.frequency || 'once',
    recurrenceKey: record.recurrence_key || undefined,
  }));
  categories = cloudCategories?.map((category) => category.name) || [...DEFAULT_CATEGORIES];
  goals = (cloudGoals || []).map((goal) => ({ id: goal.id, name: goal.name, target: Number(goal.target), saved: Number(goal.saved) }));

  const { data: cloudBudget } = await supabaseClient
    .from('budgets')
    .select('amount')
    .eq('month', `${monthFilter.value}-01`)
    .maybeSingle();
  budgetInput.value = cloudBudget ? cloudBudget.amount : '';
  setSyncStatus('Synced');
}

async function showApp() {
  authScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  userGreeting.textContent = `Logged in as ${currentEmail}`;
  records = loadRecords();
  categories = loadCategories();
  goals = loadGoals();
  budgetInput.value = localStorage.getItem(getBudgetKey()) || '';
  try {
    await loadCloudData();
    addMissingMonthlyRecords();
  } catch (error) {
    console.error('Cloud data could not be loaded:', error);
    setSyncStatus(`Cloud sync failed: ${error.message || 'check Supabase permissions.'}`, true);
  }
  loadTheme();
  loadFont();
  renderCategoryOptions();
  renderCategoryList();
  renderGoals();
  render();
  setActiveTab('dashboard');
}

function applyFont(fontName, save = true) {
  const font = FONT_STYLES[fontName] || FONT_STYLES.dm;
  document.documentElement.style.setProperty('--font-body', font.body);
  document.documentElement.style.setProperty('--font-heading', font.heading);
  fontSelect.value = FONT_STYLES[fontName] ? fontName : 'dm';
  if (save) localStorage.setItem(getUserKey(FONT_STORAGE_KEY), fontName);
}

function loadFont() {
  applyFont(localStorage.getItem(getUserKey(FONT_STORAGE_KEY)) || 'dm', false);
}

function applyTheme(theme, save = true) {
  Object.entries(theme).forEach(([name, value]) => {
    const cssVariable = name === 'accent' ? '--primary' : name === 'background' ? '--bg' : name === 'surface' ? '--panel' : '--text';
    document.documentElement.style.setProperty(cssVariable, value);
    themeInputs[name].value = value;
  });
  if (save) localStorage.setItem(getUserKey(THEME_STORAGE_KEY), JSON.stringify(theme));
  document.querySelectorAll('.theme-preset').forEach((button) => {
    button.classList.toggle('active', JSON.stringify(THEMES[button.dataset.theme]) === JSON.stringify(theme));
  });
}

function loadTheme() {
  try {
    const savedTheme = JSON.parse(localStorage.getItem(getUserKey(THEME_STORAGE_KEY)) || 'null');
    applyTheme(savedTheme || THEMES.classic, false);
  } catch (error) {
    applyTheme(THEMES.classic, false);
  }
}

function loadCategories() {
  const savedData = localStorage.getItem(getUserKey(CATEGORY_STORAGE_KEY));

  if (!savedData) {
    return [...DEFAULT_CATEGORIES];
  }

  try {
    const parsed = JSON.parse(savedData);
    const cleanList = Array.isArray(parsed)
      ? parsed.map((item) => normalizeCategoryName(item)).filter(Boolean)
      : [];

    return cleanList.length ? [...new Set(cleanList)] : [...DEFAULT_CATEGORIES];
  } catch (error) {
    console.error('Failed to load categories:', error);
    return [...DEFAULT_CATEGORIES];
  }
}

async function saveCategories() {
  localStorage.setItem(getUserKey(CATEGORY_STORAGE_KEY), JSON.stringify(categories));
  if (!currentUser) return;
  await supabaseClient.from('categories').delete().eq('user_id', currentUser);
  await supabaseClient.from('categories').insert(categories.map((name) => ({ user_id: currentUser, name })));
}

function loadGoals() {
  try {
    const savedGoals = JSON.parse(localStorage.getItem(getUserKey(GOAL_STORAGE_KEY)) || '[]');
    return Array.isArray(savedGoals) ? savedGoals : [];
  } catch (error) {
    return [];
  }
}

async function saveGoals() {
  localStorage.setItem(getUserKey(GOAL_STORAGE_KEY), JSON.stringify(goals));
  if (!currentUser) return;
  await supabaseClient.from('goals').delete().eq('user_id', currentUser);
  await supabaseClient.from('goals').insert(goals.map((goal) => ({ user_id: currentUser, name: goal.name, target: goal.target, saved: goal.saved })));
}

function loadRecords() {
  const savedData = localStorage.getItem(getUserKey(STORAGE_KEY));

  if (!savedData) {
    return [
      { id: crypto.randomUUID(), type: 'income', category: 'Salary', amount: 25000, note: 'Monthly salary', date: defaultDate },
      { id: crypto.randomUUID(), type: 'expense', category: 'Food', amount: 1200, note: 'Lunch and dinner', date: defaultDate },
      { id: crypto.randomUUID(), type: 'expense', category: 'Transpo', amount: 350, note: 'Jeepney fare', date: defaultDate },
    ];
  }

  try {
    return JSON.parse(savedData);
  } catch (error) {
    console.error('Failed to load saved records:', error);
    return [];
  }
}

async function saveRecords() {
  localStorage.setItem(getUserKey(STORAGE_KEY), JSON.stringify(records));
  if (!currentUser) return;
  setSyncStatus('Saving...');
  await supabaseClient.from('transactions').delete().eq('user_id', currentUser);
  const { data, error } = await supabaseClient.from('transactions').insert(records.map((record) => ({
    user_id: currentUser,
    type: record.type,
    category: record.category,
    amount: record.amount,
    transaction_date: record.date,
    note: record.note || null,
    frequency: record.frequency || 'once',
    recurrence_key: record.recurrenceKey || null,
  }))).select();
  if (error) {
    setSyncStatus('Sync failed. Your local copy is safe.', true);
    throw error;
  }
  if (data) {
    records = data.map((record) => ({ ...record, date: record.transaction_date, amount: Number(record.amount) }));
  }
  setSyncStatus('Synced');
}

function addMissingMonthlyRecords() {
  const currentMonthStart = new Date(`${defaultDate.slice(0, 7)}-01T00:00:00`);
  const generatedRecords = [];

  records.filter((record) => record.frequency === 'monthly').forEach((record) => {
    const sourceDate = new Date(`${record.date}T00:00:00`);
    let nextDate = new Date(sourceDate);
    nextDate.setMonth(nextDate.getMonth() + 1, 1);

    while (nextDate <= currentMonthStart) {
      const date = nextDate.toISOString().split('T')[0];
      const recurrenceKey = `${record.id}-${date}`;
      const alreadyExists = records.some((item) => item.recurrenceKey === recurrenceKey);

      if (!alreadyExists) {
        generatedRecords.push({ ...record, id: crypto.randomUUID(), date, recurrenceKey });
      }
      nextDate.setMonth(nextDate.getMonth() + 1, 1);
    }
  });

  if (generatedRecords.length) {
    records.push(...generatedRecords);
    saveRecords();
  }
}

function getVisibleRecords() {
  if (!monthFilter.value) return records;
  return records.filter((record) => record.date.startsWith(monthFilter.value));
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value);
}

function renderCategoryOptions() {
  const currentSelection = categorySelect.value || categories[0] || '';
  categorySelect.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');

  if (categories.includes(currentSelection)) {
    categorySelect.value = currentSelection;
  } else if (categories.length) {
    categorySelect.value = categories[0];
  }
}

function renderCategoryList() {
  categoryList.innerHTML = categories
    .map(
      (category) => `
        <div class="category-item">
          <span>${escapeHtml(category)}</span>
          <button class="category-delete-btn" data-category="${escapeHtml(category)}" type="button">×</button>
        </div>
      `
    )
    .join('');

  categoryList.querySelectorAll('.category-delete-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const categoryToDelete = button.dataset.category;

      if (categories.length <= 1) {
        alert('You need at least one category left.');
        return;
      }

      const confirmDelete = window.confirm(`Delete category "${categoryToDelete}"?`);
      if (!confirmDelete) {
        return;
      }

      categories = categories.filter((category) => category !== categoryToDelete);
      saveCategories();
      renderCategoryOptions();
      renderCategoryList();
    });
  });
}

function calculateTotals() {
  let totalIncome = 0;
  let totalExpense = 0;

  getVisibleRecords().forEach((record) => {
    if (record.type === 'income') {
      totalIncome += Number(record.amount);
    } else {
      totalExpense += Number(record.amount);
    }
  });

  const balance = totalIncome - totalExpense;

  incomeTotalEl.textContent = formatMoney(totalIncome);
  expenseTotalEl.textContent = formatMoney(totalExpense);
  balanceTotalEl.textContent = formatMoney(balance);
  balanceTotalEl.style.color = balance >= 0 ? '#2563eb' : '#dc2626';

  const budget = Number(budgetInput.value);
  if (!budget) {
    budgetStatus.textContent = 'No budget set';
    budgetProgress.style.width = '0%';
  } else {
    const percentage = Math.min((totalExpense / budget) * 100, 100);
    budgetStatus.textContent = `${formatMoney(totalExpense)} of ${formatMoney(budget)}`;
    budgetProgress.style.width = `${percentage}%`;
    budgetProgress.style.background = totalExpense > budget ? '#dc2626' : '#16a34a';
  }
}

function renderCategoryBreakdown() {
  const expenseTotals = {};
  getVisibleRecords().forEach((record) => {
    if (record.type === 'expense') {
      expenseTotals[record.category] = (expenseTotals[record.category] || 0) + Number(record.amount);
    }
  });

  const entries = Object.entries(expenseTotals).sort(([, first], [, second]) => second - first);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
  categoryExpenseTotal.textContent = formatMoney(total);

  if (!entries.length) {
    categoryBreakdown.innerHTML = '<div class="empty-state">No expenses found for this month.</div>';
    return;
  }

  categoryBreakdown.innerHTML = entries
    .map(([category, amount]) => {
      const percentage = total ? (amount / total) * 100 : 0;
      return `
        <div class="breakdown-row">
          <div class="breakdown-heading"><span>${escapeHtml(category)}</span><span>${formatMoney(amount)}</span></div>
          <div class="breakdown-track"><div class="breakdown-fill" style="width: ${percentage}%"></div></div>
        </div>
      `;
    })
    .join('');
}

function renderGoals() {
  if (!goals.length) {
    goalList.innerHTML = '<div class="empty-state">No savings goals yet.</div>';
    return;
  }

  goalList.innerHTML = goals.map((goal) => {
    const percentage = Math.min((Number(goal.saved) / Number(goal.target)) * 100, 100);
    return `
      <div class="goal-item">
        <div class="goal-heading"><span>${escapeHtml(goal.name)}</span><button class="goal-delete" data-id="${goal.id}" type="button">Delete</button></div>
        <div class="progress-track"><div class="progress-bar" style="width: ${percentage}%"></div></div>
        <div class="goal-meta"><span>${formatMoney(Number(goal.saved))} saved</span><span>${formatMoney(Number(goal.target))} target</span></div>
      </div>
    `;
  }).join('');

  goalList.querySelectorAll('.goal-delete').forEach((button) => {
    button.addEventListener('click', () => {
      if (!window.confirm('Delete this savings goal?')) return;
      goals = goals.filter((goal) => goal.id !== button.dataset.id);
      saveGoals();
      renderGoals();
    });
  });
}

function renderTransactions() {
  const visibleRecords = getVisibleRecords();
  if (!visibleRecords.length) {
    transactionList.innerHTML = '<div class="empty-state">No transactions found for this month.</div>';
    return;
  }

  const sorted = [...visibleRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

  transactionList.innerHTML = sorted
    .map(
      (record) => `
        <div class="transaction-item ${record.type}">
          <div class="transaction-main">
            <div class="transaction-title">${escapeHtml(record.category)}</div>
            <div class="transaction-meta">${new Date(record.date).toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}${record.note ? ' • ' + escapeHtml(record.note) : ''}${record.frequency === 'monthly' ? ' • Monthly' : ''}</div>
          </div>
          <span class="pill">${record.type}</span>
          <div class="transaction-amount">${record.type === 'income' ? '+' : '-'} ${formatMoney(Number(record.amount))}</div>
          <button class="edit-btn" data-id="${record.id}" type="button">Edit</button>
          <button class="delete-btn" data-id="${record.id}" type="button">Delete</button>
        </div>
      `
    )
    .join('');

  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      if (!window.confirm('Delete this transaction?')) return;
      records = records.filter((item) => item.id !== id);
      saveRecords();
      render();
    });
  });

  document.querySelectorAll('.edit-btn').forEach((button) => {
    button.addEventListener('click', () => startEditing(button.dataset.id));
  });
}

function startEditing(id) {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  editingId = id;
  document.getElementById('type').value = record.type;
  categorySelect.value = record.category;
  document.getElementById('amount').value = record.amount;
  document.getElementById('date').value = record.date;
  document.getElementById('note').value = record.note || '';
  document.getElementById('frequency').value = record.frequency || 'once';
  formTitle.textContent = 'Edit Transaction';
  submitBtn.textContent = 'Save Changes';
  cancelEditBtn.classList.remove('hidden');
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  editingId = null;
  form.reset();
  document.getElementById('date').value = defaultDate;
  renderCategoryOptions();
  formTitle.textContent = 'Add Transaction';
  submitBtn.textContent = 'Add Record';
  cancelEditBtn.classList.add('hidden');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function render() {
  calculateTotals();
  renderCategoryBreakdown();
  renderGoals();
  renderTransactions();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const type = formData.get('type');
  const category = normalizeCategoryName(formData.get('category'));
  const amount = Number(formData.get('amount'));
  const date = formData.get('date');
  const note = normalizeCategoryName(formData.get('note'));
  const frequency = formData.get('frequency');

  if (!category || !date || amount <= 0) {
    alert('Please complete all required fields with a valid amount.');
    return;
  }

  const updatedRecord = { id: editingId || crypto.randomUUID(), type, category, amount, date, note, frequency };
  if (editingId) {
    records = records.map((record) => (record.id === editingId ? updatedRecord : record));
  } else {
    records.push(updatedRecord);
  }

  try {
    await saveRecords();
  } catch (error) {
    console.error('Could not save transaction:', error);
  }
  resetForm();
  render();
});

cancelEditBtn.addEventListener('click', resetForm);
monthFilter.addEventListener('change', () => {
  budgetInput.value = localStorage.getItem(getBudgetKey()) || '';
  render();
});

budgetInput.addEventListener('input', () => {
  const value = Number(budgetInput.value);
  if (value > 0) localStorage.setItem(getBudgetKey(), String(value));
  else localStorage.removeItem(getBudgetKey());
  if (currentUser) {
    if (value > 0) {
      supabaseClient.from('budgets').upsert({
        user_id: currentUser,
        month: `${monthFilter.value}-01`,
        amount: value,
      }, { onConflict: 'user_id,month' });
    } else {
      supabaseClient.from('budgets').delete().eq('user_id', currentUser).eq('month', `${monthFilter.value}-01`);
    }
  }
  calculateTotals();
});

exportBtn.addEventListener('click', () => {
  const rows = [['Type', 'Category', 'Amount', 'Date', 'Note'], ...records.map((record) => [record.type, record.category, record.amount, record.date, record.note || ''])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'money-tracker-transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
});

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

backupBtn.addEventListener('click', () => {
  const theme = Object.fromEntries(Object.entries(themeInputs).map(([key, control]) => [key, control.value]));
  downloadJson(`money-tracker-backup-${currentUser}.json`, { records, categories, goals, theme, budgets: getSavedBudgets() });
});

importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      if (!Array.isArray(backup.records) || !Array.isArray(backup.categories) || !Array.isArray(backup.goals)) {
        throw new Error('Invalid backup format');
      }
      records = backup.records;
      categories = backup.categories;
      goals = backup.goals;
      Object.entries(backup.budgets || {}).forEach(([month, amount]) => {
        localStorage.setItem(`${getUserKey(BUDGET_STORAGE_KEY)}-${month}`, amount);
      });
      saveRecords();
      saveCategories();
      saveGoals();
      if (backup.theme) applyTheme(backup.theme);
      renderCategoryOptions();
      renderCategoryList();
      render();
      alert('Backup imported successfully.');
    } catch (error) {
      alert('Could not import this file. Please choose a valid Money Tracker JSON backup.');
    }
    importFile.value = '';
  };
  reader.readAsText(file);
});

addCategoryBtn.addEventListener('click', () => {
  const newCategory = normalizeCategoryName(newCategoryInput.value);

  if (!newCategory) {
    alert('Please enter a category name.');
    return;
  }

  if (categories.some((category) => category.toLowerCase() === newCategory.toLowerCase())) {
    alert('That category already exists.');
    return;
  }

  categories.push(newCategory);
  saveCategories();
  renderCategoryOptions();
  renderCategoryList();
  newCategoryInput.value = '';
});

goalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = normalizeCategoryName(document.getElementById('goalName').value);
  const target = Number(document.getElementById('goalTarget').value);
  const saved = Number(document.getElementById('goalSaved').value);

  if (!name || target <= 0 || saved < 0 || saved > target) {
    alert('Enter a goal name and valid amounts. Saved amount cannot exceed the target.');
    return;
  }

  goals.push({ id: crypto.randomUUID(), name, target, saved });
  saveGoals();
  goalForm.reset();
  renderGoals();
});

document.querySelectorAll('.theme-preset').forEach((button) => {
  button.addEventListener('click', () => applyTheme(THEMES[button.dataset.theme]));
});

Object.entries(themeInputs).forEach(([name, input]) => {
  input.addEventListener('input', () => {
    const currentTheme = Object.fromEntries(Object.entries(themeInputs).map(([key, control]) => [key, control.value]));
    applyTheme(currentTheme);
  });
});

resetThemeBtn.addEventListener('click', () => applyTheme(THEMES.classic));
fontSelect.addEventListener('change', () => applyFont(fontSelect.value));
tabButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tab));
});

clearAllBtn.addEventListener('click', () => {
  if (!records.length) {
    alert('There are no records to clear.');
    return;
  }

  const confirmDelete = window.confirm('Clear all transactions? This cannot be undone.');
  if (!confirmDelete) {
    return;
  }

  records = [];
  saveRecords();
  render();
});

authModeBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  authSubmitBtn.textContent = isRegisterMode ? 'Create Account' : 'Log In';
  authModeBtn.textContent = isRegisterMode ? 'Already have an account? Log in' : 'Create a new account';
  authPassword.autocomplete = isRegisterMode ? 'new-password' : 'current-password';
  setAuthMessage('');
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = authUsername.value.trim().toLowerCase();
  const password = authPassword.value;

  if (!email || password.length < 4) {
    setAuthMessage('Enter a valid email and a password with at least 4 characters.', true);
    return;
  }

  authSubmitBtn.disabled = true;
  setAuthMessage('Please wait...');

  const result = isRegisterMode
    ? await supabaseClient.auth.signUp({ email, password, options: { data: { username: email.split('@')[0] } } })
    : await supabaseClient.auth.signInWithPassword({ email, password });

  authSubmitBtn.disabled = false;

  if (result.error) {
    setAuthMessage(result.error.message, true);
    return;
  }

  if (isRegisterMode && !result.data.session) {
    setAuthMessage('Account created. Check your email to confirm, then log in.');
    return;
  }

  const user = result.data.user;
  currentUser = user.id;
  currentEmail = user.email || email;
  authForm.reset();
  setAuthMessage('');
  showApp();
});

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentEmail = '';
  records = [];
  showAuth();
});

async function initializeAuth() {
  const hasValidSupabaseConfig = Boolean(
    typeof window !== 'undefined' &&
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY &&
    !SUPABASE_URL.includes('your-project') &&
    !SUPABASE_PUBLISHABLE_KEY.includes('your_')
  );

  if (!hasValidSupabaseConfig) {
    currentUser = 'guest';
    currentEmail = 'Guest user';
    showApp();
    return;
  }

  try {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session?.user) {
      currentUser = data.session.user.id;
      currentEmail = data.session.user.email || '';
      showApp();
    } else {
      showApp();
    }
  } catch (error) {
    console.warn('Supabase session unavailable, using guest mode:', error);
    currentUser = 'guest';
    currentEmail = 'Guest user';
    showApp();
  }
}

initializeAuth();
