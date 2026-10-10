/**
 * Comportamentos da página (carregado com `defer`, o DOM já está pronto).
 *  1. Menu mobile acessível
 *  2. Cabeçalho ao rolar
 *  3. Link ativo na navegação
 *  4. Animação de entrada na rolagem (reveal + cascata)
 *  5. Spotlight que segue o cursor nos cards da stack
 *  6. Linha do tempo que se preenche conforme a rolagem
 *  7. Durações e progresso calculados a partir das datas
 *  8. Ano no rodapé
 *  9. Certificações: filtro por categoria e "Mostrar todas"
 */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 1. Menu mobile -------------------------------------------------------------
const navToggle = document.getElementById("nav-toggle");
const siteNav = document.getElementById("site-nav");

function setMenu(open) {
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    siteNav.classList.toggle("is-open", open);
}

navToggle.addEventListener("click", () => {
    setMenu(navToggle.getAttribute("aria-expanded") !== "true");
});

siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
        setMenu(false);
        navToggle.focus();
    }
});

// 2 e 6. Rolagem: cabeçalho + linha do tempo ---------------------------------
const header = document.getElementById("site-header");
const timeline = document.getElementById("timeline");

function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);

    if (timeline) {
        // A linha acompanha um ponto a 60% da altura da janela
        const rect = timeline.getBoundingClientRect();
        const progress = (window.innerHeight * 0.6 - rect.top) / rect.height;
        timeline.style.setProperty("--progress", `${Math.min(Math.max(progress, 0), 1) * 100}%`);
    }
}

let ticking = false;
window.addEventListener(
    "scroll",
    () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            onScroll();
            ticking = false;
        });
    },
    { passive: true }
);
onScroll();

// 3. Link ativo na navegação -------------------------------------------------
const navLinks = new Map(
    [...siteNav.querySelectorAll('a[href^="#"]')].map((link) => [link.hash.slice(1), link])
);

const sectionObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((link) => link.classList.remove("is-active"));
            navLinks.get(entry.target.id)?.classList.add("is-active");
        });
    },
    { rootMargin: "-45% 0px -50% 0px" }
);

navLinks.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
});

// 4. Reveal na rolagem -------------------------------------------------------
// Em grupos [data-stagger], cada filho recebe um atraso crescente (efeito cascata).
document.querySelectorAll("[data-stagger]").forEach((group) => {
    group.querySelectorAll(":scope > [data-reveal]").forEach((el, i) => {
        // Limita o atraso para listas longas não demorarem a aparecer
        el.style.setProperty("--d", `${Math.min(i, 8) * 90}ms`);
    });
});

const revealEls = document.querySelectorAll("[data-reveal]");

if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
}

// 5. Spotlight nos cards -----------------------------------------------------
document.querySelectorAll(".spotlight").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    });
});

// 7. Datas ---------------------------------------------------------------------
const today = new Date();
const parseMonth = (value) => {
    const [year, month] = value.split("-").map(Number);
    return { year, month };
};
const current = { year: today.getFullYear(), month: today.getMonth() + 1 };

/** Meses entre duas datas AAAA-MM, contando o mês inicial e o final. */
function monthsBetween(start, end) {
    return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

function formatDuration(totalMonths) {
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    const y = years ? `${years} ${years === 1 ? "ano" : "anos"}` : "";
    const m = months ? `${months} ${months === 1 ? "mês" : "meses"}` : "";
    return [y, m].filter(Boolean).join(" e ");
}

// Duração de cada cargo (cargos sem data-end contam até hoje)
document.querySelectorAll(".role-meta [data-start]").forEach((el) => {
    const start = parseMonth(el.dataset.start);
    const end = el.dataset.end ? parseMonth(el.dataset.end) : current;
    const text = el.querySelector(".duration-text");
    if (text) text.textContent = formatDuration(monthsBetween(start, end));
});

// "X+ anos em TI"
document.querySelectorAll("[data-years-since]").forEach((el) => {
    const years = Math.floor(monthsBetween(parseMonth(el.dataset.yearsSince), current) / 12);
    if (years > 0) el.textContent = `${years}+`;
});

// Progresso dos cursos em andamento
document.querySelectorAll(".edu-progress[data-start][data-end]").forEach((el) => {
    const start = parseMonth(el.dataset.start);
    const end = parseMonth(el.dataset.end);
    const ratio = monthsBetween(start, current) / monthsBetween(start, end);
    const percent = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
    el.querySelector(".edu-progress-fill")?.style.setProperty("--p", `${percent}%`);
});

// 9. Certificações: contagem, filtro por categoria e "Mostrar todas" ---------
const certList = document.getElementById("cert-list");

if (certList) {
    const certs = [...certList.children];
    const filterButtons = document.querySelectorAll("[data-filter]");
    const moreButton = document.getElementById("cert-more");
    const LIMIT = 9;
    let activeFilter = "all";
    let expanded = false;

    const matches = (cert) => activeFilter === "all" || cert.dataset.cat === activeFilter;

    // Contagem de cada categoria nos botões do filtro
    document.querySelectorAll("[data-count]").forEach((el) => {
        const key = el.dataset.count;
        el.textContent = key === "all" ? certs.length : certs.filter((c) => c.dataset.cat === key).length;
    });

    function renderCerts() {
        const visible = certs.filter(matches);
        certs.forEach((cert) => (cert.hidden = true));
        visible.forEach((cert, i) => (cert.hidden = !expanded && i >= LIMIT));

        moreButton.hidden = visible.length <= LIMIT;
        moreButton.setAttribute("aria-expanded", String(expanded));
        moreButton.textContent = expanded ? "Mostrar menos" : `Mostrar todas (${visible.length})`;
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            activeFilter = button.dataset.filter;
            expanded = false;
            filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
            renderCerts();
        });
    });

    moreButton.addEventListener("click", () => {
        expanded = !expanded;
        renderCerts();
        // Ao recolher, volta o início da seção para a tela
        if (!expanded) document.getElementById("certs").scrollIntoView({ block: "start" });
    });

    renderCerts();
}

// 8. Ano no rodapé -----------------------------------------------------------
document.getElementById("year").textContent = today.getFullYear();
