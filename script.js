document.addEventListener('DOMContentLoaded', () => {
    // Elements for index.html
    const categoryInput = document.getElementById('categoryInput');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const categoryList = document.getElementById('categoryList');
    const currentCategoryTitle = document.getElementById('currentCategoryTitle');
    const noteInput = document.getElementById('noteInput');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const notesList = document.getElementById('notesList');
    const currentMonthYearSpan = document.getElementById('currentMonthYear');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const calendarGrid = document.getElementById('calendarGrid');

    // Elements for archive.html
    const archivedNotesList = document.getElementById('archivedNotesList');
    const noArchivedNotesMessage = document.getElementById('noArchivedNotesMessage');

    // Structure: { categoryName: [ { content, timestamp, isFavorite: boolean, isPinned: boolean, isArchived: boolean }, ... ] }
    let allNotes = JSON.parse(localStorage.getItem('allNotes')) || { "Все заметки": [] };
    let currentCategory = "Все заметки"; // Default category on index.html

    function saveAllNotes() {
        localStorage.setItem('allNotes', JSON.stringify(allNotes));
    }

    function renderCategories() {
        if (!categoryList) return; // Exit if not on index.html

        categoryList.innerHTML = '';
        let categories = Object.keys(allNotes);

        // Ensure "Все заметки" is always the first category
        if (!categories.includes("Все заметки")) {
            allNotes["Все заметки"] = [];
            categories.unshift("Все заметки");
        } else {
            const allNotesIndex = categories.indexOf("Все заметки");
            if (allNotesIndex > -1) {
                const [allNotesEntry] = categories.splice(allNotesIndex, 1);
                categories.unshift(allNotesEntry);
            }
        }

        categories.forEach(categoryName => {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('category-item');
            if (categoryName === currentCategory) {
                categoryItem.classList.add('active');
            }
            categoryItem.dataset.category = categoryName;

            const categoryText = document.createElement('span');
            categoryText.textContent = categoryName;
            categoryItem.appendChild(categoryText);

            if (categoryName !== "Все заметки") {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Удалить';
                deleteButton.dataset.categoryToDelete = categoryName;
                categoryItem.appendChild(deleteButton);
            }

            categoryList.appendChild(categoryItem);
        });
    }

    function renderNotes() {
        // This function is for the main index.html page
        if (!notesList) return; // Exit if not on the main notes page

        notesList.innerHTML = '';
        currentCategoryTitle.textContent = currentCategory;
        // Filter out archived notes for the main view
        let notes = (allNotes[currentCategory] || []).filter(note => !note.isArchived);

        if (notes.length === 0) {
            notesList.innerHTML = '<p>В этой категории пока нет заметок.</p>';
            return;
        }

        notes.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        notes.forEach(note => {
            // Find the original index in the unfiltered array to correctly update 'allNotes'
            const originalIndex = allNotes[currentCategory].findIndex(n => n === note);

            const noteItem = document.createElement('div');
            noteItem.classList.add('note-item');
            if (note.isPinned) {
                noteItem.classList.add('pinned');
            }
            if (note.isFavorite) {
                noteItem.classList.add('favorite');
            }

            noteItem.innerHTML = `
                <div>
                    <div class="note-content">${note.content}</div>
                    <span class="note-date">${new Date(note.timestamp).toLocaleString('ru-RU')}</span>
                </div>
                <div class="note-actions">
                    <button class="action-btn favorite-btn ${note.isFavorite ? 'active' : ''}" data-action="favorite" data-category="${currentCategory}" data-original-index="${originalIndex}">★</button>
                    <button class="action-btn pin-btn ${note.isPinned ? 'active' : ''}" data-action="pin" data-category="${currentCategory}" data-original-index="${originalIndex}">📌</button>
                    <button class="action-btn archive-btn" data-action="archive" data-category="${currentCategory}" data-original-index="${originalIndex}">Архивировать</button>
                    <button class="action-btn delete-btn" data-action="delete" data-category="${currentCategory}" data-original-index="${originalIndex}">Удалить</button>
                </div>
            `;
            notesList.appendChild(noteItem);
        });
    }

    function renderArchivedNotes() {
        // This function is for the archive.html page
        if (!archivedNotesList) return; // Exit if not on the archive page

        archivedNotesList.innerHTML = '';
        let hasArchivedNotes = false;

        Object.keys(allNotes).forEach(categoryName => {
            const archivedNotesInCategory = (allNotes[categoryName] || []).filter(note => note.isArchived);

            if (archivedNotesInCategory.length > 0) {
                hasArchivedNotes = true;
                const categoryHeader = document.createElement('h3');
                categoryHeader.textContent = `Категория: ${categoryName}`;
                categoryHeader.style.marginTop = '1.5rem';
                categoryHeader.style.marginBottom = '1rem';
                archivedNotesList.appendChild(categoryHeader);

                archivedNotesInCategory.forEach(note => {
                    const originalIndex = allNotes[categoryName].findIndex(n => n === note);

                    const noteItem = document.createElement('div');
                    noteItem.classList.add('note-item');
                    // Archived notes are not pinned or favorited in archive view
                    noteItem.innerHTML = `
                        <div>
                            <div class="note-content">${note.content}</div>
                            <span class="note-date">${new Date(note.timestamp).toLocaleString('ru-RU')}</span>
                        </div>
                        <div class="note-actions">
                            <button class="action-btn unarchive-btn" data-action="unarchive" data-category="${categoryName}" data-original-index="${originalIndex}">Разархивировать</button>
                            <button class="action-btn delete-btn" data-action="delete" data-category="${categoryName}" data-original-index="${originalIndex}">Удалить</button>
                        </div>
                    `;
                    archivedNotesList.appendChild(noteItem);
                });
            }
        });

        if (hasArchivedNotes) {
            noArchivedNotesMessage.style.display = 'none';
        } else {
            noArchivedNotesMessage.style.display = 'block';
        }
    }


    // --- Calendar Functions (only on index.html) ---
    if (currentMonthYearSpan && prevMonthBtn && nextMonthBtn && calendarGrid) {
        let currentDate = new Date(); // Current date for calendar view

        function renderCalendar() {
            calendarGrid.innerHTML = ''; // Clear previous days
            currentMonthYearSpan.textContent = currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth(); // 0-indexed

            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);

            let startDay = firstDayOfMonth.getDay();
            if (startDay === 0) startDay = 6;
            else startDay--;

            for (let i = 0; i < startDay; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.classList.add('calendar-day', 'empty');
                calendarGrid.appendChild(emptyDay);
            }

            for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
                const dayElement = document.createElement('div');
                dayElement.classList.add('calendar-day');
                dayElement.textContent = day;

                const today = new Date();
                if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    dayElement.classList.add('current-day');
                }

                const dayOfWeek = new Date(year, month, day).getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    dayElement.classList.add('weekend-day');
                }
                calendarGrid.appendChild(dayElement);
            }
        }

        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
    }
    // --- End Calendar Functions ---


    // Add Category (only on index.html)
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            const categoryName = categoryInput.value.trim();
            if (categoryName && !allNotes[categoryName]) {
                allNotes[categoryName] = [];
                categoryInput.value = '';
                saveAllNotes();
                renderCategories();
                currentCategory = categoryName;
                renderNotes();
            } else if (allNotes[categoryName]) {
                alert('Категория с таким названием уже существует!');
            }
        });
    }


    // Switch Category / Delete Category (only on index.html)
    if (categoryList) {
        categoryList.addEventListener('click', (event) => {
            if (event.target.closest('.category-item') && !event.target.dataset.categoryToDelete) {
                const categoryItem = event.target.closest('.category-item');
                currentCategory = categoryItem.dataset.category;
                renderCategories();
                renderNotes();
            }
            if (event.target.dataset.categoryToDelete) {
                const categoryToDelete = event.target.dataset.categoryToDelete;
                if (confirm(`Вы уверены, что хотите удалить категорию "${categoryToDelete}" и все её заметки?`)) {
                    delete allNotes[categoryToDelete];
                    if (currentCategory === categoryToDelete) {
                        currentCategory = "Все заметки";
                    }
                    saveAllNotes();
                    renderCategories();
                    renderNotes();
                }
            }
        });
    }


    // Add Note logic for both index.html and archive.html
    if (addNoteBtn) { // This button exists on both pages
        addNoteBtn.addEventListener('click', () => {
            const content = noteInput.value.trim();
            if (content) {
                const isArchivedNote = window.location.pathname.endsWith('archive.html');
                const targetCategory = "Все заметки"; // New notes always go to "Все заметки"

                if (!allNotes[targetCategory]) {
                    allNotes[targetCategory] = [];
                }

                allNotes[targetCategory].push({
                    content: content,
                    timestamp: new Date().toISOString(),
                    isFavorite: false,
                    isPinned: false,
                    isArchived: isArchivedNote // Set archived status based on current page
                });
                noteInput.value = '';
                saveAllNotes();
                if (isArchivedNote) {
                    renderArchivedNotes(); // Re-render archive page
                } else {
                    renderNotes(); // Re-render main page
                }
            }
        });
    }


    // Handle Note Actions (Delete, Favorite, Pin, Archive, Unarchive)
    document.addEventListener('click', (event) => {
        const targetButton = event.target.closest('.action-btn');
        if (!targetButton) return;

        const action = targetButton.dataset.action;
        const index = parseInt(targetButton.dataset.originalIndex);
        const categoryName = targetButton.dataset.category; // Get category from data-attribute

        if (isNaN(index) || !allNotes[categoryName] || index >= allNotes[categoryName].length) {
            console.error("Invalid index or category for note action.");
            return;
        }

        const note = allNotes[categoryName][index];

        if (action === 'delete') {
            if (confirm('Вы уверены, что хотите удалить эту заметку?')) {
                allNotes[categoryName].splice(index, 1);
                saveAllNotes();
                if (window.location.pathname.endsWith('archive.html')) {
                    renderArchivedNotes(); // Re-render archive page
                } else {
                    renderNotes(); // Re-render main page
                }
            }
        } else if (action === 'favorite') {
            note.isFavorite = !note.isFavorite;
            saveAllNotes();
            renderNotes(); // Re-render main page (archive doesn't show favorites)
        } else if (action === 'pin') {
            note.isPinned = !note.isPinned;
            saveAllNotes();
            renderNotes(); // Re-render main page (archive doesn't show pinned)
        } else if (action === 'archive') {
            note.isArchived = true;
            note.isPinned = false; // Unpin when archiving
            note.isFavorite = false; // Unfavorite when archiving
            saveAllNotes();
            renderNotes(); // Re-render main page to remove archived note
        } else if (action === 'unarchive') {
            note.isArchived = false;
            saveAllNotes();
            renderArchivedNotes(); // Re-render archive page to remove unarchived note
        }
    });


    // Initial renders based on current page
    if (window.location.pathname.endsWith('archive.html')) {
        renderArchivedNotes();
    } else {
        renderCategories();
        renderNotes();
        if (calendarGrid) { // Only render calendar if the elements exist on the page
            renderCalendar();
        }
    }
});

