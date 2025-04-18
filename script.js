    /**
     * QVCT Manager - Script Principal v23 (Intégration Modale Détail Animation + TUI Calendar)
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

        const hamburgerBtn = document.querySelector('.hamburger-btn');
    const sidebar = document.querySelector('.sidebar'); // Vous l'avez peut-être déjà sélectionné ? Sinon, ajoutez-le.
    const overlay = document.querySelector('.overlay');
    const body = document.body; // Vous pouvez aussi utiliser document.body directement dans la fonction si vous préférez

        console.log('Vérification éléments:', { hamburgerBtn, sidebar, overlay, body });
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

        const toggleSidebar = () => {
        body.classList.toggle('sidebar-open');
    };

 /**
 * Helper pour obtenir la valeur numérique (ms) d'une date (Timestamp, String, etc.)
 * @param {*} dateFieldValue - La valeur du champ date (dateTime ou dueDate)
 * @returns {number} - Timestamp en millisecondes ou Infinity si invalide/erreur
 */
const getDateValueInMillis = (dateFieldValue) => {
    if (!dateFieldValue) return Infinity; // Gère null ou undefined
    // Cas 1: Timestamp Firestore
    if (typeof dateFieldValue.toDate === 'function') {
        try {
            const d = dateFieldValue.toDate();
            // Vérifier aussi la validité au cas où toDate renverrait qqch d'invalide
            return (d instanceof Date && !isNaN(d.getTime())) ? d.getTime() : Infinity;
        } catch (e) {
            console.warn("Erreur conversion Timestamp:", dateFieldValue, e);
            return Infinity; // Erreur de conversion
        }
    }
    // Cas 2: String, Date JS, etc. -> Essayer de parser
    try {
         const d = new Date(dateFieldValue);
         return (d instanceof Date && !isNaN(d.getTime())) ? d.getTime() : Infinity;
    } catch (e) {
         console.warn("Erreur parsing Date:", dateFieldValue, e);
         return Infinity; // Erreur de parsing
    }
};       // --- Fin Utilitaires ---
    
    
        // --- 5. Logique de Navigation ---
        // ... (Identique v21) ...
        const navigateTo = (pageId, updateHistory = true) => { pages.forEach(p => p.classList.remove('active')); const targetPage = document.getElementById(pageId); if (targetPage) { targetPage.classList.add('active'); } else { console.warn(`Page ID "${pageId}" introuvable.`); document.getElementById('dashboard')?.classList.add('active'); pageId = 'dashboard'; } sidebarLinks.forEach(l => l.classList.remove('active')); const activeLink = document.querySelector(`.nav-link[href="#${pageId}"]`); if (activeLink) { activeLink.classList.add('active'); } else { document.querySelector(`.nav-link[href="#dashboard"]`)?.classList.add('active'); } if (updateHistory && window.location.hash !== `#${pageId}`) { window.location.hash = pageId; } console.log(`Nav vers: ${pageId}`); if (currentUser || pageId === 'dashboard') { ensureCacheAndRender(pageId); } else { console.log("Navigation bloquée : utilisateur déconnecté."); pages.forEach(p => { if(p.id !== 'dashboard') p.innerHTML = '<p style="text-align:center; margin-top: 30px; color: var(--danger-color);">Veuillez vous connecter.</p>'; }); document.getElementById('dashboard')?.classList.add('active'); ensureCacheAndRender('dashboard'); } };
        const ensureCacheAndRender = async (pageId) => { if (!currentUser && pageId !== 'dashboard') { console.log(`Render annulé pour ${pageId} (déconnecté)`); const targetPage = document.getElementById(pageId); if(targetPage) { targetPage.innerHTML = '<p style="text-align:center; margin-top: 30px; color: var(--danger-color);">Veuillez vous connecter.</p>'; } return; } if (!isInitialLoadComplete && currentUser) { console.log(`Attente chargement initial des données pour ${pageId}...`); return; } console.log(`Ensure cache pour ${pageId}`); try { switch (pageId) { case 'members': if(currentUser) { await loadMembersIntoCache(); renderMembers(); } break; case 'animations': if(currentUser) { await loadAnimationsIntoCache(); renderAnimations(); } break; case 'tasks': if(currentUser) { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache(), loadTasksIntoCache()]); populateTaskFilterDropdown(); renderTasks(); } break; case 'dashboard': await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache(), loadTasksIntoCache()]); renderDashboard(); break; case 'stats': if(currentUser) { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache()]); renderStats(); } break; case 'documents': const docPage = document.getElementById('documents'); if(currentUser) { if (docPage) docPage.innerHTML = '<h2><i class="fas fa-folder-open"></i> Documents et Ressources</h2><p>Gestion des documents à venir...</p>'; } else { if(docPage) docPage.innerHTML = '<p>Veuillez vous connecter.</p>'; } break; default: console.log(`Pas de rendu spécifique pour ${pageId}.`); break; } } catch (error) { console.error(`Erreur chargement/rendu pour ${pageId}:`, error); const targetPage = document.getElementById(pageId); if(targetPage) targetPage.innerHTML = '<p class="error-message">Erreur lors du chargement de cette section.</p>';} };
        // --- Fin Navigation ---
    
    
        // --- 6. Gestion du Cache ---
        // ... (Identique v21) ...
        const loadMembersIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement membres annulé (déconnecté)"); cachedMembers = []; membersLoaded = false; return Promise.resolve(); } if (membersLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Membres..."); const snapshot = await membersCollection.orderBy("lastname", "asc").get(); cachedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); membersLoaded = true; console.log("Cache Membres OK:", cachedMembers.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache membres:", error); membersLoaded = false; return Promise.reject(error); } };
        const loadAnimationsIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement animations annulé (déconnecté)"); cachedAnimations = []; animationsLoaded = false; return Promise.resolve(); } if (animationsLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Animations..."); const snapshot = await animationsCollection.orderBy("dateTime", "desc").get(); cachedAnimations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); animationsLoaded = true; console.log("Cache Animations OK:", cachedAnimations.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache animations:", error); animationsLoaded = false; return Promise.reject(error); } };
        const loadTasksIntoCache = async (forceReload = false) => { if (!currentUser) { console.warn("Chargement tâches annulé (déconnecté)"); cachedTasks = []; tasksLoaded = false; return Promise.resolve(); } if (tasksLoaded && !forceReload) return Promise.resolve(); try { console.log("Firestore: Chargement Tâches..."); const snapshot = await tasksCollection.get(); cachedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); tasksLoaded = true; console.log("Cache Tâches OK:", cachedTasks.length); return Promise.resolve(); } catch (error) { console.error("Erreur cache tâches:", error); tasksLoaded = false; return Promise.reject(error); } };
        const loadAllCaches = async (forceReload = false) => { if (!currentUser) { console.log("Chargement global caches annulé (déconnecté)"); isInitialLoadComplete = true; return Promise.resolve(); } console.log("Chargement de tous les caches..."); isInitialLoadComplete = false; try { await Promise.all([ loadMembersIntoCache(forceReload), loadAnimationsIntoCache(forceReload), loadTasksIntoCache(forceReload) ]); isInitialLoadComplete = true; console.log("Chargement global caches OK."); } catch (error) { console.error("Erreur chargement global des caches:", error); isInitialLoadComplete = false; document.body.innerHTML = '<h1 style="color:red; text-align:center; margin-top: 50px;">Erreur chargement données. Rechargez.</h1>'; throw error; } };
        const clearAllCaches = () => { cachedMembers = []; membersLoaded = false; cachedAnimations = []; animationsLoaded = false; cachedTasks = []; tasksLoaded = false; isInitialLoadComplete = false; console.log("Caches vidés."); };
        // --- Fin Gestion Cache ---
    
    
        // --- 7. Fonctions pour Dropdowns et Checkboxes ---
        // ... (Identique v21) ...
        const populateMemberOptions = (selectEl, selectedId = '') => { if (!selectEl) return; const currentVal = selectEl.value; selectEl.innerHTML = '<option value="">-- Choisir --</option>'; cachedMembers.forEach(m => { const opt = document.createElement('option'); opt.value = m.id; opt.textContent = `${m.firstname} ${m.lastname}`; selectEl.appendChild(opt); }); selectEl.value = selectedId || currentVal || ""; };
        const populateAnimationOptions = (selectEl, selectedId = '', addAll = false) => { if (!selectEl || !cachedAnimations) return; const currentVal = selectEl.value; selectEl.innerHTML = ''; if (addAll) { const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = 'Toutes'; selectEl.appendChild(allOpt); } else { selectEl.innerHTML = '<option value="">-- Choisir --</option>'; } cachedAnimations.forEach(a => { const opt = document.createElement('option'); opt.value = a.id; opt.textContent = a.title || 'Sans titre'; selectEl.appendChild(opt); }); if (selectedId) { selectEl.value = selectedId; } else if (addAll) { selectEl.value = currentVal === 'all' || !currentVal ? 'all' : currentVal; } else { selectEl.value = currentVal === "" ? "" : currentVal;} };
        const populateTaskFilterDropdown = () => { if (!animationsLoaded) { console.warn("Cache animations non prêt pour filtre tâches."); return; } populateAnimationOptions(taskFilterAnimationSelect, taskFilterAnimationSelect?.value || 'all', true); };
        const renderMemberCheckboxesForTask = async (selectedIds = []) => { if (!taskAssigneesDiv) { console.error("DOM Error: #task-assignees-list not found"); return; } try { await loadMembersIntoCache(); taskAssigneesDiv.innerHTML = '<p>Chargement...</p>'; if (cachedMembers.length === 0) { taskAssigneesDiv.innerHTML = '<p>Aucun membre disponible.</p>'; return; } taskAssigneesDiv.innerHTML = ''; cachedMembers.forEach(member => { const isChecked = selectedIds.includes(member.id); const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" name="taskAssignees" value="${member.id}" ${isChecked ? 'checked' : ''}> ${member.firstname} ${member.lastname}`; taskAssigneesDiv.appendChild(label); }); } catch (error) { console.error("Erreur rendu checkboxes tâche:", error); taskAssigneesDiv.innerHTML = '<p style="color:red">Erreur chargement membres.</p>'; } };
        const renderMemberCheckboxes = async (selectedIds = []) => { if (!currentUser) return; if (!animationParticipantsDiv) { console.error("DOM Error: #animation-participants-list not found"); return; } try { await loadMembersIntoCache(); animationParticipantsDiv.innerHTML = '<p>Chargement...</p>'; if (cachedMembers.length === 0) { animationParticipantsDiv.innerHTML = '<p>Aucun membre.</p>'; return; } animationParticipantsDiv.innerHTML = ''; cachedMembers.forEach(member => { const isChecked = selectedIds.includes(member.id); const label = document.createElement('label'); label.innerHTML = `<input type="checkbox" name="participants" value="${member.id}" ${isChecked ? 'checked' : ''}> ${member.firstname} ${member.lastname}`; animationParticipantsDiv.appendChild(label); }); } catch (error) { console.error("Erreur rendu checkboxes animation:", error); animationParticipantsDiv.innerHTML = '<p style="color:red">Erreur.</p>'; } };
        // --- Fin Dropdowns/Checkboxes ---
    
    
        // --- 8. Fonctions de Rendu (Affichage) ---
        const renderMembers = async () => { if (!currentUser) return; if (!memberListDiv) { console.error("DOM Error: #member-list not found"); return; } memberListDiv.innerHTML = '<p>Chargement...</p>'; try { await loadMembersIntoCache(true); if (cachedMembers.length === 0) { memberListDiv.innerHTML = '<p>Aucun membre COPIL ajouté.</p>'; return; } memberListDiv.innerHTML = ''; cachedMembers.forEach((member, index) => { const memberId = member.id; const div = document.createElement('div'); div.className = 'member-card card-hidden'; div.setAttribute('data-id', memberId); div.innerHTML = ` <div class="card-body"> <h3 class="member-name">${member.firstname} ${member.lastname}</h3> <p class="member-detail"> <i class="fas fa-user-tag"></i> <span>Rôle: ${member.role || 'N/A'}</span> </p> <p class="member-detail"> <i class="fas fa-envelope"></i> <span>Contact: ${member.contact || 'N/A'}</span> </p> </div> <div class="card-footer"> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; memberListDiv.appendChild(div); animateCardEntry(div, index * 70); const editBtn = div.querySelector('.edit-btn'); if (editBtn) editBtn.addEventListener('click', () => handleEditMember(memberId)); const deleteBtn = div.querySelector('.delete-btn'); if (deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteMember(memberId)); }); } catch (error) { console.error("Erreur rendu membres:", error); memberListDiv.innerHTML = '<p class="error-message">Erreur chargement des membres.</p>'; } };
        const renderAnimations = async () => { if (!currentUser) return; if (!animationListDiv) { console.error("DOM Error: #animation-list not found"); return; } animationListDiv.innerHTML = '<p>Chargement...</p>'; const selectedStatus = animationStatusFilterSelect?.value || 'all'; const selectedView = animationViewFilterSelect?.value || 'active'; console.log(`Filtrage animations - Vue: ${selectedView}, Statut: ${selectedStatus}`); try { await loadAnimationsIntoCache(true); let animationsToRender = cachedAnimations; if (selectedView === 'active') { animationsToRender = animationsToRender.filter(anim => anim.status === 'prévue' || anim.status === 'en cours'); } else if (selectedView === 'archived') { animationsToRender = animationsToRender.filter(anim => anim.status === 'réalisée' || anim.status === 'annulée'); } if (selectedStatus !== 'all') { animationsToRender = animationsToRender.filter(anim => anim.status === selectedStatus); } if (animationsToRender.length === 0) { let message = "Aucune animation trouvée"; if (selectedView !== 'all' || selectedStatus !== 'all') { message += ` pour la vue "${selectedView}" ${selectedStatus !== 'all' ? 'avec le statut "' + selectedStatus + '"' : ''}.`; } else { message += "."; } animationListDiv.innerHTML = `<p>${message}</p>`; return; } animationListDiv.innerHTML = ''; animationsToRender.forEach((animation, index) => { const animationId = animation.id; const div = document.createElement('div'); const statusClass = (animation.status || 'prévue').replace(' ', '-'); div.className = `animation-card status-${statusClass} card-hidden`; div.setAttribute('data-id', animationId); let dateStr = 'N/A'; if (animation.dateTime?.toDate) { try { dateStr = animation.dateTime.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch(e){} } let timeStr = ''; if (animation.dateTime?.toDate) { try { timeStr = animation.dateTime.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); } catch(e){} } const animType = animation.animationType || 'N/D'; const location = animation.location || 'N/A'; const statusText = animation.status || 'N/A'; const budget = (animation.budget !== undefined && animation.budget !== null) ? `${animation.budget.toLocaleString('fr-FR')} €` : 'N/D'; const docsCount = (animation.documentLinks || []).length; const participantsCount = (animation.participantIds || []).length; const participantText = participantsCount === 1 ? `1 Part.` : `${participantsCount} Parts.`; const docText = docsCount === 1 ? `1 Doc.` : `${docsCount} Docs.`; div.innerHTML = ` <div class="card-header"> <h3>${animation.title || 'Sans titre'}</h3> </div> <div class="card-body"> <div class="card-details-row compact"> <span class="detail-item date"><i class="fas fa-calendar-day"></i> ${dateStr} ${timeStr ? ' - ' + timeStr : ''}</span> <span class="detail-item type"><i class="fas fa-tags"></i> ${animType}</span> <span class="detail-item location"><i class="fas fa-map-marker-alt"></i> ${location}</span> </div> <div class="card-details-row secondary"> <span class="detail-item status"><i class="fas fa-info-circle"></i> ${statusText}</span> <span class="detail-item budget"><i class="fas fa-euro-sign"></i> ${budget}</span> <span class="detail-item participants"><i class="fas fa-users"></i> ${participantText}</span> <span class="detail-item docs"><i class="fas fa-paperclip"></i> ${docText}</span> </div> ${animation.description ? `<p class="card-description" title="${animation.description}">${animation.description}</p>` : '<p class="card-description no-description"><i>Aucune description fournie.</i></p>'} </div> <div class="card-footer"> <button class="btn secondary-btn show-tasks-btn" title="Voir tâches"><i class="fas fa-list-check"></i></button> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; animationListDiv.appendChild(div); animateCardEntry(div, index * 70); const showTasksBtn = div.querySelector('.show-tasks-btn'); if(showTasksBtn) showTasksBtn.addEventListener('click', () => handleShowAnimationTasks(animationId, animation.title)); const editBtn = div.querySelector('.edit-btn'); if(editBtn) editBtn.addEventListener('click', () => handleEditAnimation(animationId)); const deleteBtn = div.querySelector('.delete-btn'); if(deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteAnimation(animationId)); }); } catch (error) { console.error("Erreur rendu animations:", error); animationListDiv.innerHTML = '<p class="error-message">Erreur chargement des animations.</p>'; } };
        const renderTasks = async () => { if (!currentUser) return; if (!taskListDiv) { console.error("DOM Error: #task-list not found"); return; } taskListDiv.innerHTML = '<p>Chargement...</p>'; if (!membersLoaded || !animationsLoaded) { console.warn("renderTasks: Dépendances membres/animations non prêtes."); taskListDiv.innerHTML = '<p>Préparation...</p>'; return; } const selectedAnimId = taskFilterAnimationSelect?.value || 'all'; try { await loadTasksIntoCache(true); let filteredTasks = cachedTasks; if (selectedAnimId !== 'all') { filteredTasks = cachedTasks.filter(t => t.animationId === selectedAnimId); } filteredTasks.sort((a, b) => {
    const timeA = getDateValueInMillis(a.dueDate);
    const timeB = getDateValueInMillis(b.dueDate);
    // Gestion de Infinity pour tri ascendant (place les erreurs/nulls à la fin)
    if (timeA === Infinity && timeB === Infinity) return 0;
    if (timeA === Infinity) return 1; // Met A après B si A est invalide/null
    if (timeB === Infinity) return -1; // Met B après A si B est invalide/null
    return timeA - timeB; // Tri ascendant normal
}); if (filteredTasks.length === 0) { taskListDiv.innerHTML = `<p>Aucune tâche trouvée ${selectedAnimId !== 'all' ? 'pour cette animation': ''}.</p>`; return; } taskListDiv.innerHTML = ''; filteredTasks.forEach((task, index) => { const taskId = task.id; const animation = cachedAnimations.find(a => a.id === task.animationId); const div = document.createElement('div'); const statusClass = (task.status || 'à faire').replace(' ', '-'); div.className = `task-card status-${statusClass} card-hidden`; div.setAttribute('data-id', taskId); let date = 'N/A'; let overdue = ''; date = 'N/A';
try {
    let dateObj = null;
    if (task.dueDate?.toDate) { // Priorité au timestamp
         dateObj = task.dueDate.toDate();
    } else if (task.dueDate) { // Essayer de parser si ce n'est pas un timestamp
         dateObj = new Date(task.dueDate);
    }

    if (dateObj instanceof Date && !isNaN(dateObj.getTime())) { // Vérifier si on a une date valide
        date = dateObj.toLocaleDateString('fr-FR', { year:'numeric', month:'short', day:'numeric'});
        if (task.status !== 'terminé' && dateObj.getTime() < Date.now() - 864e5) {
             overdue = ' <span style="color: var(--danger-color); font-weight: bold;">(Retard)</span>';
        }
    }
} catch (e) { console.warn("Err formatage date task card:", e); date = 'Err'; } const assigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []); let assigneesText = 'N/A'; if (assigneeIds.length > 0 && membersLoaded) { assigneesText = assigneeIds.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? `${member.firstname.charAt(0)}.${member.lastname.charAt(0)}.` : '?'; }).join(', '); } div.innerHTML = ` <div class="card-body"> <p class="task-description">${task.description || 'N/A'}</p> <div class="card-detail"><i class="fas fa-link"></i><span>${animation ? animation.title : 'N/A'}</span></div> <div class="card-detail"><i class="fas fa-users"></i><span>${assigneesText}</span></div> <div class="card-detail"><i class="fas fa-clock"></i><span>Éch: ${date}${overdue}</span></div> <div class="card-detail"><i class="fas fa-info-circle"></i><span>${task.status || 'N/A'}</span></div> </div> <div class="card-footer"> <button class="btn secondary-btn edit-btn" title="Modifier"><i class="fas fa-edit"></i></button> <button class="btn danger-btn delete-btn" title="Supprimer"><i class="fas fa-trash"></i></button> </div>`; taskListDiv.appendChild(div); animateCardEntry(div, index * 70); const editBtn = div.querySelector('.edit-btn'); if(editBtn) editBtn.addEventListener('click', () => handleEditTask(taskId)); const deleteBtn = div.querySelector('.delete-btn'); if(deleteBtn) deleteBtn.addEventListener('click', () => handleDeleteTask(taskId)); }); } catch (error) { console.error("Erreur rendu tâches:", error); taskListDiv.innerHTML = '<p class="error-message">Erreur chargement des tâches.</p>'; } };
        const renderDashboard = async () => { console.log("--- Début Render Dashboard ---"); const budgetChartCtx = document.getElementById('dashboard-budget-chart')?.getContext('2d'); const calendarEl = document.getElementById('dashboard-calendar'); if (!currentUser) { if (upcomingListEl) upcomingListEl.innerHTML = ''; if (upcomingCountEl) upcomingCountEl.textContent = '-'; if (ongoingListEl) ongoingListEl.innerHTML = ''; if (ongoingCountEl) ongoingCountEl.textContent = '-'; if (deadlinesListEl) deadlinesListEl.innerHTML = ''; if (overdueTasksBadgeEl) overdueTasksBadgeEl.style.display='none'; if (plannedBudgetTotalEl) plannedBudgetTotalEl.textContent = '-'; if (budgetDetailsInfoEl) budgetDetailsInfoEl.textContent = 'Connectez-vous'; if (recentAnimationsListEl) recentAnimationsListEl.innerHTML = ''; if (recentAnimationsCountEl) recentAnimationsCountEl.textContent = '-'; if(remainingAnnualBudgetEl) remainingAnnualBudgetEl.textContent = '-'; if(remainingBudgetDetailsEl) remainingBudgetDetailsEl.textContent='Connectez-vous'; if (dashboardBudgetChartInstance) { dashboardBudgetChartInstance.destroy(); dashboardBudgetChartInstance = null; } if (budgetChartCtx) { budgetChartCtx.clearRect(0, 0, budgetChartCtx.canvas.width, budgetChartCtx.canvas.height); } if(budgetChartErrorEl) { budgetChartErrorEl.textContent = 'Connectez-vous pour voir le graphique.'; budgetChartErrorEl.style.display = 'block'; budgetChartErrorEl.classList.remove('error'); budgetChartErrorEl.style.color = '#777'; } if (dashboardCalendarInstance) { try{ dashboardCalendarInstance.destroy(); } catch(e){console.warn("Err Calendar destroy")} dashboardCalendarInstance = null; } if (calendarEl) { calendarEl.innerHTML = ''; } if (calendarMessageEl) { calendarMessageEl.textContent = 'Connectez-vous pour voir le calendrier.'; calendarMessageEl.style.display = 'block'; calendarMessageEl.classList.remove('error'); calendarMessageEl.style.color = '#777';} console.log("Dashboard vidé (déconnecté)"); return; } if (upcomingCountEl) upcomingCountEl.textContent = '...'; if (upcomingListEl) upcomingListEl.innerHTML = '<li>Chargement...</li>'; if (ongoingCountEl) ongoingCountEl.textContent = '...'; if (ongoingListEl) ongoingListEl.innerHTML = '<li>Chargement...</li>'; if (deadlinesListEl) deadlinesListEl.innerHTML = '<li>Chargement...</li>'; if (overdueTasksBadgeEl) overdueTasksBadgeEl.style.display='none'; if (plannedBudgetTotalEl) plannedBudgetTotalEl.textContent = '...'; if (budgetDetailsInfoEl) budgetDetailsInfoEl.textContent = 'Chargement...'; if (recentAnimationsCountEl) recentAnimationsCountEl.textContent = '...'; if (recentAnimationsListEl) recentAnimationsListEl.innerHTML = '<li>Chargement...</li>'; if (remainingAnnualBudgetEl) remainingAnnualBudgetEl.textContent = '...'; if (remainingBudgetDetailsEl) remainingBudgetDetailsEl.textContent = 'Chargement...'; if (budgetChartErrorEl) { budgetChartErrorEl.textContent = 'Chargement...'; budgetChartErrorEl.style.display = 'block'; budgetChartErrorEl.classList.remove('error'); budgetChartErrorEl.style.color = '#777';} if (calendarMessageEl) { calendarMessageEl.textContent = 'Chargement du calendrier...'; calendarMessageEl.style.display = 'block'; calendarMessageEl.classList.remove('error'); calendarMessageEl.style.color = '#777'; } if (dashboardBudgetChartInstance) { dashboardBudgetChartInstance.destroy(); dashboardBudgetChartInstance = null; } if (dashboardCalendarInstance) { try{dashboardCalendarInstance.destroy();}catch(e){console.warn("Err Calendar destroy")} dashboardCalendarInstance = null; } if (!isInitialLoadComplete) { console.log("Dashboard: attente chargement données..."); return; } if (!membersLoaded || !animationsLoaded || !tasksLoaded) { console.warn("Dashboard: Caches non prêts (connecté)"); return; } const now = new Date(); const currentYear = now.getFullYear(); const currentMonthIndex = now.getMonth(); const monthsElapsed = currentMonthIndex + 1; const nowTime = now.getTime(); const sevenDays = nowTime + 7 * 24 * 60 * 60 * 1000; if (upcomingCountEl && upcomingListEl) { try { const upcoming = cachedAnimations.filter(a => { const isP = a.status === 'prévue'; let d=null; try { if(a.dateTime?.toDate) d=a.dateTime.toDate(); }catch(e){} const isV = d instanceof Date && !isNaN(d); const isF = isV && d.getTime() >= nowTime; return isP && isF; }).sort((a,b) => (a.dateTime?.toDate?.getTime()||0) - (b.dateTime?.toDate?.getTime()||0)); upcomingCountEl.textContent = upcoming.length; upcomingListEl.innerHTML = upcoming.length === 0 ? '<li class="no-items">Aucune</li>' : upcoming.slice(0, 4).map(a => { let date='Err'; try {const d=a.dateTime.toDate(); if(d instanceof Date && !isNaN(d)) date=d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});} catch(e){} return `<li><span class="dashboard-date">${date}</span> ${a.title || 'N/A'}</li>` }).join(''); } catch(e){ console.error("Err dash anims:",e); if(upcomingListEl) upcomingListEl.innerHTML='<li class="no-items error-item">Erreur</li>'; if(upcomingCountEl) upcomingCountEl.textContent='Err';} } if (ongoingCountEl && ongoingListEl) { try { const ongoing = cachedTasks.filter(t => t.status === 'en cours').sort((a, b) => (a.dueDate?.toDate?.getTime() || Infinity) - (b.dueDate?.toDate?.getTime() || Infinity)); ongoingCountEl.textContent = ongoing.length; ongoingListEl.innerHTML = ongoing.length === 0 ? '<li class="no-items">Aucune</li>' : ongoing.slice(0, 4).map(t => { const assigneeIdsDash = Array.isArray(t.assigneeIds) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []); let assigneesTextDash = 'N/A'; if (assigneeIdsDash.length > 0 && membersLoaded) { assigneesTextDash = assigneeIdsDash.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? member.firstname : '?'; }).join(', '); } return `<li>${t.description || 'N/A'} <span class="dashboard-name">(${assigneesTextDash})</span></li>`; }).join(''); } catch(e){ console.error("Err dash tâches:",e); if(ongoingListEl) ongoingListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(ongoingCountEl) ongoingCountEl.textContent = 'Err';} } if (deadlinesListEl && overdueTasksBadgeEl) { try { let overdueCount = 0; const deadlines = cachedTasks.filter(t => t.status !== 'terminé' && t.dueDate?.toDate).map(t => ({ ...t, dueDateMs: t.dueDate.toDate().getTime() })).filter(t => t.dueDateMs < sevenDays).sort((a, b) => a.dueDateMs - b.dueDateMs); deadlinesListEl.innerHTML = deadlines.length === 0 ? '<li class="no-items">Aucune</li>' : deadlines.slice(0, 5).map(t => { const assigneeIdsDead = Array.isArray(t.assigneeIds) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []); let assigneesTextDead = 'N/A'; if (assigneeIdsDead.length > 0 && membersLoaded) { assigneesTextDead = assigneeIdsDead.map(id => { const member = cachedMembers.find(m => m.id === id); return member ? member.firstname : '?'; }).join(', '); } const overdue = t.dueDateMs < nowTime; if(overdue) overdueCount++; const dateStr = new Date(t.dueDateMs).toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}); return `<li><span class="dashboard-date ${overdue ? 'overdue' : 'due-soon'}">${dateStr}</span> ${t.description || 'N/A'} <span class="dashboard-name">(${assigneesTextDead})</span>${overdue ? '<span class="overdue"> (Retard!)</span>' : ''}</li>`; }).join(''); if(overdueCount > 0){ overdueTasksBadgeEl.textContent = overdueCount; overdueTasksBadgeEl.style.display = 'inline-block'; } else { overdueTasksBadgeEl.style.display = 'none'; } } catch(e){ console.error("Err dash échéances:",e); if(deadlinesListEl) deadlinesListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(overdueTasksBadgeEl) overdueTasksBadgeEl.style.display = 'none'; } } if (plannedBudgetTotalEl && budgetDetailsInfoEl) { try { let totalBudget = 0; let count = 0; cachedAnimations.filter(a => (a.status === 'prévue' || a.status === 'en cours')).forEach(a => { if (typeof a.budget === 'number' && !isNaN(a.budget) && a.budget > 0) { totalBudget += a.budget; count++; } }); plannedBudgetTotalEl.textContent = totalBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); budgetDetailsInfoEl.textContent = count > 0 ? `(${count} anim.)` : `(0 anim.)`; budgetDetailsInfoEl.classList.remove('loading-error'); } catch(e) { console.error("Err dash budget:", e); if(plannedBudgetTotalEl) plannedBudgetTotalEl.textContent = 'Erreur'; if(budgetDetailsInfoEl) { budgetDetailsInfoEl.textContent = 'Erreur calcul.'; budgetDetailsInfoEl.classList.add('loading-error'); } } } if (recentAnimationsCountEl && recentAnimationsListEl) { try { const recent = cachedAnimations.filter(a => { const isDone = a.status === 'réalisée' || a.status === 'annulée'; let dateObj=null; try{ if(a.dateTime?.toDate) dateObj=a.dateTime.toDate();}catch(e){} const isValid = dateObj instanceof Date && !isNaN(dateObj); const isPast = isValid && dateObj.getTime() < nowTime; return isDone && isPast; }).sort((a,b) => (b.dateTime?.toDate?.getTime()||0) - (a.dateTime?.toDate?.getTime()||0)); recentAnimationsCountEl.textContent = recent.length; recentAnimationsListEl.innerHTML = recent.length === 0 ? '<li class="no-items">Aucune</li>' : recent.slice(0, 4).map(a => { let date='Err'; try{const d=a.dateTime.toDate(); if(d instanceof Date && !isNaN(d)) date=d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});}catch(e){} const statusClass = a.status === 'réalisée' ? 'realisee' : 'annulee'; return `<li><span class="dashboard-date">${date}</span> ${a.title || 'N/A'} <span class="dashboard-status ${statusClass}">(${a.status})</span></li>`; }).join(''); } catch(e){ console.error("Err dash recentes:",e); if(recentAnimationsListEl) recentAnimationsListEl.innerHTML = '<li class="no-items error-item">Erreur</li>'; if(recentAnimationsCountEl) recentAnimationsCountEl.textContent = 'Err';} } if (remainingAnnualBudgetEl && remainingBudgetDetailsEl) { try { const totalAnnualBudget = 12 * 200; let spentPlannedCurrentYear = 0; cachedAnimations.filter(a => { let animYear = null; try { if(a.dateTime?.toDate) animYear = a.dateTime.toDate().getFullYear(); } catch(e) {} return animYear === currentYear; }).filter(a => (a.status === 'prévue' || a.status === 'en cours' || a.status === 'réalisée')).forEach(a => { if (typeof a.budget === 'number' && a.budget > 0) { spentPlannedCurrentYear += a.budget; } }); const remainingAnnualFixedBudget = totalAnnualBudget - spentPlannedCurrentYear; remainingAnnualBudgetEl.textContent = remainingAnnualFixedBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); remainingBudgetDetailsEl.textContent = `Budget Annuel ${totalAnnualBudget.toLocaleString('fr-FR')}€ - Engagé ${spentPlannedCurrentYear.toLocaleString('fr-FR')}€`; remainingBudgetDetailsEl.classList.remove('loading-error'); if (remainingAnnualFixedBudget < 0) { remainingAnnualBudgetEl.style.color = 'var(--danger-color)'; } else { remainingAnnualBudgetEl.style.color = 'var(--info-color)'; } } catch (error) { console.error("Erreur calcul budget annuel restant:", error); if (remainingAnnualBudgetEl) remainingAnnualBudgetEl.textContent = 'Erreur'; if (remainingBudgetDetailsEl) { remainingBudgetDetailsEl.textContent = 'Erreur de calcul.'; remainingBudgetDetailsEl.classList.add('loading-error'); } } } console.log("Dashboard: Calcul données budget mensuel..."); 

                                            if (budgetChartCtx) {
  try {
    const currentYear = new Date().getFullYear(); // Par ex., 2025
    const monthlyBudgets = {};

    // Filtrer pour inclure uniquement les animations de l'année en cours
    cachedAnimations
      .filter(a => {
        let animYear = null;
        try {
          if (a.dateTime?.toDate) {
            animYear = a.dateTime.toDate().getFullYear();
          }
        } catch (e) {
          console.warn(`Erreur parsing date anim ${a.id}:`, e);
        }
        return (
          animYear === currentYear && // Filtrer par année courante
          typeof a.budget === 'number' && a.budget > 0 // Vérifier budget valide
        );
      })
      .forEach(a => {
        try {
          const date = a.dateTime.toDate();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const monthKey = `${currentYear}-${month}`;
          if (!monthlyBudgets[monthKey]) {
            monthlyBudgets[monthKey] = 0;
          }
          monthlyBudgets[monthKey] += a.budget;
        } catch (dateError) {
          console.warn(`Erreur date anim ${a.id}:`, dateError);
        }
      });

    const sortedMonths = Object.keys(monthlyBudgets).sort();
    if (sortedMonths.length > 0) {
      const budgetData = sortedMonths.map(month => monthlyBudgets[month]);
      const targetData = sortedMonths.map(() => 200); // Objectif mensuel fixe (200 €)

      console.log("Dashboard: Création graphique budget...");
      dashboardBudgetChartInstance = new Chart(budgetChartCtx, {
        type: 'line',
        data: {
          labels: sortedMonths,
          datasets: [
            {
              label: 'Budget Planifié (€)',
              data: budgetData,
              borderColor: 'rgba(74, 144, 226, 0.8)',
              backgroundColor: 'rgba(74, 144, 226, 0.2)',
              fill: true,
              tension: 0.1,
            },
            {
              label: 'Objectif Mensuel (€)',
              data: targetData,
              borderColor: 'rgba(220, 53, 69, 0.5)',
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0,
              tension: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: value => value.toLocaleString('fr-FR') + ' €' },
            },
            x: { title: { display: false } },
          },
          plugins: {
            legend: { position: 'top' },
            tooltip: {
              callbacks: {
                label: context =>
                  `${context.dataset.label || ''}: ${
                    context.parsed.y !== null ? context.parsed.y.toLocaleString('fr-FR') + ' €' : 'N/A'
                  }`,
              },
            },
          },
        },
      });
      if (budgetChartErrorEl) budgetChartErrorEl.style.display = 'none';
    } else {
      console.log("Dashboard: Aucune donnée de budget pour l'année " + currentYear);
      if (budgetChartErrorEl) {
        budgetChartErrorEl.textContent = `Aucune donnée de budget pour ${currentYear}.`;
        budgetChartErrorEl.style.display = 'block';
        budgetChartErrorEl.classList.remove('error');
        budgetChartErrorEl.style.color = '#777';
      }
    }
  } catch (error) {
    console.error("Erreur création graphique budget dashboard:", error);
    if (budgetChartErrorEl) {
      budgetChartErrorEl.textContent = 'Erreur affichage graphique budget.';
      budgetChartErrorEl.style.display = 'block';
      budgetChartErrorEl.classList.add('error');
    }
  }
} else {
  console.warn("Canvas #dashboard-budget-chart non trouvé.");
  if (budgetChartErrorEl) {
    budgetChartErrorEl.textContent = 'Élément graphique non trouvé.';
    budgetChartErrorEl.style.display = 'block';
    budgetChartErrorEl.classList.add('error');
  }
}
                                             
                                             console.log("Dashboard: Préparation FullCalendar..."); if (calendarEl) { if (calendarMessageEl) calendarMessageEl.style.display = 'none'; try { const animationsForCalendar = cachedAnimations.filter(a => (a.status === 'prévue' || a.status === 'en cours') && a.dateTime?.toDate); const calendarEvents = animationsForCalendar.map(anim => { let eventColor = '#6C9D7E'; let eventTextColor = '#FFFFFF'; if (anim.status === 'en cours') { eventColor = '#A8D8B9'; eventTextColor = '#4A4A4A'; } return { id: anim.id, title: anim.title || 'Animation', start: anim.dateTime.toDate(), allDay: false, color: eventColor, textColor: eventTextColor, borderColor: eventColor }; }); console.log(`Dashboard: ${calendarEvents.length} événements pour FullCalendar.`); dashboardCalendarInstance = new FullCalendar.Calendar(calendarEl, { initialView: 'dayGridMonth', locale: 'fr', headerToolbar: { left: 'prev,next today', center: 'title', right: '' }, buttonText: { today: 'Auj.' }, height: 'auto', aspectRatio: 1.8, handleWindowResize: true, events: calendarEvents, eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false }, eventClick: function(info) { info.jsEvent.preventDefault(); showAnimationDetails(info.event.id); /* Appeler la modale détail */ } }); dashboardCalendarInstance.render(); console.log("Dashboard: FullCalendar rendu."); } catch (error) { console.error("Erreur création/rendu FullCalendar:", error); if (calendarMessageEl) { calendarMessageEl.textContent = 'Erreur affichage calendrier.'; calendarMessageEl.style.display = 'block'; calendarMessageEl.classList.add('error'); } if (calendarEl) calendarEl.innerHTML = ''; if (dashboardCalendarInstance) { try{dashboardCalendarInstance.destroy();}catch(e){} dashboardCalendarInstance = null; } } } else { console.warn("Élément #dashboard-calendar non trouvé."); if (calendarMessageEl) { calendarMessageEl.textContent = 'Conteneur calendrier non trouvé.'; /* ... */ } } console.log("--- Fin Render Dashboard ---"); };
        const renderStats = async () => { if (!currentUser) return; console.log("--- Début Render Stats ---"); const statusCtx = document.getElementById('stats-status-chart')?.getContext('2d'); const typeCtx = document.getElementById('stats-type-chart')?.getContext('2d'); const participationCtx = document.getElementById('stats-participation-chart')?.getContext('2d'); if (!statsTotalCompletedEl || !statsAvgParticipationEl || !statsTotalBudgetSpentEl || !statusCtx || !typeCtx || !participationCtx || !statusErrorEl || !typeErrorEl || !participationErrorEl ) { console.error("DOM Error: Eléments Stats manquants."); return; } statsTotalCompletedEl.textContent = '...'; statsAvgParticipationEl.textContent = '...'; statsTotalBudgetSpentEl.textContent = '...'; statusErrorEl.style.display = 'none'; typeErrorEl.style.display = 'none'; participationErrorEl.style.display = 'none'; if (statusChartInstance) { statusChartInstance.destroy(); statusChartInstance = null; } if (typeChartInstance) { typeChartInstance.destroy(); typeChartInstance = null; } if (participationChartInstance) { participationChartInstance.destroy(); participationChartInstance = null; } if (!isInitialLoadComplete || !membersLoaded || !animationsLoaded) { console.warn("Stats: Données cache non prêtes."); return; } try { console.log("Stats: Calculs..."); const completedAnimations = cachedAnimations.filter(a => a.status === 'réalisée'); const memberCount = cachedMembers.length; const totalCompleted = completedAnimations.length; let totalParticipants = 0; completedAnimations.forEach(a => { totalParticipants += (a.participantIds || []).length; }); const avgParticipation = (totalCompleted > 0 && memberCount > 0) ? (totalParticipants / (totalCompleted * memberCount)) * 100 : 0; let totalBudget = 0; completedAnimations.forEach(a => { if (typeof a.budget === 'number' && !isNaN(a.budget) && a.budget > 0) totalBudget += a.budget; }); const statusCounts = cachedAnimations.reduce((acc, a) => { const s = a.status || 'inconnu'; acc[s] = (acc[s] || 0) + 1; return acc; }, {}); const typeCounts = cachedAnimations.reduce((acc, a) => { const type = a.animationType || 'Non défini'; acc[type] = (acc[type] || 0) + 1; return acc; }, {}); const memberParticipation = cachedMembers.map(m => { let c = 0; completedAnimations.forEach(a => { if ((a.participantIds || []).includes(m.id)) c++; }); return { name: `${m.firstname} ${m.lastname}`, count: c }; }).sort((a, b) => b.count - a.count); console.log("Stats: MàJ DOM (Indicateurs clés)..."); statsTotalCompletedEl.textContent = totalCompleted; statsAvgParticipationEl.textContent = `${avgParticipation.toFixed(1)} %`; statsTotalBudgetSpentEl.textContent = totalBudget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }); console.log("Stats: Création Graphiques..."); const chartColors = [ 'rgba(74, 144, 226, 0.7)', 'rgba(80, 227, 194, 0.7)', 'rgba(245, 166, 35, 0.7)', 'rgba(220, 53, 69, 0.7)', 'rgba(40, 167, 69, 0.7)', 'rgba(108, 117, 125, 0.7)', 'rgba(23, 162, 184, 0.7)', 'rgba(255, 193, 7, 0.7)' ]; if (statusCtx && Object.keys(statusCounts).length > 0) { try { const statusLabels = Object.keys(statusCounts); const statusData = Object.values(statusCounts); statusChartInstance = new Chart(statusCtx, { type: 'doughnut', data: { labels: statusLabels, datasets: [{ label: 'Répartition par Statut', data: statusData, backgroundColor: chartColors.slice(0, statusLabels.length), hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }} } }); } catch(chartError) { console.error("Erreur graph Statut:", chartError); if(statusErrorEl) { statusErrorEl.textContent = 'Erreur affichage graph Statut.'; statusErrorEl.style.display = 'block'; statusErrorEl.classList.add('error'); } } } else if (statusCtx) { if(statusErrorEl) { statusErrorEl.textContent = 'Aucune donnée statut.'; statusErrorEl.style.display = 'block'; statusErrorEl.style.color = '#777'; statusErrorEl.classList.remove('error');} } if (typeCtx && Object.keys(typeCounts).length > 0) { try { const typeLabels = Object.keys(typeCounts); const typeData = Object.values(typeCounts); const typeColors = [...chartColors.slice(typeLabels.length), ...chartColors.slice(0, typeLabels.length)]; typeChartInstance = new Chart(typeCtx, { type: 'pie', data: { labels: typeLabels, datasets: [{ label: 'Répartition par Type', data: typeData, backgroundColor: typeColors.slice(0, typeLabels.length), hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }} } }); } catch(chartError) { console.error("Erreur graph Type:", chartError); if(typeErrorEl) { typeErrorEl.textContent = 'Erreur affichage graph Type.'; typeErrorEl.style.display = 'block'; typeErrorEl.classList.add('error');} } } else if (typeCtx) { if(typeErrorEl) { typeErrorEl.textContent = 'Aucune donnée type.'; typeErrorEl.style.display = 'block'; typeErrorEl.style.color = '#777'; typeErrorEl.classList.remove('error');} } if (participationCtx && memberParticipation.length > 0) { try { const participationLabels = memberParticipation.map(m => m.name); const participationData = memberParticipation.map(m => m.count); participationChartInstance = new Chart(participationCtx, { type: 'bar', data: { labels: participationLabels, datasets: [{ label: 'Nb Participations (Anim. Réalisées)', data: participationData, backgroundColor: 'rgba(23, 162, 184, 0.6)', borderColor: 'rgba(23, 162, 184, 1)', borderWidth: 1 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false }} } }); } catch(chartError) { console.error("Erreur graph Participation:", chartError); if(participationErrorEl) { participationErrorEl.textContent = 'Erreur affichage graph Participation.'; participationErrorEl.style.display = 'block'; participationErrorEl.classList.add('error');} } } else if (participationCtx) { if(participationErrorEl) { participationErrorEl.textContent = 'Aucune donnée participation.'; participationErrorEl.style.display = 'block'; participationErrorEl.style.color = '#777'; participationErrorEl.classList.remove('error');} } } catch (error) { console.error("Erreur calcul/affichage stats:", error); if(statsTotalCompletedEl) statsTotalCompletedEl.textContent = 'Err'; if(statsAvgParticipationEl) statsAvgParticipationEl.textContent = 'Err'; if(statsTotalBudgetSpentEl) statsTotalBudgetSpentEl.textContent = 'Err'; if(statusErrorEl) { statusErrorEl.textContent = 'Erreur chargement stats statut.'; statusErrorEl.style.display = 'block'; statusErrorEl.classList.add('error'); } if(typeErrorEl) { typeErrorEl.textContent = 'Erreur chargement stats type.'; typeErrorEl.style.display = 'block'; typeErrorEl.classList.add('error'); } if(participationErrorEl) { participationErrorEl.textContent = 'Erreur chargement stats participation.'; participationErrorEl.style.display = 'block'; participationErrorEl.classList.add('error'); } } console.log("--- Fin Render Stats ---"); };
        // --- Fin Fonctions de Rendu ---
    
    
        // --- 9. Event Handlers (CRUD & Autres) ---
        // ... (Handlers Membres: handleAddMember, handleEditMember, handleDeleteMember, handleMemberFormSubmit - Identiques v19) ...
        const handleAddMember = () => { if(!currentUser) {alert('Connectez-vous pour ajouter.'); return;} editingMemberId = null; if(memberForm) memberForm.reset(); if(memberFormTitle) memberFormTitle.textContent = "Ajouter Membre"; if(hiddenMemberIdInput) hiddenMemberIdInput.value = ''; if(memberModal) openModal(memberModal); };
        const handleEditMember = async (id) => { if(!currentUser) return; editingMemberId = id; try { const doc = await membersCollection.doc(id).get(); if (doc.exists) { const m = doc.data(); if(memberFormTitle) memberFormTitle.textContent = "Modifier Membre"; if(hiddenMemberIdInput) hiddenMemberIdInput.value = id; ['firstname', 'lastname', 'role', 'contact'].forEach(f => { const el = document.getElementById(`member-${f}`); if(el) el.value = m[f] || ''; }); if(memberModal) openModal(memberModal); } else { alert("Membre introuvable."); editingMemberId = null; } } catch (e) { console.error("Err get membre:", e); alert("Erreur."); editingMemberId = null; } };
        const handleDeleteMember = async (id) => { if(!currentUser) return; let name = `ID ${id}`; let memberEmail = null; try { const d=await membersCollection.doc(id).get(); if(d.exists) { name=`${d.data().firstname} ${d.data().lastname}`; memberEmail = d.data().contact; } } catch(e){} if (confirm(`Supprimer ${name} ?\n${memberEmail ? 'Cela retirera aussi l\'accès pour ' + memberEmail + ' si présent.' : ''}`)) { try { await membersCollection.doc(id).delete(); console.log("Membre supprimé de la collection members."); if (memberEmail) { try { await authorizedUsersCollection.doc(memberEmail).delete(); console.log(`Accès retiré pour ${memberEmail} dans authorizedUsers.`); } catch (authDeleteError) { console.warn(`Erreur suppression ${memberEmail} de authorizedUsers (peut-être inexistant) :`, authDeleteError); } } membersLoaded = false; alert(`${name} supprimé.`); ensureCacheAndRender(window.location.hash.substring(1) || 'dashboard'); } catch (e) { console.error("Err suppr membre:", e); alert("Erreur."); } } };
        const handleMemberFormSubmit = async (e) => { e.preventDefault(); if (!currentUser) { alert("Vous devez être connecté."); return; } const firstname = document.getElementById('member-firstname')?.value.trim(); const lastname = document.getElementById('member-lastname')?.value.trim(); const role = document.getElementById('member-role')?.value.trim(); const contactEmail = document.getElementById('member-contact')?.value.trim(); if (!firstname || !lastname) { alert("Prénom et Nom sont requis."); return; } if (contactEmail && !/\S+@\S+\.\S+/.test(contactEmail)) { alert("Veuillez entrer une adresse email valide pour le contact."); return; } const data = { firstname: firstname, lastname: lastname, role: role, contact: contactEmail }; const btn = memberForm?.querySelector('button[type="submit"]'); if (btn) btn.disabled = true; try { let memberDocRef; if (editingMemberId) { memberDocRef = membersCollection.doc(editingMemberId); await memberDocRef.update(data); console.log("Membre mis à jour:", editingMemberId); /* TODO: Gérer changement d'email dans authorizedUsers ? */ } else { memberDocRef = await membersCollection.add(data); console.log("Nouveau membre ajouté:", memberDocRef.id); if (contactEmail) { try { const authorizedUserRef = authorizedUsersCollection.doc(contactEmail); await authorizedUserRef.set({ addedFromMemberForm: true, memberName: `${firstname} ${lastname}`, addedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }); console.log(`Email ${contactEmail} ajouté/mis à jour dans authorizedUsers.`); } catch (authError) { console.error(`Erreur lors de l'ajout de ${contactEmail} à authorizedUsers:`, authError); alert(`Membre ajouté, mais erreur ajout autorisation pour ${contactEmail}. Vérifiez manuellement.`); } } else { console.log("Aucun email fourni, pas d'ajout à authorizedUsers."); } } membersLoaded = false; alert(`Membre ${editingMemberId ? 'mis à jour' : 'ajouté'}. ${contactEmail && !editingMemberId ? 'Accès autorisé pour ' + contactEmail + '.' : ''}`); if (memberModal) closeModal(memberModal); ensureCacheAndRender('members'); } catch (e) { console.error("Erreur sauvegarde membre:", e); alert("Erreur lors de l'enregistrement du membre."); } finally { if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; } } };
        // ... (Handlers Animations: handleAddAnimation, handleEditAnimation, handleDeleteAnimation, handleAnimationFormSubmit - Identiques v19) ...
        const handleAddAnimation = async () => { if(!currentUser) {alert('Connectez-vous pour ajouter.'); return;} editingAnimationId = null; if(animationForm) animationForm.reset(); if(animationFormTitle) animationFormTitle.textContent = "Ajouter Animation"; if(hiddenAnimationIdInput) hiddenAnimationIdInput.value = ''; await renderMemberCheckboxes(); if(animationModal) openModal(animationModal); };
        const handleEditAnimation = async (id) => { if(!currentUser) return; editingAnimationId = id; try { await loadMembersIntoCache(); const doc = await animationsCollection.doc(id).get(); if (doc.exists) { const a = doc.data(); if(animationFormTitle) animationFormTitle.textContent = "Modifier Animation"; if(hiddenAnimationIdInput) hiddenAnimationIdInput.value = id; ['title', 'description', 'location', 'status'].forEach(f => { const el = document.getElementById(`animation-${f}`); if(el) el.value = a[f] || (f === 'status' ? 'prévue' : ''); }); const typeSelect = document.getElementById('animation-type'); if(typeSelect) typeSelect.value = a.animationType || ''; if(document.getElementById('animation-docs')) document.getElementById('animation-docs').value = (a.documentLinks || []).join('\n'); const budgetInput = document.getElementById('animation-budget'); if (budgetInput) budgetInput.value = (a.budget !== undefined && a.budget !== null) ? a.budget : ''; let dateInputVal = ''; if (a.dateTime?.toDate) { try { const d=a.dateTime.toDate(); dateInputVal=`${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}T${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; } catch(e){} } if(document.getElementById('animation-date')) document.getElementById('animation-date').value = dateInputVal; await renderMemberCheckboxes(a.participantIds || []); if(animationModal) openModal(animationModal); } else { alert("Anim introuvable."); editingAnimationId = null; } } catch (e) { console.error("Err get anim:", e); alert("Erreur."); editingAnimationId = null; } };
        const handleDeleteAnimation = async (id) => { if(!currentUser) return; let title = `ID ${id}`; try { const d=await animationsCollection.doc(id).get(); if(d.exists) title=`"${d.data().title}"`; } catch(e){} if (confirm(`Supprimer anim ${title} ?\n(Supprime aussi tâches liées!)`)) { try { const tasksToDelete = await tasksCollection.where("animationId", "==", id).get(); const batch = db.batch(); tasksToDelete.forEach(doc => batch.delete(doc.ref)); await batch.commit(); console.log(`${tasksToDelete.size} tâches liées supprimées.`); await animationsCollection.doc(id).delete(); animationsLoaded = false; tasksLoaded = false; alert(`Anim ${title} et tâches supprimées.`); ensureCacheAndRender(window.location.hash.substring(1) || 'dashboard'); } catch (error) { console.error("Err suppr anim/tâches:", error); alert("Erreur suppression."); } } };
        const handleAnimationFormSubmit = async (e) => { e.preventDefault(); if(!currentUser) return; const title = document.getElementById('animation-title')?.value.trim(); const dateStr = document.getElementById('animation-date')?.value; const type = document.getElementById('animation-type')?.value; if (!title || !dateStr || !type) { alert("Titre, Date et Type sont requis."); return; } let timestamp; try { timestamp = firebase.firestore.Timestamp.fromDate(new Date(dateStr)); } catch (e) { alert("Date invalide."); return; } let budget = null; const budgetInput = document.getElementById('animation-budget'); if (budgetInput?.value !== '') { const pBudget = parseFloat(budgetInput.value); if (!isNaN(pBudget) && pBudget >= 0) budget = pBudget; } const participants = Array.from(animationForm?.querySelectorAll('input[name="participants"]:checked') || []).map(cb => cb.value); const docs = document.getElementById('animation-docs')?.value.split('\n').map(l => l.trim()).filter(l => l !== '') || []; const data = { title: title, description: document.getElementById('animation-description')?.value.trim(), dateTime: timestamp, location: document.getElementById('animation-location')?.value.trim(), participantIds: participants, status: document.getElementById('animation-status')?.value || 'prévue', animationType: type, documentLinks: docs, budget: budget }; const btn = animationForm?.querySelector('button[type="submit"]'); if(btn) btn.disabled = true; try { if (editingAnimationId) { await animationsCollection.doc(editingAnimationId).update(data); } else { await animationsCollection.add(data); } animationsLoaded = false; tasksLoaded = false; alert(`Anim ${editingAnimationId ? 'màj' : 'ajoutée'} !`); if(animationModal) closeModal(animationModal); ensureCacheAndRender(window.location.hash.substring(1) || 'dashboard'); } catch (e) { console.error("Err save anim:", e); alert("Erreur."); } finally { if(btn) { btn.disabled = false; btn.textContent='Enregistrer';} } };
        // ... (Handlers Tâches: handleAddTask, handleEditTask, handleDeleteTask, handleTaskFormSubmit - Identiques v19) ...
        const handleAddTask = async () => { if(!currentUser) {alert('Connectez-vous pour ajouter.'); return;} editingTaskId = null; if (taskForm) taskForm.reset(); if (taskFormTitle) taskFormTitle.textContent = "Ajouter Tâche"; if (hiddenTaskIdInput) hiddenTaskIdInput.value = ''; try { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache()]); await renderMemberCheckboxesForTask(); populateAnimationOptions(taskAnimationSelect); if (taskModal) openModal(taskModal); } catch(e) { console.error("Erreur préparation formulaire ajout tâche:", e); alert("Erreur chargement données pour le formulaire."); } };
        const handleEditTask = async (id) => { if(!currentUser) return; editingTaskId = id; try { await Promise.all([loadMembersIntoCache(), loadAnimationsIntoCache()]); const doc = await tasksCollection.doc(id).get(); if (doc.exists) { const t = doc.data(); if (taskFormTitle) taskFormTitle.textContent = "Modifier Tâche"; if (hiddenTaskIdInput) hiddenTaskIdInput.value = id; if(document.getElementById('task-description')) document.getElementById('task-description').value = t.description || ''; if(document.getElementById('task-status')) document.getElementById('task-status').value = t.status || 'à faire'; populateAnimationOptions(taskAnimationSelect, t.animationId); const dateInput = document.getElementById('task-due-date'); if(dateInput){ if (t.dueDate) { try { const d=t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate+'T00:00:00'); dateInput.value = d.toISOString().split('T')[0]; } catch(e){ dateInput.value = '';} } else { dateInput.value = ''; } } const assigneeIdsToSelect = Array.isArray(t.assigneeIds) ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []); await renderMemberCheckboxesForTask(assigneeIdsToSelect); if (taskModal) openModal(taskModal); } else { alert("Tâche introuvable."); editingTaskId = null; } } catch (e) { console.error("Err get tâche:", e); alert("Erreur."); editingTaskId = null; } };
        const handleDeleteTask = async (id) => { if(!currentUser) return; let desc = `ID ${id}`; try { const d=await tasksCollection.doc(id).get(); if(d.exists) desc=`"${d.data().description}"`; } catch(e){} if (confirm(`Supprimer tâche ${desc} ?`)) { try { await tasksCollection.doc(id).delete(); tasksLoaded = false; alert(`Tâche ${desc} supprimée.`); ensureCacheAndRender(window.location.hash.substring(1) || 'dashboard'); } catch (e) { console.error("Err suppr tâche:", e); alert("Erreur."); } } };
        const handleTaskFormSubmit = async (e) => { e.preventDefault(); if(!currentUser) return; const desc = document.getElementById('task-description')?.value.trim(); const animId = document.getElementById('task-animation')?.value; const assigneeIds = Array.from(taskForm?.querySelectorAll('input[name="taskAssignees"]:checked') || []).map(cb => cb.value); if (!desc || !animId || assigneeIds.length === 0) { alert("Description, Animation liée et au moins un Membre assigné sont requis."); return; } const dateStr = document.getElementById('task-due-date')?.value; let dueDate = null; if (dateStr) { try { dueDate = firebase.firestore.Timestamp.fromDate(new Date(dateStr + 'T00:00:00')); } catch (e) { alert("Date échéance invalide."); return; } } const data = { description: desc, animationId: animId, assigneeIds: assigneeIds, dueDate: dueDate, status: document.getElementById('task-status')?.value || 'à faire' }; const btn = taskForm?.querySelector('button[type="submit"]'); if(btn) btn.disabled = true; try { if (editingTaskId) { await tasksCollection.doc(editingTaskId).update(data); } else { await tasksCollection.add(data); } tasksLoaded = false; alert(`Tâche ${editingTaskId ? 'màj' : 'ajoutée'} !`); if(taskModal) closeModal(taskModal); ensureCacheAndRender(window.location.hash.substring(1) || 'dashboard'); } catch (e) { console.error("Err save tâche:", e); alert("Erreur."); } finally { if(btn) { btn.disabled = false; btn.textContent='Enregistrer'; } } };
        // <<< NOUVEAU >>> Handler pour Modale Détail Animation
        const showAnimationDetails = async (animationId) => { if (!currentUser || !animationId) return; if (!animationDetailModal || !animationDetailContent || !detailModalTitle || !editFromDetailBtn) { console.error("Éléments DOM modale détail manquants."); return; } detailContent.innerHTML = '<p>Chargement...</p>'; detailTitle.textContent = "Détail de l'Animation"; openModal(animationDetailModal); currentDetailAnimationId = animationId; try { await Promise.all([loadAnimationsIntoCache(), loadMembersIntoCache()]); const animation = cachedAnimations.find(a => a.id === animationId); if (!animation) { detailContent.innerHTML = '<p class="error-message">Animation non trouvée.</p>'; currentDetailAnimationId = null; return; } if (animation.title) { detailModalTitle.textContent = `Détail: ${animation.title}`; } let dateStr = 'N/D'; if(animation.dateTime?.toDate){ try{ dateStr = animation.dateTime.toDate().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short'})} catch(e){} } let participantsList = 'Aucun'; if (animation.participantIds && animation.participantIds.length > 0) { participantsList = '<ul>'; animation.participantIds.forEach(pId => { const member = cachedMembers.find(m => m.id === pId); participantsList += `<li>${member ? member.firstname + ' ' + member.lastname : 'Membre inconnu'}</li>`; }); participantsList += '</ul>'; } let documentsList = 'Aucun'; if (animation.documentLinks && animation.documentLinks.length > 0) { documentsList = '<ul>'; animation.documentLinks.forEach(link => { let linkText = link; try { linkText = new URL(link).pathname.split('/').pop() || link; } catch(e){} documentsList += `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${linkText}</a></li>`; }); documentsList += '</ul>'; } detailContent.innerHTML = ` <p><strong><i class="fas fa-calendar-day"></i> Date:</strong> ${dateStr}</p> <p><strong><i class="fas fa-map-marker-alt"></i> Lieu:</strong> ${animation.location || 'N/D'}</p> <p><strong><i class="fas fa-tags"></i> Type:</strong> ${animation.animationType || 'N/D'}</p> <p><strong><i class="fas fa-info-circle"></i> Statut:</strong> ${animation.status || 'N/D'}</p> <p><strong><i class="fas fa-euro-sign"></i> Budget:</strong> ${animation.budget !== undefined && animation.budget !== null ? animation.budget.toLocaleString('fr-FR') + ' €' : 'N/D'}</p> <p><strong><i class="fas fa-align-left"></i> Description:</strong><br><span style="margin-left: 24px; display: block; white-space: pre-wrap;">${animation.description || 'Aucune'}</span></p> <p><strong><i class="fas fa-users"></i> Participants:</strong></p> ${participantsList} <p><strong><i class="fas fa-paperclip"></i> Documents:</strong></p> ${documentsList} `; } catch (error) { console.error("Erreur affichage détails animation:", error); detailContent.innerHTML = '<p class="error-message">Impossible de charger les détails.</p>'; currentDetailAnimationId = null; } };
        // ... (Handler Export CSV - Identique v19) ...
        const handleExportCsvStats = () => { if(!currentUser) {alert('Connectez-vous pour exporter.'); return;} console.log("Début export CSV stats..."); if (!membersLoaded || !animationsLoaded || !tasksLoaded) { alert("Données non chargées pour l'export."); return; } try { let csvRows = []; const headers = ['Section', 'Indicateur / Nom', 'Valeur / Détail 1', 'Détail 2', 'Détail 3'].map(escapeCsvValue).join(';'); csvRows.push(headers); csvRows.push(['Indicateurs Clés', escapeCsvValue('Animations Réalisées'), escapeCsvValue(statsTotalCompletedEl?.textContent || 'N/A'), '', ''].join(';')); csvRows.push(['', escapeCsvValue('Taux Participation Moyen (%)'), escapeCsvValue(statsAvgParticipationEl?.textContent?.replace('%','').trim() || 'N/A'), '', ''].join(';')); csvRows.push(['', escapeCsvValue('Budget Total Engagé (€)'), escapeCsvValue(statsTotalBudgetSpentEl?.textContent?.replace('€','').replace(/\s/g, '').trim() || 'N/A'), '', ''].join(';')); csvRows.push(['', '', '', '', '']); const typeCountsExport = cachedAnimations.reduce((acc, a) => { const type = a.animationType || 'Non défini'; acc[type] = (acc[type] || 0) + 1; return acc; }, {}); csvRows.push(['Répartition par Type', escapeCsvValue('Type'), escapeCsvValue('Nombre'), '', ''].join(';')); if(Object.keys(typeCountsExport).length > 0) { Object.entries(typeCountsExport).forEach(([type, count]) => { csvRows.push(['', escapeCsvValue(type), escapeCsvValue(count), '', ''].join(';')); }); } else { csvRows.push(['', escapeCsvValue('Aucune donnée'), '', '', ''].join(';')); } csvRows.push(['', '', '', '', '']); const completedAnims = cachedAnimations.filter(a => a.status === 'réalisée'); csvRows.push(['Animations Réalisées', escapeCsvValue('Titre'), escapeCsvValue('Type'), escapeCsvValue('Date'), escapeCsvValue('Participants')].join(';')); if (completedAnims.length > 0) { completedAnims.forEach(anim => { const dateStr = anim.dateTime?.toDate ? anim.dateTime.toDate().toLocaleDateString('fr-FR') : 'N/A'; const participantsCount = (anim.participantIds || []).length; const animType = anim.animationType || 'N/D'; csvRows.push(['', escapeCsvValue(anim.title), escapeCsvValue(animType), escapeCsvValue(dateStr), escapeCsvValue(participantsCount)].join(';')); }); } else { csvRows.push(['', escapeCsvValue('Aucune animation réalisée'), '', '', ''].join(';')); } csvRows.push(['', '', '', '', '']); const totalCompletedForExport = completedAnims.length; const memberParticipation = cachedMembers.map(m => { let c = 0; completedAnims.forEach(a => { if ((a.participantIds || []).includes(m.id)) c++; }); return { name: `${m.firstname} ${m.lastname}`, count: c, rate: totalCompletedForExport > 0 ? (c / totalCompletedForExport) * 100 : 0 }; }).sort((a, b) => b.count - a.count); csvRows.push(['Participation Membre', escapeCsvValue('Nom Membre'), escapeCsvValue('Nb Participations'), escapeCsvValue('Taux (%)'), ''].join(';')); if (memberParticipation.length > 0) { memberParticipation.forEach(m => { csvRows.push(['', escapeCsvValue(m.name), escapeCsvValue(m.count), escapeCsvValue(m.rate.toFixed(0)), ''].join(';')); }); } else { csvRows.push(['', escapeCsvValue('Aucun membre'), '', '', ''].join(';')); } const csvString = csvRows.join('\n'); const bom = '\uFEFF'; const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${bom}${csvString}`); const link = document.createElement("a"); link.setAttribute("href", encodedUri); const exportDate = new Date().toISOString().split('T')[0]; link.setAttribute("download", `bilan_qvct_${exportDate}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); console.log("Export CSV terminé."); } catch (error) { console.error("Erreur génération/téléchargement CSV:", error); alert("Erreur création fichier CSV."); } };
       
        // --- Fin Event Handlers ---
    /**
     * NOUVELLE FONCTION : Gère l'affichage des tâches liées à une animation dans une modale.
     */
    const handleShowAnimationTasks = async (animationId, animationTitle) => {
        if (!currentUser) {
            alert("Veuillez vous connecter pour voir les tâches.");
            return;
        }
        // Vérifier si les éléments de la modale existent
        if (!taskListModal || !modalTaskTitle || !modalTaskContent) {
            console.error("Éléments DOM de la modale des tâches (#task-list-modal) non trouvés !");
            alert("Erreur : Impossible d'afficher la modale des tâches.");
            return;
        }

        // Préparer et ouvrir la modale
        modalTaskTitle.textContent = `Tâches pour : ${animationTitle || 'Animation sélectionnée'}`;
        modalTaskContent.innerHTML = '<p>Chargement des tâches associées...</p>';
        openModal(taskListModal);

        try {
            // Assurer que les caches nécessaires sont chargés
            // Normalement, ils devraient l'être si le dashboard ou la page Tâches a été vue.
            // On peut ajouter une vérification ou un rechargement si nécessaire.
            if (!tasksLoaded || !membersLoaded) {
                 console.warn("handleShowAnimationTasks: Tentative d'affichage avant chargement complet des caches Tâches/Membres.");
                 // Optionnel : forcer un rechargement, mais peut ralentir.
                 // await Promise.all([loadTasksIntoCache(), loadMembersIntoCache()]);
            }

            // Filtrer les tâches pour cette animation
            const relatedTasks = cachedTasks.filter(task => task.animationId === animationId);

            // Trier les tâches (par exemple, par échéance - Optionnel mais utile)
             relatedTasks.sort((a, b) => {
        const timeA = getDateValueInMillis(a.dueDate); // Utilise l'helper
        const timeB = getDateValueInMillis(b.dueDate); // Utilise l'helper

        // Gestion de Infinity pour tri ascendant (place les erreurs/nulls à la fin)
        if (timeA === Infinity && timeB === Infinity) return 0;
        if (timeA === Infinity) return 1; // Met A après B si A est invalide/null
        if (timeB === Infinity) return -1; // Met B après A si B est invalide/null
        return timeA - timeB; // Tri ascendant normal
    });

            if (relatedTasks.length === 0) {
                modalTaskContent.innerHTML = '<p style="text-align:center; color:#888; font-style:italic; padding: 20px 0;">Aucune tâche associée à cette animation.</p>';
                return;
            }

            // Générer le HTML pour la liste des tâches dans la modale
            let tasksHtml = '';
            relatedTasks.forEach(task => {
                let dateStr = 'N/A';
                let overdueClass = '';
                let dateObj = null;
                // Tentative de gestion simple des dates (String ou Timestamp) pour l'affichage
                try {
                    if (task.dueDate?.toDate) { // Priorité au Timestamp
                         dateObj = task.dueDate.toDate();
                    } else if (task.dueDate) { // Essayer de parser si ce n'est pas un timestamp
                         dateObj = new Date(task.dueDate + 'T00:00:00'); // Ajout T00 pour éviter pbs timezone potentiels
                    }

                    if (dateObj instanceof Date && !isNaN(dateObj.getTime())) { // Vérifier si on a une date valide
                         dateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                        if (task.status !== 'terminé' && dateObj.getTime() < Date.now() - 864e5) {
                             overdueClass = 'text-danger'; // Assurez-vous que cette classe existe en CSS
                        }
                    }
                } catch (e) { dateStr = 'Date invalide'; }


                let statusIcon = '<i class="fas fa-circle" style="color: var(--warning-color);"></i>'; // Défaut: à faire
                if(task.status === 'en cours') statusIcon = '<i class="fas fa-spinner fa-spin" style="color: var(--primary-color);"></i>';
                else if (task.status === 'terminé') statusIcon = '<i class="fas fa-check-circle" style="color: var(--success-color);"></i>';

                const assigneeIds = Array.isArray(task.assigneeIds) ? task.assigneeIds : (task.assigneeId ? [task.assigneeId] : []);
                let assigneesText = 'N/A';
                if (assigneeIds.length > 0 && membersLoaded) {
                     assigneesText = assigneeIds.map(id => {
                         const member = cachedMembers.find(m => m.id === id);
                         return member ? `${member.firstname} ${member.lastname}` : 'Inconnu';
                     }).join(', ');
                 }

                tasksHtml += `
                    <div class="modal-task-item">
                        <p class="task-desc">${task.description || 'Tâche sans description'}</p>
                        <div class="task-detail">
                           ${statusIcon} <span>Statut : ${task.status || 'N/A'}</span>
                        </div>
                        <div class="task-detail">
                           <i class="fas fa-users"></i> <span>Assigné(s) : ${assigneesText}</span>
                        </div>
                        <div class="task-detail">
                           <i class="fas fa-clock"></i> <span class="${overdueClass}">Échéance : ${dateStr} ${overdueClass ? '(Retard!)' : ''}</span>
                        </div>
                    </div>
                `;
            });

            modalTaskContent.innerHTML = tasksHtml;

        } catch (error) {
            console.error("Erreur lors du chargement/affichage des tâches dans la modale :", error);
            // Afficher l'erreur dans la modale
            modalTaskContent.innerHTML = `<p class="error-message" style="padding: 20px;">Erreur lors du chargement des tâches associées.<br><small>${error.message}</small></p>`;
             // Si l'erreur est due au tri des dates String, le message d'erreur s'affichera ici.
        }
    };
    
        // --- Fonctions Auth ---
        const signInWithGoogle = async () => { const provider = new firebase.auth.GoogleAuthProvider(); try { console.log("Tentative connexion Google..."); const result = await auth.signInWithPopup(provider); console.log("Connecté avec Google:", result.user.displayName); } catch (error) { console.error("Erreur connexion Google:", error); if (error.code === 'auth/popup-closed-by-user') { alert("Fenêtre connexion fermée."); } else if (error.code === 'auth/cancelled-popup-request') { console.warn("Popups multiples."); } else if (error.code === 'auth/unauthorized-domain') { alert("Domaine non autorisé. Vérifiez la config Firebase.");} else { alert(`Erreur connexion: ${error.message}`); } } };
        const signOut = async () => { try { await auth.signOut(); console.log("Utilisateur déconnecté."); } catch (error) { console.error("Erreur déconnexion:", error); alert(`Erreur déconnexion: ${error.message}`); } };
        // --- Fin Fonctions Auth ---
    
    
        // --- 10. Event Listener Attachments ---
        try {
            sidebarLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); const pageId = link.getAttribute('href')?.substring(1); if(pageId) navigateTo(pageId, true); }); });
            window.addEventListener('popstate', () => { const pageId = window.location.hash.substring(1) || 'dashboard'; navigateTo(pageId, false); });
            // Fermeture modales standard
            allCloseBtns.forEach(btn => { const modal = btn.closest('.modal'); if(modal && modal.id !== 'animation-detail-modal') btn.addEventListener('click', () => closeModal(modal)); }); // Exclure détail ici
            allModals.forEach(modal => { if(modal.id !== 'animation-detail-modal') modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); }); }); // Exclure détail ici
            // Fermeture modale détail SPÉCIFIQUE
            const detailModalCloseBtn = animationDetailModal?.querySelector('.close-btn');
            if(detailModalCloseBtn) detailModalCloseBtn.addEventListener('click', () => closeModal(animationDetailModal));
            if(animationDetailModal) animationDetailModal.addEventListener('click', (e) => { if (e.target === animationDetailModal) closeModal(animationDetailModal); });
            // Bouton Modifier dans modale détail
            if(editFromDetailBtn) { editFromDetailBtn.addEventListener('click', () => { if(currentDetailAnimationId){ closeModal(animationDetailModal); handleEditAnimation(currentDetailAnimationId); } }); } else { console.warn('#edit-from-detail-btn manquant');}
    
            // Reste des listeners
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

            // <<< AJOUTEZ LES ÉCOUTEURS D'ÉVÉNEMENTS POUR LE HAMBURGER ICI >>>
        console.log('Préparation attachement listeners hamburger...');
            if (hamburgerBtn && sidebar && overlay) {
            hamburgerBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Empêche la propagation de l'événement
                toggleSidebar();
            });
console.log('Condition IF passée, attachement listeners...');
            overlay.addEventListener('click', () => {
                console.log('Overlay cliqué !');
                // Ferme seulement si le sidebar est ouvert
                if (body.classList.contains('sidebar-open')) {
                            console.log('Sidebar était ouvert, tentative de fermeture...'); // <-- AJOUTER CECI

                    toggleSidebar();
               } else {
        console.log('Sidebar était déjà fermé.'); // <-- AJOUTER CECI
    }
            });

            // Optionnel : Ferme le menu quand on clique sur un lien de navigation
            const sidebarNavLinksForToggle = sidebar.querySelectorAll('.nav-link');
            sidebarNavLinksForToggle.forEach(link => {
                link.addEventListener('click', () => {
                    if (body.classList.contains('sidebar-open')) {
                        // Utilise setTimeout pour laisser le temps à la navigation de se faire
                        // avant que le menu ne se ferme visuellement.
                        setTimeout(toggleSidebar, 100);
                    }
                });
            });

        } else {
            console.warn("Éléments hamburgerBtn, sidebar, ou overlay non trouvés. Le menu mobile risque de ne pas fonctionner.");
        }
        // --- Fin Listeners Hamburger ---

        } catch (err) { console.error("Erreur attachement listeners:", err); }
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
                        if (!isInitialLoadComplete || !wasConnected) { await loadAllCaches(true); }
                        const currentPage = window.location.hash.substring(1) || 'dashboard';
                        console.log(`Autorisé - Navigation/Rendu vers: ${currentPage}`);
                        navigateTo(currentPage, !wasConnected);
                    } else {
                        console.warn(`Utilisateur ${user.email} authentifié mais NON AUTORISÉ.`); alert("Accès non autorisé. Votre compte Google est connecté mais n'est pas dans la liste des utilisateurs autorisés pour cette application. Veuillez contacter l'administrateur si vous pensez qu'il s'agit d'une erreur.");
                        if (userInfoDiv && loginBtn && logoutBtn) { userInfoDiv.style.display = 'none'; loginBtn.style.display = 'block'; logoutBtn.style.display = 'none'; }
                        clearAllCaches();
                        if(memberListDiv) memberListDiv.innerHTML = '<p>Accès non autorisé.</p>'; if(animationListDiv) animationListDiv.innerHTML = '<p>Accès non autorisé.</p>'; if(taskListDiv) taskListDiv.innerHTML = '<p>Accès non autorisé.</p>';
                        if(statsTotalCompletedEl) statsTotalCompletedEl.textContent = '-'; if(statsAvgParticipationEl) statsAvgParticipationEl.textContent = '-'; if(statsTotalBudgetSpentEl) statsTotalBudgetSpentEl.textContent = '-';
                        if (statusChartInstance) { statusChartInstance.destroy(); statusChartInstance = null; } if (typeChartInstance) { typeChartInstance.destroy(); typeChartInstance = null; } if (participationChartInstance) { participationChartInstance.destroy(); participationChartInstance = null; }
                        const statusCtx = document.getElementById('stats-status-chart')?.getContext('2d'); if(statusCtx) statusCtx.clearRect(0,0,statusCtx.canvas.width,statusCtx.canvas.height); const typeCtx = document.getElementById('stats-type-chart')?.getContext('2d'); if(typeCtx) typeCtx.clearRect(0,0,typeCtx.canvas.width,typeCtx.canvas.height); const participationCtx = document.getElementById('stats-participation-chart')?.getContext('2d'); if(participationCtx) participationCtx.clearRect(0,0,participationCtx.canvas.width,participationCtx.canvas.height);
                        if(statusErrorEl) statusErrorEl.style.display='none'; if(typeErrorEl) typeErrorEl.style.display='none'; if(participationErrorEl) participationErrorEl.style.display='none';
                        const docPage = document.getElementById('documents'); if(docPage) docPage.innerHTML = '<p>Accès non autorisé.</p>';
                        await auth.signOut();
                    }
                } catch (error) { console.error("Erreur lors de la vérification d'autorisation:", error); alert("Erreur vérification droits d'accès. Réessayez."); await auth.signOut(); }
            } else {
                console.log("Auth state changed: Utilisateur déconnecté"); currentUser = null;
                if (userInfoDiv && loginBtn && logoutBtn) { userInfoDiv.style.display = 'none'; loginBtn.style.display = 'block'; logoutBtn.style.display = 'none'; }
                clearAllCaches(); console.log("Auth state: Effacement des vues (déconnexion)...");
                if(memberListDiv) memberListDiv.innerHTML = '<p>Veuillez vous connecter pour voir les membres.</p>'; if(animationListDiv) animationListDiv.innerHTML = '<p>Veuillez vous connecter pour voir les animations.</p>'; if(taskListDiv) taskListDiv.innerHTML = '<p>Veuillez vous connecter pour voir les tâches.</p>';
                if(statsTotalCompletedEl) statsTotalCompletedEl.textContent = '-'; if(statsAvgParticipationEl) statsAvgParticipationEl.textContent = '-'; if(statsTotalBudgetSpentEl) statsTotalBudgetSpentEl.textContent = '-';
                if (statusChartInstance) { statusChartInstance.destroy(); statusChartInstance = null; } if (typeChartInstance) { typeChartInstance.destroy(); typeChartInstance = null; } if (participationChartInstance) { participationChartInstance.destroy(); participationChartInstance = null; }
                const statusCtx = document.getElementById('stats-status-chart')?.getContext('2d'); if(statusCtx) statusCtx.clearRect(0,0,statusCtx.canvas.width,statusCtx.canvas.height); const typeCtx = document.getElementById('stats-type-chart')?.getContext('2d'); if(typeCtx) typeCtx.clearRect(0,0,typeCtx.canvas.width,typeCtx.canvas.height); const participationCtx = document.getElementById('stats-participation-chart')?.getContext('2d'); if(participationCtx) participationCtx.clearRect(0,0,participationCtx.canvas.width,participationCtx.canvas.height);
                if(statusErrorEl) statusErrorEl.style.display='none'; if(typeErrorEl) typeErrorEl.style.display='none'; if(participationErrorEl) participationErrorEl.style.display='none';
                const docPage = document.getElementById('documents'); if(docPage) docPage.innerHTML = '<h2><i class="fas fa-folder-open"></i> Documents et Ressources</h2><p>Veuillez vous connecter pour accéder aux documents.</p>';
                navigateTo('dashboard', false); // Afficher dashboard vide
            }
        });
        // --- Fin Observateur & Init ---
    
    }); // Fin DOMContentLoaded
