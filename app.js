const STORAGE_KEY = "home-finance-app-state";
// ==== Експорт JSON ====
function exportDB() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "user_data.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ==== Імпорт JSON ====
function importDB(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      const requiredKeys = ["accounts", "expenses", "income", "loans", "currencies", "members"];
      const errors = [];

      for (const key of requiredKeys) {
        if (!(key in imported)) {
          errors.push(`Відсутній ключ: ${key}`);
        } else if (!Array.isArray(imported[key])) {
          errors.push(`Ключ ${key} має бути масивом`);
        }
      }

      if (errors.length > 0) {
        console.error("Помилки імпорту:", errors);
        alert("❌ Помилки імпорту:\n" + errors.join("\n"));
        return;
      }

      // Оновити стан
      state = {
        ...deepClone(defaultState),
        ...imported,
      };
      saveState();
      alert("✅ Дані успішно імпортовано!");
      location.reload();
    } catch (e) {
      console.error("JSON Decode Error:", e);
      alert("❌ Файл не валідний JSON: " + e.message);
    }
  };
  reader.readAsText(file);
}


const SHARED_OWNER_ID = "shared";
const COLLECTION_PREFIX = {
  members: "member",
  accounts: "acc",
  expenses: "exp",
  income: "inc",
  loans: "loan",
  currencies: "cur",
};

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const defaultState = {
  currencies: [
    { id: "cur-uah", code: "UAH", name: "Гривня", rateToBase: 1 },
    { id: "cur-usd", code: "USD", name: "Долар США", rateToBase: 40 },
    { id: "cur-eur", code: "EUR", name: "Євро", rateToBase: 42 },
  ],
  baseCurrencyId: "cur-uah",
  members: [
    { id: "member-1", name: "Олена", role: "Мама" },
    { id: "member-2", name: "Ігор", role: "Тато" },
    { id: "member-3", name: "Марко", role: "Син" },
  ],
  accounts: [
    {
      id: "acc-1",
      name: "Спільна картка",
      owner: SHARED_OWNER_ID,
      balance: 12500,
      currencyId: "cur-uah",
      note: "Побутові витрати",
    },
    {
      id: "acc-2",
      name: "Зарплатна Олени",
      owner: "member-1",
      balance: 8400,
      currencyId: "cur-uah",
      note: "",
    },
    {
      id: "acc-3",
      name: "Зарплатна Ігоря",
      owner: "member-2",
      balance: 10550,
      currencyId: "cur-uah",
      note: "",
    },
  ],
  expenses: [
    {
      id: "exp-1",
      date: new Date().toISOString().slice(0, 10),
      memberId: "member-1",
      accountId: "acc-1",
      category: "Продукти",
      subcategory: "Супермаркет",
      description: "Супермаркет",
      amount: 1250,
      currencyId: "cur-uah",
    },
  ],
  income: [
    {
      id: "inc-1",
      date: new Date().toISOString().slice(0, 10),
      memberId: "member-2",
      accountId: "acc-3",
      source: "Зарплата",
      description: "Основна робота",
      amount: 24000,
      currencyId: "cur-uah",
    },
  ],
  loans: [
    {
      id: "loan-1",
      memberId: "member-2",
      counterparty: "Олена",
      direction: "lend",
      amount: 2000,
      currencyId: "cur-uah",
      fromAccountId: "acc-3",
      toAccountId: "acc-1",
      date: new Date().toISOString().slice(0, 10),
      status: "active",
      note: "Покупка техніки",
    },
  ],
};

let state = loadState();

function getBaseCurrency() {
  const base =
    state.currencies &&
    state.currencies.find((currency) => currency.id === state.baseCurrencyId);
  return base || (state.currencies && state.currencies[0]) || { code: "UAH", rateToBase: 1 };
}

const findCurrency = (id) => {
  if (!state.currencies) return null;
  return state.currencies.find((currency) => currency.id === id) || null;
};

const convertToBase = (amount, currencyId) => {
  const currency = findCurrency(currencyId) || getBaseCurrency();
  const rate = Number(currency.rateToBase || 1);
  return Number(amount || 0) * rate;
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(defaultState);
    const parsed = JSON.parse(raw);
    const merged = {
      ...deepClone(defaultState),
      ...parsed,
    };

    if (!merged.currencies) {
      merged.currencies = deepClone(defaultState.currencies);
      merged.baseCurrencyId = defaultState.baseCurrencyId;
    }

    merged.accounts = (merged.accounts || []).map((acc) => ({
      ...acc,
      currencyId: acc.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
    }));

    merged.expenses = (merged.expenses || []).map((exp) => ({
      ...exp,
      subcategory: exp.subcategory || "",
      currencyId: exp.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
    }));

    merged.income = (merged.income || []).map((inc) => ({
      ...inc,
      currencyId: inc.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
    }));

    merged.loans = (merged.loans || []).map((loan) => {
      if (loan.memberId && loan.counterparty) {
        return {
          ...loan,
          currencyId: loan.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
          fromAccountId: loan.fromAccountId || null,
          toAccountId: loan.toAccountId || null,
        };
      }

      const borrower = loan.borrowerId ? loan.borrowerId : null;
      const lender = loan.lenderId ? loan.lenderId : null;
      let memberId = borrower || lender || (merged.members && merged.members[0]?.id);
      let counterpartyName = "";
      let direction = "owe";

      const borrowerMember = borrower && merged.members.find((m) => m.id === borrower);
      const lenderMember = lender && merged.members.find((m) => m.id === lender);

      if (borrowerMember && lenderMember) {
        memberId = borrowerMember.id;
        counterpartyName = lenderMember.name;
        direction = "owe";
      } else if (borrowerMember) {
        memberId = borrowerMember.id;
        counterpartyName = loan.note || "Контрагент";
        direction = "owe";
      } else if (lenderMember) {
        memberId = lenderMember.id;
        counterpartyName = loan.note || "Контрагент";
        direction = "lend";
      }

      return {
        id: loan.id,
        memberId,
        counterparty: counterpartyName,
        direction,
        amount: loan.amount || 0,
        currencyId: loan.currencyId || merged.baseCurrencyId || defaultState.baseCurrencyId,
        fromAccountId: loan.fromAccountId || null,
        toAccountId: loan.toAccountId || null,
        date: loan.date || new Date().toISOString().slice(0, 10),
        status: loan.status || "active",
        note: loan.note || "",
      };
    });

    return merged;
  } catch (error) {
    console.error("Cannot load state", error);
    return deepClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const uid = (prefix) =>
  `${prefix}-${(crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).slice(2, 9)}`;

const formatMoney = (value, currencyCode) => {
  const base = getBaseCurrency();
  const code = currencyCode || base.code || "UAH";
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
};

const findMember = (id) => {
  if (id === SHARED_OWNER_ID) {
    return { id, name: "Спільний", role: "Для всіх" };
  }
  return state.members.find((m) => m.id === id);
};

const findAccount = (id) => state.accounts.find((acc) => acc.id === id);

const convertAmountBetweenCurrencies = (amount, fromCurrencyId, toCurrencyId) => {
  if (!amount) return 0;
  const base = convertToBase(amount, fromCurrencyId);
  const to = findCurrency(toCurrencyId) || getBaseCurrency();
  const rateTo = Number(to.rateToBase || 1);
  if (!rateTo) return 0;
  return base / rateTo;
};

const setActiveView = (viewId) => {
  document.querySelectorAll(".app-nav button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });

  document.querySelectorAll("section.view").forEach((section) => {
    section.classList.toggle("hidden", section.id !== viewId);
  });

  // Оновлення вибору валюти при зміні вкладки
  if (viewId === "accounts") setCurrencyFromMemory("account-currency", "accounts");
  if (viewId === "expenses") setCurrencyFromMemory("expense-currency", "expenses");
  if (viewId === "income") setCurrencyFromMemory("income-currency", "income");
  if (viewId === "loans") setCurrencyFromMemory("loan-currency", "loans");



  // Очистити памʼять про валюту для інших вкладок
  for (const key in currencyMemory) {
    if (key !== viewId) delete currencyMemory[key];
  }

  // Встановити валюту у відповідну форму
  if (viewId === "accounts") setDefaultCurrencyForForm("account-currency", "accounts");
  if (viewId === "expenses") setDefaultCurrencyForForm("expense-currency", "expenses");
  if (viewId === "income") setDefaultCurrencyForForm("income-currency", "income");
  if (viewId === "loans") setDefaultCurrencyForForm("loan-currency", "loans");
};

const populateSelect = (
  select,
  entries,
  { valueKey = "id", labelKey = "name", includeAny = false, anyLabel = "Усі" } = {}
) => {
  const options = [];
  if (includeAny) {
    options.push(new Option(anyLabel, "all"));
  }
  entries.forEach((entry) => {
    options.push(new Option(entry[labelKey], entry[valueKey]));
  });
  select.replaceChildren(...options);
};

function refreshMemberOptions() {
  const memberSelects = ["account-owner", "expense-member", "income-member", "loan-member"];
  memberSelects.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      const entries =
        id === "account-owner"
          ? [{ id: SHARED_OWNER_ID, name: "Спільний рахунок" }, ...state.members]
          : state.members;
      populateSelect(element, entries);
    }
  });

  populateSelect(document.getElementById("expense-member-filter"), state.members, {
    includeAny: true,
  });

  populateSelect(document.getElementById("income-member-filter"), state.members, {
    includeAny: true,
  });
}

function refreshAccountOptions() {
  const accountSelects = [
    "expense-account",
    "income-account",
    "loan-from-account",
    "loan-to-account",
    "transfer-from-account",
    "transfer-to-account",
  ];
  accountSelects.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      populateSelect(
        element,
        state.accounts.map((acc) => ({ id: acc.id, name: acc.name }))
      );
    }
  });

  populateSelect(document.getElementById("expense-account-filter"), state.accounts, { includeAny: true });
  populateSelect(document.getElementById("income-account-filter"), state.accounts, { includeAny: true });
}


function setCurrencyFromMemory(selectId, viewId) {
  const el = document.getElementById(selectId);
  if (el && !el.value) {
    el.value = getLastCurrency(viewId);
  }
  el?.addEventListener("change", () => {
    setLastCurrency(viewId, el.value);
  });
}



function refreshCurrencyOptions() {
  if (!state.currencies) return;
  const base = getBaseCurrency();
  const ordered = [base, ...state.currencies.filter(c => c.id !== base.id)];

  const selects = ["account-currency", "expense-currency", "income-currency", "loan-currency"];
  selects.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      populateSelect(
        element,
        ordered.map(cur => ({ id: cur.id, name: `${cur.code} — ${cur.name}` }))
      );
      if (!element.value) element.value = state.baseCurrencyId;
    }
  });

  const baseCurrencySelect = document.getElementById("base-currency-select");
  if (baseCurrencySelect) {
    populateSelect(
      baseCurrencySelect,
      ordered.map(cur => ({ id: cur.id, name: `${cur.code} — ${cur.name}` }))
    );
    baseCurrencySelect.value = state.baseCurrencyId;
  }
}


function refreshExpenseCategoryOptions() {
  const catDatalist = document.getElementById("expense-category-options");
  const subDatalist = document.getElementById("expense-subcategory-options");
  if (!catDatalist && !subDatalist) return;

  const categories = Array.from(
    new Set((state.expenses || []).map((exp) => (exp.category || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "uk"));

  if (catDatalist) {
    catDatalist.innerHTML = categories.map((cat) => `<option value="${cat}"></option>`).join("");
  }

  if (subDatalist) {
    const currentCategoryInput = document.getElementById("expense-category");
    const currentCategory = currentCategoryInput ? currentCategoryInput.value : "";
    updateExpenseSubcategoryOptions(currentCategory);
  }
}

function updateExpenseSubcategoryOptions(categoryValue) {
  const subDatalist = document.getElementById("expense-subcategory-options");
  if (!subDatalist) return;

  const normalized = (categoryValue || "").trim().toLowerCase();
  if (!normalized) {
    subDatalist.innerHTML = "";
    return;
  }

  const subcategories = Array.from(
    new Set(
      (state.expenses || [])
        .filter(
          (exp) => (exp.category || "").trim().toLowerCase() === normalized && (exp.subcategory || "").trim()
        )
        .map((exp) => exp.subcategory.trim())
    )
  ).sort((a, b) => a.localeCompare(b, "uk"));

  subDatalist.innerHTML = subcategories.map((sub) => `<option value="${sub}"></option>`).join("");
}

function renderMembers() {
  const tbody = document.getElementById("members-table");
  tbody.innerHTML = state.members
    .map(
      (member) => `
      <tr>
        <td>${member.name}</td>
        <td>${member.role || "—"}</td>
        <td data-entity="member" data-id="${member.id}" class="table-actions">
          <button data-action="edit">Редагувати</button>
          <button data-action="delete" class="danger">Видалити</button>
        </td>
      </tr>`
    )
    .join("");
}

function renderAccounts() {
  const tbody = document.getElementById("accounts-table");
  tbody.innerHTML = state.accounts
    .map((account) => {
      const owner = findMember(account.owner);
      const currency = findCurrency(account.currencyId) || getBaseCurrency();
      return `
      <tr>
        <td>${account.name}</td>
        <td>${owner?.name ?? "Невідомо"}</td>
        <td>${currency.code}</td>
        <td>${formatMoney(account.balance, currency.code)}</td>
        <td>${account.note || "—"}</td>
        <td data-entity="account" data-id="${account.id}" class="table-actions">
          <button data-action="edit">Редагувати</button>
          <button data-action="delete" class="danger">Видалити</button>
        </td>
      </tr>`;
    })
    .join("");
}

function renderExpenses() {
  const memberFilter = document.getElementById("expense-member-filter").value;
  const accountFilter = document.getElementById("expense-account-filter").value;
  const categoryFilter = document.getElementById("expense-category-filter").value.trim().toLowerCase();
  const subcategoryFilter = document.getElementById("expense-subcategory-filter")?.value.trim().toLowerCase();
  const sort = document.getElementById("expense-sort").value;
  const fromDate = document.getElementById("expense-from-date")?.value;
  const toDate = document.getElementById("expense-to-date")?.value;

  let rows = [...state.expenses];

  rows = rows.filter((item) => (memberFilter === "all" ? true : item.memberId === memberFilter));
  rows = rows.filter((item) => (accountFilter === "all" ? true : item.accountId === accountFilter));
  rows = rows.filter((item) => (categoryFilter ? item.category.toLowerCase().includes(categoryFilter) : true));
  rows = rows.filter((item) => (subcategoryFilter ? item.subcategory?.toLowerCase().includes(subcategoryFilter) : true));

  if (fromDate || toDate) {
    rows = rows.filter((item) => {
      const d = new Date(item.date);
      return (!fromDate || d >= new Date(fromDate)) && (!toDate || d <= new Date(toDate));
    });
  }

  const sortBy = {
    "date-desc": (a, b) => b.date.localeCompare(a.date),
    "date-asc": (a, b) => a.date.localeCompare(b.date),
    "amount-desc": (a, b) => b.amount - a.amount,
    "amount-asc": (a, b) => a.amount - b.amount,
  };
  rows.sort(sortBy[sort]);

  const tbody = document.getElementById("expenses-table");
  tbody.innerHTML = rows
    .map((item) => {
      const member = findMember(item.memberId);
      const account = findAccount(item.accountId);
      const currency = findCurrency(item.currencyId) || findCurrency(account?.currencyId) || getBaseCurrency();
		return `
		  <tr>
			<td data-label="Дата">${item.date}</td>
			<td data-label="Член">${member?.name ?? "Невідомо"}</td>
			<td data-label="Рахунок">${account?.name ?? "Невідомо"}</td>
			<td data-label="Категорія">${item.category}</td>
			<td data-label="Підкатегорія">${item.subcategory || "—"}</td>
			<td data-label="Опис">${item.description || "—"}</td>
			<td data-label="Сума">${formatMoney(item.amount, currency.code)}</td>
			<td data-label="Дії" data-entity="expense" data-id="${item.id}" class="table-actions">
			  <button data-action="edit">Редагувати</button>
			  <button data-action="delete" class="danger">Видалити</button>
			</td>
		  </tr>
		`;
    })
    .join("");
}


function renderIncome() {
  const memberFilter = document.getElementById("income-member-filter").value;
  const accountFilter = document.getElementById("income-account-filter").value;
  const sourceFilter = document.getElementById("income-source-filter").value.trim().toLowerCase();
  const sort = document.getElementById("income-sort").value;
  const fromDate = document.getElementById("income-from-date")?.value;
  const toDate = document.getElementById("income-to-date")?.value;

  let rows = [...state.income];

  rows = rows.filter((item) => (memberFilter === "all" ? true : item.memberId === memberFilter));
  rows = rows.filter((item) => (accountFilter === "all" ? true : item.accountId === accountFilter));
  rows = rows.filter((item) => (sourceFilter ? item.source.toLowerCase().includes(sourceFilter) : true));

  if (fromDate || toDate) {
    rows = rows.filter((item) => {
      const d = new Date(item.date);
      return (!fromDate || d >= new Date(fromDate)) && (!toDate || d <= new Date(toDate));
    });
  }

  const sortBy = {
    "date-desc": (a, b) => b.date.localeCompare(a.date),
    "date-asc": (a, b) => a.date.localeCompare(b.date),
    "amount-desc": (a, b) => b.amount - a.amount,
    "amount-asc": (a, b) => a.amount - b.amount,
  };
  rows.sort(sortBy[sort]);

  const tbody = document.getElementById("income-table");
  tbody.innerHTML = rows
    .map((item) => {
      const member = findMember(item.memberId);
      const account = findAccount(item.accountId);
      const currency = findCurrency(item.currencyId) || findCurrency(account?.currencyId) || getBaseCurrency();
      return `
        <tr>
          <td>${item.date}</td>
          <td>${item.source}</td>
          <td>${member?.name ?? "Невідомо"}</td>
          <td>${account?.name ?? "Невідомо"}</td>
          <td>${item.description || "—"}</td>
          <td>${currency.code}</td>
          <td>${formatMoney(item.amount, currency.code)}</td>
          <td data-entity="income" data-id="${item.id}" class="table-actions">
            <button data-action="edit">Редагувати</button>
            <button data-action="delete" class="danger">Видалити</button>
          </td>
        </tr>
      `;
    })
    .join("");
}


function renderLoans() {
  const statusFilter = document.getElementById("loan-status-filter")?.value || "";
  const counterpartyFilter = document.getElementById("loan-counterparty-filter")?.value.trim().toLowerCase() || "";

  let filteredLoans = state.loans;

  if (statusFilter) {
    filteredLoans = filteredLoans.filter(l => l.status === statusFilter);
  }

  if (counterpartyFilter) {
    filteredLoans = filteredLoans.filter(l =>
      l.counterparty?.toLowerCase().includes(counterpartyFilter) ||
      (findMember(l.borrowerId)?.name?.toLowerCase().includes(counterpartyFilter)) ||
      (findMember(l.lenderId)?.name?.toLowerCase().includes(counterpartyFilter))
    );
  }

  const tbody = document.getElementById("loans-table");
  tbody.innerHTML = filteredLoans
    .map((loan) => {
      const member = loan.memberId ? findMember(loan.memberId) : null;
      let counterpartyName = loan.counterparty || "";

      if (!loan.memberId && (loan.borrowerId || loan.lenderId)) {
        const borrower = loan.borrowerId ? findMember(loan.borrowerId) : null;
        const lender = loan.lenderId ? findMember(loan.lenderId) : null;
        counterpartyName = lender?.name || borrower?.name || counterpartyName;
      }

      const currency = findCurrency(loan.currencyId) || getBaseCurrency();
      const fromAccount = loan.fromAccountId ? findAccount(loan.fromAccountId) : null;
      const toAccount = loan.toAccountId ? findAccount(loan.toAccountId) : null;
      const directionLabel =
        loan.direction === "lend"
          ? "Нам винні"
          : loan.direction === "owe"
          ? "Ми винні"
          : "—";
      return `
      <tr>
        <td>${loan.date}</td>
        <td>${member?.name ?? "Невідомо"}</td>
        <td>${counterpartyName || "—"}</td>
        <td>${fromAccount?.name || "—"}</td>
        <td>${toAccount?.name || "—"}</td>
        <td>${formatMoney(loan.amount, currency.code)}</td>
        <td>${directionLabel}</td>
        <td>${loan.status === "active" ? "Активна" : loan.status === "paid" ? "Повернена" : "Надана"}</td>
        <td>${loan.note || "—"}</td>
        <td data-entity="loan" data-id="${loan.id}" class="table-actions">
          <button data-action="edit">Редагувати</button>
          <button data-action="repay">Погашено</button>
          <button data-action="delete" class="danger">Видалити</button>
        </td>
      </tr>`;
    })
    .join("");
}


function renderReports() {
  const reportCards = document.getElementById("report-cards");
  const baseCurrency = getBaseCurrency();
  const totalBalance = state.accounts.reduce(
    (sum, account) => sum + convertToBase(account.balance || 0, account.currencyId),
    0
  );
  const totalIncome = state.income.reduce(
    (sum, entry) => sum + convertToBase(entry.amount || 0, entry.currencyId),
    0
  );
  const totalExpenses = state.expenses.reduce(
    (sum, entry) => sum + convertToBase(entry.amount || 0, entry.currencyId),
    0
  );
  const activeLoans = state.loans
    .filter((loan) => loan.status === "active")
    .reduce((sum, loan) => sum + convertToBase(loan.amount || 0, loan.currencyId), 0);

  reportCards.innerHTML = `
    <div class="report-card">
      <span>Загальний баланс (в основній валюті ${baseCurrency.code})</span>
      <strong>${formatMoney(totalBalance, baseCurrency.code)}</strong>
    </div>
    <div class="report-card">
      <span>Доходи</span>
      <strong>${formatMoney(totalIncome, baseCurrency.code)}</strong>
    </div>
    <div class="report-card">
      <span>Витрати</span>
      <strong>${formatMoney(totalExpenses, baseCurrency.code)}</strong>
    </div>
    <div class="report-card">
      <span>Активні позики</span>
      <strong>${formatMoney(activeLoans, baseCurrency.code)}</strong>
    </div>
  `;

  const memberSummary = {};
  state.members.forEach((member) => {
    memberSummary[member.id] = { income: 0, expense: 0 };
  });
  state.income.forEach((entry) => {
    if (!memberSummary[entry.memberId]) memberSummary[entry.memberId] = { income: 0, expense: 0 };
    memberSummary[entry.memberId].income += convertToBase(entry.amount || 0, entry.currencyId);
  });
  state.expenses.forEach((entry) => {
    if (!memberSummary[entry.memberId]) memberSummary[entry.memberId] = { income: 0, expense: 0 };
    memberSummary[entry.memberId].expense += convertToBase(entry.amount || 0, entry.currencyId);
  });

  const memberList = document.getElementById("report-members");
  memberList.innerHTML = Object.entries(memberSummary)
    .map(([memberId, stats]) => {
      const member = findMember(memberId);
      return `<li>
        ${member?.name ?? "Невідомо"} — ${formatMoney(stats.income - stats.expense)} (дохід ${formatMoney(
        stats.income
      )}, витрати ${formatMoney(stats.expense)})
      </li>`;
    })
    .join("");

  const expenseCategories = state.expenses.reduce((acc, expense) => {
    acc[expense.category] =
      (acc[expense.category] || 0) + convertToBase(expense.amount || 0, expense.currencyId);
    return acc;
  }, {});

  const expenseList = document.getElementById("report-expense-categories");
  expenseList.innerHTML = Object.entries(expenseCategories)
    .map(([category, amount]) => `<li>${category}: ${formatMoney(amount)}</li>`)
    .join("");

  const incomeSources = state.income.reduce((acc, entry) => {
    acc[entry.source] =
      (acc[entry.source] || 0) + convertToBase(entry.amount || 0, entry.currencyId);
    return acc;
  }, {});
  const incomeList = document.getElementById("report-income-sources");
  incomeList.innerHTML = Object.entries(incomeSources)
    .map(([source, amount]) => `<li>${source}: ${formatMoney(amount)}</li>`)
    .join("");
}

function renderCurrencies() {
  const tbody = document.getElementById("currencies-table");
  if (!tbody) return;

  const baseId = state.baseCurrencyId;
  tbody.innerHTML = (state.currencies || [])
    .map((cur) => {
      const isBase = cur.id === baseId;
      return `
      <tr>
        <td>${cur.name}</td>
        <td>${cur.code}</td>
        <td>${isBase ? "1 (основна)" : Number(cur.rateToBase || 0).toFixed(4)}</td>
        <td data-entity="currency" data-id="${cur.id}" class="table-actions">
          <button data-action="edit">Редагувати</button>
          <button data-action="delete" class="danger"${isBase ? " disabled title=\"Основна валюта\"" : ""}>Видалити</button>
        </td>
      </tr>`;
    })
    .join("");
}

function renderIncomeSourceOptions() {
  const list = document.getElementById("income-source-options");
  const sources = [...new Set(state.income.map(i => i.source).filter(Boolean))];
  list.innerHTML = sources.map(s => `<option value="${s}">`).join("");
}

function renderLoanCounterpartyOptions() {
  const list = document.getElementById("loan-counterparty-options");
  const parties = [...new Set(state.loans.map(l => l.counterparty).filter(Boolean))];
  list.innerHTML = parties.map(p => `<option value="${p}">`).join("");
}

function resetForm(formId) {
  const form = document.getElementById(formId);
  form.reset();
  const hiddenId = form.querySelector('input[type="hidden"]');
  if (hiddenId) hiddenId.value = "";
  setDefaultDates();
}

function handleFormSubmit(formId, collectionKey, preparePayload, afterChange) {
  const form = document.getElementById(formId);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const idField = form.querySelector('input[type="hidden"]');
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    const payload = preparePayload(values, idField && idField.value);

    const collection = state[collectionKey] || [];

    if (idField && idField.value) {
      const existingIndex = collection.findIndex((entry) => entry.id === idField.value);
      const previous = existingIndex >= 0 ? collection[existingIndex] : null;
      const updated = { ...(previous || {}), ...payload, id: idField.value };
      state[collectionKey] = collection.map((entry) => (entry.id === idField.value ? updated : entry));
      if (afterChange) {
        afterChange(previous, updated, "update");
      }
    } else {
      const prefix = COLLECTION_PREFIX[collectionKey] ?? "item";
      const created = { id: uid(prefix), ...payload };
      state[collectionKey] = [...collection, created];
      if (afterChange) {
        afterChange(null, created, "create");
      }
    }

    
saveState();

let selectedMember = null;
let selectedAccount = null;
if (formId === "expense-form") {
  selectedMember = form.querySelector("#expense-member")?.value;
  selectedAccount = form.querySelector("#expense-account")?.value;
}


const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}

renderAll();

if (formId === "expense-form") {
  if (selectedMember) {
    const memberSelect = document.querySelector("#expense-member");
    if (memberSelect) memberSelect.value = selectedMember;
  }
  if (selectedAccount) {
    const accountSelect = document.querySelector("#expense-account");
    if (accountSelect) accountSelect.value = selectedAccount;
  }
}


    if (formId === "expense-form") {
      // ✅ Часткове очищення тільки для форми витрат
      const amountInput = form.querySelector("#expense-amount");
      if (amountInput) amountInput.value = "";
      if (idField) idField.value = "";
      setDefaultDates();
    } else {
      // Для інших форм — повне очищення
      form.reset();
      if (idField) idField.value = "";
      setDefaultDates();
    }

  });
}

function attachCancel(buttonId, formId) {
  const btn = document.getElementById(buttonId);
  btn.addEventListener("click", () => resetForm(formId));
}

function attachTableActions(tableId, entity, handlers) {
  document.getElementById(tableId).addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const rowCell = button.closest("[data-entity]");
    if (!rowCell) return;
    const { id } = rowCell.dataset;
    if (button.dataset.action === "edit") {
      handlers.edit(id);
    } 
else if (button.dataset.action === "repay") {
  const loan = state.loans.find(l => l.id === id);
  if (!loan) return;
  const amount = parseFloat(prompt("Введіть суму погашення:", loan.amount)) || 0;
  if (amount <= 0) return;

  const fromAcc = findAccount(loan.fromAccountId);
  const toAcc = findAccount(loan.toAccountId);

  if (loan.direction === "owe" && fromAcc) {
    fromAcc.balance -= amount;
  } else if (loan.direction === "lend" && toAcc) {
    toAcc.balance += amount;
  }

  if (amount >= loan.amount) {
    loan.amount = 0;
    loan.status = "paid";
  } else {
    loan.amount -= amount;
  }

  
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

}

    else if (button.dataset.action === "delete") {
      handlers.delete(id);
    }
  });
}


// Зберігання останньої вибраної валюти по вкладках
const LAST_CURRENCY_KEY = "last-selected-currency";
let lastSelectedCurrencyByView = JSON.parse(localStorage.getItem(LAST_CURRENCY_KEY) || "{}");

function getLastCurrency(viewId) {
  return lastSelectedCurrencyByView[viewId] || state.baseCurrencyId;
}

function setLastCurrency(viewId, currencyId) {
  lastSelectedCurrencyByView[viewId] = currencyId;
  localStorage.setItem(LAST_CURRENCY_KEY, JSON.stringify(lastSelectedCurrencyByView));
}



// Памʼять останнього вибору валюти для активної вкладки (на час роботи)
const currencyMemory = {};

function rememberCurrency(viewId, value) {
  if (value) {
    currencyMemory[viewId] = value;
  }
}

function getRememberedCurrency(viewId) {
  return currencyMemory[viewId] || state.baseCurrencyId;
}

function setDefaultCurrencyForForm(selectId, viewId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  el.value = getRememberedCurrency(viewId);
  el.addEventListener("change", () => {
    rememberCurrency(viewId, el.value);
  });
}


function renderAll() {
  setCurrencyFromMemory("account-currency", "accounts");
  setCurrencyFromMemory("expense-currency", "expenses");
  setCurrencyFromMemory("income-currency", "income");
  setCurrencyFromMemory("loan-currency", "loans");

  refreshMemberOptions();
  refreshAccountOptions();
  refreshCurrencyOptions();
  renderMembers();
  renderAccounts();
  renderExpenses();
  renderIncome();
  renderLoans();
  renderReports();
  refreshExpenseCategoryOptions();
  renderCurrencies();
  renderIncomeSourceOptions();
  renderLoanCounterpartyOptions();
  renderLoanCounterpartyFilterOptions();
  renderIncomeSourceFilterOptions();
  renderExpenseSubcategoryFilterOptions();
}

function renderLoanCounterpartyFilterOptions() {
  const el = document.getElementById("loan-counterparty-filter-options");
  if (!el) return;
  const values = [...new Set(state.loans.map(l => l.counterparty).filter(Boolean))];
  el.innerHTML = values.map(v => `<option value="${v}">`).join("");
}

function renderIncomeSourceFilterOptions() {
  const el = document.getElementById("income-source-filter-options");
  if (!el) return;
  const values = [...new Set(state.income.map(i => i.source).filter(Boolean))];
  el.innerHTML = values.map(v => `<option value="${v}">`).join("");
}

function renderExpenseSubcategoryFilterOptions() {
  const el = document.getElementById("expense-subcategory-filter-options");
  if (!el) return;
  const values = [...new Set(state.expenses.map(e => e.subcategory).filter(Boolean))];
  el.innerHTML = values.map(v => `<option value="${v}">`).join("");
}

function initNavigation() {
  document.querySelectorAll(".app-nav button").forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });
}

function initFilters() {
  const expenseControls = [
    { id: "expense-member-filter", event: "change" },
    { id: "expense-account-filter", event: "change" },
    { id: "expense-category-filter", event: "input" },
    { id: "expense-sort", event: "change" },
  ];
  expenseControls.forEach(({ id, event }) => document.getElementById(id).addEventListener(event, renderExpenses));

  const incomeControls = [
    { id: "income-member-filter", event: "change" },
    { id: "income-account-filter", event: "change" },
    { id: "income-source-filter", event: "input" },
    { id: "income-sort", event: "change" },
  ];
  incomeControls.forEach(({ id, event }) => document.getElementById(id).addEventListener(event, renderIncome));
}

function initMembers() {
  handleFormSubmit("member-form", "members", (values) => ({
    name: (values["member-name"] || "").trim(),
    role: (values["member-role"] || "").trim(),
  }));

  attachCancel("member-cancel-btn", "member-form");

  attachTableActions("members-table", "member", {
    edit: (id) => {
      const member = state.members.find((m) => m.id === id);
      if (!member) return;
      document.getElementById("member-id").value = member.id;
      document.getElementById("member-name").value = member.name;
      document.getElementById("member-role").value = member.role || "";
      setActiveView("members");
    },
    delete: (id) => {
      if (!confirm("Видалити члена сімʼї?")) return;
      state.members = state.members.filter((m) => m.id !== id);
      
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

    },
  });
}

function initAccounts() {
  handleFormSubmit("account-form", "accounts", (values) => ({
    name: (values["account-name"] || "").trim(),
    owner: values["account-owner"],
    balance: Number(values["account-balance"] || 0),
    currencyId: values["account-currency"],
    note: (values["account-note"] || "").trim(),
  }));

  attachCancel("account-cancel-btn", "account-form");

  attachTableActions("accounts-table", "account", {
    edit: (id) => {
      const account = state.accounts.find((acc) => acc.id === id);
      if (!account) return;
      document.getElementById("account-id").value = account.id;
      document.getElementById("account-name").value = account.name;
      document.getElementById("account-owner").value = account.owner;
      document.getElementById("account-balance").value = account.balance;
      if (document.getElementById("account-currency")) {
        document.getElementById("account-currency").value =
          account.currencyId || state.baseCurrencyId || getBaseCurrency().id;
      }
      document.getElementById("account-note").value = account.note || "";
      setActiveView("accounts");
    },
    delete: (id) => {
      if (!confirm("Видалити рахунок?")) return;
      state.accounts = state.accounts.filter((acc) => acc.id !== id);
      state.expenses = state.expenses.filter((expense) => expense.accountId !== id);
      state.income = state.income.filter((entry) => entry.accountId !== id);
      
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

    },
  });
}

function initExpenses() {
  handleFormSubmit(
    "expense-form",
    "expenses",
    (values) => ({
      date: values["expense-date"],
      memberId: values["expense-member"],
      accountId: values["expense-account"],
      category: (values["expense-category"] || "").trim(),
      subcategory: (values["expense-subcategory"] || "").trim(),
      description: (values["expense-description"] || "").trim(),
      amount: Number(values["expense-amount"] || 0),
      currencyId: values["expense-currency"],
    }),
    (previous, next) => {
      const applyEffect = (expense, sign) => {
        if (!expense) return;
        const acc = findAccount(expense.accountId);
        if (!acc) return;
        const delta = convertAmountBetweenCurrencies(
          Number(expense.amount || 0),
          expense.currencyId || acc.currencyId,
          acc.currencyId
        );
        acc.balance += -delta * sign;
      };
      if (previous) applyEffect(previous, -1);
      if (next) applyEffect(next, 1);
    }
);

  attachCancel("expense-cancel-btn", "expense-form");

  const categoryInput = document.getElementById("expense-category");
  if (categoryInput) {
    categoryInput.addEventListener("input", () => {
      updateExpenseSubcategoryOptions(categoryInput.value);
    });
  }

  attachTableActions("expenses-table", "expense", {
    edit: (id) => {
      const expense = state.expenses.find((item) => item.id === id);
      if (!expense) return;
      document.getElementById("expense-id").value = expense.id;
      document.getElementById("expense-date").value = expense.date;
      document.getElementById("expense-member").value = expense.memberId;
      document.getElementById("expense-account").value = expense.accountId;
      document.getElementById("expense-category").value = expense.category;
      if (document.getElementById("expense-subcategory")) {
        document.getElementById("expense-subcategory").value = expense.subcategory || "";
      }
      document.getElementById("expense-description").value = expense.description || "";
      document.getElementById("expense-amount").value = expense.amount;
      if (document.getElementById("expense-currency")) {
        document.getElementById("expense-currency").value =
          expense.currencyId ||
          findAccount(expense.accountId)?.currencyId ||
          state.baseCurrencyId ||
          getBaseCurrency().id;
      }
      setActiveView("expenses");
    },
    delete: (id) => {
      if (!confirm("Видалити витрату?")) return;
      const expense = state.expenses.find((item) => item.id === id);
      if (expense) {
        const acc = findAccount(expense.accountId);
        if (acc) {
          const delta = convertAmountBetweenCurrencies(
            Number(expense.amount || 0),
            expense.currencyId || acc.currencyId,
            acc.currencyId
          );
          acc.balance += delta; // видалення витрати повертає кошти
        }
      }
      state.expenses = state.expenses.filter((item) => item.id !== id);
      
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

    },
  });
}

function initIncome() {
  handleFormSubmit(
    "income-form",
    "income",
    (values) => ({
      date: values["income-date"],
      memberId: values["income-member"],
      accountId: values["income-account"],
      source: (values["income-source"] || "").trim(),
      description: (values["income-description"] || "").trim(),
      amount: Number(values["income-amount"] || 0),
      currencyId: values["income-currency"],
    }),
    (previous, next) => {
      const applyEffect = (entry, sign) => {
        if (!entry) return;
        const acc = findAccount(entry.accountId);
        if (!acc) return;
        const delta = convertAmountBetweenCurrencies(
          Number(entry.amount || 0),
          entry.currencyId || acc.currencyId,
          acc.currencyId
        );
        acc.balance += delta * sign;
      };
      if (previous) applyEffect(previous, -1);
      if (next) applyEffect(next, 1);
    }
  );

  attachCancel("income-cancel-btn", "income-form");

  attachTableActions("income-table", "income", {
    edit: (id) => {
      const entry = state.income.find((item) => item.id === id);
      if (!entry) return;
      document.getElementById("income-id").value = entry.id;
      document.getElementById("income-date").value = entry.date;
      document.getElementById("income-member").value = entry.memberId;
      document.getElementById("income-account").value = entry.accountId;
      document.getElementById("income-source").value = entry.source;
      document.getElementById("income-description").value = entry.description || "";
      document.getElementById("income-amount").value = entry.amount;
      if (document.getElementById("income-currency")) {
        document.getElementById("income-currency").value =
          entry.currencyId ||
          findAccount(entry.accountId)?.currencyId ||
          state.baseCurrencyId ||
          getBaseCurrency().id;
      }
      setActiveView("income");
    },
    delete: (id) => {
      if (!confirm("Видалити дохід?")) return;
      const entry = state.income.find((item) => item.id === id);
      if (entry) {
        const acc = findAccount(entry.accountId);
        if (acc) {
          const delta = convertAmountBetweenCurrencies(
            Number(entry.amount || 0),
            entry.currencyId || acc.currencyId,
            acc.currencyId
          );
          acc.balance -= delta; // видалення доходу зменшує баланс
        }
      }
      state.income = state.income.filter((item) => item.id !== id);
      
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

    },
  });
}

function applyLoanBalanceEffect(loan, sign) {
  if (!loan) return;
  const amount = Number(loan.amount || 0);
  if (!amount) return;

  if (loan.direction === "lend" && loan.fromAccountId) {
    const acc = findAccount(loan.fromAccountId);
    if (acc) {
      // Ми позичаємо комусь: гроші йдуть З рахунку (сума в валюті позики конвертується в валюту рахунку)
      const delta = convertAmountBetweenCurrencies(
        amount,
        loan.currencyId || acc.currencyId,
        acc.currencyId
      );
      acc.balance += -delta * sign;
    }
  } else if (loan.direction === "owe" && loan.toAccountId) {
    const acc = findAccount(loan.toAccountId);
    if (acc) {
      // Нам позичають: гроші заходять НА рахунок
      const delta = convertAmountBetweenCurrencies(
        amount,
        loan.currencyId || acc.currencyId,
        acc.currencyId
      );
      acc.balance += delta * sign;
    }
  }
}

function initLoans() {
  handleFormSubmit(
    "loan-form",
    "loans",
    (values) => ({
      memberId: values["loan-member"],
      counterparty: (values["loan-counterparty"] || "").trim(),
      direction: values["loan-direction"],
      amount: Number(values["loan-amount"] || 0),
      fromAccountId: values["loan-from-account"] || null,
      toAccountId: values["loan-to-account"] || null,
      currencyId: values["loan-currency"],
      date: values["loan-date"],
      status: values["loan-status"],
      note: (values["loan-note"] || "").trim(),
    }),
    (previous, next, mode) => {
      // Скасовуємо попередній вплив і застосовуємо новий
      if (previous) applyLoanBalanceEffect(previous, -1);
      if (next) applyLoanBalanceEffect(next, 1);
    }
  );

  attachCancel("loan-cancel-btn", "loan-form");

  attachTableActions("loans-table", "loan", {
    edit: (id) => {
      const loan = state.loans.find((entry) => entry.id === id);
      if (!loan) return;
      document.getElementById("loan-id").value = loan.id;
      if (document.getElementById("loan-member")) {
        document.getElementById("loan-member").value =
          loan.memberId ||
          loan.borrowerId ||
          loan.lenderId ||
          (state.members && state.members[0]?.id);
      }
      if (document.getElementById("loan-counterparty")) {
        const borrower = loan.borrowerId ? findMember(loan.borrowerId) : null;
        const lender = loan.lenderId ? findMember(loan.lenderId) : null;
        document.getElementById("loan-counterparty").value =
          loan.counterparty || lender?.name || borrower?.name || "";
      }
      if (document.getElementById("loan-direction")) {
        document.getElementById("loan-direction").value = loan.direction || "owe";
      }
      document.getElementById("loan-amount").value = loan.amount;
      if (document.getElementById("loan-from-account")) {
        document.getElementById("loan-from-account").value = loan.fromAccountId || "";
      }
      if (document.getElementById("loan-to-account")) {
        document.getElementById("loan-to-account").value = loan.toAccountId || "";
      }
      if (document.getElementById("loan-currency")) {
        document.getElementById("loan-currency").value =
          loan.currencyId || state.baseCurrencyId || getBaseCurrency().id;
      }
      document.getElementById("loan-date").value = loan.date;
      document.getElementById("loan-status").value = loan.status;
      document.getElementById("loan-note").value = loan.note || "";
      setActiveView("loans");
    },
    delete: (id) => {
      if (!confirm("Видалити позику?")) return;
      const loan = state.loans.find((entry) => entry.id === id);
      if (loan) {
        applyLoanBalanceEffect(loan, -1);
      }
      state.loans = state.loans.filter((entry) => entry.id !== id);
      
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

    },
  });
}

function initDataControls() {
  document.getElementById("reset-data-btn").addEventListener("click", () => {
    if (!confirm("Очистити всі дані та повернути демо-набір?")) return;
    state = deepClone(defaultState);
    
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

  });

  document.getElementById("export-data-btn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `home-finance-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("import-data-input").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!imported.members || !imported.accounts) {
          alert("Файл не схожий на експорт застосунку.");
          return;
        }
        state = {
          ...deepClone(defaultState),
          ...imported,
        };
        
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

        alert("Дані імпортовано.");
      } catch (error) {
        console.error(error);
        alert("Не вдалося імпортувати файл.");
      }
    };
    reader.readAsText(file);
  });
  document.getElementById("import-data-btn").addEventListener("click", () => {
  document.getElementById("import-data-input").click();
});

}


function initTransfers() {
  const form = document.getElementById("transfer-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fromId = form["transfer-from-account"].value;
    const toId = form["transfer-to-account"].value;
    const rate = Number(form["transfer-rate"].value || 1);
    const amount = Number(form["transfer-amount"].value || 0);

    if (!fromId || !toId || !amount || !rate || rate <= 0) {
      alert("Перевірте правильність заповнення полів переказу.");
      return;
    }

    if (fromId === toId) {
      alert("Переказ між однаковими рахунками не має сенсу.");
      return;
    }

    const fromAcc = findAccount(fromId);
    const toAcc = findAccount(toId);
    if (!fromAcc || !toAcc) {
      alert("Не вдалося знайти вибрані рахунки.");
      return;
    }

    if (fromAcc.balance < amount) {
      if (!confirm("На рахунку-джерелі недостатньо коштів. Все одно виконати переказ?")) {
        return;
      }
    }

    fromAcc.balance -= amount;
    toAcc.balance += amount * rate;

    
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

    form.reset();
    form["transfer-rate"].value = "1";
  });
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  ["expense-date", "income-date", "loan-date"].forEach((id) => {
    const input = document.getElementById(id);
    if (input && !input.value) input.value = today;
  });
}

function initCurrencies() {
  handleFormSubmit("currency-form", "currencies", (values) => ({
    name: (values["currency-name"] || "").trim(),
    code: (values["currency-code"] || "").trim().toUpperCase(),
    rateToBase: Number(values["currency-rate"] || 1),
  }));

  attachCancel("currency-cancel-btn", "currency-form");

  attachTableActions("currencies-table", "currency", {
    edit: (id) => {
      const currency = state.currencies.find((cur) => cur.id === id);
      if (!currency) return;
      document.getElementById("currency-id").value = currency.id;
      document.getElementById("currency-name").value = currency.name;
      document.getElementById("currency-code").value = currency.code;
      document.getElementById("currency-rate").value = currency.rateToBase;
      setActiveView("currencies");
    },
    delete: (id) => {
      if (id === state.baseCurrencyId) {
        alert("Неможливо видалити основну валюту.");
        return;
      }
      if (!confirm("Видалити валюту?")) return;
      state.currencies = state.currencies.filter((cur) => cur.id !== id);
      state.accounts = state.accounts.map((acc) => ({
        ...acc,
        currencyId: acc.currencyId === id ? state.baseCurrencyId : acc.currencyId,
      }));
      state.expenses = state.expenses.map((exp) => ({
        ...exp,
        currencyId: exp.currencyId === id ? state.baseCurrencyId : exp.currencyId,
      }));
      state.income = state.income.map((inc) => ({
        ...inc,
        currencyId: inc.currencyId === id ? state.baseCurrencyId : inc.currencyId,
      }));
      state.loans = state.loans.map((loan) => ({
        ...loan,
        currencyId: loan.currencyId === id ? state.baseCurrencyId : loan.currencyId,
      }));
      
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

    },
  });

  const baseCurrencySelect = document.getElementById("base-currency-select");
  if (baseCurrencySelect) {
    baseCurrencySelect.addEventListener("change", (event) => {
      const newBaseId = event.target.value;
      if (!newBaseId || newBaseId === state.baseCurrencyId) return;

      const oldBase = getBaseCurrency();
      const newBase = findCurrency(newBaseId);
      if (!newBase || !oldBase) return;

      const divisor = Number(newBase.rateToBase || 1);
      if (!divisor || divisor <= 0) {
        alert("Курс для обраної валюти повинен бути більше 0.");
        baseCurrencySelect.value = state.baseCurrencyId;
        return;
      }

      state.currencies = state.currencies.map((cur) => {
        if (cur.id === newBaseId) {
          return { ...cur, rateToBase: 1 };
        }
        return { ...cur, rateToBase: Number(cur.rateToBase || 1) / divisor };
      });

      state.baseCurrencyId = newBaseId;
      
saveState();
const activeView = document.querySelector(".app-nav button.active")?.dataset.view;
if (activeView) {
  const select = document.querySelector(`#${activeView.slice(0, -1)}-currency`);
  if (select) rememberCurrency(activeView, select.value);
}
renderAll();

    });
  }
}

function init() {
  initNavigation();
  initFilters();
  initMembers();
  initAccounts();
  initExpenses();
  initIncome();
  initLoans();
  initTransfers();
  initCurrencies();
  initDataControls();
  renderAll();
  setDefaultDates();
	document.getElementById("expense-subcategory-filter")?.addEventListener("input", renderExpenses);
	document.getElementById("expense-from-date")?.addEventListener("change", renderExpenses);
	document.getElementById("expense-to-date")?.addEventListener("change", renderExpenses);

	// Доходи — нові фільтри
	document.getElementById("income-from-date")?.addEventListener("change", renderIncome);
	document.getElementById("income-to-date")?.addEventListener("change", renderIncome);

	// Позики — фільтри статусу і іншої сторони
	document.getElementById("loan-status-filter")?.addEventListener("change", renderLoans);
	document.getElementById("loan-counterparty-filter")?.addEventListener("input", renderLoans);
}

document.addEventListener("DOMContentLoaded", init);

document.getElementById("generate-report-chart").addEventListener("click", () => {
  const fromDate = document.getElementById("report-from-date").value;
  const toDate = document.getElementById("report-to-date").value;
  const grouping = document.getElementById("report-grouping").value;

  if (!fromDate || !toDate) {
    alert("Оберіть дату початку та кінця");
    return;
  }

  const start = new Date(fromDate);
  const end = new Date(toDate);

  const income = state.income.filter(item => new Date(item.date) >= start && new Date(item.date) <= end);
  const expenses = state.expenses.filter(item => new Date(item.date) >= start && new Date(item.date) <= end);

  const formatKey = (date) => {
    const d = new Date(date);
    if (grouping === "day") return d.toISOString().split("T")[0];
    // if (grouping === "week") return `${d.getFullYear()}-W${Math.ceil(d.getDate() / 7)}`;

	if (grouping === "week") {
	  const date = new Date(d);
	  date.setHours(0, 0, 0, 0);

	  // ISO week: Monday = 1, Sunday = 7
	  const day = (date.getDay() + 6) % 7;
	  date.setDate(date.getDate() - day + 3);

	  const firstThursday = new Date(date.getFullYear(), 0, 4);
	  const weekNumber =
		1 +
		Math.round(
		  ((date - firstThursday) / 86400000 -
			((firstThursday.getDay() + 6) % 7) +
			3) /
			7
		);

	  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
	}


    if (grouping === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (grouping === "year") return `${d.getFullYear()}`;
  };

  const summary = {};

  [...income, ...expenses].forEach(item => {
    const key = formatKey(item.date);
    if (!summary[key]) summary[key] = { income: 0, expenses: 0 };
    if (item.source !== undefined) summary[key].income += item.amount;
    else summary[key].expenses += item.amount;
  });

  const labels = Object.keys(summary).sort();
  const incomeData = labels.map(l => summary[l].income);
  const expenseData = labels.map(l => summary[l].expenses);

  if (window.reportChart) {
    window.reportChart.destroy();
  }

  const ctx = document.getElementById("report-chart").getContext("2d");
  window.reportChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Доходи",
          data: incomeData,
          backgroundColor: "rgba(75, 192, 192, 0.6)"
        },
        {
          label: "Витрати",
          data: expenseData,
          backgroundColor: "rgba(255, 99, 132, 0.6)"
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: false
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
	// ========== Категорії витрат ==========
	const expenseByCategory = {};
	expenses.forEach(item => {
	  if (!expenseByCategory[item.category]) expenseByCategory[item.category] = 0;
	  expenseByCategory[item.category] += item.amount;
	});

	const totalExpenses = Object.values(expenseByCategory).reduce((a, b) => a + b, 0);
	const expenseTable = document.getElementById("report-period-expense-categories");
	expenseTable.innerHTML = `
	  <table>
		<thead><tr><th>Категорія</th><th>Сума</th><th>%</th></tr></thead>
		<tbody>
		  ${Object.entries(expenseByCategory)
			.sort((a, b) => b[1] - a[1])
			.map(([cat, sum]) => {
			  const percent = ((sum / totalExpenses) * 100).toFixed(1);
			  return `<tr><td>${cat}</td><td>${formatMoney(sum)}</td><td>${percent}%</td></tr>`;
			})
			.join("")}
		</tbody>
	  </table>
	`;


	// ========== Джерела доходів ==========
	const incomeBySource = {};
	income.forEach(item => {
	  if (!incomeBySource[item.source]) incomeBySource[item.source] = 0;
	  incomeBySource[item.source] += item.amount;
	});

	const totalIncome = Object.values(incomeBySource).reduce((a, b) => a + b, 0);
	const incomeTable = document.getElementById("report-period-income-sources");
	incomeTable.innerHTML = `
	  <table>
		<thead><tr><th>Джерело</th><th>Сума</th><th>%</th></tr></thead>
		<tbody>
		  ${Object.entries(incomeBySource)
			.sort((a, b) => b[1] - a[1])
			.map(([src, sum]) => {
			  const percent = ((sum / totalIncome) * 100).toFixed(1);
			  return `<tr><td>${src}</td><td>${formatMoney(sum)}</td><td>${percent}%</td></tr>`;
			})
			.join("")}
		</tbody>
	  </table>
	`;

});
