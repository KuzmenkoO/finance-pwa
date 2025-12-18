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
      const amountInput = form.querySelector("#expense-amount");
      if (amountInput) amountInput.value = "";
      if (idField) idField.value = "";
      setDefaultDates();
    } else {
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
    if (!button.dataset.action) return;

    const row = button.closest("td");
    const id = row.dataset.id;
    if (!id) return;

    if (button.dataset.action === "edit") {
      handlers.edit(id);
    } else if (button.dataset.action === "repay") {
      const loan = state.loans.find((l) => l.id === id);
      if (!loan) return;
      const amount = Number(prompt("Сума погашення", loan.amount) || 0);
      if (!amount || amount <= 0) {
        alert("Некоректна сума");
        return;
      }
      if (loan.direction === "owe") {
        const toAcc = loan.toAccountId ? findAccount(loan.toAccountId) : null;
        if (toAcc && toAcc.balance < amount) {
          alert("На рахунку недостатньо коштів для погашення");
          return;
        }
      }

      if (loan.direction === "owe" && loan.toAccountId) {
        const toAcc = findAccount(loan.toAccountId);
        if (toAcc) {
          const delta = convertAmountBetweenCurrencies(
            amount,
            loan.currencyId || toAcc.currencyId,
            toAcc.currencyId
          );
          toAcc.balance -= delta;
        }
      }

      if (loan.direction === "lend" && loan.fromAccountId) {
        const toAcc = findAccount(loan.fromAccountId);
        if (toAcc) {
          const delta = convertAmountBetweenCurrencies(
            amount,
            loan.currencyId || toAcc.currencyId,
            toAcc.currencyId
          );
          toAcc.balance += delta;
        }
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
          acc.balance += delta;
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
          acc.balance -= delta;
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
