(() => {
  const LS_KEY = "reports";

  const tabButtons = document.querySelectorAll(".tab-btn");
  const panels = {
    "tab-input": document.getElementById("tab-input"),
    "tab-analysis": document.getElementById("tab-analysis"),
    "tab-reports": document.getElementById("tab-reports"),
  };

  function showTab(tabId) {
    tabButtons.forEach((b) => b.classList.remove("active"));
    Object.values(panels).forEach((p) => p.classList.remove("active"));

    const btn = [...tabButtons].find((x) => x.dataset.tab === tabId);
    if (btn) btn.classList.add("active");
    if (panels[tabId]) panels[tabId].classList.add("active");

    if (tabId === "tab-analysis") renderAnalysis();
    if (tabId === "tab-reports") renderReports();
  }

  tabButtons.forEach((btn) =>
    btn.addEventListener("click", () => showTab(btn.dataset.tab)),
  );

  const form = document.getElementById("reportForm");
  const placeEl = document.getElementById("place");
  const typeEl = document.getElementById("problemType");
  const levelEl = document.getElementById("level");
  const dateEl = document.getElementById("date");
  const commentEl = document.getElementById("comment");

  const tableBody = document.getElementById("tableBody");

  const countEl = document.getElementById("count");
  const avgEl = document.getElementById("avg");
  const recEl = document.getElementById("recommendations");

  const filterTypeEl = document.getElementById("filterType");
  const filterLevelEl = document.getElementById("filterLevel");

  const toastWrap = document.createElement("div");
  toastWrap.className = "toast-wrap";
  document.body.appendChild(toastWrap);

  function toast(text, type = "ok") {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = text;
    toastWrap.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(-6px)";
      t.style.transition = "opacity .2s ease, transform .2s ease";
      setTimeout(() => t.remove(), 220);
    }, 1600);
  }

  let reports = safeLoad();

  function safeLoad() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(reports));
  }

  function uuid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return String(Date.now()) + "_" + Math.random().toString(16).slice(2);
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function bucket(level) {
    if (level >= 67) return "high";
    if (level >= 34) return "mid";
    return "low";
  }
  function levelClass(level) {
    const b = bucket(level);
    if (b === "high") return "lvl-high";
    if (b === "mid") return "lvl-mid";
    return "lvl-low";
  }

  function avgClass(avg) {
    if (avg >= 67) return "bad";
    if (avg >= 34) return "warn";
    return "ok";
  }

  function animateNumber(el, from, to, ms = 220) {
    const start = performance.now();
    const diff = to - from;

    function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      const val = from + diff * t;
      el.textContent = (Math.round(val * 10) / 10).toFixed(1);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function renderAnalysis() {
    countEl.textContent = String(reports.length);

    if (reports.length === 0) {
      avgEl.classList.remove("ok", "warn", "bad");
      avgEl.classList.add("ok");
      animateNumber(avgEl, Number(avgEl.textContent) || 0, 0);
      recEl.innerHTML = "";
      return;
    }

    const avg = reports.reduce((sum, r) => sum + r.level, 0) / reports.length;

    avgEl.classList.remove("ok", "warn", "bad");
    avgEl.classList.add(avgClass(avg));

    animateNumber(avgEl, Number(avgEl.textContent) || 0, avg, 250);

    recEl.innerHTML = "";
    if (avg >= 67) {
      recEl.innerHTML =
        "<li>Очень высокий уровень загрязнения. Рекомендуются меры по снижению загрязнения.</li>";
    } else if (avg >= 34) {
      recEl.innerHTML =
        "<li>Средний уровень загрязнения. Рекомендуется наблюдение.</li>";
    } else {
      recEl.innerHTML = "<li>Низкий уровень загрязнения.</li>";
    }
  }

  function filtered() {
    const typeF = filterTypeEl.value;
    const lvlF = filterLevelEl.value;

    return reports.filter((r) => {
      const okType = typeF === "Все" ? true : r.type === typeF;
      const okLvl = lvlF === "Все" ? true : bucket(r.level) === lvlF;
      return okType && okLvl;
    });
  }

  function renderReports(highlightId = null) {
    const list = filtered();
    tableBody.innerHTML = "";

    for (const r of list) {
      const tr = document.createElement("tr");
      tr.dataset.id = r.id;

      tr.innerHTML = `
        <td>${escapeHtml(r.place)}</td>
        <td>${escapeHtml(r.type)}</td>
        <td class="${levelClass(r.level)}">${r.level}</td>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.comment || "")}</td>
        <td><button class="delete-btn" data-id="${r.id}">Удалить</button></td>
      `;

      if (highlightId && r.id === highlightId) {
        tr.classList.add("row-enter");
        tableBody.appendChild(tr);
        requestAnimationFrame(() => tr.classList.add("active"));
      } else {
        tableBody.appendChild(tr);
      }
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const level = Number(levelEl.value);

    if (!Number.isFinite(level) || level < 1 || level > 100) {
      toast("Уровень должен быть от 1 до 100", "warn");
      return;
    }
    if (!placeEl.value) {
      toast("Выбери район", "warn");
      return;
    }
    if (!typeEl.value) {
      toast("Выбери тип проблемы", "warn");
      return;
    }
    if (!dateEl.value) {
      toast("Выбери дату", "warn");
      return;
    }

    const report = {
      id: uuid(),
      place: placeEl.value,
      type: typeEl.value,
      level,
      date: dateEl.value,
      comment: commentEl.value.trim(),
      createdAt: Date.now(),
    };

    reports.push(report);
    save();

    renderAnalysis();

    const reportsActive = panels["tab-reports"].classList.contains("active");
    if (reportsActive) renderReports(report.id);

    form.reset();

    const t = level >= 67 ? "bad" : level >= 34 ? "warn" : "ok";
    toast(
      `Сохранено: ${report.place}, ${report.type}, уровень ${report.level}`,
      t,
    );
  });

  filterTypeEl.addEventListener("change", () => renderReports());
  filterLevelEl.addEventListener("change", () => renderReports());

  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;

    const id = btn.dataset.id;
    const tr = tableBody.querySelector(`tr[data-id="${id}"]`);

    const removeById = () => {
      reports = reports.filter((r) => r.id !== id);
      save();
      renderAnalysis();
      renderReports();
      toast("Запись удалена", "ok");
    };

    if (tr) {
      tr.classList.add("row-exit");
      requestAnimationFrame(() => tr.classList.add("active"));
      tr.addEventListener("transitionend", removeById, { once: true });
    } else {
      removeById();
    }
  });

  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");

  let w = 0,
    h = 0;
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  const particles = [];
  const COUNT = 90;

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.6 + 0.9,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
    });
  }

  function animateBg() {
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "rgba(100, 255, 180, 0.55)";
    ctx.strokeStyle = "rgba(100, 255, 180, 0.12)";

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animateBg);
  }
  animateBg();

  renderAnalysis();
  renderReports();
})();
