const apiKey = "901f7c87";

const searchInput = document.getElementById("searchInput");
const resultDiv = document.getElementById("result");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error");

// Support two possible collection container ids for flexibility:
const collectionDiv = document.getElementById("collectionList") || document.getElementById("collection");

// Provide a placeholder image URL if poster missing:
const PLACEHOLDER_POSTER = "https://via.placeholder.com/300x450?text=No+Poster";

let collection = JSON.parse(localStorage.getItem("movies")) || [];
collection.sort((a, b) => a.Title.localeCompare(b.Title));
renderCollection();

let searchTimeout = null; // debounce timeout
const DEBOUNCE_MS = 400;

// Errors
function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
}

function clearError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
}

// Loading
function showLoading() {
    if (!loading) return;
    loading.classList.remove("hidden");
}

function hideLoading() {
    if (!loading) return;
    loading.classList.add("hidden");
}

// Live search
if (searchInput) {
    searchInput.addEventListener("input", () => {
        const text = searchInput.value.trim();
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            if (text.length >= 2) {
                searchMovie(text);
            } else {
                if (resultDiv) {
                    resultDiv.innerHTML = "";
                    resultDiv.classList.add("hidden");
                }
                clearError();
            }
        }, DEBOUNCE_MS);
    });
}

// Search movies
async function searchMovie(query) {
    clearError();
    showLoading();
    if (resultDiv) resultDiv.classList.add("hidden");

    try {
        const resp = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(query)}&type=movie&apikey=${apiKey}`);
        const data = await resp.json();
        hideLoading();

        if (data.Response === "False" || !data.Search || data.Search.length === 0) {
            if (resultDiv) {
                resultDiv.innerHTML = "<p>No results found.</p>";
                resultDiv.classList.remove("hidden");
            }
            return;
        }

        renderSearchList(data.Search);
    } catch (e) {
        hideLoading();
        showError("Network error during search. Please try again.");
        console.error(e);
    }
}

// Render search list
function renderSearchList(list) {
    if (!resultDiv) return;
    resultDiv.innerHTML = "<h2>Search Results</h2>";
    list.sort((a, b) => a.Title.localeCompare(b.Title));

    const ul = document.createElement("div");
    ul.style.display = "block";

    list.forEach(item => {
        const row = document.createElement("div");
        row.className = "search-item";
        row.style.padding = "8px 6px";
        row.style.borderBottom = "1px solid rgba(0,0,0,0.08)";
        row.style.cursor = "pointer";
        row.innerHTML = `<strong>${escapeHtml(item.Title)}</strong> (${escapeHtml(item.Year)})`;

        row.addEventListener("click", () => {
            fetchMovieDetails(item.imdbID);
        });

        ul.appendChild(row);
    });

    resultDiv.appendChild(ul);
    resultDiv.classList.remove("hidden");
}

// Fetch movie details
async function fetchMovieDetails(imdbID) {
    clearError();
    showLoading();
    if (resultDiv) resultDiv.classList.add("hidden");

    try {
        const resp = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbID)}&plot=full&apikey=${apiKey}`);
        const movie = await resp.json();
        hideLoading();

        if (movie.Response === "False") {
            showError("Movie details not found.");
            return;
        }

        renderResult(movie);
    } catch (e) {
        hideLoading();
        showError("Network error while fetching movie details.");
        console.error(e);
    }
}

// Render full movie details
function renderResult(movie) {
    if (!resultDiv) return;

    const alreadyAdded = collection.some(m => m.imdbID === movie.imdbID);

    const imdb = movie.imdbRating && movie.imdbRating !== "N/A" ? movie.imdbRating : "N/A";
    let rotten = "N/A";
    if (Array.isArray(movie.Ratings)) {
        const rt = movie.Ratings.find(r => r.Source === "Rotten Tomatoes");
        if (rt) rotten = rt.Value;
    }

    resultDiv.innerHTML = `
        <div class="movie-card">
            <div style="display:flex; gap:16px; align-items:flex-start;">
                <div>
                    <img src="${movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER_POSTER}" alt="${escapeHtml(movie.Title)} poster" style="width:150px; border-radius:6px;">
                </div>
                <div style="flex:1;">
                    <h3>${escapeHtml(movie.Title)} (${escapeHtml(movie.Year)})</h3>
                    <p><strong>Genre:</strong> ${escapeHtml(movie.Genre || "—")}</p>
                    <p><strong>Description:</strong> ${escapeHtml(movie.Plot || "—")}</p>
                    <h4>Ratings</h4>
                    <p><strong>IMDb:</strong> ${escapeHtml(imdb)}</p>
                    <p><strong>Rotten Tomatoes:</strong> ${escapeHtml(rotten)}</p>

                    <div style="margin-top:10px;">
                        <h4>Do you own this?</h4>
                        <label style="margin-right:10px;"><input type="checkbox" id="ownDVD"> DVD</label>
                        <label style="margin-right:10px;"><input type="checkbox" id="ownBluRay"> Blu-ray</label>
                    </div>

                    <div style="margin-top:12px;">
                        <button class="button" id="addBtn" ${alreadyAdded ? "disabled" : ""}>
                            ${alreadyAdded ? "Already in collection" : "Add to collection"}
                        </button>
                        <button class="button" id="closeBtn" style="margin-left:8px;">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (alreadyAdded) {
        const existing = collection.find(m => m.imdbID === movie.imdbID);
        if (existing && existing.ownedFormats) {
            const dvdElem = document.getElementById("ownDVD");
            const blurayElem = document.getElementById("ownBluRay");
            if (dvdElem) dvdElem.checked = !!existing.ownedFormats.dvd;
            if (blurayElem) blurayElem.checked = !!existing.ownedFormats.bluray;
        }
    }

    const addBtn = document.getElementById("addBtn");
    if (addBtn) {
        if (alreadyAdded) {
            addBtn.textContent = "Already in collection";
            addBtn.disabled = true;
            addBtn.classList.add("disabled");
        } else {
            addBtn.addEventListener("click", addToCollection);
        }
    }

    const closeBtn = document.getElementById("closeBtn");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            resultDiv.innerHTML = "";
            resultDiv.classList.add("hidden");
        });
    }

    resultDiv.classList.remove("hidden");
    window.currentMovie = movie;
}

// Add movie to collection
function addToCollection() {
    const movie = window.currentMovie;
    if (!movie) {
        showError("No selected movie to add.");
        return;
    }

    if (collection.some(m => m.imdbID === movie.imdbID)) {
        showError("This movie is already in your collection.");
        const addBtn = document.getElementById("addBtn");
        if (addBtn) {
            addBtn.textContent = "Already in collection";
            addBtn.disabled = true;
            addBtn.classList.add("disabled");
        }
        return;
    }

    const ownDVD = document.getElementById("ownDVD") ? document.getElementById("ownDVD").checked : false;
    const ownBluRay = document.getElementById("ownBluRay") ? document.getElementById("ownBluRay").checked : false;

    const movieToSave = Object.assign({}, movie);
    movieToSave.ownedFormats = {
        dvd: !!ownDVD,
        bluray: !!ownBluRay
    };

    collection.push(movieToSave);
    collection.sort((a, b) => a.Title.localeCompare(b.Title));
    localStorage.setItem("movies", JSON.stringify(collection));
    renderCollection();

    if (addBtn) {
        addBtn.textContent = "Already in collection";
        addBtn.disabled = true;
        addBtn.classList.add("disabled");
    }
}

// Render collection
function renderCollection() {
    if (!collectionDiv) return;

    collectionDiv.innerHTML = "";

    if (!Array.isArray(collection) || collection.length === 0) {
        collectionDiv.innerHTML = "<p>No movies in collection.</p>";
        return;
    }

    collection.sort((a, b) => a.Title.localeCompare(b.Title));

    collection.forEach((movie, index) => {
        const item = document.createElement("div");
        item.className = "collection-poster";
        item.dataset.index = index;
        item.style.position = "relative";
        item.style.display = "inline-block";

        const img = document.createElement("img");
        img.src = movie.Poster && movie.Poster !== "N/A" ? movie.Poster : PLACEHOLDER_POSTER;
        img.alt = movie.Title;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        img.style.display = "block";

        img.addEventListener("click", () => {
            renderResult(movie);
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        tooltip.textContent = movie.Title;
        tooltip.setAttribute("aria-hidden", "true");

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-poster-btn";
        removeBtn.textContent = "×";
        removeBtn.title = "Remove from collection";
        removeBtn.style.position = "absolute";
        removeBtn.style.top = "8px";
        removeBtn.style.right = "8px";
        removeBtn.style.background = "rgba(0,0,0,0.6)";
        removeBtn.style.color = "#fff";
        removeBtn.style.border = "none";
        removeBtn.style.borderRadius = "50%";
        removeBtn.style.width = "30px";
        removeBtn.style.height = "30px";
        removeBtn.style.display = "none";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.fontSize = "18px";
        removeBtn.style.lineHeight = "26px";
        removeBtn.style.textAlign = "center";

        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeMovie(movie.imdbID);
        });

        item.addEventListener("mouseenter", () => { removeBtn.style.display = "block"; });
        item.addEventListener("mouseleave", () => { removeBtn.style.display = "none"; });

        item.appendChild(img);
        item.appendChild(tooltip);
        item.appendChild(removeBtn);

        item.setAttribute("role", "button");
        item.setAttribute("aria-label", `Open details for ${movie.Title}`);

        collectionDiv.appendChild(item);
    });
}

// Remove movie from collection
function removeMovie(imdbID) {
    collection = collection.filter(m => m.imdbID !== imdbID);
    collection.sort((a, b) => a.Title.localeCompare(b.Title));
    localStorage.setItem("movies", JSON.stringify(collection));
    renderCollection();

    if (window.currentMovie && window.currentMovie.imdbID === imdbID) {
        if (resultDiv) {
            resultDiv.innerHTML = "";
            resultDiv.classList.add("hidden");
        }
        window.currentMovie = null;
    }
}

// Escape HTML
function escapeHtml(text) {
    if (text === undefined || text === null) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
