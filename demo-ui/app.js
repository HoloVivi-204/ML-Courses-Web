const params = new URLSearchParams(window.location.search);
const view = params.get("view") || "home";
if (params.has("capture")) document.documentElement.classList.add("capture");
const templates = {
  home: "home-template",
  dashboard: "dashboard-template",
  labs: "labs-template",
  lesson: "lesson-template",
  playground: "playground-template",
  profile: "profile-template"
};

const selected = templates[view] || templates.home;
document.getElementById("app").appendChild(
  document.getElementById(selected).content.cloneNode(true)
);

const relatedViews = {
  lesson: "dashboard",
  playground: "labs",
  profile: "dashboard"
};

document.querySelectorAll(".main-nav a").forEach((link) => {
  const target = new URL(link.href).searchParams.get("view");
  link.classList.toggle("active", target === view || target === relatedViews[view]);
});

const topActions = document.querySelector(".top-actions");
if (view === "home") {
  topActions.classList.add("public-actions");
  topActions.innerHTML = `
    <button class="utility-btn" aria-label="Đổi giao diện">☼</button>
    <button class="language-btn">VI <span>⌄</span></button>
    <a class="login-link" href="?view=dashboard">Đăng nhập</a>
    <a class="register-btn" href="?view=dashboard">Đăng ký</a>
  `;
} else {
  topActions.insertAdjacentHTML("afterbegin", `
    <button class="utility-btn" aria-label="Đổi giao diện">☼</button>
    <button class="language-btn">VI <span>⌄</span></button>
  `);
}

if (["labs", "playground"].includes(view)) {
  document.querySelector(".search-box input").placeholder = "Tìm bài toán, thuật toán...";
}

document.querySelectorAll('input[type="range"]').forEach((range) => {
  range.addEventListener("input", () => {
    const output = range.closest(".range-field")?.querySelector("output");
    if (!output) return;
    output.textContent = output.textContent.includes(".")
      ? (Number(range.value) / 880).toFixed(2)
      : String(Math.round(50 + Number(range.value) * 3.2));
  });
});
