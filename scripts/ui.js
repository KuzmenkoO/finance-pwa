function adjustAccountsTransferPlacement() {
  const accounts = document.getElementById("accounts");
  if (!accounts) return;
  const transferForm = document.getElementById("transfer-form");
  if (!transferForm) return;
  const transferCard = transferForm.closest(".card");
  const tableScroll = accounts.querySelector(".table-scroll-container");
  const firstCard = accounts.querySelector(".card");
  const mobile = window.innerWidth <= 768;
  if (mobile) {
    if (tableScroll && transferCard && transferCard.parentNode !== tableScroll) {
      tableScroll.appendChild(transferCard);
    }
  } else {
    if (firstCard && transferCard && transferCard.parentNode !== accounts) {
      firstCard.parentNode.insertBefore(transferCard, firstCard.nextSibling);
    }
  }
  adjustAccountsHeights();
}

function adjustAccountsHeights() {
  const accounts = document.getElementById("accounts");
  if (!accounts) return;
  const card = accounts.querySelector(".card");
  const tableScroll = accounts.querySelector(".table-scroll-container");
  const controls = accounts.querySelector(".account-controls-scroll");
  if (!card || !tableScroll) return;

  const mobile = window.innerWidth <= 768;
  if (!mobile) {
    tableScroll.style.maxHeight = "";
    return;
  }

  const cardTop = card.getBoundingClientRect().top;
  const headerH = card.querySelector("h2")?.getBoundingClientRect().height || 0;
  const controlsH = controls ? controls.getBoundingClientRect().height : 0;
  const padding = 24;
  const available = Math.max(120, window.innerHeight - cardTop - headerH - controlsH - padding);
  tableScroll.style.maxHeight = available + "px";
}

function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

window.addEventListener("resize", debounce(adjustAccountsTransferPlacement, 120));
document.addEventListener("DOMContentLoaded", () => setTimeout(adjustAccountsTransferPlacement, 50));

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

	if (grouping === "week") {
	  const date = new Date(d);
	  date.setHours(0, 0, 0, 0);

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
