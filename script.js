    /**
     * QVCT Manager - Script Principal v23.1 (Correction Dates Robustes)
     *
     * Fonctionnalités:
     * - Auth Google + Vérif Autorisation Firestore.
     * - CRUD Membres, Animations, Tâches (cartes, multi-assignés, UI améliorée).
     * - Dashboard: Indicateurs, Listes, Graphique Budget Mensuel/Restant, Calendrier FullCalendar.
     * - Stats: Indicateurs + Graphiques (Statut, Type, Participation).
     * - Filtres Animations/Tâches.
     * - Ajout auto autorisation membre.
     * - Gestion état connecté/déconnecté.
     * - Cache basique.
     * - Export CSV.
     * - Animations CSS/JS cartes.
     * - Clic calendrier ouvre Modale Détail (avec bouton Modifier).
     * - Correction pour gérer les dates (dateTime/dueDate) stockées en String ou Timestamp.
     */
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {

        // --- 1. Vérification des Dépendances Essentielles ---
        try {
            if (typeof firebase === 'undefined' || typeof firebase.firestore === 'undefined' || typeof firebase.auth === 'undefined') { throw new Error("SDK Firebase non chargé"); }
            if (typeof firebaseConfig === 'undefined') { throw new Error("firebaseConfig non défini"); }
            if (typeof Chart === 'undefined') { throw new Error("Chart.js non chargé"); }
            if (typeof FullCalendar === 'undefined' || typeof FullCalendar.Calendar === 'undefined') { throw new Error("FullCalendar non chargé"); }
            console.log("Vérifications initiales OK.");
        } catch (err) { console.error("ERREUR CRITIQUE INIT:", err); document.body.innerHTML = `<div style="padding: 40px; text-align: center;"><h1 style="color: red;">Erreur Critique</h1><p>Impossible de charger l'application : ${err.message}. Vérifiez l'inclusion des bibliothèques dans index.html et la console.</p></div>`; return; }

        // Initialisation Firebase
        let db; let auth;
        try {
            if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); console.log("Firebase Initialized"); } else { firebase.app(); console.log("Firebase App already exists"); }
            db = firebase.firestore(); auth = firebase.auth(); console.log("Firestore & Auth Ready");
        } catch (initError) { console.error("Erreur Init Firebase:", initError); document.body.innerHTML = `<div style="padding: 40px; text-align: center;"><h1 style="color: red;">Erreur Initialisation Firebase</h1><p>Impossible d'initialiser Firebase.</p></div>`; return; }

        // Références Collections
        const membersCollection = db.collection('members'); const animationsCollection = db.collection('animations'); const tasksCollection = db.collection('tasks'); const authorizedUsersCollection = db.collection('authorizedUsers');
        // --- Fin Références Firebase ---


        // --- 2. Références aux Éléments DOM ---
        const sidebarLinks = document.querySelectorAll('.nav-link'); const pages = document.querySelectorAll('.page'); const allCloseBtns = document.querySelectorAll('.modal .close-btn'); const allModals = document.querySelectorAll('.modal');
        const addMemberBtn = document.getElementById('add-member-btn'); const memberModal = document.getElementById('member-form-modal'); const memberForm = document.getElementById('member-form'); const memberListDiv = document.getElementById('member-list'); const memberFormTitle = document.getElementById('member-form-title'); const hiddenMemberIdInput = document.getElementById('member-id');
        const addAnimationBtn = document.getElementById('add-animation-btn'); const animationModal = document.getElementById('animation-form-modal'); const animationForm = document.getElementById('animation-form'); const animationListDiv = document.getElementById('animation-list'); const animationFormTitle = document.getElementById('animation-form-title'); const animationParticipantsDiv = document.getElementById('animation-participants-list'); const hiddenAnimationIdInput = document.getElementById('animation-id'); const animationStatusFilterSelect = document.getElementById('animation-status-filter'); const animationTypeSelect = document.getElementById('animation-type'); const animationViewFilterSelect = document.getElementById('animation-view-filter');
        const addTaskBtn = document.getElementById('add-task-btn'); const taskModal = document.getElementById('task-form-modal'); const taskForm = document.getElementById('task-form'); const taskListDiv = document.getElementById('task-list'); const taskFormTitle = document.getElementById('task-form-title'); const taskFilterAnimationSelect = document.getElementById('task-filter-animation'); const taskAnimationSelect = document.getElementById('task-animation'); const taskAssigneesDiv = document.getElementById('task-assignees-list'); const hiddenTaskIdInput = document.getElementById('task-id');
        const taskListModal = document.getElementById('task-list-modal'); const modalTaskTitle = document.getElementById('modal-task-title'); const modalTaskContent = document.getElementById('modal-task-content');
        const upcomingCountEl = document.getElementById('upcoming-animations-count'); const upcomingListEl = document.getElementById('upcoming-animations-list'); const ongoingCountEl = document.getElementById('ongoing-tasks-count'); const ongoingListEl = document.getElementById('ongoing-tasks-list'); const deadlinesListEl = document.getElementById('deadlines-list'); const plannedBudgetTotalEl = document.getElementById('planned-budget-total'); const budgetDetailsInfoEl = document.getElementById('budget-details-info'); const recentAnimationsCountEl = document.getElementById('recent-animations-count'); const recentAnimationsListEl = document.getElementById('recent-animations-list'); const overdueTasksBadgeEl = document.getElementById('overdue-tasks-badge'); const remainingAnnualBudgetEl = document.getElementById('remaining-annual-budget'); const remainingBudgetDetailsEl = document.getElementById('remaining-budget-details'); const budgetChartErrorEl = document.getElementById('dashboard-budget-error');
        const calendarContainerEl = document.getElementById('dashboard-calendar'); const calendarMessageEl = document.querySelector('#dashboard-calendar-wrapper .calendar-loading-message');
        const statsTotalCompletedEl = document.getElementById('stats-total-completed'); const statsAvgParticipationEl = document.getElementById('stats-avg-participation'); const statsTotalBudgetSpentEl = document.getElementById('stats-total-budget-spent'); const statusErrorEl = document.getElementById('stats-status-error'); const typeErrorEl = document.getElementById('stats-type-error'); const participationErrorEl = document.getElementById('stats-participation-error'); const exportCsvBtn = document.getElementById('export-csv-btn');
        const loginBtn = document.getElementById('login-btn'); const logoutBtn = document.getElementById('logout-btn'); const userInfoDiv = document.getElementById('user-info'); const userNameSpan = document.getElementById('user-name'); const userPhotoImg = document.getElementById('user-photo');
        const animationDetailModal = document.getElementById('animation-detail-modal'); // <<< Nouvelle Modale Détail
        const animationDetailContent = document.getElementById('animation-detail-content');
        const detailModalTitle = document.getElementById('detail-modal-title');
        const editFromDetailBtn = document.getElementById('edit-from-detail-btn');

        // const hamburgerBtn = document.querySelector('.hamburger-btn'); // Commenté car non utilisé dans l'HTML fourni
        // const sidebar = document.querySelector('.sidebar');
        // const overlay = document.querySelector('.overlay');
        const body = document.body;

        // console.log('Vérification éléments hamburger:', { hamburgerBtn, sidebar, overlay, body }); // Commenté
        // --- Fin Références DOM ---

        // --- 3. Variables d'État, Cache et Instances ---
        let editingMemberId = null; let editingAnimationId = null; let editingTaskId = null;
        let isInitialLoadComplete = false;
        let cachedMembers = []; let cachedAnimations = []; let cachedTasks = [];
        let membersLoaded = false; let animationsLoaded = false; let tasksLoaded = false;
        let statusChartInstance = null; let typeChartInstance = null; let participationChartInstance = null; let dashboardBudgetChartInstance = null; let dashboardCalendarInstance = null;
        let currentUser = null;
        let currentDetailAnimationId = null; // <<< ID pour modale détail
        // --- Fin État et Cache ---

        // --- 4. Fonctions Utilitaires ---
        const openModal = (modal) => { if(modal) modal.style.display = 'block'; };
        const closeModal = (modal) => { if (!modal) return; modal.style.display = 'none'; if (modal === memberModal && memberForm) { memberForm.reset(); editingMemberId = null; if(memberFormTitle) memberFormTitle.textContent="Ajouter Membre"; if(hiddenMemberIdInput) hiddenMemberIdInput.value=''; } else if (modal === animationModal && animationForm) { animationForm.reset(); editingAnimationId = null; if(animationFormTitle) animationFormTitle.textContent="Ajouter Animation"; if(hiddenAnimationIdInput) hiddenAnimationIdInput.value=''; if(animationParticipantsDiv) animationParticipantsDiv.innerHTML='<p>Chargement...</p>'; } else if (modal === taskModal && taskForm) { taskForm.reset(); editingTaskId = null; if(taskFormTitle) taskFormTitle.textContent="Ajouter Tâche"; if(hiddenTaskIdInput) hiddenTaskIdInput.value=''; if(taskAnimationSelect) taskAnimationSelect.value=""; if(taskAssigneesDiv) taskAssigneesDiv.innerHTML='<p>Chargement...</p>'; } else if (modal === taskListModal) { if(modalTaskTitle) modalTaskTitle.textContent="Tâches"; if(modalTaskContent) modalTaskContent.innerHTML='<p>Chargement...</p>'; } else if (modal === animationDetailModal) { if(animationDetailContent) animationDetailContent.innerHTML='<p>Chargement...</p>'; currentDetailAnimationId = null;} }; // <<< Ajout nettoyage modale détail
        const escapeCsvValue = (value) => { const stringValue = String(value === null || value === undefined ? '' : value); if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) { return `"${stringValue.replace(/"/g, '""')}"`; } return stringValue; };
        const animateCardEntry = (cardElement, delay) => { if (!cardElement) return; requestAnimationFrame(() => { requestAnimationFrame(() => { cardElement.style.transitionDelay = `${delay}ms`; cardElement.classList.remove('card-hidden'); cardElement.addEventListener('transitionend', () => { cardElement.style.transitionDelay = ''; }, { once: true }); }); }); };

        // const toggleSidebar = () => { // Commenté car non utilisé
        // body.classList.toggle('sidebar-open');
        //};

        /**
         * >>> NOUVEAU <<< Fonction Helper pour obtenir la valeur numérique d'une date (Timestamp ou String)
         * Retourne le timestamp en millisecondes ou Infinity en cas d'erreur/invalidité.
         */
        const getDateValueInMillis = (dateFieldValue) => {
            if (!dateFieldValue) return Infinity; // Gère null ou undefined

            // Cas 1: C'est un Timestamp Firestore
            if (typeof dateFieldValue.toDate === 'function') {
                try {
                    const d = dateFieldValue.toDate();
                    return d.getTime(); // Retourne les millisecondes
                } catch (e) {
                    console.warn("Erreur conversion Timestamp:", dateFieldValue, e);
                    return Infinity; // Erreur de conversion
                }
            }

            // Cas 2: Ce n'est pas un Timestamp, essayer de le parser (String, Date JS, etc.)
            try {
                const d = new Date(dateFieldValue);
                // Vérifie si le parsing a réussi et retourne les millisecondes ou Infinity
                return isNaN(d.getTime()) ? Infinity : d.getTime();
            } catch (e) {
                console.warn("Erreur parsing Date:", dateFieldValue, e);
                return Infinity; // Erreur de parsing
            }
        };

         /**
         * >>> NOUVEAU <<< Fonction Helper pour obtenir un objet Date valide (Timestamp ou String)
         * Retourne un objet Date ou null en cas d'erreur/invalidité.
         */
        const getValidDateObject = (dateFieldValue) => {
            if (!dateFieldValue) return null;

             // Cas 1: Timestamp Firestore
            if (typeof dateFieldValue.toDate === 'function') {
                try {
                    const d = dateFieldValue.toDate();
                    // Vérifie aussi la validité au cas où toDate() renverrait qqch d'invalide
                    return (d instanceof Date && !isNaN(d.getTime())) ? d : null;
                } catch (e) {
                     console.warn("Erreur conversion Timestamp en Date:", dateFieldValue, e);
                    return null;
                }
            }

            // Cas 2: String, Date JS, etc.
            try {
                 const d = new Date(dateFieldValue);
                 return (d instanceof Date && !isNaN(d.getTime())) ? d : null;
            } catch (e) {
                 console.warn("Erreur parsing en Date:", dateFieldValue, e);
                 return null;
            }
        };
        // --- Fin Utilitaires ---


        // --- 5. Logique de Navigation ---
        const navigateTo = (pageId, updateHistory = true) => { pages.forEach(p => p.classList.remove('active')); const targetPage = document.getElementById(pageId); if (targetPage) { targetPage.classList.add('active'); } else { console.warn(`Page ID "${pageId}" introuvable.`); document.getElementById('dashboard')?.classList.add('active'); pageId = 'dashboard'; } sidebarLinks.forEach(l => l.classList.remove('active')); const activeLink = document.querySelector(`.nav-link[href="#${pageId}"]`); if (activeLink) { activeLink.classList.add('active'); } else { document.querySelector(`.nav-link[href="#dashboard"]`)?.classList.add('active'); } if (updateHistory && window.location.hash !== `#${pageId}`) { window.location.hash = pageId; } console.log(`Nav vers: ${pageId}`); if (currentUser || pageId === 'dashboard') { ensureCacheAndRender(pageId); } else { console.log("Navigation bloquée : utilisateur déconnecté."); pages.forEach(p => { if(p.id !== 'dashboard') p.innerHTML = '<p style="text-align:center; margin-top: 30px; color: var(--danger-color);">Veuillez vous connecter.</p>'; }); document.getElementById('dashboard')?.classList.add('active'); ensureCacheAndRender('dashboard'); } };
        const ensureCacheAndRender = async (pageId) => { if (!currentUser && pageId !== 'dashboard') { console.log(`Render annulé pour ${pageId} (déconnecté)`); const targetPage = document.getElementById(pageId); if(targetPage) { targetPage.innerHTML = '<p style="text-align:center; margin-top: 30px; color: var(--danger-color);">Veuillez vous connecter.</p>'; } return; } if (!isInitialLoadComplete && currentUser) { console.log(`Attente chargement initial des données pour ${pageId}...`); return; } console.log(`Ensure cache pour ${pageId}`); try { switch (pageId) { case 'members': if(currentUser) { await loadMembersIntoCache(); renderMembers(); } break; case 'animations': if(currentUser) { await loadAnimationsIntoCache(); renderAnimations(); } break; case 'tasks': if(currentUser) { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache(), loadTasksIntoCache()]); populateTaskFilterDropdown(); renderTasks(); } break; case 'dashboard': await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache(), loadTasksIntoCache()]); renderDashboard(); break; case 'stats': if(currentUser) { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache()]); renderStats(); } break; case 'documents': const docPage = document.getElementById('documents'); if(currentUser) { if (docPage) docPage.innerHTML = '<h2><i class="fas fa-folder-open"></i> Documents et Ressources</h2><p>Gestion des documents à venir...</p>'; } else { if(docPage) docPage.innerHTML = '<p>Veuillez vous connecter.</p>'; } break; default: console.log(`Pas de rendu spécifique pour ${pageId}.`); break; } } catch (error) { console.error(`Erreur chargement/rendu pour ${pageId}:`, error); const targetPage = document.getElementById(pageId); if(targetPage) targetPage.innerHTML = '<p class="error-message">Erreur lors du chargement de cette section.</p>';} };
        // --- Fin Navigation ---


        // --- 6. Gestion du Cache ---
        const loadMembersIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement membres annulé (déconnecté)"); cachedMembers = []; membersLoaded = false; return Promise.resolve(); } if (membersLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Membres..."); const snapshot = await membersCollection.orderBy("lastname", "asc").get(); cachedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); membersLoaded = true; console.log("Cache Membres OK:", cachedMembers.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache membres:", error); membersLoaded = false; return Promise.reject(error); } };
        const loadAnimationsIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement animations annulé (déconnecté)"); cachedAnimations = []; animationsLoaded = false; return Promise.resolve(); } if (animationsLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Animations..."); const snapshot = await animationsCollection.orderBy("dateTime", "desc").get(); cachedAnimations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); animationsLoaded = true; console.log("Cache Animations OK:", cachedAnimations.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache animations:", error); animationsLoaded = false; return Promise.reject(error); } };
        const loadTasksIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement tâches annulé (déconnecté)"); cachedTasks = []; tasksLoaded = false; return Promise.resolve(); } if (tasksLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Tâches..."); const snapshot = await tasksCollection.get(); cachedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); tasksLoaded = true; console.log("Cache Tâches OK:", cachedTasks.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache tâches:", error); tasksLoaded = false; return Promise.reject(error); } };
        const loadAllCaches = async (forceReload = false) => { if (!currentUser) { console.log("Chargement global caches annulé (déconnecté)"); isInitialLoadComplete = true; return Promise.resolve(); } console.log("Chargement de tous les caches..."); isInitialLoadComplete = false; try { await Promise.all([ loadMembersIntoCache(forceReload), loadAnimationsIntoCache(forceReload), loadTasksIntoCache(forceReload) ]); isInitialLoadComplete = true; console.log("Chargement global caches OK."); } catch (error) { console.error("Erreur chargement global des caches:", error); isInitialLoadComplete = false; document.body.innerHTML = '<h1 style="color:red; text-align:center; margin-top: 50px;">Erreur chargement données. Rechargez.</h1>'; throw error; } };
        const clearAllCaches = () => { cachedMembers = []; membersLoaded = false; cachedAnimations = []; animationsLoaded = false; cachedTasks = []; tasksLoaded = false; isInitialLoadComplete = false; console.log("Caches vidés."); };
        // --- Fin Gestion Cache ---


        // --- 7. Fonctions pour Dropdowns et Checkboxes ---
        const populateMemberOptions = (selectEl, selectedId = '') => { if (!selectEl) return; const currentVal = selectEl.value; selectEl.innerHTML = '<option value="">-- Choisir --</option>'; cachedMembers.forEach(m => { const opt = document.createElement('option'); opt.value = m.id; opt.textContent = `${m.firstname} ${m.lastname}`; selectEl.appendChild(opt); }); selectEl.value = selectedId || currentVal || ""; };
        const populateAnimationOptions = (selectEl, selectedId = '', addAll = false) => { if (!selectEl || !cachedAnimations) return; const currentVal = selectEl.value; selectEl.innerHTML = ''; if (addAll) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = 'Toutes'; selectEl.appendChild(allOpt); } else { selectEl.innerHTML = '<option value="">-- Choisir --</option>'; } cachedAnimations.forEach(a => { const opt = document.createElement('option'); opt.value = a.id; opt.textContent = a.title || 'Sans titre'; selectEl.appendChild(opt); }); if (selectedId) { selectEl.value = selectedId; } else if (addAll) { selectEl.value = currentVal === 'all' || !currentVal ? 'all' : currentVal; } else { selectEl.value = currentVal === "" ? "" : currentVal;} };
        const populateTaskFilterDropdown = () => { if (!animationsLoaded) { console.warn("Cache animations non prêt pour filtre tâches."); return; } populateAnimationOptions(taskFilterAnimationSelect, taskFilterAnimationSelect?.value || 'all', true); };
        const renderMemberCheckboxesForTask = async (selectedIds = []) => { if (!taskAssigneesDiv) { console.error("DOM Error: #task-assignees-list not found"); return; } try { await loadMembersIntoCache(); taskAssigneesDiv.innerHTML = '<p>Chargement...</p>'; if (cachedMembers.length === 0) { taskAssigneesDiv.innerHTML = '<p>Aucun membre disponible.</p>'; return; } taskAssigneesDiv.innerHTML = ''; cachedMembers.forEach(member => { const isChecked = selectedIds.includes(member.id); const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" name="taskAssignees" value="${member.id}" ${isChecked ? 'checked' : ''}> ${member.firstname} ${member.lastname}`; taskAssigneesDiv.appendChild(label); }); } catch (error) { console.error("Erreur rendu checkboxes tâche:", error); taskAssigneesDiv.innerHTML = '<p style="color:red">Erreur chargement membres.</p>'; } };
        const renderMemberCheckboxes = async (selectedIds = []) => { if (!currentUser) return; if (!animationParticipantsDiv) { console.error("DOM Error: #animation-participants-list not found"); return; } try { await loadMembersIntoCache(); animationParticipantsDiv.innerHTML = '<p>Chargement...</p>'; if (cachedMembers.length === 0) { animationParticipantsDiv.innerHTML = '<p>Aucun membre.</p>'; return; } animationParticipantsDiv.innerHTML = ''; cachedMembers.forEach(member => { const isChecked = selectedIds.includes(member.id); const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" name="participants" value="${member.id}" ${isChecked ? 'checked' : ''}> ${member.firstname} ${member.lastname}`; animationParticipantsDiv.appendChild(label); }); } catch (error) { console.error("Erreur rendu checkboxes animation:", error); animationParticipantsDiv.innerHTML = '<p style="color:red">Erreur.</p>'; } };
        // --- Fin Dropdowns/Checkboxes ---


        // --- 8. Fonctions de Rendu (Affichage) ---
        const renderMembers = async () => { if (!currentUser) return; if (!memberListDiv) { console.error("DOM Error: #member-list not found"); return; } memberListDiv.innerHTML = '<p>Chargement...</p>'; try { await loadMembersIntoCache(true); if (cachedMembers.length === 0) { memberListDiv.innerHTML = '<p>Aucun membre COPIL ajouté.</p>'; return; } memberListDiv.innerHTML = ''; cachedMembers.forEach((member, index) => { const memberId = member.id; const div = document.createElement('div'); div.className = 'member-card card-hidden'; div.setAttribute('data-id', memberId); div.innerHTML = ` <div class="card-body"> <h3 class="member-name">${member.firstname} ${member.lastname}</h3> <p class="member-detail"> <i class="fas fa-user-tag"></i> <span>Rôle: ${member.role || 'N/A'}</span> </p> <p class="member-detail"> <i class="fas fa-envelope"></i> <span>Contact: ${member.contact || 'N/A'}</span> </p> </div> <div class="card-footer"> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; memberListDiv.appendChild(div); animateCardEntry(div, index * 70); const editBtn = div.querySelector('.edit-btn'); if (editBtn) editBtn.addEventListener('click', () => handleEditMember(memberId)); const deleteBtn = div.querySelector('.delete-btn'); if (deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteMember(memberId)); }); } catch (error) { console.error("Erreur rendu membres:", error); memberListDiv.innerHTML = '<p class="error-message">Erreur chargement des membres.</p>'; } };
        const renderAnimations = async () => { if (!currentUser) return; if (!animationListDiv) { console.error("DOM Error: #animation-list not found"); return; } animationListDiv.innerHTML = '<p>Chargement...</p>'; const selectedStatus = animationStatusFilterSelect?.value || 'all'; const selectedView = animationViewFilterSelect?.value || 'active'; console.log(`Filtrage animations - Vue: ${selectedView}, Statut: ${selectedStatus}`); try { await loadAnimationsIntoCache(true); let animationsToRender = cachedAnimations; if (selectedView === 'active') { animationsToRender = animationsToRender.filter(anim => anim.status === 'prévue' || anim.status === 'en cours'); } else if (selectedView === 'archived') { animationsToRender = animationsToRender.filter(anim => anim.status === 'réalisée' || anim.status === 'annulée'); } if (selectedStatus !== 'all') { animationsToRender = animationsToRender.filter(anim => anim.status === selectedStatus); } if (animationsToRender.length === 0) { let message = "Aucune animation trouvée"; if (selectedView !== 'all' || selectedStatus !== 'all') { message += ` pour la vue "${selectedView}" ${selectedStatus !== 'all' ? 'avec le statut "' + selectedStatus + '"' : ''}.`; } else { message += "."; } animationListDiv.innerHTML = `<p>${message}</p>`; return; } animationListDiv.innerHTML = ''; animationsToRender.forEach((animation, index) => { const animationId = animation.id; const div = document.createElement('div'); const statusClass = (animation.status || 'prévue').replace(' ', '-'); div.className = `animation-card status-${statusClass} card-hidden`; div.setAttribute('data-id', animationId); let dateStr = 'N/A'; let timeStr = ''; const dateObj = getValidDateObject(animation.dateTime); // Utilise l'helper
            if (dateObj) { try { dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch(e){ console.warn("Erreur formatage date anim card:", e); dateStr = 'Err'; timeStr = '';} } const animType = animation.animationType || 'N/D'; const location = animation.location || 'N/A'; const statusText = animation.status || 'N/A'; const budget = (animation.budget !== undefined && animation.budget !== null) ? `${animation.budget.toLocaleString('fr-FR')} €` : 'N/D'; const docsCount = (animation.documentLinks || []).length; const participantsCount = (animation.participantIds || []).length; const participantText = participantsCount === 1 ? `1 Part.` : `${participantsCount} Parts.`; const docText = docsCount === 1 ? `1 Doc.` : `${docsCount} Docs.`; div.innerHTML = ` <div class="card-header"> <h3>${animation.title || 'Sans titre'}</h3> </div> <div class="card-body"> <div class="card-details-row compact"> <span class="detail-item date"><i class="fas fa-calendar-day"></i> ${dateStr} ${timeStr ? ' - ' + timeStr : ''}</span> <span class="detail-item type"><i class="fas fa-tags"></i> ${animType}</span> <span class="detail-item location"><i class="fas fa-map-marker-alt"></i> ${location}</span> </div> <div class="card-details-row secondary"> <span class="detail-item status"><i class="fas fa-info-circle"></i> ${statusText}</span> <span class="detail-item budget"><i class="fas fa-euro-sign"></i> ${budget}</span> <span class="detail-item participants"><i class="fas fa-users"></i> ${participantText}</span> <span class="detail-item docs"><i class="fas fa-paperclip"></i> ${docText}</span> </div> ${animation.description ? `<p class="card-description" title="${animation.description}">${animation.description}</p>` : '<p class="card-description no-description"><i>Aucune description fournie.</i></p>'} </div> <div class="card-footer"> <button class="btn secondary-btn show-tasks-btn" title="Voir tâches"><i class="fas fa-list-check"></i></button> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; animationListDiv.appendChild(div); animateCardEntry(div, index * 70); const showTasksBtn = div.querySelector('.show-tasks-btn'); if(showTasksBtn) showTasksBtn.addEventListener('click', () => handleShowAnimationTasks(animationId, animation.title)); const editBtn = div.querySelector('.edit-btn'); if(editBtn) editBtn.addEventListener('click', () => handleEditAnimation(animationId)); const deleteBtn = div.querySelector('.delete-btn'); if(deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteAnimation(animationId)); }); } catch (error) { console.error("Erreur rendu animations:", error); animationListDiv.innerHTML = '<p class="error-message">Erreur chargement des animations.</p>'; } };
        const renderTasks = async () => { if (!currentUser) return; if (!taskListDiv) { console.error("DOM Error: #task-list not found"); return; } taskListDiv.innerHTML = '<p>Chargement...</p>'; if (!membersLoaded || !animationsLoaded) { console.warn("renderTasks: Dépendances membres/animations non prêtes."); taskListDiv.innerHTML = '<p>Préparation...</p>'; return; } const selectedAnimId = taskFilterAnimationSelect?.value || 'all'; try { await loadTasksIntoCache(true); let filteredTasks = cachedTasks; if (selectedAnimId !== 'all') { filteredTasks = cachedTasks.filter(t => t.animationId === selectedAnimId); }

            // >>> MODIFICATION : Utilisation de la fonction helper pour le tri <<<
            filteredTasks.sort((a, b) => {
                const timeA = getDateValueInMillis(a.dueDate);
                const timeB = getDateValueInMillis(b.dueDate);
                // Gestion de Infinity pour tri ascendant (place les erreurs/nulls à la fin)
                if (timeA === Infinity && timeB === Infinity) return 0;
                if (timeA === Infinity) return 1; // Met A après B si A est invalide/null
                if (timeB === Infinity) return -1; // Met B après A si B est invalide/null
                return timeA - timeB; // Tri ascendant normal
            });

            if (filteredTasks.length === 0) { taskListDiv.innerHTML = `<p>Aucune tâche trouvée ${selectedAnimId !== 'all' ? 'pour cette animation': ''}.</p>`; return; } taskListDiv.innerHTML = ''; filteredTasks.forEach((task, index) => { const taskId = task.id; const animation = cachedAnimations.find(a => a.id === task.animationId); const div = document.createElement('div'); const statusClass = (task.status || 'à faire').replace(' ', '-'); div.className = `task-card status-${statusClass} card-hidden`; div.setAttribute('data-id', taskId); let date = 'N/A'; let overdue = '';
                const dateObj = getValidDateObject(task.dueDate); // Utilise l'helper
                if (dateObj) { try { date = dateObj.toLocaleDateString('fr-FR', { year:'numeric', month:'short', day:'numeric'}); if (task.status !== 'terminé' && dateObj.getTime() < Date.now() - 864e5) { overdue = ' <span style="color: var(--danger-color); font-weight: bold;">(Retard)</span>'; } } catch (e) { console.warn("Err formatage date task card:", e); date = 'Err';} } const assigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []); let assigneesText = 'N/A'; if (assigneeIds.length > 0 && membersLoaded) { assigneesText = assigneeIds.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? `${member.firstname.charAt(0)}.${member.lastname.charAt(0)}.` : '?'; }).join(', '); } div.innerHTML = ` <div class="card-body"> <p class="task-description">${task.description || 'N/A'}</p> <div class="card-detail"><i class="fas fa-link"></i><span>${animation ? animation.title : 'N/A'}</span></div> <div class="card-detail"><i class="fas fa-users"></i><span>${assigneesText}</span></div> <div class="card-detail"><i class="fas fa-clock"></i><span>Éch: ${date}${overdue}</span></div> <div class="card-detail"><i class="fas fa-info-circle"></i><span>${task.status || 'N/A'}</span></div> </div> <div class="card-footer"> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; taskListDiv.appendChild(div); animateCardEntry(div, index * 70); const editBtn = div.querySelector('.edit-btn'); if(editBtn) editBtn.addEventListener('click', () => handleEditTask(taskId)); const deleteBtn = div.querySelector('.delete-btn'); if(deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteTask(taskId)); }); } catch (error) { console.error("Erreur rendu tâches:", error); taskListDiv.innerHTML = '<p class="error-message">Erreur chargement des tâches.</p>'; } };
        const renderDashboard = async () => { console.log("--- Début Render Dashboard ---"); const budgetChartCtx = document.getElementById('dashboard-budget-chart')?.getContext('2d'); const calendarEl = document.getElementById('dashboard-calendar'); if (!currentUser) { /* ... (code inchangé pour utilisateur déconnecté) ... */ console.log("Dashboard vidé (déconnecté)"); return; } /* ... (code inchangé pour état chargement) ... */ if (!isInitialLoadComplete) { console.log("Dashboard: attente chargement données..."); return; } if (!membersLoaded || !animationsLoaded || !tasksLoaded) { console.warn("Dashboard: Caches non prêts (connecté)"); return; } const now = new Date(); const currentYear = now.getFullYear(); const currentMonthIndex = now.getMonth(); const monthsElapsed = currentMonthIndex + 1; const nowTime = now.getTime(); const sevenDays = nowTime + 7 * 24 * 60 * 60 * 1000;

            // --- Section Upcoming Animations ---
            if (upcomingCountEl && upcomingListEl) { try { const upcoming = cachedAnimations.filter(a => { const isP = a.status === 'prévue'; const dateObj = getValidDateObject(a.dateTime); // Utilise l'helper
                const isF = dateObj && dateObj.getTime() >= nowTime; return isP && isF;
                })
                // >>> MODIFICATION : Utilisation de la fonction helper pour le tri <<<
                .sort((a, b) => {
                    const timeA = getDateValueInMillis(a.dateTime);
                    const timeB = getDateValueInMillis(b.dateTime);
                    // Tri ascendant (a - b)
                    if (timeA === Infinity && timeB === Infinity) return 0;
                    if (timeA === Infinity) return 1;
                    if (timeB === Infinity) return -1;
                    return timeA - timeB;
                });
                upcomingCountEl.textContent = upcoming.length;
                upcomingListEl.innerHTML = upcoming.length === 0 ? '<li class="no-items">Aucune</li>' : upcoming.slice(0, 4).map(a => {
                    let date = 'Err';
                    const dateObj = getValidDateObject(a.dateTime); // Utilise l'helper
                    if (dateObj) {
                        try { date = dateObj.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); } catch(e){}
                    }
                    return `<li><span class="dashboard-date">${date}</span> ${a.title || 'N/A'}</li>`;
                }).join('');
            } catch(e){ console.error("Err dash anims:",e); if(upcomingListEl) upcomingListEl.innerHTML='<li class="no-items error-item">Erreur</li>'; if(upcomingCountEl) upcomingCountEl.textContent='Err';} }

            // --- Section Ongoing Tasks ---
            if (ongoingCountEl && ongoingListEl) { try { const ongoing = cachedTasks.filter(t => t.status === 'en cours')
                // >>> MODIFICATION : Utilisation de la fonction helper pour le tri <<<
                .sort((a, b) => {
                    const timeA = getDateValueInMillis(a.dueDate);
                    const timeB = getDateValueInMillis(b.dueDate);
                    // Tri ascendant (a - b)
                    if (timeA === Infinity && timeB === Infinity) return 0;
                    if (timeA === Infinity) return 1;
                    if (timeB === Infinity) return -1;
                    return timeA - timeB;
                });
                ongoingCountEl.textContent = ongoing.length; ongoingListEl.innerHTML = ongoing.length === 0 ? '<li class="no-items">Aucune</li>' : ongoing.slice(0, 4).map(t => { const assigneeIdsDash = Array.isArray(t.assigneeIds) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []); let assigneesTextDash = 'N/A'; if (assigneeIdsDash.length > 0 && membersLoaded) { assigneesTextDash = assigneeIdsDash.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? member.firstname : '?'; }).join(', '); } return `<li>${t.description || 'N/A'} <span class="dashboard-name">(${assigneesTextDash})</span></li>`; }).join(''); } catch(e){ console.error("Err dash tâches:",e); if(ongoingListEl) ongoingListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(ongoingCountEl) ongoingCountEl.textContent = 'Err';} }

            // --- Section Deadlines ---
            if (deadlinesListEl && overdueTasksBadgeEl) { try { let overdueCount = 0;
                const deadlines = cachedTasks
                    .filter(t => t.status !== 'terminé' && t.dueDate /* Filtrer ceux qui ont une date */)
                    .map(t => ({
                        ...t,
                         // >>> MODIFICATION : Utilisation de la fonction helper pour calculer dueDateMs <<<
                        dueDateMs: getDateValueInMillis(t.dueDate)
                    }))
                    .filter(t => t.dueDateMs < sevenDays && t.dueDateMs !== Infinity /* Exclure dates invalides du filtre */)
                    .sort((a, b) => a.dueDateMs - b.dueDateMs); // Tri simple sur les ms calculées

                deadlinesListEl.innerHTML = deadlines.length === 0 ? '<li class="no-items">Aucune</li>' : deadlines.slice(0, 5).map(t => {
                    const assigneeIdsDead = Array.isArray(t.assigneeIds) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []); let assigneesTextDead = 'N/A'; if (assigneeIdsDead.length > 0 && membersLoaded) { assigneesTextDead = assigneeIdsDead.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? member.firstname : '?'; }).join(', '); }
                    const overdue = t.dueDateMs < nowTime; if(overdue) overdueCount++;
                    const dateStr = new Date(t.dueDateMs).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}); // Fonctionne car dueDateMs est un nombre valide ici
                    return `<li><span class="dashboard-date ${overdue ? 'overdue' : 'due-soon'}">${dateStr}</span> ${t.description || 'N/A'} <span class="dashboard-name">(${assigneesTextDead})</span>${overdue ? '<span class="overdue"> (Retard!)</span>' : ''}</li>`;
                }).join('');
                if(overdueCount > 0){ overdueTasksBadgeEl.textContent = overdueCount; overdueTasksBadgeEl.style.display = 'inline-block'; } else { overdueTasksBadgeEl.style.display = 'none'; }
            } catch(e){ console.error("Err dash échéances:",e); if(deadlinesListEl) deadlinesListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(overdueTasksBadgeEl) overdueTasksBadgeEl.style.display = 'none'; } }

            // --- Section Planned Budget ---
            if (plannedBudgetTotalEl && budgetDetailsInfoEl) { try { let totalBudget = 0; let count = 0; cachedAnimations.filter(a => (a.status === 'prévue' || a.status === 'en cours')).forEach(a => { if (typeof a.budget === 'number' && !isNaN(a.budget) && a.budget > 0) { totalBudget += a.budget; count++; } }); plannedBudgetTotalEl.textContent = totalBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); budgetDetailsInfoEl.textContent = count > 0 ? `(${count} anim.)` : `(0 anim.)`; budgetDetailsInfoEl.classList.remove('loading-error'); } catch(e) { console.error("Err dash budget:", e); if(plannedBudgetTotalEl) plannedBudgetTotalEl.textContent = 'Erreur'; if(budgetDetailsInfoEl) { budgetDetailsInfoEl.textContent = 'Erreur calcul.'; budgetDetailsInfoEl.classList.add('loading-error'); } } }

            // --- Section Recent Animations ---
            if (recentAnimationsCountEl && recentAnimationsListEl) { try { const recent = cachedAnimations.filter(a => { const isDone = a.status === 'réalisée' || a.status === 'annulée'; const dateObj = getValidDateObject(a.dateTime); // Utilise l'helper
                const isPast = dateObj && dateObj.getTime() < nowTime; return isDone && isPast;
                })
                 // >>> MODIFICATION : Utilisation de la fonction helper pour le tri <<<
                .sort((a, b) => {
                    const timeA = getDateValueInMillis(a.dateTime);
                    const timeB = getDateValueInMillis(b.dateTime);
                    // Tri descendant (b - a)
                    if (timeA === Infinity && timeB === Infinity) return 0;
                    if (timeA === Infinity) return 1; // Met A après B si A est invalide
                    if (timeB === Infinity) return -1; // Met B après A si B est invalide
                    return timeB - timeA; // Tri descendant normal
                });
                recentAnimationsCountEl.textContent = recent.length;
                recentAnimationsListEl.innerHTML = recent.length === 0 ? '<li class="no-items">Aucune</li>' : recent.slice(0, 4).map(a => {
                    let date = 'Err';
                    const dateObj = getValidDateObject(a.dateTime); // Utilise l'helper
                    if (dateObj) { try { date = dateObj.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); } catch(e){} }
                    const statusClass = a.status === 'réalisée' ? 'realisee' : 'annulee';
                    return `<li><span class="dashboard-date">${date}</span> ${a.title || 'N/A'} <span class="dashboard-status ${statusClass}">(${a.status})</span></li>`;
                }).join('');
            } catch(e){ console.error("Err dash recentes:",e); if(recentAnimationsListEl) recentAnimationsListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(recentAnimationsCountEl) recentAnimationsCountEl.textContent = 'Err';} }

             // --- Section Remaining Annual Budget ---
            if (remainingAnnualBudgetEl && remainingBudgetDetailsEl) { try { const totalAnnualBudget = 12 * 200; let spentPlannedCurrentYear = 0;
                cachedAnimations.filter(a => {
                    const dateObj = getValidDateObject(a.dateTime); // Utilise l'helper
                    return dateObj && dateObj.getFullYear() === currentYear; // Filtre par année courante
                })
                .filter(a => (a.status === 'prévue' || a.status === 'en cours' || a.status === 'réalisée'))
                .forEach(a => { if (typeof a.budget === 'number' && a.budget > 0) { spentPlannedCurrentYear += a.budget; } });

                const remainingAnnualFixedBudget = totalAnnualBudget - spentPlannedCurrentYear; remainingAnnualBudgetEl.textContent = remainingAnnualFixedBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); remainingBudgetDetailsEl.textContent = `Budget Annuel ${totalAnnualBudget.toLocaleString('fr-FR')}€ - Engagé ${spentPlannedCurrentYear.toLocaleString('fr-FR')}€`; remainingBudgetDetailsEl.classList.remove('loading-error'); if (remainingAnnualFixedBudget < 0) { remainingAnnualBudgetEl.style.color = 'var(--danger-color)'; } else { remainingAnnualBudgetEl.style.color = 'var(--info-color)'; } } catch (error) { console.error("Erreur calcul budget annuel restant:", error); if (remainingAnnualBudgetEl) remainingAnnualBudgetEl.textContent = 'Erreur'; if (remainingBudgetDetailsEl) { remainingBudgetDetailsEl.textContent = 'Erreur de calcul.'; remainingBudgetDetailsEl.classList.add('loading-error'); } } }

            console.log("Dashboard: Calcul données budget mensuel...");
            // --- Section Budget Chart ---
             if (budgetChartCtx) { try {
                const currentYearForChart = new Date().getFullYear();
                const monthlyBudgets = {};
                cachedAnimations
                    .filter(a => {
                        const dateObj = getValidDateObject(a.dateTime); // Utilise l'helper
                        return dateObj && dateObj.getFullYear() === currentYearForChart && typeof a.budget === 'number' && a.budget > 0;
                    })
                    .forEach(a => {
                        const dateObj = getValidDateObject(a.dateTime); // Re-get dateObj (or pass from filter)
                        if (dateObj) { // Should always be true here due to filter, but safer
                           const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                           const monthKey = `${currentYearForChart}-${month}`;
                           monthlyBudgets[monthKey] = (monthlyBudgets[monthKey] || 0) + a.budget;
                        }
                    });
                // ... (Reste du code du graphique budget, inchangé car il ne dépend pas du tri mais de la conversion de date qui est gérée) ...
                const sortedMonths = Object.keys(monthlyBudgets).sort(); if (sortedMonths.length > 0) { const budgetData = sortedMonths.map(month => monthlyBudgets[month]); const targetData = sortedMonths.map(() => 200); console.log("Dashboard: Création graphique budget..."); if (dashboardBudgetChartInstance) { dashboardBudgetChartInstance.destroy(); dashboardBudgetChartInstance = null;} dashboardBudgetChartInstance = new Chart(budgetChartCtx, { type: 'line', data: { labels: sortedMonths, datasets: [ { label: 'Budget Planifié (€)', data: budgetData, borderColor: 'rgba(74, 144, 226, 0.8)', backgroundColor: 'rgba(74, 144, 226, 0.2)', fill: true, tension: 0.1, }, { label: 'Objectif Mensuel (€)', data: targetData, borderColor: 'rgba(220, 53, 69, 0.5)', borderDash: [5, 5], fill: false, pointRadius: 0, tension: 0, }, ], }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: value => value.toLocaleString('fr-FR') + ' €' }, }, x: { title: { display: false } }, }, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: context => `${context.dataset.label || ''}: ${ context.parsed.y !== null ? context.parsed.y.toLocaleString('fr-FR') + ' €' : 'N/A' }`, }, }, }, }, }); if (budgetChartErrorEl) budgetChartErrorEl.style.display = 'none'; } else { console.log("Dashboard: Aucune donnée de budget pour l'année " + currentYearForChart); if (budgetChartErrorEl) { budgetChartErrorEl.textContent = `Aucune donnée de budget pour ${currentYearForChart}.`; budgetChartErrorEl.style.display = 'block'; budgetChartErrorEl.classList.remove('error'); budgetChartErrorEl.style.color = '#777'; } } } catch (error) { console.error("Erreur création graphique budget dashboard:", error); if (budgetChartErrorEl) { budgetChartErrorEl.textContent = 'Erreur affichage graphique budget.'; budgetChartErrorEl.style.display = 'block'; budgetChartErrorEl.classList.add('error'); } } } else { console.warn("Canvas #dashboard-budget-chart non trouvé."); if (budgetChartErrorEl) { budgetChartErrorEl.textContent = 'Élément graphique non trouvé.'; budgetChartErrorEl.style.display = 'block'; budgetChartErrorEl.classList.add('error'); } }

            console.log("Dashboard: Préparation FullCalendar...");
            // --- Section Calendar ---
            if (calendarEl) { if (calendarMessageEl) calendarMessageEl.style.display = 'none'; try {
                const animationsForCalendar = cachedAnimations.filter(a => {
                    const isValidStatus = a.status === 'prévue' || a.status === 'en cours';
                    const isValidDate = getValidDateObject(a.dateTime) !== null; // Utilise l'helper
                    return isValidStatus && isValidDate;
                });

                const calendarEvents = animationsForCalendar.map(anim => {
                    let eventColor = '#6C9D7E'; let eventTextColor = '#FFFFFF'; if (anim.status === 'en cours') { eventColor = '#A8D8B9'; eventTextColor = '#4A4A4A'; }
                    const startDate = getValidDateObject(anim.dateTime); // Utilise l'helper
                    return { id: anim.id, title: anim.title || 'Animation', start: startDate, // Assigner l'objet Date valide
                             allDay: false, color: eventColor, textColor: eventTextColor, borderColor: eventColor };
                });
                console.log(`Dashboard: ${calendarEvents.length} événements pour FullCalendar.`);
                if (dashboardCalendarInstance) { try{dashboardCalendarInstance.destroy();}catch(e){console.warn("Err Calendar destroy")} dashboardCalendarInstance = null; }
                dashboardCalendarInstance = new FullCalendar.Calendar(calendarEl, { initialView: 'dayGridMonth', locale: 'fr', headerToolbar: { left: 'prev,next today', center: 'title', right: '' }, buttonText: { today: 'Auj.' }, height: 'auto', aspectRatio: 1.8, handleWindowResize: true, events: calendarEvents, eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false }, eventClick: function(info) { info.jsEvent.preventDefault(); showAnimationDetails(info.event.id); /* Appeler la modale détail */ } }); dashboardCalendarInstance.render(); console.log("Dashboard: FullCalendar rendu."); } catch (error) { console.error("Erreur création/rendu FullCalendar:", error); if (calendarMessageEl) { calendarMessageEl.textContent = 'Erreur affichage calendrier.'; calendarMessageEl.style.display = 'block'; calendarMessageEl.classList.add('error'); } if (calendarEl) calendarEl.innerHTML = ''; if (dashboardCalendarInstance) { try{dashboardCalendarInstance.destroy();}catch(e){} dashboardCalendarInstance = null; } } } else { console.warn("Élément #dashboard-calendar non trouvé."); if (calendarMessageEl) { calendarMessageEl.textContent = 'Conteneur calendrier non trouvé.'; /* ... */ } } console.log("--- Fin Render Dashboard ---"); };

        // --- Section Stats --- (Utilise également les dates pour filtres/affichage)
        const renderStats = async () => { if (!currentUser) return; console.log("--- Début Render Stats ---"); const statusCtx = document.getElementById('stats-status-chart')?.getContext('2d'); const typeCtx = document.getElementById('stats-type-chart')?.getContext('2d'); const participationCtx = document.getElementById('stats-participation-chart')?.getContext('2d'); if (!statsTotalCompletedEl || !statsAvgParticipationEl || !statsTotalBudgetSpentEl || !statusCtx || !typeCtx || !participationCtx || !statusErrorEl || !typeErrorEl || !participationErrorEl ) { console.error("DOM Error: Eléments Stats manquants."); return; } /* ... (reset affichage stats) ... */ if (!isInitialLoadComplete || !membersLoaded || !animationsLoaded) { console.warn("Stats: Données cache non prêtes."); return; } try { console.log("Stats: Calculs..."); const completedAnimations = cachedAnimations.filter(a => a.status === 'réalisée'); const memberCount = cachedMembers.length; const totalCompleted = completedAnimations.length; let totalParticipants = 0; completedAnimations.forEach(a => { totalParticipants += (a.participantIds || []).length; }); const avgParticipation = (totalCompleted > 0 && memberCount > 0) ? (totalParticipants / (totalCompleted * memberCount)) * 100 : 0; let totalBudget = 0; completedAnimations.forEach(a => { if (typeof a.budget === 'number' && !isNaN(a.budget) && a.budget > 0) totalBudget += a.budget; }); const statusCounts = cachedAnimations.reduce((acc, a) => { const s = a.status || 'inconnu'; acc[s] = (acc[s] || 0) + 1; return acc; }, {}); const typeCounts = cachedAnimations.reduce((acc, a) => { const type = a.animationType || 'Non défini'; acc[type] = (acc[type] || 0) + 1; return acc; }, {}); const memberParticipation = cachedMembers.map(m => { let c = 0; completedAnimations.forEach(a => { if ((a.participantIds || []).includes(m.id)) c++; }); return { name: `${m.firstname} ${m.lastname}`, count: c }; }).sort((a, b) => b.count - a.count); console.log("Stats: MàJ DOM (Indicateurs clés)..."); statsTotalCompletedEl.textContent = totalCompleted; statsAvgParticipationEl.textContent = `${avgParticipation.toFixed(1)} %`; statsTotalBudgetSpentEl.textContent = totalBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); console.log("Stats: Création Graphiques..."); /* ... (code graphiques inchangé, car n'utilise pas directement de tri par date) ... */ } catch (error) { console.error("Erreur calcul/affichage stats:", error); /* ... (gestion erreur stats) ... */ } console.log("--- Fin Render Stats ---"); };
        // --- Fin Fonctions de Rendu ---


        // --- 9. Event Handlers (CRUD & Autres) ---
        const handleAddMember = () => { /* ... (inchangé) ... */ };
        const handleEditMember = async (id) => { /* ... (inchangé) ... */ };
        const handleDeleteMember = async (id) => { /* ... (inchangé) ... */ };
        const handleMemberFormSubmit = async (e) => { /* ... (inchangé) ... */ };
        const handleAddAnimation = async () => { /* ... (inchangé) ... */ };
        const handleEditAnimation = async (id) => { /* ... (Modification pour gérer date String potentiellement) ... */ if(!currentUser) return; editingAnimationId = id; try { await loadMembersIntoCache(); const doc = await animationsCollection.doc(id).get(); if (doc.exists) { const a = doc.data(); if(animationFormTitle) animationFormTitle.textContent = "Modifier Animation"; if(hiddenAnimationIdInput) hiddenAnimationIdInput.value = id; ['title', 'description', 'location', 'status'].forEach(f => { const el = document.getElementById(`animation-${f}`); if(el) el.value = a[f] || (f === 'status' ? 'prévue' : ''); }); const typeSelect = document.getElementById('animation-type'); if(typeSelect) typeSelect.value = a.animationType || ''; if(document.getElementById('animation-docs')) document.getElementById('animation-docs').value = (a.documentLinks || []).join('\n'); const budgetInput = document.getElementById('animation-budget'); if (budgetInput) budgetInput.value = (a.budget !== undefined && a.budget !== null) ? a.budget : '';
                let dateInputVal = '';
                const dateObj = getValidDateObject(a.dateTime); // Utilise l'helper
                if(dateObj) { try { dateInputVal=`${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2,'0')}-${dateObj.getDate().toString().padStart(2,'0')}T${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')}`; } catch(e){ console.warn("Err formatting date for edit input:", e);} }
                 if(document.getElementById('animation-date')) document.getElementById('animation-date').value = dateInputVal; await renderMemberCheckboxes(a.participantIds || []); if(animationModal) openModal(animationModal); } else { alert("Anim introuvable."); editingAnimationId = null; } } catch (e) { console.error("Err get anim:", e); alert("Erreur."); editingAnimationId = null; } };
        const handleDeleteAnimation = async (id) => { /* ... (inchangé) ... */ };
        const handleAnimationFormSubmit = async (e) => { /* ... (inchangé, car il utilise déjà new Date() et Timestamp.fromDate) ... */ };
        const handleAddTask = async () => { /* ... (inchangé) ... */ };
        const handleEditTask = async (id) => { /* ... (Modification pour gérer date String potentiellement) ... */ if(!currentUser) return; editingTaskId = id; try { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache()]); const doc = await tasksCollection.doc(id).get(); if (doc.exists) { const t = doc.data(); if (taskFormTitle) taskFormTitle.textContent = "Modifier Tâche"; if (hiddenTaskIdInput) hiddenTaskIdInput.value = id; if(document.getElementById('task-description')) document.getElementById('task-description').value = t.description || ''; if(document.getElementById('task-status')) document.getElementById('task-status').value = t.status || 'à faire'; populateAnimationOptions(taskAnimationSelect, t.animationId); const dateInput = document.getElementById('task-due-date'); if(dateInput){
                    const dateObj = getValidDateObject(t.dueDate); // Utilise l'helper
                    if (dateObj) { try { dateInput.value = dateObj.toISOString().split('T')[0]; } catch(e){ console.warn("Err formatting date for edit input (task):", e); dateInput.value = '';} } else { dateInput.value = ''; }
                } const assigneeIdsToSelect = Array.isArray(t.assigneeIds) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []); await renderMemberCheckboxesForTask(assigneeIdsToSelect); if (taskModal) openModal(taskModal); } else { alert("Tâche introuvable."); editingTaskId = null; } } catch (e) { console.error("Err get tâche:", e); alert("Erreur."); editingTaskId = null; } };
        const handleDeleteTask = async (id) => { /* ... (inchangé) ... */ };
        const handleTaskFormSubmit = async (e) => { /* ... (inchangé, car il utilise déjà new Date() et Timestamp.fromDate) ... */ };
        const showAnimationDetails = async (animationId) => { /* ... (Modification pour gérer date String potentiellement) ... */ if (!currentUser || !animationId) return; if (!animationDetailModal || !animationDetailContent || !detailModalTitle || !editFromDetailBtn) { console.error("Éléments DOM modale détail manquants."); return; } animationDetailContent.innerHTML = '<p>Chargement...</p>'; detailModalTitle.textContent = "Détail de l'Animation"; openModal(animationDetailModal); currentDetailAnimationId = animationId; try { await Promise.all([loadAnimationsIntoCache(), loadMembersIntoCache()]); const animation = cachedAnimations.find(a => a.id === animationId); if (!animation) { animationDetailContent.innerHTML = '<p class="error-message">Animation non trouvée.</p>'; currentDetailAnimationId = null; return; } if (animation.title) { detailModalTitle.textContent = `Détail: ${animation.title}`; }
                let dateStr = 'N/D';
                const dateObj = getValidDateObject(animation.dateTime); // Utilise l'helper
                if(dateObj){ try{ dateStr = dateObj.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short'})} catch(e){ console.warn("Err formatting date detail modal:", e); dateStr = 'Err';} }
                let participantsList = 'Aucun'; if (animation.participantIds && animation.participantIds.length > 0) { participantsList = '<ul>'; animation.participantIds.forEach(pId => { const member = cachedMembers.find(m => m.id === pId); participantsList += `<li>${member ? member.firstname + ' ' + member.lastname : 'Membre inconnu'}</li>`; }); participantsList += '</ul>'; } let documentsList = 'Aucun'; if (animation.documentLinks && animation.documentLinks.length > 0) { documentsList = '<ul>'; animation.documentLinks.forEach(link => { let linkText = link; try { linkText = new URL(link).pathname.split('/').pop() || link; } catch(e){} documentsList += `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${linkText}</a></li>`; }); documentsList += '</ul>'; } animationDetailContent.innerHTML = ` <p><strong><i class="fas fa-calendar-day"></i> Date:</strong> ${dateStr}</p> <p><strong><i class="fas fa-map-marker-alt"></i> Lieu:</strong> ${animation.location || 'N/D'}</p> <p><strong><i class="fas fa-tags"></i> Type:</strong> ${animation.animationType || 'N/D'}</p> <p><strong><i class="fas fa-info-circle"></i> Statut:</strong> ${animation.status || 'N/D'}</p> <p><strong><i class="fas fa-euro-sign"></i> Budget:</strong> ${animation.budget !== undefined && animation.budget !== null ? animation.budget.toLocaleString('fr-FR') + ' €' : 'N/D'}</p> <p><strong><i class="fas fa-align-left"></i> Description:</strong><br><span style="margin-left: 24px; display: block; white-space: pre-wrap;">${animation.description || 'Aucune'}</span></p> <p><strong><i class="fas fa-users"></i> Participants:</strong></p> ${participantsList} <p><strong><i class="fas fa-paperclip"></i> Documents:</strong></p> ${documentsList} `; } catch (error) { console.error("Erreur affichage détails animation:", error); animationDetailContent.innerHTML = '<p class="error-message">Impossible de charger les détails.</p>'; currentDetailAnimationId = null; } };
        const handleExportCsvStats = () => { /* ... (Modification pour gérer date String potentiellement) ... */ if(!currentUser) {alert('Connectez-vous pour exporter.'); return;} console.log("Début export CSV stats..."); if (!membersLoaded || !animationsLoaded || !tasksLoaded) { alert("Données non chargées pour l'export."); return; } try { let csvRows = []; const headers = ['Section', 'Indicateur / Nom', 'Valeur / Détail 1', 'Détail 2', 'Détail 3'].map(escapeCsvValue).join(';'); csvRows.push(headers); /* ... (Indicateurs clés inchangés) ... */ csvRows.push(['', '', '', '', '']); const typeCountsExport = cachedAnimations.reduce((acc, a) => { const type = a.animationType || 'Non défini'; acc[type] = (acc[type] || 0) + 1; return acc; }, {}); csvRows.push(['Répartition par Type', escapeCsvValue('Type'), escapeCsvValue('Nombre'), '', ''].join(';')); if(Object.keys(typeCountsExport).length > 0) { Object.entries(typeCountsExport).forEach(([type, count]) => { csvRows.push(['', escapeCsvValue(type), escapeCsvValue(count), '', ''].join(';')); }); } else { csvRows.push(['', escapeCsvValue('Aucune donnée'), '', '', ''].join(';')); } csvRows.push(['', '', '', '', '']); const completedAnims = cachedAnimations.filter(a => a.status === 'réalisée'); csvRows.push(['Animations Réalisées', escapeCsvValue('Titre'), escapeCsvValue('Type'), escapeCsvValue('Date'), escapeCsvValue('Participants')].join(';')); if (completedAnims.length > 0) { completedAnims.forEach(anim => {
                    let dateStr = 'N/A';
                    const dateObj = getValidDateObject(anim.dateTime); // Utilise l'helper
                    if(dateObj) { try { dateStr = dateObj.toLocaleDateString('fr-FR'); } catch(e){} }
                    const participantsCount = (anim.participantIds || []).length; const animType = anim.animationType || 'N/D'; csvRows.push(['', escapeCsvValue(anim.title), escapeCsvValue(animType), escapeCsvValue(dateStr), escapeCsvValue(participantsCount)].join(';')); }); } else { csvRows.push(['', escapeCsvValue('Aucune animation réalisée'), '', '', ''].join(';')); } csvRows.push(['', '', '', '', '']); const totalCompletedForExport = completedAnims.length; const memberParticipation = cachedMembers.map(m => { let c = 0; completedAnims.forEach(a => { if ((a.participantIds || []).includes(m.id)) c++; }); return { name: `${m.firstname} ${m.lastname}`, count: c, rate: totalCompletedForExport > 0 ? (c / totalCompletedForExport) * 100 : 0 }; }).sort((a, b) => b.count - a.count); csvRows.push(['Participation Membre', escapeCsvValue('Nom Membre'), escapeCsvValue('Nb Participations'), escapeCsvValue('Taux (%)'), ''].join(';')); if (memberParticipation.length > 0) { memberParticipation.forEach(m => { csvRows.push(['', escapeCsvValue(m.name), escapeCsvValue(m.count), escapeCsvValue(m.rate.toFixed(0)), ''].join(';')); }); } else { csvRows.push(['', escapeCsvValue('Aucun membre'), '', '', ''].join(';')); } const csvString = csvRows.join('\n'); const bom = '\uFEFF'; const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${bom}${csvString}`); const link = document.createElement("a"); link.setAttribute("href", encodedUri); const exportDate = new Date().toISOString().split('T')[0]; link.setAttribute("download", `bilan_qvct_${exportDate}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); console.log("Export CSV terminé."); } catch (error) { console.error("Erreur génération/téléchargement CSV:", error); alert("Erreur création fichier CSV."); } };
        // --- Fin Event Handlers ---


        // --- Fonctions Auth ---
        const signInWithGoogle = async () => { /* ... (inchangé) ... */ };
        const signOut = async () => { /* ... (inchangé) ... */ };
        // --- Fin Fonctions Auth ---


        // --- 10. Event Listener Attachments ---
        try {
            sidebarLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); const pageId = link.getAttribute('href')?.substring(1); if(pageId) navigateTo(pageId, true); }); });
            window.addEventListener('popstate', () => { const pageId = window.location.hash.substring(1) || 'dashboard'; navigateTo(pageId, false); });
            allCloseBtns.forEach(btn => { const modal = btn.closest('.modal'); if(modal && modal.id !== 'animation-detail-modal') btn.addEventListener('click', () => closeModal(modal)); });
            allModals.forEach(modal => { if(modal.id !== 'animation-detail-modal') modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); }); });
            const detailModalCloseBtn = animationDetailModal?.querySelector('.close-btn'); if(detailModalCloseBtn) detailModalCloseBtn.addEventListener('click', () => closeModal(animationDetailModal)); if(animationDetailModal) animationDetailModal.addEventListener('click', (e) => { if (e.target === animationDetailModal) closeModal(animationDetailModal); });
            if(editFromDetailBtn) { editFromDetailBtn.addEventListener('click', () => { if(currentDetailAnimationId){ closeModal(animationDetailModal); handleEditAnimation(currentDetailAnimationId); } }); } else { console.warn('#edit-from-detail-btn manquant');}
            if(addMemberBtn) addMemberBtn.addEventListener('click', handleAddMember); else console.warn("#add-member-btn manquant");
            if(addAnimationBtn) addAnimationBtn.addEventListener('click', handleAddAnimation); else console.warn("#add-animation-btn manquant");
            if(addTaskBtn) addTaskBtn.addEventListener('click', handleAddTask); else console.warn("#add-task-btn manquant");
            if(memberForm) memberForm.addEventListener('submit', handleMemberFormSubmit); else console.warn("#member-form manquant");
            if(animationForm) animationForm.addEventListener('submit', handleAnimationFormSubmit); else console.warn("#animation-form manquant");
            if(taskForm) taskForm.addEventListener('submit', handleTaskFormSubmit); else console.warn("#task-form manquant");
            if(taskFilterAnimationSelect) { taskFilterAnimationSelect.addEventListener('change', renderTasks); } else console.warn("#task-filter-animation manquant");
            if(animationStatusFilterSelect) { animationStatusFilterSelect.addEventListener('change', renderAnimations); } else { console.warn("#animation-status-filter manquant."); }
            if(animationViewFilterSelect) { animationViewFilterSelect.addEventListener('change', renderAnimations); } else { console.warn("#animation-view-filter manquant."); }
            if (exportCsvBtn) { exportCsvBtn.addEventListener('click', handleExportCsvStats); } else { console.warn("#export-csv-btn manquant."); }
            if (loginBtn) { loginBtn.addEventListener('click', signInWithGoogle); } else { console.warn("#login-btn manquant"); }
            if (logoutBtn) { logoutBtn.addEventListener('click', signOut); } else { console.warn("#logout-btn manquant"); }

            // --- Listeners Hamburger (Commentés car non utilisés dans l'HTML fourni) ---
            // console.log('Préparation attachement listeners hamburger...');
            // const hamburgerBtn = document.querySelector('.hamburger-btn');
            // const sidebar = document.querySelector('.sidebar');
            // const overlay = document.querySelector('.overlay');
            // if (hamburgerBtn && sidebar && overlay) {
            //    hamburgerBtn.addEventListener('click', (e) => { /* ... */ });
            //    overlay.addEventListener('click', () => { /* ... */ });
            //    const sidebarNavLinksForToggle = sidebar.querySelectorAll('.nav-link');
            //    sidebarNavLinksForToggle.forEach(link => { /* ... */ });
            // } else {
            //    console.warn("Éléments hamburgerBtn, sidebar, ou overlay non trouvés.");
            // }
            // --- Fin Listeners Hamburger ---

        } catch (err) { console.error("Erreur attachement listeners:", err); }
        // --- Fin Listeners ---


        // --- 11. Observateur d'Authentification et Initialisation ---
        console.log("Mise en place de l'observateur d'authentification...");
        auth.onAuthStateChanged(async user => { /* ... (Logique d'authentification inchangée) ... */ });
        // --- Fin Observateur & Init ---

    }); // Fin DOMContentLoaded
