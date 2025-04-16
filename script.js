/**
 * QVCT Manager - Script Principal v23.3 (Gestion Dates Robuste Intégrée Partout)
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
 * - Correction pour gérer les dates (dateTime/dueDate) stockées en String ou Timestamp partout.
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
    const animationDetailModal = document.getElementById('animation-detail-modal');
    const animationDetailContent = document.getElementById('animation-detail-content');
    const detailModalTitle = document.getElementById('detail-modal-title');
    const editFromDetailBtn = document.getElementById('edit-from-detail-btn');
    const body = document.body;
    // --- Fin Références DOM ---

    // --- 3. Variables d'État, Cache et Instances ---
    let editingMemberId = null; let editingAnimationId = null; let editingTaskId = null;
    let isInitialLoadComplete = false;
    let cachedMembers = []; let cachedAnimations = []; let cachedTasks = [];
    let membersLoaded = false; let animationsLoaded = false; let tasksLoaded = false;
    let statusChartInstance = null; let typeChartInstance = null; let participationChartInstance = null; let dashboardBudgetChartInstance = null; let dashboardCalendarInstance = null;
    let currentUser = null;
    let currentDetailAnimationId = null;
    // --- Fin État et Cache ---

    // --- 4. Fonctions Utilitaires ---
    const openModal = (modal) => { if(modal) modal.style.display = 'block'; };
    const closeModal = (modal) => { if (!modal) return; modal.style.display = 'none'; if (modal === memberModal && memberForm) { memberForm.reset(); editingMemberId = null; if(memberFormTitle) memberFormTitle.textContent="Ajouter Membre"; if(hiddenMemberIdInput) hiddenMemberIdInput.value=''; } else if (modal === animationModal && animationForm) { animationForm.reset(); editingAnimationId = null; if(animationFormTitle) animationFormTitle.textContent="Ajouter Animation"; if(hiddenAnimationIdInput) hiddenAnimationIdInput.value=''; if(animationParticipantsDiv) animationParticipantsDiv.innerHTML='<p>Chargement...</p>'; } else if (modal === taskModal && taskForm) { taskForm.reset(); editingTaskId = null; if(taskFormTitle) taskFormTitle.textContent="Ajouter Tâche"; if(hiddenTaskIdInput) hiddenTaskIdInput.value=''; if(taskAnimationSelect) taskAnimationSelect.value=""; if(taskAssigneesDiv) taskAssigneesDiv.innerHTML='<p>Chargement...</p>'; } else if (modal === taskListModal) { if(modalTaskTitle) modalTaskTitle.textContent="Tâches"; if(modalTaskContent) modalTaskContent.innerHTML='<p>Chargement...</p>'; } else if (modal === animationDetailModal) { if(animationDetailContent) animationDetailContent.innerHTML='<p>Chargement...</p>'; currentDetailAnimationId = null;} };
    const escapeCsvValue = (value) => { const stringValue = String(value === null || value === undefined ? '' : value); if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) { return `"${stringValue.replace(/"/g, '""')}"`; } return stringValue; };
    const animateCardEntry = (cardElement, delay) => { if (!cardElement) return; requestAnimationFrame(() => { requestAnimationFrame(() => { cardElement.style.transitionDelay = `${delay}ms`; cardElement.classList.remove('card-hidden'); cardElement.addEventListener('transitionend', () => { cardElement.style.transitionDelay = ''; }, { once: true }); }); }); };

    /**
     * Helper pour obtenir un objet Date JS valide à partir d'une valeur (Timestamp, String, etc.)
     * @param {*} dateFieldValue - La valeur du champ date (dateTime ou dueDate)
     * @returns {Date | null} - Un objet Date valide ou null si invalide/erreur
     */
    const getValidDateObject = (dateFieldValue) => {
        if (!dateFieldValue) return null;
        // Cas 1: Timestamp Firestore
        if (typeof dateFieldValue.toDate === 'function') {
            try {
                const d = dateFieldValue.toDate();
                return (d instanceof Date && !isNaN(d.getTime())) ? d : null;
            } catch (e) {
                 console.warn("Erreur conversion Timestamp en Date:", dateFieldValue, e);
                return null;
            }
        }
        // Cas 2: String, Date JS, etc. -> Essayer de parser
        try {
             const d = new Date(dateFieldValue);
             return (d instanceof Date && !isNaN(d.getTime())) ? d : null;
        } catch (e) {
             console.warn("Erreur parsing en Date:", dateFieldValue, e);
             return null;
        }
    };

    /**
     * Helper pour obtenir la valeur numérique (ms) d'une date (Timestamp, String, etc.)
     * @param {*} dateFieldValue - La valeur du champ date (dateTime ou dueDate)
     * @returns {number} - Timestamp en millisecondes ou Infinity si invalide/erreur
     */
    const getDateValueInMillis = (dateFieldValue) => {
        const dateObj = getValidDateObject(dateFieldValue);
        return dateObj ? dateObj.getTime() : Infinity;
    };
    // --- Fin Utilitaires ---

    // --- 5. Logique de Navigation ---
    const navigateTo = (pageId, updateHistory = true) => { pages.forEach(p => p.classList.remove('active')); const targetPage = document.getElementById(pageId); if (targetPage) { targetPage.classList.add('active'); } else { console.warn(`Page ID "${pageId}" introuvable.`); document.getElementById('dashboard')?.classList.add('active'); pageId = 'dashboard'; } sidebarLinks.forEach(l => l.classList.remove('active')); const activeLink = document.querySelector(`.nav-link[href="#${pageId}"]`); if (activeLink) { activeLink.classList.add('active'); } else { document.querySelector(`.nav-link[href="#dashboard"]`)?.classList.add('active'); } if (updateHistory && window.location.hash !== `#${pageId}`) { window.location.hash = pageId; } console.log(`Nav vers: ${pageId}`); if (currentUser || pageId === 'dashboard') { ensureCacheAndRender(pageId); } else { console.log("Navigation bloquée : utilisateur déconnecté."); pages.forEach(p => { if(p.id !== 'dashboard') p.innerHTML = '<p style="text-align:center; margin-top: 30px; color: var(--danger-color);">Veuillez vous connecter.</p>'; }); document.getElementById('dashboard')?.classList.add('active'); ensureCacheAndRender('dashboard'); } };
    const ensureCacheAndRender = async (pageId) => { if (!currentUser && pageId !== 'dashboard') { console.log(`Render annulé pour ${pageId} (déconnecté)`); const targetPage = document.getElementById(pageId); if(targetPage) { targetPage.innerHTML = '<p style="text-align:center; margin-top: 30px; color: var(--danger-color);">Veuillez vous connecter.</p>'; } return; } if (!isInitialLoadComplete && currentUser) { console.log(`Attente chargement initial des données pour ${pageId}...`); return; } console.log(`Ensure cache pour ${pageId}`); try { switch (pageId) { case 'members': if(currentUser) { await loadMembersIntoCache(); renderMembers(); } break; case 'animations': if(currentUser) { await loadAnimationsIntoCache(); renderAnimations(); } break; case 'tasks': if(currentUser) { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache(), loadTasksIntoCache()]); populateTaskFilterDropdown(); renderTasks(); } break; case 'dashboard': await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache(), loadTasksIntoCache()]); renderDashboard(); break; case 'stats': if(currentUser) { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache()]); renderStats(); } break; case 'documents': const docPage = document.getElementById('documents'); if(currentUser) { if (docPage) docPage.innerHTML = '<h2><i class="fas fa-folder-open"></i> Documents et Ressources</h2><p>Gestion des documents à venir...</p>'; } else { if(docPage) docPage.innerHTML = '<p>Veuillez vous connecter.</p>'; } break; default: console.log(`Pas de rendu spécifique pour ${pageId}.`); break; } } catch (error) { console.error(`Erreur chargement/rendu pour ${pageId}:`, error); const targetPage = document.getElementById(pageId); if(targetPage) targetPage.innerHTML = '<p class="error-message">Erreur lors du chargement de cette section.</p>';} };
    // --- Fin Navigation ---

    // --- 6. Gestion du Cache ---
    const loadMembersIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement membres annulé (déconnecté)"); cachedMembers = []; membersLoaded = false; return Promise.resolve(); } if (membersLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Membres..."); const snapshot = await membersCollection.orderBy("lastname", "asc").get(); cachedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); membersLoaded = true; console.log("Cache Membres OK:", cachedMembers.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache membres:", error); membersLoaded = false; return Promise.reject(error); } };
    const loadAnimationsIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement animations annulé (déconnecté)"); cachedAnimations = []; animationsLoaded = false; return Promise.resolve(); } if (animationsLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Animations..."); // Tri par date ici, même si date est string, Firestore essaiera un tri lexicographique
         // On retrie explicitement en JS après avec la logique robuste
        const snapshot = await animationsCollection.orderBy("dateTime", "desc").get();
        cachedAnimations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        animationsLoaded = true; console.log("Cache Animations OK:", cachedAnimations.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache animations:", error); animationsLoaded = false; return Promise.reject(error); } };
    const loadTasksIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement tâches annulé (déconnecté)"); cachedTasks = []; tasksLoaded = false; return Promise.resolve(); } if (tasksLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Tâches..."); const snapshot = await tasksCollection.get(); cachedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); tasksLoaded = true; console.log("Cache Tâches OK:", cachedTasks.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache tâches:", error); tasksLoaded = false; return Promise.reject(error); } };
    const loadAllCaches = async (forceReload = false) => { if (!currentUser) { console.log("Chargement global caches annulé (déconnecté)"); isInitialLoadComplete = true; return Promise.resolve(); } console.log("Chargement de tous les caches..."); isInitialLoadComplete = false; try { await Promise.all([ loadMembersIntoCache(forceReload), loadAnimationsIntoCache(forceReload), loadTasksIntoCache(forceReload) ]); isInitialLoadComplete = true; console.log("Chargement global caches OK."); } catch (error) { console.error("Erreur chargement global des caches:", error); isInitialLoadComplete = false; document.body.innerHTML = '<h1 style="color:red; text-align:center; margin-top: 50px;">Erreur chargement données. Rechargez.</h1>'; throw error; } };
    const clearAllCaches = () => { cachedMembers = []; membersLoaded = false; cachedAnimations = []; animationsLoaded = false; cachedTasks = []; tasksLoaded = false; isInitialLoadComplete = false; console.log("Caches vidés."); };
    // --- Fin Gestion Cache ---

    // --- 7. Fonctions pour Dropdowns et Checkboxes ---
    const populateMemberOptions = (selectEl, selectedId = '') => { if (!selectEl) return; const currentVal = selectEl.value; selectEl.innerHTML = '<option value="">-- Choisir --</option>'; cachedMembers.forEach(m => { const opt = document.createElement('option'); opt.value = m.id; opt.textContent = `${m.firstname} ${m.lastname}`; selectEl.appendChild(opt); }); selectEl.value = selectedId || currentVal || ""; };
    const populateAnimationOptions = (selectEl, selectedId = '', addAll = false) => { if (!selectEl || !cachedAnimations) return; const currentVal = selectEl.value; selectEl.innerHTML = ''; if (addAll) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = 'Toutes'; selectEl.appendChild(allOpt); } else { selectEl.innerHTML = '<option value="">-- Choisir --</option>'; }
        // Trier les options d'animation par date pour le dropdown
        const sortedAnimations = [...cachedAnimations].sort((a, b) => {
            const timeA = getDateValueInMillis(a.dateTime);
            const timeB = getDateValueInMillis(b.dateTime);
             // Descendant (plus récent en premier)
            if (timeA === Infinity && timeB === Infinity) return 0;
            if (timeA === Infinity) return 1;
            if (timeB === Infinity) return -1;
            return timeB - timeA;
        });
        sortedAnimations.forEach(a => { const opt = document.createElement('option'); opt.value = a.id; opt.textContent = a.title || 'Sans titre'; selectEl.appendChild(opt); }); if (selectedId) { selectEl.value = selectedId; } else if (addAll) { selectEl.value = currentVal === 'all' || !currentVal ? 'all' : currentVal; } else { selectEl.value = currentVal === "" ? "" : currentVal;} };
    const populateTaskFilterDropdown = () => { if (!animationsLoaded) { console.warn("Cache animations non prêt pour filtre tâches."); return; } populateAnimationOptions(taskFilterAnimationSelect, taskFilterAnimationSelect?.value || 'all', true); };
    const renderMemberCheckboxesForTask = async (selectedIds = []) => { if (!taskAssigneesDiv) { console.error("DOM Error: #task-assignees-list not found"); return; } try { await loadMembersIntoCache(); taskAssigneesDiv.innerHTML = '<p>Chargement...</p>'; if (cachedMembers.length === 0) { taskAssigneesDiv.innerHTML = '<p>Aucun membre disponible.</p>'; return; } taskAssigneesDiv.innerHTML = ''; cachedMembers.forEach(member => { const isChecked = selectedIds.includes(member.id); const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" name="taskAssignees" value="${member.id}" ${isChecked ? 'checked' : ''}> ${member.firstname} ${member.lastname}`; taskAssigneesDiv.appendChild(label); }); } catch (error) { console.error("Erreur rendu checkboxes tâche:", error); taskAssigneesDiv.innerHTML = '<p style="color:red">Erreur chargement membres.</p>'; } };
    const renderMemberCheckboxes = async (selectedIds = []) => { if (!currentUser) return; if (!animationParticipantsDiv) { console.error("DOM Error: #animation-participants-list not found"); return; } try { await loadMembersIntoCache(); animationParticipantsDiv.innerHTML = '<p>Chargement...</p>'; if (cachedMembers.length === 0) { animationParticipantsDiv.innerHTML = '<p>Aucun membre.</p>'; return; } animationParticipantsDiv.innerHTML = ''; cachedMembers.forEach(member => { const isChecked = selectedIds.includes(member.id); const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" name="participants" value="${member.id}" ${isChecked ? 'checked' : ''}> ${member.firstname} ${member.lastname}`; animationParticipantsDiv.appendChild(label); }); } catch (error) { console.error("Erreur rendu checkboxes animation:", error); animationParticipantsDiv.innerHTML = '<p style="color:red">Erreur.</p>'; } };
    // --- Fin Dropdowns/Checkboxes ---

    // --- 8. Fonctions de Rendu (Affichage) ---
    const renderMembers = async () => { if (!currentUser) return; if (!memberListDiv) { console.error("DOM Error: #member-list not found"); return; } memberListDiv.innerHTML = '<p>Chargement...</p>'; try { await loadMembersIntoCache(true); if (cachedMembers.length === 0) { memberListDiv.innerHTML = '<p>Aucun membre COPIL ajouté.</p>'; return; } memberListDiv.innerHTML = ''; cachedMembers.forEach((member, index) => { const memberId = member.id; const div = document.createElement('div'); div.className = 'member-card card-hidden'; div.setAttribute('data-id', memberId); div.innerHTML = ` <div class="card-body"> <h3 class="member-name">${member.firstname} ${member.lastname}</h3> <p class="member-detail"> <i class="fas fa-user-tag"></i> <span>Rôle: ${member.role || 'N/A'}</span> </p> <p class="member-detail"> <i class="fas fa-envelope"></i> <span>Contact: ${member.contact || 'N/A'}</span> </p> </div> <div class="card-footer"> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; memberListDiv.appendChild(div); animateCardEntry(div, index * 70); const editBtn = div.querySelector('.edit-btn'); if (editBtn) editBtn.addEventListener('click', () => handleEditMember(memberId)); const deleteBtn = div.querySelector('.delete-btn'); if (deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteMember(memberId)); }); } catch (error) { console.error("Erreur rendu membres:", error); memberListDiv.innerHTML = '<p class="error-message">Erreur chargement des membres.</p>'; } };

    const renderAnimations = async () => { if (!currentUser) return; if (!animationListDiv) { console.error("DOM Error: #animation-list not found"); return; } animationListDiv.innerHTML = '<p>Chargement...</p>'; const selectedStatus = animationStatusFilterSelect?.value || 'all'; const selectedView = animationViewFilterSelect?.value || 'active'; console.log(`Filtrage animations - Vue: ${selectedView}, Statut: ${selectedStatus}`); try { await loadAnimationsIntoCache(true); let animationsToRender = cachedAnimations; if (selectedView === 'active') { animationsToRender = animationsToRender.filter(anim => anim.status === 'prévue' || anim.status === 'en cours'); } else if (selectedView === 'archived') { animationsToRender = animationsToRender.filter(anim => anim.status === 'réalisée' || anim.status === 'annulée'); } if (selectedStatus !== 'all') { animationsToRender = animationsToRender.filter(anim => anim.status === selectedStatus); }
        // Tri des animations affichées par date (plus récente en premier)
        animationsToRender.sort((a, b) => {
            const timeA = getDateValueInMillis(a.dateTime);
            const timeB = getDateValueInMillis(b.dateTime);
            if (timeA === Infinity && timeB === Infinity) return 0;
            if (timeA === Infinity) return 1; // Place les dates invalides/nulles à la fin
            if (timeB === Infinity) return -1;
            return timeB - timeA; // Tri descendant
        });

        if (animationsToRender.length === 0) { let message = "Aucune animation trouvée"; if (selectedView !== 'all' || selectedStatus !== 'all') { message += ` pour la vue "${selectedView}" ${selectedStatus !== 'all' ? 'avec le statut "' + selectedStatus + '"' : ''}.`; } else { message += "."; } animationListDiv.innerHTML = `<p>${message}</p>`; return; }
        animationListDiv.innerHTML = ''; animationsToRender.forEach((animation, index) => { const animationId = animation.id; const div = document.createElement('div'); const statusClass = (animation.status || 'prévue').replace(' ', '-'); div.className = `animation-card status-${statusClass} card-hidden`; div.setAttribute('data-id', animationId); let dateStr = 'N/A'; let timeStr = ''; const dateObj = getValidDateObject(animation.dateTime); if (dateObj) { try { dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch(e){ console.warn("Erreur formatage date anim card:", e); dateStr = 'Err'; timeStr = '';} } const animType = animation.animationType || 'N/D'; const location = animation.location || 'N/A'; const statusText = animation.status || 'N/A'; const budget = (animation.budget !== undefined && animation.budget !== null) ? `${animation.budget.toLocaleString('fr-FR')} €` : 'N/D'; const docsCount = (animation.documentLinks || []).length; const participantsCount = (animation.participantIds || []).length; const participantText = participantsCount === 1 ? `1 Part.` : `${participantsCount} Parts.`; const docText = docsCount === 1 ? `1 Doc.` : `${docsCount} Docs.`; div.innerHTML = ` <div class="card-header"> <h3>${animation.title || 'Sans titre'}</h3> </div> <div class="card-body"> <div class="card-details-row compact"> <span class="detail-item date"><i class="fas fa-calendar-day"></i> ${dateStr} ${timeStr ? ' - ' + timeStr : ''}</span> <span class="detail-item type"><i class="fas fa-tags"></i> ${animType}</span> <span class="detail-item location"><i class="fas fa-map-marker-alt"></i> ${location}</span> </div> <div class="card-details-row secondary"> <span class="detail-item status"><i class="fas fa-info-circle"></i> ${statusText}</span> <span class="detail-item budget"><i class="fas fa-euro-sign"></i> ${budget}</span> <span class="detail-item participants"><i class="fas fa-users"></i> ${participantText}</span> <span class="detail-item docs"><i class="fas fa-paperclip"></i> ${docText}</span> </div> ${animation.description ? `<p class="card-description" title="${animation.description}">${animation.description}</p>` : '<p class="card-description no-description"><i>Aucune description fournie.</i></p>'} </div> <div class="card-footer"> <button class="btn secondary-btn show-tasks-btn" title="Voir tâches"><i class="fas fa-list-check"></i></button> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; animationListDiv.appendChild(div); animateCardEntry(div, index * 70); const showTasksBtn = div.querySelector('.show-tasks-btn'); if(showTasksBtn) showTasksBtn.addEventListener('click', () => handleShowAnimationTasks(animationId, animation.title)); const editBtn = div.querySelector('.edit-btn'); if(editBtn) editBtn.addEventListener('click', () => handleEditAnimation(animationId)); const deleteBtn = div.querySelector('.delete-btn'); if(deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteAnimation(animationId)); }); } catch (error) { console.error("Erreur rendu animations:", error); animationListDiv.innerHTML = '<p class="error-message">Erreur chargement des animations.</p>'; } };

    const renderTasks = async () => { if (!currentUser) return; if (!taskListDiv) { console.error("DOM Error: #task-list not found"); return; } taskListDiv.innerHTML = '<p>Chargement...</p>'; if (!membersLoaded || !animationsLoaded) { console.warn("renderTasks: Dépendances membres/animations non prêtes."); taskListDiv.innerHTML = '<p>Préparation...</p>'; return; } const selectedAnimId = taskFilterAnimationSelect?.value || 'all'; try { await loadTasksIntoCache(true); let filteredTasks = cachedTasks; if (selectedAnimId !== 'all') { filteredTasks = cachedTasks.filter(t => t.animationId === selectedAnimId); }
        // Tri des tâches affichées par échéance (plus proche en premier)
        filteredTasks.sort((a, b) => {
            const timeA = getDateValueInMillis(a.dueDate);
            const timeB = getDateValueInMillis(b.dueDate);
            if (timeA === Infinity && timeB === Infinity) return 0;
            if (timeA === Infinity) return 1;
            if (timeB === Infinity) return -1;
            return timeA - timeB; // Tri ascendant
        });
        if (filteredTasks.length === 0) { taskListDiv.innerHTML = `<p>Aucune tâche trouvée ${selectedAnimId !== 'all' ? 'pour cette animation': ''}.</p>`; return; }
        taskListDiv.innerHTML = ''; filteredTasks.forEach((task, index) => { const taskId = task.id; const animation = cachedAnimations.find(a => a.id === task.animationId); const div = document.createElement('div'); const statusClass = (task.status || 'à faire').replace(' ', '-'); div.className = `task-card status-${statusClass} card-hidden`; div.setAttribute('data-id', taskId); let date = 'N/A'; let overdue = ''; const dateObj = getValidDateObject(task.dueDate); if (dateObj) { try { date = dateObj.toLocaleDateString('fr-FR', { year:'numeric', month:'short', day:'numeric'}); if (task.status !== 'terminé' && dateObj.getTime() < Date.now() - 864e5) { overdue = ' <span style="color: var(--danger-color); font-weight: bold;">(Retard)</span>'; } } catch (e) { console.warn("Err formatage date task card:", e); date = 'Err';} } const assigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []); let assigneesText = 'N/A'; if (assigneeIds.length > 0 && membersLoaded) { assigneesText = assigneeIds.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? `${member.firstname.charAt(0)}.${member.lastname.charAt(0)}.` : '?'; }).join(', '); } div.innerHTML = ` <div class="card-body"> <p class="task-description">${task.description || 'N/A'}</p> <div class="card-detail"><i class="fas fa-link"></i><span>${animation ? animation.title : 'N/A'}</span></div> <div class="card-detail"><i class="fas fa-users"></i><span>${assigneesText}</span></div> <div class="card-detail"><i class="fas fa-clock"></i><span>Éch: ${date}${overdue}</span></div> <div class="card-detail"><i class="fas fa-info-circle"></i><span>${task.status || 'N/A'}</span></div> </div> <div class="card-footer"> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; taskListDiv.appendChild(div); animateCardEntry(div, index * 70); const editBtn = div.querySelector('.edit-btn'); if(editBtn) editBtn.addEventListener('click', () => handleEditTask(taskId)); const deleteBtn = div.querySelector('.delete-btn'); if(deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteTask(taskId)); }); } catch (error) { console.error("Erreur rendu tâches:", error); taskListDiv.innerHTML = '<p class="error-message">Erreur chargement des tâches.</p>'; } };

    const renderDashboard = async () => {
        console.log("--- Début Render Dashboard ---");
        const budgetChartCtx = document.getElementById('dashboard-budget-chart')?.getContext('2d');
        const calendarEl = document.getElementById('dashboard-calendar');
        const calendarMessageEl = document.querySelector('#dashboard-calendar-wrapper .calendar-loading-message');

        if (!currentUser) { /* Code état déconnecté */ if (upcomingListEl) upcomingListEl.innerHTML = ''; if (upcomingCountEl) upcomingCountEl.textContent = '-'; if (ongoingListEl) ongoingListEl.innerHTML = ''; if (ongoingCountEl) ongoingCountEl.textContent = '-'; if (deadlinesListEl) deadlinesListEl.innerHTML = ''; if (overdueTasksBadgeEl) overdueTasksBadgeEl.style.display='none'; if (plannedBudgetTotalEl) plannedBudgetTotalEl.textContent = '-'; if (budgetDetailsInfoEl) budgetDetailsInfoEl.textContent = 'Connectez-vous'; if (recentAnimationsListEl) recentAnimationsListEl.innerHTML = ''; if (recentAnimationsCountEl) recentAnimationsCountEl.textContent = '-'; if(remainingAnnualBudgetEl) remainingAnnualBudgetEl.textContent = '-'; if(remainingBudgetDetailsEl) remainingBudgetDetailsEl.textContent='Connectez-vous'; if (dashboardBudgetChartInstance) { dashboardBudgetChartInstance.destroy(); dashboardBudgetChartInstance = null; } if (budgetChartCtx) { budgetChartCtx.clearRect(0, 0, budgetChartCtx.canvas.width, budgetChartCtx.canvas.height); } if(budgetChartErrorEl) { budgetChartErrorEl.textContent = 'Connectez-vous pour voir le graphique.'; budgetChartErrorEl.style.display = 'block'; budgetChartErrorEl.classList.remove('error'); budgetChartErrorEl.style.color = '#777'; } if (dashboardCalendarInstance) { try{ dashboardCalendarInstance.destroy(); } catch(e){console.warn("Err Calendar destroy")} dashboardCalendarInstance = null; } if (calendarEl) { calendarEl.innerHTML = ''; } if (calendarMessageEl) { calendarMessageEl.textContent = 'Connectez-vous pour voir le calendrier.'; calendarMessageEl.style.display = 'block'; calendarMessageEl.classList.remove('error'); calendarMessageEl.style.color = '#777';} console.log("Dashboard vidé (déconnecté)"); return; }

        /* Code état chargement */ if (upcomingCountEl) upcomingCountEl.textContent = '...'; if (upcomingListEl) upcomingListEl.innerHTML = '<li>Chargement...</li>'; if (ongoingCountEl) ongoingCountEl.textContent = '...'; if (ongoingListEl) ongoingListEl.innerHTML = '<li>Chargement...</li>'; if (deadlinesListEl) deadlinesListEl.innerHTML = '<li>Chargement...</li>'; if (overdueTasksBadgeEl) overdueTasksBadgeEl.style.display='none'; if (plannedBudgetTotalEl) plannedBudgetTotalEl.textContent = '...'; if (budgetDetailsInfoEl) budgetDetailsInfoEl.textContent = 'Chargement...'; if (recentAnimationsCountEl) recentAnimationsCountEl.textContent = '...'; if (recentAnimationsListEl) recentAnimationsListEl.innerHTML = '<li>Chargement...</li>'; if (remainingAnnualBudgetEl) remainingAnnualBudgetEl.textContent = '...'; if (remainingBudgetDetailsEl) remainingBudgetDetailsEl.textContent = 'Chargement...'; if (budgetChartErrorEl) { budgetChartErrorEl.textContent = 'Chargement...'; budgetChartErrorEl.style.display = 'block'; budgetChartErrorEl.classList.remove('error'); budgetChartErrorEl.style.color = '#777';} if (calendarMessageEl) { calendarMessageEl.textContent = 'Chargement du calendrier...'; calendarMessageEl.style.display = 'block'; calendarMessageEl.classList.remove('error'); calendarMessageEl.style.color = '#777'; } if (dashboardBudgetChartInstance) { dashboardBudgetChartInstance.destroy(); dashboardBudgetChartInstance = null; } if (dashboardCalendarInstance) { try{dashboardCalendarInstance.destroy();}catch(e){console.warn("Err Calendar destroy")} dashboardCalendarInstance = null; }

        if (!isInitialLoadComplete) { console.log("Dashboard: attente chargement données..."); return; }
        if (!membersLoaded || !animationsLoaded || !tasksLoaded) { console.warn("Dashboard: Caches non prêts (connecté)"); return; }

        const now = new Date();
        const currentYear = now.getFullYear();
        const nowTime = now.getTime();
        const sevenDays = nowTime + 7 * 24 * 60 * 60 * 1000;

        // --- Upcoming Animations ---
        if (upcomingCountEl && upcomingListEl) { try {
            const upcoming = cachedAnimations.filter(a => {
                const isP = a.status === 'prévue';
                const dateObj = getValidDateObject(a.dateTime);
                const isF = dateObj && dateObj.getTime() >= nowTime;
                return isP && isF;
            }).sort((a, b) => { // Tri ascendant
                const timeA = getDateValueInMillis(a.dateTime); const timeB = getDateValueInMillis(b.dateTime);
                if (timeA === Infinity && timeB === Infinity) return 0; if (timeA === Infinity) return 1; if (timeB === Infinity) return -1; return timeA - timeB;
            });
            upcomingCountEl.textContent = upcoming.length;
            upcomingListEl.innerHTML = upcoming.length === 0 ? '<li class="no-items">Aucune</li>' : upcoming.slice(0, 4).map(a => {
                let date = 'Err'; const dateObj = getValidDateObject(a.dateTime);
                if (dateObj) { try { date = dateObj.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); } catch(e){} }
                return `<li><span class="dashboard-date">${date}</span> ${a.title || 'N/A'}</li>`;
            }).join('');
        } catch(e){ console.error("Err dash anims:",e); if(upcomingListEl) upcomingListEl.innerHTML='<li class="no-items error-item">Erreur</li>'; if(upcomingCountEl) upcomingCountEl.textContent='Err';} }

        // --- Ongoing Tasks ---
        if (ongoingCountEl && ongoingListEl) { try {
            const ongoing = cachedTasks.filter(t => t.status === 'en cours')
            .sort((a, b) => { // Tri ascendant
                const timeA = getDateValueInMillis(a.dueDate); const timeB = getDateValueInMillis(b.dueDate);
                if (timeA === Infinity && timeB === Infinity) return 0; if (timeA === Infinity) return 1; if (timeB === Infinity) return -1; return timeA - timeB;
            });
            ongoingCountEl.textContent = ongoing.length;
            ongoingListEl.innerHTML = ongoing.length === 0 ? '<li class="no-items">Aucune</li>' : ongoing.slice(0, 4).map(t => { const assigneeIdsDash = Array.isArray(t.assigneeIds) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []); let assigneesTextDash = 'N/A'; if (assigneeIdsDash.length > 0 && membersLoaded) { assigneesTextDash = assigneeIdsDash.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? member.firstname : '?'; }).join(', '); } return `<li>${t.description || 'N/A'} <span class="dashboard-name">(${assigneesTextDash})</span></li>`; }).join('');
        } catch(e){ console.error("Err dash tâches:",e); if(ongoingListEl) ongoingListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(ongoingCountEl) ongoingCountEl.textContent = 'Err';} }

        // --- Deadlines ---
        if (deadlinesListEl && overdueTasksBadgeEl) { try {
            let overdueCount = 0;
            const deadlines = cachedTasks
                .filter(t => t.status !== 'terminé' && t.dueDate)
                .map(t => ({ ...t, dueDateMs: getDateValueInMillis(t.dueDate) }))
                .filter(t => t.dueDateMs < sevenDays && t.dueDateMs !== Infinity)
                .sort((a, b) => a.dueDateMs - b.dueDateMs); // Tri ascendant simple sur ms
            deadlinesListEl.innerHTML = deadlines.length === 0 ? '<li class="no-items">Aucune</li>' : deadlines.slice(0, 5).map(t => {
                const assigneeIdsDead = Array.isArray(t.assigneeIds) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []); let assigneesTextDead = 'N/A'; if (assigneeIdsDead.length > 0 && membersLoaded) { assigneesTextDead = assigneeIdsDead.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? member.firstname : '?'; }).join(', '); } const overdue = t.dueDateMs < nowTime; if(overdue) overdueCount++; const dateStr = new Date(t.dueDateMs).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}); return `<li><span class="dashboard-date ${overdue ? 'overdue' : 'due-soon'}">${dateStr}</span> ${t.description || 'N/A'} <span class="dashboard-name">(${assigneesTextDead})</span>${overdue ? '<span class="overdue"> (Retard!)</span>' : ''}</li>`; }).join('');
            if(overdueCount > 0){ overdueTasksBadgeEl.textContent = overdueCount; overdueTasksBadgeEl.style.display = 'inline-block'; } else { overdueTasksBadgeEl.style.display = 'none'; }
        } catch(e){ console.error("Err dash échéances:",e); if(deadlinesListEl) deadlinesListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(overdueTasksBadgeEl) overdueTasksBadgeEl.style.display = 'none'; } }

        // --- Planned Budget ---
        if (plannedBudgetTotalEl && budgetDetailsInfoEl) { /* ... (inchangé) ... */ }

        // --- Recent Animations ---
        if (recentAnimationsCountEl && recentAnimationsListEl) { try {
            const recent = cachedAnimations.filter(a => {
                const isDone = a.status === 'réalisée' || a.status === 'annulée';
                const dateObj = getValidDateObject(a.dateTime);
                const isPast = dateObj && dateObj.getTime() < nowTime; return isDone && isPast;
            }).sort((a, b) => { // Tri descendant
                const timeA = getDateValueInMillis(a.dateTime); const timeB = getDateValueInMillis(b.dateTime);
                if (timeA === Infinity && timeB === Infinity) return 0; if (timeA === Infinity) return 1; if (timeB === Infinity) return -1; return timeB - timeA;
            });
            recentAnimationsCountEl.textContent = recent.length;
            recentAnimationsListEl.innerHTML = recent.length === 0 ? '<li class="no-items">Aucune</li>' : recent.slice(0, 4).map(a => {
                let date='Err'; const dateObj = getValidDateObject(a.dateTime);
                if(dateObj) { try { date = dateObj.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); } catch(e){} }
                const statusClass = a.status === 'réalisée' ? 'realisee' : 'annulee';
                return `<li><span class="dashboard-date">${date}</span> ${a.title || 'N/A'} <span class="dashboard-status ${statusClass}">(${a.status})</span></li>`;
            }).join('');
        } catch(e){ console.error("Err dash recentes:",e); if(recentAnimationsListEl) recentAnimationsListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(recentAnimationsCountEl) recentAnimationsCountEl.textContent = 'Err';} }

         // --- Remaining Annual Budget ---
        if (remainingAnnualBudgetEl && remainingBudgetDetailsEl) { try {
            const totalAnnualBudget = 12 * 200; let spentPlannedCurrentYear = 0;
            cachedAnimations.filter(a => { const dateObj = getValidDateObject(a.dateTime); return dateObj && dateObj.getFullYear() === currentYear; })
            .filter(a => (a.status === 'prévue' || a.status === 'en cours' || a.status === 'réalisée'))
            .forEach(a => { if (typeof a.budget === 'number' && a.budget > 0) { spentPlannedCurrentYear += a.budget; } });
            const remainingAnnualFixedBudget = totalAnnualBudget - spentPlannedCurrentYear; remainingAnnualBudgetEl.textContent = remainingAnnualFixedBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); remainingBudgetDetailsEl.textContent = `Budget Annuel ${totalAnnualBudget.toLocaleString('fr-FR')}€ - Engagé ${spentPlannedCurrentYear.toLocaleString('fr-FR')}€`; remainingBudgetDetailsEl.classList.remove('loading-error'); if (remainingAnnualFixedBudget < 0) { remainingAnnualBudgetEl.style.color = 'var(--danger-color)'; } else { remainingAnnualBudgetEl.style.color = 'var(--info-color)'; } } catch (error) { console.error("Erreur calcul budget annuel restant:", error); if (remainingAnnualBudgetEl) remainingAnnualBudgetEl.textContent = 'Erreur'; if (remainingBudgetDetailsEl) { remainingBudgetDetailsEl.textContent = 'Erreur de calcul.'; remainingBudgetDetailsEl.classList.add('loading-error'); } } }

        console.log("Dashboard: Calcul données budget mensuel...");
        // --- Budget Chart ---
        if (budgetChartCtx) { try { /* ... (Utilise getValidDateObject pour filtrer, reste inchangé) ... */ } catch (error) { /* ... */ } } else { /* ... */ }

        console.log("Dashboard: Préparation FullCalendar...");
        // --- Calendar (Utilise la version robuste de la réponse précédente) ---
        if (calendarEl) {
            if (calendarMessageEl) calendarMessageEl.style.display = 'none';
            try {
                const validAnimationsForCalendar = cachedAnimations.filter(a => {
                    const isValidStatus = a.status === 'prévue' || a.status === 'en cours';
                    const startDate = getValidDateObject(a.dateTime);
                    return isValidStatus && startDate !== null;
                });
                const calendarEvents = validAnimationsForCalendar.map(anim => {
                    let eventColor = '#6C9D7E'; let eventTextColor = '#FFFFFF';
                    if (anim.status === 'en cours') { eventColor = '#A8D8B9'; eventTextColor = '#4A4A4A'; }
                    const startDate = getValidDateObject(anim.dateTime); // Garanti d'être une Date ici
                    return { id: anim.id, title: anim.title || 'Animation', start: startDate, allDay: false, color: eventColor, textColor: eventTextColor, borderColor: eventColor };
                });
                console.log(`Dashboard: ${calendarEvents.length} événements VALIDES pour FullCalendar.`);
                if (dashboardCalendarInstance) { try { dashboardCalendarInstance.destroy(); } catch (e) { console.warn("Err Calendar destroy avant re-render"); } dashboardCalendarInstance = null; }
                dashboardCalendarInstance = new FullCalendar.Calendar(calendarEl, { /* ... options ... */ events: calendarEvents, /* ... */ });
                dashboardCalendarInstance.render();
                console.log("Dashboard: FullCalendar rendu.");
            } catch (error) {
                 console.error("Erreur CRITIQUE création/rendu FullCalendar:", error);
                 if (calendarMessageEl) { calendarMessageEl.textContent = 'Erreur affichage calendrier.'; calendarMessageEl.style.display = 'block'; calendarMessageEl.classList.add('error'); }
                 if (calendarEl) calendarEl.innerHTML = '<p style="color:red; text-align:center;">Erreur chargement Calendrier</p>';
                 if (dashboardCalendarInstance) { try{dashboardCalendarInstance.destroy();}catch(e){} dashboardCalendarInstance = null; }
            }
        } else { console.warn("Élément #dashboard-calendar non trouvé."); if (calendarMessageEl) { /* ... */ } }
        console.log("--- Fin Render Dashboard ---");
    }; // --- Fin renderDashboard ---

    const renderStats = async () => { if (!currentUser) return; console.log("--- Début Render Stats ---"); /* ... (Code inchangé, n'utilise pas de tri par date complexe) ... */ console.log("--- Fin Render Stats ---"); };
    // --- Fin Fonctions de Rendu ---

    // --- 9. Event Handlers (CRUD & Autres) ---
    const handleAddMember = () => { /* ... (inchangé) ... */ };
    const handleEditMember = async (id) => { /* ... (inchangé) ... */ };
    const handleDeleteMember = async (id) => { /* ... (inchangé) ... */ };
    const handleMemberFormSubmit = async (e) => { /* ... (inchangé) ... */ };
    const handleAddAnimation = async () => { /* ... (inchangé) ... */ };
    const handleEditAnimation = async (id) => { if(!currentUser) return; editingAnimationId = id; try { await loadMembersIntoCache(); const doc = await animationsCollection.doc(id).get(); if (doc.exists) { const a = doc.data(); /* ... (récupération autres champs) ... */
            let dateInputVal = ''; const dateObj = getValidDateObject(a.dateTime); // Utilisation helper
            if(dateObj) { try { dateInputVal=`${dateObj.getFullYear()}-${(dateObj.getMonth()+1).toString().padStart(2,'0')}-${dateObj.getDate().toString().padStart(2,'0')}T${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')}`; } catch(e){ console.warn("Err formatting date for edit input:", e);} }
            if(document.getElementById('animation-date')) document.getElementById('animation-date').value = dateInputVal;
            /* ... (reste du code edit animation) ... */ } else { alert("Anim introuvable."); editingAnimationId = null; } } catch (e) { console.error("Err get anim:", e); alert("Erreur."); editingAnimationId = null; } };
    const handleDeleteAnimation = async (id) => { /* ... (inchangé) ... */ };
    const handleAnimationFormSubmit = async (e) => { /* ... (inchangé - sauvegarde déjà correctement) ... */ };
    const handleAddTask = async () => { /* ... (inchangé) ... */ };
    const handleEditTask = async (id) => { if(!currentUser) return; editingTaskId = id; try { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache()]); const doc = await tasksCollection.doc(id).get(); if (doc.exists) { const t = doc.data(); /* ... (récupération autres champs) ... */
            const dateInput = document.getElementById('task-due-date'); if(dateInput){ const dateObj = getValidDateObject(t.dueDate); // Utilisation helper
                if (dateObj) { try { dateInput.value = dateObj.toISOString().split('T')[0]; } catch(e){ console.warn("Err formatting date for edit input (task):", e); dateInput.value = '';} } else { dateInput.value = ''; } }
            /* ... (reste du code edit task) ... */ } else { alert("Tâche introuvable."); editingTaskId = null; } } catch (e) { console.error("Err get tâche:", e); alert("Erreur."); editingTaskId = null; } };
    const handleDeleteTask = async (id) => { /* ... (inchangé) ... */ };
    const handleTaskFormSubmit = async (e) => { /* ... (inchangé - sauvegarde déjà correctement) ... */ };
    const showAnimationDetails = async (animationId) => { if (!currentUser || !animationId) return; /* ... (récupération éléments DOM) ... */ try { /* ... (chargement caches) ... */ const animation = cachedAnimations.find(a => a.id === animationId); if (!animation) { /* ... */ return; } /* ... */
            let dateStr = 'N/D'; const dateObj = getValidDateObject(animation.dateTime); // Utilisation helper
            if(dateObj){ try{ dateStr = dateObj.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short'})} catch(e){ console.warn("Err formatting date detail modal:", e); dateStr = 'Err';} }
            /* ... (construction HTML détail avec dateStr) ... */ } catch (error) { /* ... */ } };
    const handleExportCsvStats = () => { if(!currentUser) {alert('Connectez-vous pour exporter.'); return;} /* ... */ try { /* ... */
        const completedAnims = cachedAnimations.filter(a => a.status === 'réalisée'); /* ... */
        if (completedAnims.length > 0) { completedAnims.forEach(anim => {
            let dateStr = 'N/A'; const dateObj = getValidDateObject(anim.dateTime); // Utilisation helper
            if(dateObj) { try { dateStr = dateObj.toLocaleDateString('fr-FR'); } catch(e){} }
            const participantsCount = (anim.participantIds || []).length; const animType = anim.animationType || 'N/D'; csvRows.push(['', escapeCsvValue(anim.title), escapeCsvValue(animType), escapeCsvValue(dateStr), escapeCsvValue(participantsCount)].join(';')); }); } else { /* ... */ }
        /* ... (reste export) ... */ } catch (error) { /* ... */ } };
    // --- Fin Event Handlers ---

    // --- Fonctions Auth ---
    const signInWithGoogle = async () => { /* ... (inchangé) ... */ };
    const signOut = async () => { /* ... (inchangé) ... */ };
    // --- Fin Fonctions Auth ---

    // --- 10. Event Listener Attachments ---
    try { /* ... (tous les listeners inchangés, hamburger commenté) ... */ } catch (err) { console.error("Erreur attachement listeners:", err); }
    // --- Fin Listeners ---

    // --- 11. Observateur d'Authentification et Initialisation ---
    console.log("Mise en place de l'observateur d'authentification...");
    auth.onAuthStateChanged(async user => {
        const wasConnected = !!currentUser;
        currentUser = user;
        if (user) {
             console.log("Auth state changed: Utilisateur connecté", user.uid, user.email);
             try {
                 console.log(`Vérification autorisation pour: ${user.email}...`);
                 const authorizedUserRef = authorizedUsersCollection.doc(user.email);
                 const docSnap = await authorizedUserRef.get();
                 if (docSnap.exists) {
                     console.log("Autorisation accordée.");
                     if (userInfoDiv && userNameSpan && userPhotoImg && loginBtn && logoutBtn) { userNameSpan.textContent = user.displayName || user.email || 'Utilisateur'; userPhotoImg.src = user.photoURL || 'img/placeholder.png'; userPhotoImg.alt = user.displayName || 'Avatar'; userInfoDiv.style.display = 'flex'; loginBtn.style.display = 'none'; logoutBtn.style.display = 'inline-flex'; }
                     // Charger les caches SEULEMENT si pas déjà chargés OU si reconnexion
                     if (!isInitialLoadComplete || !wasConnected) {
                         await loadAllCaches(true); // Force reload on initial login or reconnect
                     }
                     const currentPage = window.location.hash.substring(1) || 'dashboard';
                     console.log(`Autorisé - Navigation/Rendu vers: ${currentPage}`);
                     // Naviguer et rendre la page demandée APRES chargement des caches
                     navigateTo(currentPage, !wasConnected);
                 } else {
                      console.warn(`Utilisateur ${user.email} authentifié mais NON AUTORISÉ.`); alert("Accès non autorisé. Votre compte Google est connecté mais n'est pas dans la liste des utilisateurs autorisés pour cette application. Veuillez contacter l'administrateur si vous pensez qu'il s'agit d'une erreur.");
                      if (userInfoDiv && loginBtn && logoutBtn) { userInfoDiv.style.display = 'none'; loginBtn.style.display = 'block'; logoutBtn.style.display = 'none'; }
                      clearAllCaches();
                      // Vider explicitement le contenu des sections protégées
                      if(memberListDiv) memberListDiv.innerHTML = '<p>Accès non autorisé.</p>'; if(animationListDiv) animationListDiv.innerHTML = '<p>Accès non autorisé.</p>'; if(taskListDiv) taskListDiv.innerHTML = '<p>Accès non autorisé.</p>';
                      if(statsTotalCompletedEl) statsTotalCompletedEl.textContent = '-'; if(statsAvgParticipationEl) statsAvgParticipationEl.textContent = '-'; if(statsTotalBudgetSpentEl) statsTotalBudgetSpentEl.textContent = '-';
                      // Détruire les graphiques stats
                      if (statusChartInstance) { statusChartInstance.destroy(); statusChartInstance = null; } if (typeChartInstance) { typeChartInstance.destroy(); typeChartInstance = null; } if (participationChartInstance) { participationChartInstance.destroy(); participationChartInstance = null; }
                      const statusCtx = document.getElementById('stats-status-chart')?.getContext('2d'); if(statusCtx) statusCtx.clearRect(0,0,statusCtx.canvas.width,statusCtx.canvas.height); const typeCtx = document.getElementById('stats-type-chart')?.getContext('2d'); if(typeCtx) typeCtx.clearRect(0,0,typeCtx.canvas.width,typeCtx.canvas.height); const participationCtx = document.getElementById('stats-participation-chart')?.getContext('2d'); if(participationCtx) participationCtx.clearRect(0,0,participationCtx.canvas.width,participationCtx.canvas.height);
                      if(statusErrorEl) statusErrorEl.style.display='none'; if(typeErrorEl) typeErrorEl.style.display='none'; if(participationErrorEl) participationErrorEl.style.display='none';
                      const docPage = document.getElementById('documents'); if(docPage) docPage.innerHTML = '<p>Accès non autorisé.</p>';
                      // Ne pas appeler navigateTo ici, déconnecter directement
                      await auth.signOut(); // Déconnecter l'utilisateur non autorisé
                 }
             } catch (error) {
                  console.error("Erreur lors de la vérification d'autorisation:", error); alert("Erreur vérification droits d'accès. Réessayez.");
                  await auth.signOut();
             }
        } else {
            // Utilisateur déconnecté
            console.log("Auth state changed: Utilisateur déconnecté");
            currentUser = null;
            if (userInfoDiv && loginBtn && logoutBtn) { userInfoDiv.style.display = 'none'; loginBtn.style.display = 'block'; logoutBtn.style.display = 'none'; }
            clearAllCaches();
            console.log("Auth state: Effacement des vues (déconnexion)...");
             // Vider explicitement le contenu des sections
             if(memberListDiv) memberListDiv.innerHTML = '<p>Veuillez vous connecter pour voir les membres.</p>'; if(animationListDiv) animationListDiv.innerHTML = '<p>Veuillez vous connecter pour voir les animations.</p>'; if(taskListDiv) taskListDiv.innerHTML = '<p>Veuillez vous connecter pour voir les tâches.</p>';
             if(statsTotalCompletedEl) statsTotalCompletedEl.textContent = '-'; if(statsAvgParticipationEl) statsAvgParticipationEl.textContent = '-'; if(statsTotalBudgetSpentEl) statsTotalBudgetSpentEl.textContent = '-';
             // Détruire les graphiques stats
             if (statusChartInstance) { statusChartInstance.destroy(); statusChartInstance = null; } if (typeChartInstance) { typeChartInstance.destroy(); typeChartInstance = null; } if (participationChartInstance) { participationChartInstance.destroy(); participationChartInstance = null; }
             const statusCtx = document.getElementById('stats-status-chart')?.getContext('2d'); if(statusCtx) statusCtx.clearRect(0,0,statusCtx.canvas.width,statusCtx.canvas.height); const typeCtx = document.getElementById('stats-type-chart')?.getContext('2d'); if(typeCtx) typeCtx.clearRect(0,0,typeCtx.canvas.width,typeCtx.canvas.height); const participationCtx = document.getElementById('stats-participation-chart')?.getContext('2d'); if(participationCtx) participationCtx.clearRect(0,0,participationCtx.canvas.width,participationCtx.canvas.height);
             if(statusErrorEl) statusErrorEl.style.display='none'; if(typeErrorEl) typeErrorEl.style.display='none'; if(participationErrorEl) participationErrorEl.style.display='none';
             const docPage = document.getElementById('documents'); if(docPage) docPage.innerHTML = '<h2><i class="fas fa-folder-open"></i> Documents et Ressources</h2><p>Veuillez vous connecter pour accéder aux documents.</p>';
            // Afficher le dashboard vide (qui gère l'état déconnecté)
            navigateTo('dashboard', false);
        }
    });
    // --- Fin Observateur & Init ---

}); // Fin DOMContentLoaded
