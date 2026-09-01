
// gets all the existing theses saved in local storage
// JSON.parse converts the JSON string back to a javascript array
// if there are no logged theses, it returns an empty string 

const getTheses = () =>
    JSON.parse(localStorage.getItem("theses")) || [];


// saves information entered in the the thesis form
// event.prevetDefault stops the browser from submitting the form
// this allows the java time to process and store the data
// after this the user is sent back to the dashboard page
function saveThesis(event) {
    event.preventDefault();

    // Validate required fields
    const date = document.getElementById("Thesis-Date").value.trim();
    const stockName = document.getElementById("Stock-Name-Search").value.trim();
    const ticker = document.getElementById("Stock-Ticker").value.trim();

    if (!date || !stockName || !ticker) {
        alert("Please fill in all required fields: Date, Stock Name, and Ticker");
        return;
    }

    // Rest of your code continues below...
    const thesis = {
        date: date,
        stockName: stockName,
        ticker: ticker,

        exchange: document.getElementById("Stock-Exchange").value,
        sector: document.getElementById("Stock-Sector").value,
        entryPrice: document.getElementById("Entry-Price").value,
        targetPrice: document.getElementById("Target-Price").value,
        stopLoss: document.getElementById("Stop-Loss").value,
        positionSize: document.getElementById("Position-Size").value,
        bullCase: document.getElementById("Bull-Case-Reasoning").value,
        bearCase: document.getElementById("Bear-Case-Reasoning").value,
        confidence: document.getElementById("Confidence-Level").value,
        notes: document.getElementById("Thesis-Notes").value,
        lastReviewed: document.getElementById("Thesis-Date").value
    };
    // adds new thesis to existing array before the data is saved
    const theses = getTheses();

    theses.push(thesis);

    localStorage.setItem(
        "theses",
        JSON.stringify(theses)
    );

    window.location.href = "JournalHome.html";
}

function initDashboard() {
    const thesesContainer = document.getElementById("theses-container");
    const reviewContainer = document.getElementById("review-container");
    if (!thesesContainer || !reviewContainer) return;

    const theses = getTheses();
    // finds all the theses that have a creation date older than three months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const thesesNeedingReview = theses.filter(t => {
        const lastReviewed = t.lastReviewed || t.date;
        return new Date(lastReviewed) <= threeMonthsAgo;
    });

    // calculates the average confidence from the confidence percentage enetered
    // in all the saved theses 
    const stocks = new Set(theses.map(t => t.ticker));
    const average = theses.length
        ? Math.round(
            theses.reduce(
                (sum, t) => sum + Number(t.confidence || 0),
                0
            ) / theses.length
        )
        : 0;

    document.getElementById("stocks-tracked-amount").textContent = stocks.size;
    document.getElementById("theses-review-amount").textContent = thesesNeedingReview.length;
    document.getElementById("confidence-amount").textContent = `${average}%`;
    

    // creates links for each saved thesis 
    thesesContainer.innerHTML = theses.length
        ? theses.map((t, i) => `
            <li class="dashboard-stock-row">
                <a href="ThesisView.html?id=${i}" style="text-decoration:none;color:inherit;">
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
    // sorts the theses in theses up for review from from oldest to newest date
    // this ensures the most urgent ones get reviewed first
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
                    <a href="ThesisView.html?id=${index}" style="text-decoration:none;color:inherit;">
                        <strong class="dashboard-stock-name">${t.ticker}</strong>
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

    const chart = document.getElementById("confidence-chart");

    if (chart) {
        const brackets = [0, 0, 0, 0, 0];

        // places each thesis into one of five confidence brackets
        // these will be displayed in the confidence chart later
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

        // scales each subsequent bar relative to the largest one
        chart.innerHTML = labels.map((label, i) => `
            <div class="confidence-chart-row">
                <span class="confidence-chart-label">${label}</span>
                <div class="confidence-bar-container">
                    <div class="confidence-bar" style="width:${brackets[i] / max * 100}%"></div>
                    <span class="confidence-chart-number">${brackets[i]}</span>
                </div>
            </div>
        `).join("");
    }
}

function initThesisForm() {
    const form = document.getElementById("Thesis-Form");
    if (!form) return;
    const continueButton = document.getElementById("Continue-Button");
    if (continueButton) {
        continueButton.addEventListener("click", () => {
            document.getElementById("Disclaimer-Overlay").style.display = "none";
            document.getElementById("Disclaimer").style.display = "none";
        });
    }
    const slider = document.getElementById("Confidence-Level");
    const value = document.getElementById("Confidence-Value");
    if (slider && value) {
        const update = () => {
            value.textContent = `${slider.value}%`;
        };
        slider.addEventListener("input", update);
        update();
    }
    // if the information that the user has entered has not been saved 
    let unsavedChanges = false;
    const dashboardButton = document.querySelector(
        'button[onclick*="JournalHome.html"]'
    );
    if (dashboardButton) {
        dashboardButton.removeAttribute("onclick");
        dashboardButton.addEventListener("click", (event) => {
            if (!unsavedChanges) {
                window.location.href = "JournalHome.html";
                return;
            }
            event.preventDefault();
            const leaveWithoutSaving = confirm(
                "You have unsaved information.\n\n" +
                "Press OK to leave without saving, " +
                "or Cancel to stay on this page."
            );
            if (leaveWithoutSaving) {
                unsavedChanges = false;
                window.location.href = "JournalHome.html";
            }
        });
    }
    form.addEventListener("input", () => {
        unsavedChanges = true;
    });
    form.addEventListener("submit", saveThesis);
}

function initThesisView() {
    if (!document.getElementById("ticker-display")) return;

    // gets the thesis ID from the URL so that the correct saved thesis can be displayed
    const id = Number(
        new URLSearchParams(window.location.search).get("id")
    );

    const theses = getTheses();
    
    // validates the ID before accessing the thesis array
    if (
        !Number.isInteger(id) ||
        id < 0 ||
        id >= theses.length
    ) {
        document.body.innerHTML = `
            <p>
                Thesis not found.
                <a href="JournalHome.html">Back to home</a>
            </p>
        `;
        return;
    }

    const thesis = theses[id];
     // maps HTML elements to corresponding properties in the thesis object
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

    Object.entries(fields).forEach(([elementId, property]) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        let value = thesis[property];

        if (
            elementId === "detail-entry-price" ||
            elementId === "detail-target-price" ||
            elementId === "detail-stop-loss"
        ) {
            value = `$${value}`;
        } else if (elementId === "detail-position-size") {
            value = `${value} shares`;
        } else if (elementId === "detail-confidence") {
            value = `${value}%`;
        } else if (elementId === "detail-notes") {
            value = value || "No additional notes";
        }

        element.textContent = value;
    });

    const editButton = document.getElementById("edit-thesis");
    const saveButton = document.getElementById("save-thesis");
    let unsavedChanges = false;

    const homeButton = document.querySelector(
        'button[onclick*="JournalHome.html"]'
    );

    if (homeButton) {
        homeButton.removeAttribute("onclick");
    }

    // replaces editable thesis elements with input sections
    editButton.addEventListener("click", () => {
        Object.entries(fields).forEach(([elementId, property]) => {
            if (
                property === "ticker" ||
                property === "stockName" ||
                property === "exchange" ||
                property === "sector"
            ) {
                return;
            }

            const element = document.getElementById(elementId);
            if (!element) return;

            
            const input = document.createElement(
                property === "bullCase" ||
                property === "bearCase" ||
                property === "notes"
                    ? "textarea"
                    : "input"
            );

            // stop these specific categories from being able to be changed
            // this ensures that users can't remove data that is 
            // crucial to identifying the thesis entry in theses storage
            if (
                property === "entryPrice" ||
                property === "targetPrice" ||
                property === "stopLoss" ||
                property === "positionSize"
            ) {
                input.type = "number";
            }

            if (property === "confidence") {
                input.type = "range";
                input.min = "0";
                input.max = "100";
                input.step = "1";
            }

            if (property === "date") {
                input.type = "date";
                input.required = true;
            }

            input.value = thesis[property] || "";
            input.dataset.property = property;
            input.id = elementId;

            input.addEventListener("input", () => {
                unsavedChanges = true;
            });

            element.replaceWith(input);
        });

        editButton.style.display = "none";
        saveButton.style.display = "block";
    });

    // updates the thesis object and saved edited information to local storage
    saveButton.addEventListener("click", () => {
        Object.entries(fields).forEach(([elementId, property]) => {
            if (
                property === "ticker" ||
                property === "stockName" ||
                property === "exchange" ||
                property === "sector"
            ) {
                return;
            }

            const input = document.getElementById(elementId);

            if (input) {
                thesis[property] = input.value;
            }
        });

        if (!thesis.date) {
            alert("Please add a date.");
            return;
        }

        theses[id] = thesis;

        localStorage.setItem(
            "theses",
            JSON.stringify(theses)
        );

        unsavedChanges = false;

        alert("Thesis updated successfully!");
        location.reload();
    });

    if (homeButton) {
        homeButton.addEventListener("click", (event) => {
            if (!unsavedChanges) {
                window.location.href = "JournalHome.html";
                return;
            }

            event.preventDefault();

            const leaveWithoutSaving = confirm(
                "You have unsaved changes.\n\n" +
                "Press OK to leave without saving, " +
                "or Cancel to stay on this page."
            );

            if (leaveWithoutSaving) {
                unsavedChanges = false;
                window.location.href = "JournalHome.html";
            }
        });
    }
}

function initAccessibility() {
    const accessibilityToggle = document.getElementById("accessibility-toggle");
    const accessibilityOverlay = document.getElementById("accessibility-overlay");
    const accessibilityClose = document.getElementById("accessibility-close");

    if (!accessibilityToggle || !accessibilityOverlay || !accessibilityClose) {
        return;
    }

    accessibilityToggle.addEventListener("click", () => {
        accessibilityOverlay.hidden = false;
        accessibilityToggle.setAttribute("aria-expanded", "true");
    });

    accessibilityClose.addEventListener("click", () => {
        accessibilityOverlay.hidden = true;
        accessibilityToggle.setAttribute("aria-expanded", "false");
    });

    const textSizeSlider = document.getElementById("text-size-slider");
    const textSizeValue = document.getElementById("text-size-value");

    if (textSizeSlider && textSizeValue) {
        const savedTextSize = localStorage.getItem("textSize") || "100";
        textSizeSlider.value = savedTextSize;
        textSizeValue.textContent = `${savedTextSize}%`;

        const textElements = document.querySelectorAll(
            "h1, h2, h3, h4, h5, h6, p, a, button, label, span, li, legend, input, textarea, select"
        );

        textElements.forEach(element => {
            element.dataset.originalFontSize =
                window.getComputedStyle(element).fontSize;
        });

        const applyTextSize = () => {
            const scale = Number(textSizeSlider.value) / 100;

            textSizeValue.textContent = `${textSizeSlider.value}%`;

            localStorage.setItem("textSize", textSizeSlider.value);

            textElements.forEach(element => {
                const originalSize = parseFloat(
                    element.dataset.originalFontSize
                );

                element.style.fontSize = `${originalSize * scale}px`;
            });
        };

        textSizeSlider.addEventListener("input", applyTextSize);
        applyTextSize();
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initDashboard();
    initThesisForm();
    initThesisView();
    initAccessibility();
});