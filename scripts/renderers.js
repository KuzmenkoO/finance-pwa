function renderMembers() {
  const tbody = document.getElementById("members-table");
  tbody.innerHTML = state.members
    .map(
      (member) => `
      <tr>
        <td data-label="Ім'я">${member.name}</td>
        <td data-label="Роль">${member.role || "—"}</td>
        <td data-label="Дії" data-entity="member" data-id="${member.id}" class="table-actions">
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
        <td data-label="Назва">${account.name}</td>
        <td data-label="Власник">${owner?.name ?? "Невідомо"}</td>
        <td data-label="Валюта">${currency.code}</td>
        <td data-label="Баланс">${formatMoney(account.balance, currency.code)}</td>
        <td data-label="Замітки">${account.note || "—"}</td>
        <td data-label="Дії" data-entity="account" data-id="${account.id}" class="table-actions">
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
    		<td data-label="Рахунок">${getAccountLabel(account)}</td>
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
          <td data-label="Дата">${item.date}</td>
          <td data-label="Джерело">${item.source}</td>
          <td data-label="Член">${member?.name ?? "Невідомо"}</td>
          <td data-label="Рахунок">${getAccountLabel(account)}</td>
          <td data-label="Опис">${item.description || "—"}</td>
          <td data-label="Валюта">${currency.code}</td>
          <td data-label="Сума">${formatMoney(item.amount, currency.code)}</td>
          <td data-label="Дії" data-entity="income" data-id="${item.id}" class="table-actions">
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
        <td data-label="Дата">${loan.date}</td>
        <td data-label="Член">${member?.name ?? "Невідомо"}</td>
        <td data-label="Інша сторона">${counterpartyName || "—"}</td>
        <td data-label="З рахунку">${fromAccount?.name || "—"}</td>
        <td data-label="На рахунок">${toAccount?.name || "—"}</td>
        <td data-label="Сума">${formatMoney(loan.amount, currency.code)}</td>
        <td data-label="Тип">${directionLabel}</td>
        <td data-label="Статус">${loan.status === "active" ? "Активна" : loan.status === "paid" ? "Повернена" : "Надана"}</td>
        <td data-label="Нотатка">${loan.note || "—"}</td>
        <td data-label="Дії" data-entity="loan" data-id="${loan.id}" class="table-actions">
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
  const totalBalance = getMainAccounts().reduce(
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

  const memberBalances = {};
  const accountsForSummary = [];
  getMainAccounts().forEach((account) => {
    const children = getAccountChildren(account.id);
    if (children.length) {
      accountsForSummary.push(...children);
    } else {
      accountsForSummary.push(account);
    }
  });

  accountsForSummary.forEach((account) => {
    const ownerId = account.owner || SHARED_OWNER_ID;
    if (!memberBalances[ownerId]) memberBalances[ownerId] = 0;
    memberBalances[ownerId] += convertToBase(account.balance || 0, account.currencyId);
  });

  const memberList = document.getElementById("report-members");
  memberList.innerHTML = Object.entries(memberBalances)
    .map(([memberId, amount]) => {
      const member =
        memberId === SHARED_OWNER_ID ? findMember(SHARED_OWNER_ID) : findMember(memberId);
      const name = member?.name || "�������";
      return `<li>${name} :&nbsp; ${formatMoney(amount, baseCurrency.code)}</li>`;
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
  tbody.innerHTML = state.currencies
    .map(
      (cur) => `
      <tr>
        <td data-label="Назва">${cur.name}</td>
        <td data-label="Код">${cur.code}</td>
        <td data-label="Курс до базової">${cur.rateToBase}</td>
        <td data-label="Дії" data-entity="currency" data-id="${cur.id}" class="table-actions">
          ${
            cur.id === baseId
              ? '<span class="badge base-currency">Основна</span>'
              : '<button data-action="edit">Редагувати</button><button data-action="delete" class="danger">Видалити</button>'
          }
        </td>
      </tr>`
    )
    .join("");
}

function renderIncomeSourceOptions() {
  const list = document.getElementById("income-source-options");
  if (!list) return;
  const sources = [...new Set(state.income.map(i => i.source).filter(Boolean))];
  list.innerHTML = sources.map(s => `<option value="${s}">`).join("");
}

function renderLoanCounterpartyOptions() {
  const list = document.getElementById("loan-counterparty-options");
  const parties = [...new Set(state.loans.map(l => l.counterparty).filter(Boolean))];
  list.innerHTML = parties.map(p => `<option value="${p}">`).join("");
}

function isAccountExpanded(accountId) {
  if (accountExpandedState[accountId] === undefined) {
    accountExpandedState[accountId] = true;
  }
  return accountExpandedState[accountId];
}

function renderAccounts() {
  const tbody = document.getElementById("accounts-table");
  const rows = [];

  const mainAccounts = getMainAccounts();
  mainAccounts.forEach((account) => {
    const children = getAccountChildren(account.id);
    const expanded = children.length ? isAccountExpanded(account.id) : false;
    rows.push(renderAccountRow(account, false, children.length, expanded));
    if (expanded) {
      children.forEach((child) => {
        rows.push(renderAccountRow(child, true));
      });
    }
  });

  tbody.innerHTML = rows.join("");
}

function renderAccountRow(account, isSubaccount, childCount = 0, isExpanded = false) {
  const owner = findMember(account.owner);
  const currency = findCurrency(account.currencyId) || getBaseCurrency();
  const hasChildren = !isSubaccount && childCount > 0;
  const rowClass = [
    isSubaccount ? "subaccount-row" : "",
    hasChildren ? "account-parent-row" : "",
    hasChildren && !isExpanded ? "account-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const actions = isSubaccount
    ? `
        <button data-action="edit">Редагувати</button>
        <button data-action="delete-subaccount" class="danger">-</button>
      `
    : `
        <button data-action="edit">Редагувати</button>
        <button data-action="add-subaccount" class="ghost">+</button>
        <button data-action="delete" class="danger">Видалити</button>
      `;

  const nameCell = hasChildren
    ? `
        <td data-label="Назва" class="account-name-cell" data-account-toggle="true">
          <span class="account-name-wrap">${account.name} <span class="account-children-count">(${childCount})</span></span>
        </td>
      `
    : `
        <td data-label="Назва"><span class="account-name-wrap">${account.name}</span></td>
      `;

  return `
      <tr class="${rowClass}" data-account-id="${account.id}">
        ${nameCell}
        <td data-label="Власник">${owner?.name ?? "Невідомо"}</td>
        <td data-label="Валюта">${currency.code}</td>
        <td data-label="Баланс">${formatMoney(account.balance, currency.code)}</td>
        <td data-label="Замітки">${account.note || "—"}</td>
        <td data-label="Дії" data-entity="account" data-id="${account.id}" class="table-actions">
          ${actions}
        </td>
      </tr>`;
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



