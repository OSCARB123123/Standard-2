// Get saved theses
const getTheses = () =>
    JSON.parse(localStorage.getItem("theses")) || [];



function initDashboard() {
    const thesesContainer = document.getElementById("theses-container");
    const reviewContainer = document.getElementById("review-container");
    if (!thesesContainer || !reviewContainer) return;

    const theses = getTheses();

    // Theses needing review
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const thesesNeedingReview = theses.filter(t => {
        const lastReviewed = t.lastReviewed || t.date;
        return new Date(lastReviewed) <= threeMonthsAgo;
    });

    // Dashboard statistics
    const stocks = new Set(theses.map(t => t.ticker));

    const average = theses.length
        ? Math.round(
            theses.reduce((sum, t) => sum + Number(t.confidence || 0), 0)
            / theses.length
        )
        : 0;

    document.getElementById("stocks-tracked-amount").textContent = stocks.size;
    document.getElementById("theses-review-amount").textContent = thesesNeedingReview.length;
    document.getElementById("confidence-amount").textContent = `${average}%`;

    // Thesis list
    thesesContainer.innerHTML = theses.length
        ? theses.map((t, i) => `
            <li class="dashboard-stock-row">
                <a href="ThesisView.html?id=${i}"
                   style="text-decoration:none;color:inherit;">
                    <strong class="dashboard-stock-name">${t.ticker}</strong>
                </a>
            </li>
        `).join("")
        : `
            <li class="dashboard-stock-row">
                <p>
                    No theses saved yet.
                    <a href="ThesisEntryForm.html">Create one now</a>.
                </p>
            </li>
        `;

    // Review list
    const sorted = [...thesesNeedingReview].sort(
        (a, b) =>
            new Date(a.lastReviewed || a.date) -
            new Date(b.lastReviewed || b.date)
    );

    reviewContainer.innerHTML = sorted.length
        ? sorted.map(t => {
            const index = theses.indexOf(t);

            return `
                <li class="dashboard-stock-row">
                    <a href="ThesisView.html?id=${index}"
                       style="text-decoration:none;color:inherit;">
                        <strong class="dashboard-stock-name">
                            ${t.ticker}
                        </strong>
                        <span class="dashboard-review-date">
                            ${new Date(t.lastReviewed || t.date).toLocaleDateString()}
                        </span>
                    </a>
                </li>
            `;
        }).join("")
        : `
            <li class="dashboard-stock-row">
                <p>No theses needing review yet.</p>
            </li>
        `;

    // Confidence chart
    const chart = document.getElementById("confidence-chart");

    if (chart) {
        const brackets = [0, 0, 0, 0, 0];

        theses.forEach(t => {
            const confidence = Number(t.confidence || 0);
            brackets[Math.min(Math.floor(confidence / 20), 4)]++;
        });

        const labels = [
            "0–20%",
            "21–40%",
            "41–60%",
            "61–80%",
            "81–100%"
        ];

        const max = Math.max(...brackets, 1);

        chart.innerHTML = labels.map((label, i) => `
            <div class="confidence-chart-row">
                <span class="confidence-chart-label">${label}</span>

                <div class="confidence-bar-container">
                    <div
                        class="confidence-bar"
                        style="width:${brackets[i] / max * 100}%">
                    </div>

                    <span class="confidence-chart-number">
                        ${brackets[i]}
                    </span>
                </div>
            </div>
        `).join("");
    }
}


function initThesisForm() {
    const form = document.getElementById("Thesis-Form");
    if (!form) return;

    // Disclaimer
    const continueButton = document.getElementById("Continue-Button");

    if (continueButton) {
        continueButton.addEventListener("click", () => {
            document.getElementById("Disclaimer-Overlay").style.display = "none";
            document.getElementById("Disclaimer").style.display = "none";
        });
    }

    // Confidence slider
    const slider = document.getElementById("Confidence-Level");
    const value = document.getElementById("Confidence-Value");

    if (slider && value) {
        const update = () => {
            value.textContent = `${slider.value}%`;
        };

        slider.addEventListener("input", update);
        update();
    }

    // Form submission
    form.addEventListener("submit", saveThesis);
}


function saveThesis(event) {
    event.preventDefault();

    const fields = {
        date: "Thesis-Date",
        stockName: "Stock-Name-Search",
        ticker: "Stock-Ticker",
        exchange: "Stock-Exchange",
        sector: "Stock-Sector",
        entryPrice: "Entry-Price",
        targetPrice: "Target-Price",
        stopLoss: "Stop-Loss",
        positionSize: "Position-Size",
        bullCase: "Bull-Case-Reasoning",
        bearCase: "Bear-Case-Reasoning",
        confidence: "Confidence-Level",
        notes: "Thesis-Notes"
    };

    const thesis = Object.fromEntries(
        Object.entries(fields).map(
            ([key, id]) => [key, document.getElementById(id).value]
        )
    );

    // Validation
    if (!thesis.stockName || !thesis.ticker) {
        alert("Please fill in Stock Name and Ticker Symbol.");
        return;
    }

    if (!thesis.date) {
        alert("Please add a Date.");
        return;
    }

    if (!/^[A-Za-z0-9 .&'-]+$/.test(thesis.stockName)) {
        alert("Stock Name contains invalid characters.");
        return;
    }

    if (!/^[A-Za-z0-9.-]+$/.test(thesis.ticker)) {
        alert("Ticker Symbol contains invalid characters.");
        return;
    }

    // Creation date is the initial review date
    thesis.lastReviewed = thesis.date;

    // Save
    const theses = getTheses();

    theses.push(thesis);

    localStorage.setItem("theses", JSON.stringify(theses));

    alert("Thesis saved successfully!");

    window.location.href = "JournalHome.html";
}



function initThesisView() {
    if (!document.getElementById("ticker-display")) return;

    const id = Number(
        new URLSearchParams(window.location.search).get("id")
    );

    const theses = getTheses();

    if (!Number.isInteger(id) || id < 0 || id >= theses.length) {
        document.body.innerHTML = `
            <p>
                Thesis not found.
                <a href="JournalHome.html">Back to home</a>
            </p>
        `;
        return;
    }

    const thesis = theses[id];

    const fields = {
        "ticker-display": "ticker",
        "stock-name-display": "stockName",
        "detail-stock-name": "stockName",
        "detail-ticker": "ticker",
        "detail-exchange": "exchange",
        "detail-sector": "sector",
        "detail-entry-price": "entryPrice",
        "detail-target-price": "targetPrice",
        "detail-stop-loss": "stopLoss",
        "detail-position-size": "positionSize",
        "detail-bull-case": "bullCase",
        "detail-bear-case": "bearCase",
        "detail-confidence": "confidence",
        "detail-date": "date",
        "detail-notes": "notes"
    };

    Object.entries(fields).forEach(([id, property]) => {
        const element = document.getElementById(id);

        if (!element) return;

        let value = thesis[property];

        if (
            id === "detail-entry-price" ||
            id === "detail-target-price" ||
            id === "detail-stop-loss"
        ) {
            value = `$${value}`;
        } else if (id === "detail-position-size") {
            value = `${value} shares`;
        } else if (id === "detail-confidence") {
            value = `${value}%`;
        } else if (id === "detail-notes") {
            value = value || "No additional notes";
        }

        element.textContent = value;
    });
}




document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
    initThesisForm();
    initThesisView();
});


const accessibilityToggle = document.getElementById("accessibility-toggle");
const accessibilityMenu = document.getElementById("accessibility-menu");
const narratorToggle = document.getElementById("narrator-toggle");
const stopNarratorButton = document.getElementById("stop-narrator");

// Open / close accessibility menu
if (accessibilityToggle && accessibilityMenu) {
    accessibilityToggle.addEventListener("click", () => {
        const isOpen = !accessibilityMenu.hidden;

        accessibilityMenu.hidden = isOpen;

        accessibilityToggle.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );
    });
}