/* =========================================================
   منصة الماس للاستشارات المالية ودراسات الأعمال
   ملف الجافاسكريبت العام
   التخزين: LocalStorage
   ========================================================= */

const STORAGE_KEY = "almas_financial_app_clients_v2";

function getClients() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveClients(clients) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function formatMoney(value, currency = "ر.ي") {
  const number = Number(value) || 0;
  return number.toLocaleString("ar-YE") + " " + currency;
}

function calculateScore(client) {
  const income = Number(client.income) || 0;
  const expenses = Number(client.expenses) || 0;
  const debt = Number(client.debt) || 0;

  if (income <= 0) return 20;

  const surplusRatio = (income - expenses) / income;
  const debtRatio = debt / income;

  let score = 65 + surplusRatio * 45 - debtRatio * 7;

  if (expenses > income) score -= 20;
  if (debt === 0) score += 8;
  if (debt > income * 6) score -= 15;

  return Math.max(10, Math.min(95, Math.round(score)));
}

function riskText(score) {
  if (score >= 80) return "جيد";
  if (score >= 50) return "يحتاج متابعة";
  return "خطر مرتفع";
}

function riskClass(score) {
  if (score >= 80) return "risk-low";
  if (score >= 50) return "risk-mid";
  return "risk-high";
}

function statusBadge(score) {
  if (score >= 80) return '<span class="status ok">مستقر</span>';
  if (score >= 50) return '<span class="status mid">متابعة</span>';
  return '<span class="status bad">طارئ</span>';
}

function getRecommendation(client) {
  const score = calculateScore(client);
  const income = Number(client.income) || 0;
  const expenses = Number(client.expenses) || 0;
  const debt = Number(client.debt) || 0;
  const net = income - expenses;

  if (score < 50) {
    return "يلزم تدخل سريع: خفض المصروفات غير الضرورية، إيقاف أي توسع، جدولة الديون، ومراجعة التسعير أو مصادر الدخل.";
  }

  if (net < income * 0.15 || debt > income * 3) {
    return "الوضع قابل للتحسين: إعداد ميزانية شهرية، رفع نسبة الفائض، تحسين التحصيل، وجدولة الالتزامات.";
  }

  return "الوضع جيد نسبياً: التركيز على بناء صندوق طوارئ، تنويع الدخل، ومتابعة شهرية للمؤشرات.";
}

function initApp() {
  const page = document.body.dataset.page;

  if (page === "dashboard") {
    renderDashboard();
  }

  if (page === "request") {
    const form = document.getElementById("requestForm");
    if (form) {
      form.addEventListener("submit", handleRequestSubmit);
    }
    toggleBusinessFields();
    updatePreview();
  }

  if (page === "services") {
    // لا يوجد إجراء إلزامي في صفحة الخدمات حالياً
  }
}

function renderDashboard() {
  const clients = getClients();

  const search = (document.getElementById("searchInput")?.value || "").trim();
  const typeFilter = document.getElementById("typeFilter")?.value || "all";

  const filtered = clients.filter(client => {
    const matchesSearch =
      !search ||
      client.name.includes(search) ||
      client.service.includes(search) ||
      client.type.includes(search);

    const matchesType = typeFilter === "all" || client.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const totalIncome = clients.reduce((sum, c) => sum + (Number(c.income) || 0), 0);
  const totalExpenses = clients.reduce((sum, c) => sum + (Number(c.expenses) || 0), 0);
  const totalDebt = clients.reduce((sum, c) => sum + (Number(c.debt) || 0), 0);
  const avgScore = clients.length
    ? Math.round(clients.reduce((sum, c) => sum + calculateScore(c), 0) / clients.length)
    : 0;

  setText("statClients", clients.length);
  setText("statIncome", formatMoney(totalIncome));
  setText("statExpenses", formatMoney(totalExpenses));
  setText("statNet", formatMoney(totalIncome - totalExpenses));
  setText("statDebt", formatMoney(totalDebt));
  setText("statScore", avgScore + "%");

  renderGeneralSummary(clients, totalIncome, totalExpenses, totalDebt, avgScore);
  renderRiskSummary(clients);
  renderClientsTable(filtered);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function renderGeneralSummary(clients, income, expenses, debt, avgScore) {
  const box = document.getElementById("generalSummary");
  if (!box) return;

  const individual = clients.filter(c => c.type === "فرد").length;
  const business = clients.filter(c => c.type === "تجاري").length;
  const net = income - expenses;

  box.innerHTML = `
    <div class="summary-item"><span>عدد ملفات الأفراد</span><strong>${individual}</strong></div>
    <div class="summary-item"><span>عدد ملفات المشاريع</span><strong>${business}</strong></div>
    <div class="summary-item"><span>صافي الفائض / العجز العام</span><strong>${formatMoney(net)}</strong></div>
    <div class="summary-item"><span>متوسط الصحة المالية</span><strong class="${riskClass(avgScore)}">${avgScore}% - ${riskText(avgScore)}</strong></div>
  `;
}

function renderRiskSummary(clients) {
  const box = document.getElementById("riskSummary");
  if (!box) return;

  const high = clients.filter(c => calculateScore(c) < 50).length;
  const mid = clients.filter(c => calculateScore(c) >= 50 && calculateScore(c) < 80).length;
  const good = clients.filter(c => calculateScore(c) >= 80).length;

  box.innerHTML = `
    <div class="summary-item"><span>ملفات خطر مرتفع</span><strong class="risk-high">${high}</strong></div>
    <div class="summary-item"><span>ملفات تحتاج متابعة</span><strong class="risk-mid">${mid}</strong></div>
    <div class="summary-item"><span>ملفات مستقرة</span><strong class="risk-low">${good}</strong></div>
    <div class="summary-item"><span>الإجراء المقترح</span><small>ابدأ بملفات الخطر المرتفع ثم ملفات الديون الكبيرة.</small></div>
  `;
}

function renderClientsTable(clients) {
  const table = document.getElementById("clientsTable");
  if (!table) return;

  if (!clients.length) {
    table.innerHTML = `
      <tr>
        <td colspan="10">لا توجد بيانات حالياً. اضغط على "تسجيل طلب جديد" أو أضف بيانات تجريبية.</td>
      </tr>
    `;
    return;
  }

  table.innerHTML = clients.map(client => {
    const score = calculateScore(client);
    const net = (Number(client.income) || 0) - (Number(client.expenses) || 0);

    return `
      <tr>
        <td>
          <strong>${escapeHtml(client.name)}</strong><br>
          <small class="muted">${escapeHtml(client.phone || "")}</small>
        </td>
        <td>${escapeHtml(client.type)}</td>
        <td>${escapeHtml(client.service)}</td>
        <td>${formatMoney(client.income, client.currency || "ر.ي")}</td>
        <td>${formatMoney(client.expenses, client.currency || "ر.ي")}</td>
        <td>${formatMoney(client.debt, client.currency || "ر.ي")}</td>
        <td>${formatMoney(net, client.currency || "ر.ي")}</td>
        <td class="${riskClass(score)}">${score}% - ${riskText(score)}</td>
        <td>${statusBadge(score)}</td>
        <td class="no-print">
          <button class="btn danger" onclick="deleteClient('${client.id}')">حذف</button>
        </td>
      </tr>
    `;
  }).join("");
}

function handleRequestSubmit(event) {
  event.preventDefault();

  const client = {
    id: String(Date.now()),
    createdAt: new Date().toISOString(),
    name: getValue("clientName"),
    type: getValue("clientType"),
    phone: getValue("clientPhone"),
    email: getValue("clientEmail"),
    service: getValue("clientService"),
    priority: getValue("clientPriority"),
    income: Number(getValue("income")) || 0,
    expenses: Number(getValue("expenses")) || 0,
    debt: Number(getValue("debt")) || 0,
    assets: Number(getValue("assets")) || 0,
    peopleCount: Number(getValue("peopleCount")) || 0,
    currency: getValue("currency"),
    businessActivity: getValue("businessActivity"),
    businessAge: getValue("businessAge"),
    branches: Number(getValue("branches")) || 0,
    hasAccounts: getValue("hasAccounts"),
    mainProblem: getValue("mainProblem"),
    documents: getValue("documents"),
    notes: getValue("notes")
  };

  if (!client.name) {
    alert("يرجى إدخال اسم العميل أو المشروع.");
    return;
  }

  const clients = getClients();
  clients.unshift(client);
  saveClients(clients);

  alert("تم حفظ الطلب بنجاح. سيتم نقلك إلى لوحة التحكم.");
  window.location.href = "index.html";
}

function getValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function toggleBusinessFields() {
  const type = getValue("clientType");
  const box = document.getElementById("businessFields");
  if (!box) return;

  if (type === "تجاري") {
    box.classList.remove("hidden");
  } else {
    box.classList.add("hidden");
  }
}

function updatePreview() {
  const box = document.getElementById("quickPreview");
  if (!box) return;

  const income = Number(getValue("income")) || 0;
  const expenses = Number(getValue("expenses")) || 0;
  const debt = Number(getValue("debt")) || 0;
  const currency = getValue("currency") || "ر.ي";

  const tempClient = { income, expenses, debt };
  const score = calculateScore(tempClient);
  const net = income - expenses;

  box.innerHTML = `
    <div class="summary-item"><span>الفائض / العجز الشهري</span><strong>${formatMoney(net, currency)}</strong></div>
    <div class="summary-item"><span>مؤشر الصحة المالية</span><strong class="${riskClass(score)}">${score}% - ${riskText(score)}</strong></div>
    <div class="summary-item"><span>التوصية السريعة</span><small>${getRecommendation(tempClient)}</small></div>
  `;
}

function deleteClient(id) {
  if (!confirm("هل تريد حذف هذا العميل؟")) return;

  const clients = getClients().filter(client => client.id !== id);
  saveClients(clients);
  renderDashboard();
}

function addDemoData() {
  const demo = [
    {
      id: "demo-1",
      createdAt: new Date().toISOString(),
      name: "عميل فردي - أسرة",
      type: "فرد",
      phone: "777000001",
      email: "",
      service: "تنظيم ميزانية شخصية",
      priority: "متوسطة",
      income: 500000,
      expenses: 390000,
      debt: 750000,
      assets: 0,
      peopleCount: 5,
      currency: "ر.ي",
      notes: "عميل يريد ضبط المصروفات وسداد الديون."
    },
    {
      id: "demo-2",
      createdAt: new Date().toISOString(),
      name: "مطعم الرافدين",
      type: "تجاري",
      phone: "777000002",
      email: "",
      service: "تشخيص مشروع تجاري",
      priority: "عاجلة",
      income: 4200000,
      expenses: 3900000,
      debt: 1800000,
      assets: 2500000,
      peopleCount: 12,
      currency: "ر.ي",
      businessActivity: "مطعم",
      businessAge: "3 سنوات",
      branches: 1,
      hasAccounts: "جزئياً",
      mainProblem: "ضعف صافي الربح",
      documents: "فواتير ومبيعات شهرية",
      notes: "المطعم يبيع جيداً لكن الربح ضعيف."
    },
    {
      id: "demo-3",
      createdAt: new Date().toISOString(),
      name: "مؤسسة مقاولات",
      type: "تجاري",
      phone: "777000003",
      email: "",
      service: "إعادة هيكلة مشروع متعثر",
      priority: "عاجلة",
      income: 8800000,
      expenses: 9700000,
      debt: 6200000,
      assets: 9000000,
      peopleCount: 24,
      currency: "ر.ي",
      businessActivity: "مقاولات",
      businessAge: "5 سنوات",
      branches: 1,
      hasAccounts: "لا",
      mainProblem: "عجز نقدي وديون",
      documents: "عقود ومطالبات",
      notes: "المشروع يحتاج خطة إنقاذ 90 يوم."
    }
  ];

  saveClients(demo);
  renderDashboard();
}

function clearAllData() {
  if (!confirm("سيتم مسح جميع البيانات المحفوظة في هذا المتصفح. هل أنت متأكد؟")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderDashboard();
}

function generateReport() {
  const clients = getClients();
  const title = document.getElementById("reportTitle")?.value || "تقرير تشخيص مالي أولي";
  const notes = document.getElementById("reportNotes")?.value || "";
  const output = document.getElementById("reportOutput");

  if (!output) return;

  if (!clients.length) {
    output.innerHTML = "<h2>لا توجد بيانات</h2><p>أضف عميلاً أولاً حتى يتم توليد التقرير.</p>";
    return;
  }

  const rows = clients.map(client => {
    const score = calculateScore(client);
    const net = (Number(client.income) || 0) - (Number(client.expenses) || 0);
    return `
      <tr>
        <td>${escapeHtml(client.name)}</td>
        <td>${escapeHtml(client.type)}</td>
        <td>${escapeHtml(client.service)}</td>
        <td>${formatMoney(client.income, client.currency || "ر.ي")}</td>
        <td>${formatMoney(client.expenses, client.currency || "ر.ي")}</td>
        <td>${formatMoney(client.debt, client.currency || "ر.ي")}</td>
        <td>${formatMoney(net, client.currency || "ر.ي")}</td>
        <td class="${riskClass(score)}">${score}% - ${riskText(score)}</td>
        <td>${getRecommendation(client)}</td>
      </tr>
    `;
  }).join("");

  output.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(notes)}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>العميل</th>
            <th>النوع</th>
            <th>الخدمة</th>
            <th>الدخل</th>
            <th>المصروفات</th>
            <th>الديون</th>
            <th>الفائض</th>
            <th>المؤشر</th>
            <th>التوصية</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="notice">
      <h3>إخلاء مسؤولية مهني</h3>
      <p>
        هذا التقرير أولي مبني على البيانات المدخلة من العميل أو المستخدم.
        لا يمثل ضماناً للربح ولا يغني عن التحقق المحاسبي والقانوني عند الحاجة.
      </p>
    </div>
  `;

  output.scrollIntoView({ behavior: "smooth" });
}

function exportData() {
  const clients = getClients();
  const blob = new Blob([JSON.stringify(clients, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "almas-financial-backup.json";
  link.click();

  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) {
        alert("ملف غير صحيح. يجب أن يحتوي على قائمة بيانات.");
        return;
      }

      saveClients(data);
      renderDashboard();
      alert("تم استيراد البيانات بنجاح.");
    } catch {
      alert("تعذر قراءة الملف. تأكد أنه ملف JSON صحيح.");
    }
  };

  reader.readAsText(file, "utf-8");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", initApp);
